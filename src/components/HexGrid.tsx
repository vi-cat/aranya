import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import styles from "./HexGrid.module.css";
import Hex from "./Hex";
import { HEX_H, HEX_W, axialKey, hexSpiral, hexesInBox } from "../hex/geometry";
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
 * One saturated honeycomb. Every cell that covers the viewport is rendered; the central
 * cells carry data (a centred blob, in `hexSpiral` order) and the rest are inert ghost cells.
 * Controlled: the parent owns selection and decides what a click means (drill in vs. select).
 * HexGrid only measures its box so the lattice re-centres on resize, and positions each cell.
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

  // Every visible cell — depends only on the box size, not the data. (The virtualized set.)
  const cells = useMemo(() => hexesInBox(size.w, size.h), [size]);

  // Pin each datum to a central spiral cell, keyed by axial coord for O(1) lookup below.
  const dataByCell = useMemo(() => {
    const spiral = hexSpiral(nodes.length);
    const map = new Map<string, NodeDatum>();
    spiral.forEach((axial, i) => map.set(axialKey(axial), nodes[i]));
    return map;
  }, [nodes]);

  return (
    <div ref={ref} className={styles["hex-grid"]} style={gridStyle}>
      {cells.map(({ axial, x, y }) => {
        const position = { left: x - HEX_W / 2, top: y - HEX_H / 2 };
        const node = dataByCell.get(axialKey(axial));
        return node ? (
          <Hex
            key={node.id}
            node={node}
            selected={selectedId === node.id}
            onSelect={onSelect}
            style={position}
          />
        ) : (
          // No data → a base Hex renders the inert ghost wireframe.
          <Hex key={`g:${axial.q},${axial.r}`} style={position} />
        );
      })}
    </div>
  );
}
