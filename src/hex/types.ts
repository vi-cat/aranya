/** A single node (GPU) rendered as a hex tile on the cluster map. */
export interface NodeDatum {
  /** Unique id, used for keys, selection, and navigation lookups. */
  id: string;
  /** Short text shown on the tile (hover/focus). Falls back to `id`. */
  label?: string;
  /** Utilization, 0–100. */
  util: number;
  /** Temperature in °C, if a source exists (k8s has none — optional). */
  temp?: number;
  /** Memory in use, GB. */
  mem: number;
  /** Powered off / unreachable. */
  off?: boolean;
  /** Needs attention (thermal/throttle). Rendered with the alert badge + pulse. */
  crit?: boolean;
  /** Dimmed by an active filter (e.g. namespace mismatch). */
  dim?: boolean;
}

/** Visual mode a hex renders in, derived from node data. */
export type HexState = "off" | "rest" | "active" | "hidden";

/** Utilization below this reads as "at rest" and collapses to the muted glyph. */
export const REST_THRESHOLD = 1;

export function hexState(node: NodeDatum): HexState {
  if (node.dim) return "hidden";
  if (node.off) return "off";
  return node.util < REST_THRESHOLD ? "rest" : "active";
}
