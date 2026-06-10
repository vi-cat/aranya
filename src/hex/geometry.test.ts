import { describe, expect, it } from "vitest";
import {
  axialToPixel,
  HEX_H,
  HEX_SIZE,
  HEX_W,
  hexSpiral,
  layoutSpiral,
  type Axial,
} from "./geometry";

/** Hex (cube) distance from the centre — number of steps from {0,0}. */
const ringOf = ({ q, r }: Axial) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
const key = ({ q, r }: Axial) => `${q},${r}`;

describe("constants", () => {
  it("derives the bounding box from HEX_SIZE (flat-top)", () => {
    expect(HEX_W).toBe(HEX_SIZE * 2);
    expect(HEX_H).toBeCloseTo(Math.sqrt(3) * HEX_SIZE);
  });
});

describe("hexSpiral", () => {
  it("returns nothing for non-positive counts", () => {
    expect(hexSpiral(0)).toEqual([]);
    expect(hexSpiral(-5)).toEqual([]);
  });

  it("starts at the centre", () => {
    expect(hexSpiral(1)).toEqual([{ q: 0, r: 0 }]);
    expect(hexSpiral(20)[0]).toEqual({ q: 0, r: 0 });
  });

  it("produces exactly `count` tiles, including partial rings", () => {
    for (const n of [1, 2, 3, 7, 10, 19, 28, 50]) {
      expect(hexSpiral(n)).toHaveLength(n);
    }
  });

  it("never repeats a coordinate", () => {
    const coords = hexSpiral(50);
    expect(new Set(coords.map(key)).size).toBe(50);
  });

  it("stays collision-free as the rings grow large", () => {
    // The spiral has no occupancy check — uniqueness is guaranteed by construction.
    // Across many counts (including big, fully-populated rings) every {q,r} is distinct.
    for (const n of [100, 250, 500, 1000]) {
      const coords = hexSpiral(n);
      expect(new Set(coords.map(key)).size).toBe(n);
    }
  });

  it("fills each completed ring exactly (6·k tiles, no gaps or overlaps)", () => {
    // 1 + 6 + 12 + ... + 6·8 = 217 → eight full rings plus the centre.
    const histogram = new Map<number, number>();
    for (const c of hexSpiral(217)) {
      const ring = ringOf(c);
      histogram.set(ring, (histogram.get(ring) ?? 0) + 1);
    }
    expect(histogram.get(0)).toBe(1);
    for (let ring = 1; ring <= 8; ring++) {
      expect(histogram.get(ring)).toBe(6 * ring);
    }
  });

  it("fills ring by ring (distance is non-decreasing)", () => {
    const rings = hexSpiral(50).map(ringOf);
    for (let i = 1; i < rings.length; i++) {
      expect(rings[i]).toBeGreaterThanOrEqual(rings[i - 1]);
    }
  });

  it("matches the ring sizes 1, 6, 12 for the first three full rings", () => {
    // ring k holds 6k tiles; cumulative 1 + 6 + 12 = 19
    const histogram = new Map<number, number>();
    for (const c of hexSpiral(19)) {
      const ring = ringOf(c);
      histogram.set(ring, (histogram.get(ring) ?? 0) + 1);
    }
    expect(histogram.get(0)).toBe(1);
    expect(histogram.get(1)).toBe(6);
    expect(histogram.get(2)).toBe(12);
  });
});

describe("axialToPixel", () => {
  it("places the centre at the origin", () => {
    expect(axialToPixel({ q: 0, r: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("steps columns by 1.5·size and offsets odd columns by half a row", () => {
    const a = axialToPixel({ q: 1, r: 0 });
    expect(a.x).toBeCloseTo(HEX_SIZE * 1.5); // 96
    expect(a.y).toBeCloseTo(HEX_H / 2); // half-row honeycomb shove
  });

  it("steps rows by a full tile height", () => {
    const a = axialToPixel({ q: 0, r: 1 });
    expect(a.x).toBeCloseTo(0);
    expect(a.y).toBeCloseTo(HEX_H);
  });
});

describe("layoutSpiral", () => {
  it("returns nothing for non-positive counts", () => {
    expect(layoutSpiral(0, 800, 600)).toEqual([]);
  });

  it("centres a single tile in the box", () => {
    const [tile] = layoutSpiral(1, 800, 600);
    expect(tile.x).toBeCloseTo(400);
    expect(tile.y).toBeCloseTo(300);
  });

  it("preserves spiral order / axial coords from hexSpiral", () => {
    const placed = layoutSpiral(10, 800, 600);
    expect(placed.map((p) => p.axial)).toEqual(hexSpiral(10));
  });

  it("centres the cluster bounding box in the box (full ring)", () => {
    const placed = layoutSpiral(7, 800, 600);
    const xs = placed.map((p) => p.x);
    const ys = placed.map((p) => p.y);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(400);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(300);
  });

  it("recentres when the container size changes", () => {
    const [a] = layoutSpiral(1, 1000, 400);
    expect(a.x).toBeCloseTo(500);
    expect(a.y).toBeCloseTo(200);
  });
});
