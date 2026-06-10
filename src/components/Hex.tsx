import type { CSSProperties } from "react";
import styles from "./Hex.module.css";
import EyeClosedIcon from "../assets/icons/eye-closed.svg?react";
import HexRingIcon from "../assets/icons/hex-ring.svg?react";
import { heatBand } from "../hex/heat";
import { hexState, type NodeDatum } from "../hex/types";

interface HexProps {
  node: NodeDatum;
  selected: boolean;
  onSelect: (id: string) => void;
  /** Layout-owned position (left/top) from HexGrid. */
  style?: CSSProperties;
}

/**
 * A single cluster node as a heat-coloured hex tile. Purely presentational: a band class
 * picks the colour, the content depends on state, and selection/position come in as props.
 */
export default function Hex({ node, selected, onSelect, style }: HexProps) {
  const state = hexState(node);
  const band = heatBand(node);
  const label = node.label ?? node.id;

  const className = [
    styles.hex,
    styles[`hex--${band}`],
    state === "rest" && styles["hex--rest"],
    selected && styles["hex--selected"],
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      style={style}
      title={label}
      disabled={state === "off"}
      onClick={() => onSelect(node.id)}
    >
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
    </button>
  );
}
