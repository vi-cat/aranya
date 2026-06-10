import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import styles from "./HexGrid.module.css";
import Hex from "./Hex";
import { HEX_H, HEX_W, layoutSpiral } from "../hex/geometry";
import type { NodeDatum } from "../hex/types";

interface HexGridProps {
  nodes: NodeDatum[];
  /** Currently-selected tile id (renders the ring), or null. */
  selectedId: string | null;
  /** Called with the tile id when a hex is clicked. The parent decides what it means. */
  onSelect: (id: string) => void;
}

// Tile dimensions are constant; hand them to CSS once as custom properties.
const gridStyle = {
  "--hex-w": `${HEX_W}px`,
  "--hex-h": `${HEX_H}px`,
} as CSSProperties;

/**
 * Lays out tiles as a centred spiral honeycomb. Controlled: the parent owns selection and
 * decides what a click means (drill in vs. select). HexGrid only measures its box so the
 * cluster re-centres on resize, and positions each Hex.
 */
export default function HexGrid({ nodes, selectedId, onSelect }: HexGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Layout depends only on tile count + box size — not the node data itself.
  const placed = useMemo(
    () => layoutSpiral(nodes.length, size.w, size.h),
    [nodes.length, size],
  );

  return (
    <div ref={ref} className={styles["hex-grid"]} style={gridStyle}>
      {size.w > 0 &&
        nodes.map((node, i) => (
          <Hex
            key={node.id}
            node={node}
            selected={selectedId === node.id}
            onSelect={onSelect}
            style={{
              left: placed[i].x - HEX_W / 2,
              top: placed[i].y - HEX_H / 2,
            }}
          />
        ))}
    </div>
  );
}
