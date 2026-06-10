/**
 * Flat-top hexagon geometry + a honeycomb spiral layout.
 *
 * The spiral places node 0 at the centre and fills outward ring by ring, so any count
 * reads as a compact, centred blob: 1 sits dead centre, 2–3 cluster tightly, and ~50 fill
 * a tidy hexagon. Sizing is a single source of truth here and is handed to CSS via custom
 * properties (see HexGrid), so the component never hardcodes tile dimensions.
 */

/** Centre-to-corner radius of a tile, in px. Everything else derives from this. */
export const HEX_SIZE = 64;
/** Tile bounding box (flat-top: width = 2·size, height = √3·size). */
export const HEX_W = HEX_SIZE * 2;
export const HEX_H = Math.sqrt(3) * HEX_SIZE;

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
  return { x: HEX_SIZE * 1.5 * q, y: HEX_H * (r + q / 2) };
}

/**
 * Lay out `count` tiles as a spiral honeycomb centred in a `width`×`height` box.
 * Returns tile-centre coordinates; the caller offsets by half the tile box to position.
 */
export function layoutSpiral(count: number, width: number, height: number): PlacedHex[] {
  const coords = hexSpiral(count);
  if (coords.length === 0) return [];
  const pts = coords.map(axialToPixel);

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const offsetX = width / 2 - cx;
  const offsetY = height / 2 - cy;

  return coords.map((axial, i) => ({
    axial,
    x: pts[i].x + offsetX,
    y: pts[i].y + offsetY,
  }));
}
