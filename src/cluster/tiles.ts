import type { NodeDatum } from "../hex/types";
import { isHealthyPhase, type ClusterNode, type ClusterPod } from "./types";

/**
 * Map cluster entities onto hex tiles. Both levels reuse the same Hex/HexGrid; only the
 * data differs. "util" is committed CPU (no live metrics on this cluster), temperature is
 * omitted (no source), and health flags drive the off/critical states.
 */

/** Last dash-segment of a node name, e.g. "pool-zy5r0ppmc-3ullx6" → "3ullx6". */
function shortNodeName(name: string): string {
  return name.split("-").pop() ?? name;
}

export function nodeToTile(node: ClusterNode): NodeDatum {
  return {
    id: node.name,
    label: shortNodeName(node.name),
    util: node.cpuPct,
    mem: node.memGiB,
    off: !node.ready,
    crit: node.pods.some((p) => !isHealthyPhase(p.phase)),
  };
}

export function podToTile(pod: ClusterPod): NodeDatum {
  return {
    id: pod.name,
    util: pod.cpuPct,
    mem: Number((pod.memMiB / 1024).toFixed(2)),
    off: !isHealthyPhase(pod.phase),
    crit: pod.phase === "Failed" || pod.phase === "Unknown",
  };
}
