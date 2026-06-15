/**
 * Flat-top hexagon geometry for one saturated honeycomb lattice.
 *
 * `hexSpiral` places node 0 at the centre and fills outward ring by ring, so the data reads
 * as a compact, centred blob. `hexesInBox` enumerates every cell that covers a viewport (the
 * grid that saturates the screen), with axial (0,0) pinned at the box centre — so data and
 * the surrounding ghost cells share one lattice. Sizing is a single source of truth here and
 * is handed to CSS via custom properties (see HexGrid), so components never hardcode tile dims.
 */

/** Centre-to-corner radius of a tile, in px. Everything else derives from this. */
export const HEX_SIZE = 64;
/** Tile bounding box (flat-top: width = 2·size, height = √3·size). */
export const HEX_W = HEX_SIZE * 2;
export const HEX_H = Math.sqrt(3) * HEX_SIZE;

/** Lattice steps between adjacent flat-top cells: columns by 1.5·size, rows by a full height. */
export const COL_STEP = HEX_SIZE * 1.5; // === HEX_W * 0.75
export const ROW_STEP = HEX_H;

export interface Axial {
  q: number;
  r: number;
}

export interface PlacedHex {
  axial: Axial;
  /** Tile-centre coordinates within the container. */
  x: number;
  y: number;
}

// The six axial neighbour directions, in spiral-walk order (flat-top).
const DIRECTIONS: Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/** Axial hex coordinates spiralling out from the centre, up to `count` tiles. */
export function hexSpiral(count: number): Axial[] {
  const out: Axial[] = [];
  if (count <= 0) return out;
  out.push({ q: 0, r: 0 });
  for (let ring = 1; out.length < count; ring++) {
    // Step out to the start of the ring, then walk its six sides.
    let hex: Axial = { q: DIRECTIONS[4].q * ring, r: DIRECTIONS[4].r * ring };
    for (let side = 0; side < 6 && out.length < count; side++) {
      for (let step = 0; step < ring && out.length < count; step++) {
        out.push(hex);
        hex = { q: hex.q + DIRECTIONS[side].q, r: hex.r + DIRECTIONS[side].r };
      }
    }
  }
  return out;
}

/** Flat-top axial coordinate → pixel centre. */
export function axialToPixel({ q, r }: Axial): { x: number; y: number } {
  return { x: COL_STEP * q, y: ROW_STEP * (r + q / 2) };
}

/** Stable string key for an axial coordinate — used to look a cell up in a Map. */
export function axialKey({ q, r }: Axial): string {
  return `${q},${r}`;
}

/**
 * Every cell that covers a `width`×`height` viewport, with axial (0,0) at the box centre.
 * `margin` adds a ring of off-screen tiles so the edges never show bare corners. Returns
 * tile-centre coordinates in box space; the caller offsets by half the tile box to position.
 * Bounded by the viewport — this is the virtualized set, never the full plane.
 */
export function hexesInBox(width: number, height: number, margin = 1): PlacedHex[] {
  if (width <= 0 || height <= 0) return [];
  const cx = width / 2;
  const cy = height / 2;
  const padX = margin * COL_STEP;
  const padY = margin * ROW_STEP;

  const qMin = Math.floor((-cx - padX) / COL_STEP);
  const qMax = Math.ceil((width - cx + padX) / COL_STEP);

  const out: PlacedHex[] = [];
  for (let q = qMin; q <= qMax; q++) {
    // y = ROW_STEP·(r + q/2); invert for the r-range that lands inside the padded box.
    const rMin = Math.floor((-cy - padY) / ROW_STEP - q / 2);
    const rMax = Math.ceil((height - cy + padY) / ROW_STEP - q / 2);
    for (let r = rMin; r <= rMax; r++) {
      const p = axialToPixel({ q, r });
      out.push({ axial: { q, r }, x: cx + p.x, y: cy + p.y });
    }
  }
  return out;
}
