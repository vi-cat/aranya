import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import * as k8s from "@kubernetes/client-node";
import type { V1Node, V1Pod } from "@kubernetes/client-node";

/**
 * Backend-for-frontend: the kubeconfig (which contains a cluster-admin token) is loaded
 * and used here, in the Node-side Vite dev server, never shipped to the browser. The
 * client only ever sees the sanitized JSON from /api/cluster and /api/pods/.../logs.
 */

const KUBECONFIG_PATH =
  process.env.KUBECONFIG_PATH ?? "./virginia-hiring-aranya-kubeconfig.yaml";

let kubeConfig: k8s.KubeConfig | undefined;
function config(): k8s.KubeConfig {
  if (!kubeConfig) {
    kubeConfig = new k8s.KubeConfig();
    kubeConfig.loadFromFile(KUBECONFIG_PATH);
  }
  return kubeConfig;
}

let coreApi: k8s.CoreV1Api | undefined;
function core(): k8s.CoreV1Api {
  coreApi ??= config().makeApiClient(k8s.CoreV1Api);
  return coreApi;
}

let logApi: k8s.Log | undefined;
function logs(): k8s.Log {
  logApi ??= new k8s.Log(config());
  return logApi;
}

// ---- resource-quantity parsing ----
function cpuToMilli(q?: string): number {
  if (!q) return 0;
  if (q.endsWith("m")) return parseInt(q, 10);
  if (q.endsWith("n")) return parseInt(q, 10) / 1e6;
  return Math.round(parseFloat(q) * 1000);
}
const MEM_UNITS: Record<string, number> = {
  "": 1,
  Ki: 1024,
  Mi: 1024 ** 2,
  Gi: 1024 ** 3,
  Ti: 1024 ** 4,
  K: 1e3,
  M: 1e6,
  G: 1e9,
};
function memToBytes(q?: string): number {
  if (!q) return 0;
  const m = /^(\d+(?:\.\d+)?)([A-Za-z]*)$/.exec(q);
  if (!m) return 0;
  return parseFloat(m[1]) * (MEM_UNITS[m[2]] ?? 1);
}

// ---- shapes returned to the client ----
interface ClusterPod {
  id: string;
  name: string;
  namespace: string;
  node: string;
  phase: string;
  owner?: string;
  containers: string[];
  cpuPct: number; // CPU request as % of its node's allocatable
  memMiB: number; // memory request
}
interface ClusterNode {
  id: string;
  name: string;
  ready: boolean;
  instanceType?: string;
  region?: string;
  cpuPct: number; // committed CPU (Σ pod requests ÷ allocatable)
  memPct: number;
  memGiB: number;
  podCount: number;
  pods: ClusterPod[];
}

function buildNode(node: V1Node, allPods: V1Pod[]): ClusterNode {
  const name = node.metadata?.name ?? "<unknown>";
  const alloc = node.status?.allocatable ?? {};
  const allocCpu = cpuToMilli(alloc.cpu);
  const allocMem = memToBytes(alloc.memory);

  let cpuReq = 0;
  let memReq = 0;
  const pods: ClusterPod[] = allPods
    .filter((p) => p.spec?.nodeName === name)
    .map((p) => {
      const containers = p.spec?.containers ?? [];
      const podCpu = containers.reduce((s, c) => s + cpuToMilli(c.resources?.requests?.cpu), 0);
      const podMem = containers.reduce((s, c) => s + memToBytes(c.resources?.requests?.memory), 0);
      cpuReq += podCpu;
      memReq += podMem;
      return {
        id: p.metadata?.uid ?? `${p.metadata?.namespace}/${p.metadata?.name}`,
        name: p.metadata?.name ?? "<unknown>",
        namespace: p.metadata?.namespace ?? "default",
        node: name,
        phase: p.status?.phase ?? "Unknown",
        owner: p.metadata?.ownerReferences?.[0]?.kind,
        containers: containers.map((c) => c.name),
        cpuPct: allocCpu ? Math.round((podCpu / allocCpu) * 100) : 0,
        memMiB: Math.round(podMem / 1024 ** 2),
      };
    });

  const labels = node.metadata?.labels ?? {};
  return {
    id: name,
    name,
    ready: (node.status?.conditions ?? []).some((c) => c.type === "Ready" && c.status === "True"),
    instanceType: labels["node.kubernetes.io/instance-type"],
    region: labels["topology.kubernetes.io/region"],
    cpuPct: allocCpu ? Math.round((cpuReq / allocCpu) * 100) : 0,
    memPct: allocMem ? Math.round((memReq / allocMem) * 100) : 0,
    memGiB: Number((memReq / 1024 ** 3).toFixed(2)),
    podCount: pods.length,
    pods,
  };
}

async function getClusterData() {
  const [nodes, pods] = await Promise.all([
    core().listNode(),
    core().listPodForAllNamespaces(),
  ]);
  return {
    nodes: nodes.items.map((n) => buildNode(n, pods.items)),
    fetchedAt: new Date().toISOString(),
  };
}

async function getNamespaces(): Promise<string[]> {
  const res = await core().listNamespace();
  return res.items
    .map((ns) => ns.metadata?.name ?? "")
    .filter(Boolean)
    .sort();
}

// multi-container pods require an explicit container; default to the first one
async function firstContainer(namespace: string, name: string): Promise<string | undefined> {
  const pod = await core().readNamespacedPod({ name, namespace });
  return pod.spec?.containers?.[0]?.name;
}

async function getPodLogs(namespace: string, name: string, container: string | undefined, tailLines: number) {
  const c = container ?? (await firstContainer(namespace, name));
  const log = await core().readNamespacedPodLog({ name, namespace, container: c, tailLines });
  return { container: c, log: String(log ?? "") };
}

/** Pipe a follow=true log stream straight to the HTTP response until the client disconnects. */
async function streamPodLogs(
  req: IncomingMessage,
  res: ServerResponse,
  namespace: string,
  name: string,
  container: string | undefined,
  tailLines: number,
) {
  const c = container ?? (await firstContainer(namespace, name));
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no"); // don't let any proxy buffer the stream

  const controller = await logs().log(namespace, name, c ?? "", res, {
    follow: true,
    tailLines,
    pretty: false,
    timestamps: false,
  });
  // when the browser closes the connection, stop pulling from the cluster
  req.on("close", () => controller.abort());
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

/** Vite plugin exposing the read-only cluster API on the dev server. */
export function k8sApiPlugin(): Plugin {
  return {
    name: "k8s-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        if (!path.startsWith("/api/")) return next();
        const url = new URL(req.url ?? "", "http://localhost");

        const handle = async () => {
          if (path === "/api/cluster") {
            return sendJson(res, 200, await getClusterData());
          }
          if (path === "/api/namespaces") {
            return sendJson(res, 200, await getNamespaces());
          }
          const m = /^\/api\/pods\/([^/]+)\/([^/]+)\/logs$/.exec(path);
          if (m) {
            const namespace = decodeURIComponent(m[1]);
            const name = decodeURIComponent(m[2]);
            const container = url.searchParams.get("container") ?? undefined;
            const tail = Number(url.searchParams.get("tailLines")) || 200;
            if (url.searchParams.get("follow")) {
              return streamPodLogs(req, res, namespace, name, container, tail);
            }
            return sendJson(res, 200, await getPodLogs(namespace, name, container, tail));
          }
          return next();
        };

        handle().catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          // headers are already flushed once a stream starts — can't send a JSON error then
          if (res.headersSent) res.end();
          else sendJson(res, 500, { error: message });
        });
      });
    },
  };
}
