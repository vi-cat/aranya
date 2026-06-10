import type { NodeDatum } from "./types";

/**
 * Heat band for a tile. Each band maps 1:1 to a class in Hex.module.css that points
 * `--tile` at a spectrum variable (`--h-*`), so colour stays fully in CSS and themeable
 * via `body[data-spectrum]`. JS only decides *which* band a node falls in.
 */
export type HeatBand = "off" | "idle" | "nominal" | "elevated" | "hot" | "crit";

// Lower-bound utilization thresholds, aligned to the spectrum stops.
export function heatBand(node: NodeDatum): HeatBand {
  if (node.off) return "off";
  if (node.crit) return "crit";
  if (node.util < 35) return "idle";
  if (node.util < 60) return "nominal";
  if (node.util < 82) return "elevated";
  return "hot";
}
