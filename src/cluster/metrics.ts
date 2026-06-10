import { isHealthyPhase, type ClusterData } from "./types";

/** Top-level fleet KPIs derived from the cluster snapshot. */
export interface ClusterMetrics {
  nodes: number;
  ready: number;
  avgCpu: number;
  pods: number;
  alerts: number;
}

export function clusterMetrics(data: ClusterData | null): ClusterMetrics {
  const nodes = data?.nodes ?? [];
  const pods = nodes.flatMap((n) => n.pods);
  const ready = nodes.filter((n) => n.ready).length;
  const avgCpu = nodes.length
    ? Math.round(nodes.reduce((sum, n) => sum + n.cpuPct, 0) / nodes.length)
    : 0;
  const unhealthyPods = pods.filter((p) => !isHealthyPhase(p.phase)).length;

  return {
    nodes: nodes.length,
    ready,
    avgCpu,
    pods: pods.length,
    alerts: unhealthyPods + (nodes.length - ready),
  };
}
