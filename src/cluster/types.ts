/** Sanitized cluster shapes returned by the /api/cluster backend (see server/k8sApi.ts). */

export interface ClusterPod {
  id: string;
  name: string;
  namespace: string;
  node: string;
  phase: string;
  owner?: string;
  containers: string[];
  /** CPU request as % of its node's allocatable. */
  cpuPct: number;
  /** Memory request, MiB. */
  memMiB: number;
}

export interface ClusterNode {
  id: string;
  name: string;
  ready: boolean;
  instanceType?: string;
  region?: string;
  /** Committed CPU: Σ pod requests ÷ allocatable, as %. */
  cpuPct: number;
  memPct: number;
  memGiB: number;
  podCount: number;
  pods: ClusterPod[];
}

export interface ClusterData {
  nodes: ClusterNode[];
  fetchedAt: string;
}

/** Pod phases we treat as healthy; anything else counts toward alerts / critical state. */
const HEALTHY_PHASES = new Set(["Running", "Succeeded"]);

export function isHealthyPhase(phase: string): boolean {
  return HEALTHY_PHASES.has(phase);
}
