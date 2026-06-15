import type { CSSProperties } from "react";
import styles from "./Hex.module.css";
import EyeClosedIcon from "../assets/icons/eye-closed.svg?react";
import HexRingIcon from "../assets/icons/hex-ring.svg?react";
import { heatBand } from "../hex/heat";
import { hexState, type NodeDatum } from "../hex/types";

interface HexProps {
  /** Cluster entity for this tile. Omit to render an inert ghost cell (the base wireframe). */
  node?: NodeDatum;
  selected?: boolean;
  onSelect?: (id: string) => void;
  /** Layout-owned position (left/top) from HexGrid. */
  style?: CSSProperties;
}

/**
 * A cluster node as a heat-coloured hex tile. With no `node` it falls back to the base hex
 * styling — an inert ghost outline — so the same component fills the whole saturated lattice.
 * Purely presentational: `hex--tile` + a band class add the fill, content depends on state,
 * and selection/position come in as props.
 */
export default function Hex({ node, selected = false, onSelect, style }: HexProps) {
  // No data → the base hex is already the ghost wireframe; render it inert.
  if (!node) {
    return <div className={styles.hex} style={style} aria-hidden="true" />;
  }

  const state = hexState(node);
  const band = heatBand(node);
  const label = node.label ?? node.id;

  const className = [
    styles.hex,
    styles["hex--tile"],
    styles[`hex--${band}`],
    state === "rest" && styles["hex--rest"],
    selected && styles["hex--selected"],
    state === "hidden" && styles["hex--hidden"],
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      style={style}
      title={label}
      disabled={state === "off" || state === "hidden"}
      onClick={() => onSelect?.(node.id)}
    >
      {state !== "hidden" && (
        <>
          <span className={styles["hex__id"]}>{label}</span>

          {state === "off" && <span className={styles["hex__util"]}>OFFLINE</span>}

          {/* details — shown for active tiles, and revealed on hover for idle ("at rest") tiles */}
          {state !== "off" && (
            <span className={styles["hex__body"]}>
              <span className={styles["hex__util"]}>
                {node.util}
                <span className={styles["hex__pct"]}>%</span>
              </span>
              <span className={styles["hex__sub"]}>
                {node.temp != null && (
                  <>
                    {node.temp}°<span className={styles["hex__dot"]}>/</span>
                  </>
                )}
                {node.mem}G
              </span>
            </span>
          )}

          {/* at-rest glyph, hidden on hover so the details show through */}
          {state === "rest" && (
            <span className={styles["hex__glyph"]}>
              <EyeClosedIcon />
            </span>
          )}

          {selected && (
            <span className={styles["hex__ring"]}>
              <HexRingIcon />
            </span>
          )}
        </>
      )}
    </button>
  );
}
