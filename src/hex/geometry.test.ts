import { describe, expect, it } from "vitest";
import {
  axialKey,
  axialToPixel,
  HEX_H,
  HEX_SIZE,
  HEX_W,
  hexesInBox,
  hexSpiral,
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

describe("hexesInBox", () => {
  it("returns nothing for a zero-area box", () => {
    expect(hexesInBox(0, 600)).toEqual([]);
    expect(hexesInBox(800, 0)).toEqual([]);
  });

  it("pins axial (0,0) at the box centre", () => {
    const centre = hexesInBox(800, 600).find((c) => c.axial.q === 0 && c.axial.r === 0);
    expect(centre).toBeDefined();
    expect(centre!.x).toBeCloseTo(400);
    expect(centre!.y).toBeCloseTo(300);
  });

  it("re-centres when the box size changes", () => {
    const centre = hexesInBox(1000, 400).find((c) => c.axial.q === 0 && c.axial.r === 0);
    expect(centre!.x).toBeCloseTo(500);
    expect(centre!.y).toBeCloseTo(200);
  });

  it("saturates the box — cells reach beyond all four edges", () => {
    const W = 800;
    const H = 600;
    const cells = hexesInBox(W, H);
    const xs = cells.map((c) => c.x);
    const ys = cells.map((c) => c.y);
    expect(Math.min(...xs)).toBeLessThanOrEqual(0);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(W);
    expect(Math.min(...ys)).toBeLessThanOrEqual(0);
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(H);
  });

  it("never repeats a cell", () => {
    const cells = hexesInBox(1280, 720);
    expect(new Set(cells.map((c) => axialKey(c.axial))).size).toBe(cells.length);
  });

  it("contains every central data cell (spiral keys ⊆ viewport set)", () => {
    const viewport = new Set(hexesInBox(1280, 720).map((c) => axialKey(c.axial)));
    for (const a of hexSpiral(60)) {
      expect(viewport.has(axialKey(a))).toBe(true);
    }
  });
});
