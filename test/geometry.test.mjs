import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../jsx/lib/geometry.jsx", import.meta.url), "utf8");
const BG = new Function(source + "\nreturn BG;")();

const container = BG.rect(0, 0, 1000, 700);

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks++; }

// basic helpers
ok(typeof BG.bentoLayout === "function", "bentoLayout exists");
ok(BG.styles.length === 4, "four styles");

function overlaps(a, b, eps = 1e-6) {
  return !(a.right <= b.left + eps || b.right <= a.left + eps ||
           a.bottom <= b.top + eps || b.bottom <= a.top + eps);
}

function inside(t, c, eps = 1e-6) {
  return t.left >= c.left - eps && t.top >= c.top - eps &&
         t.right <= c.right + eps && t.bottom <= c.bottom + eps;
}

for (const style of BG.styles) {
  for (const n of [2, 4, 6, 9, 12]) {
    const tiles = BG.bentoLayout(container, style, n, 8, 42);
    ok(tiles.length === n, style + " n=" + n + " count, got " + tiles.length);
    ok(tiles.every((t) => inside(t, container)), style + " n=" + n + " inside");
    // no overlaps
    let anyOverlap = false;
    for (let i = 0; i < tiles.length; i++)
      for (let j = i + 1; j < tiles.length; j++)
        if (overlaps(tiles[i], tiles[j])) anyOverlap = true;
    ok(!anyOverlap, style + " n=" + n + " no overlaps");
    // positive sizes
    ok(tiles.every((t) => t.width > 0 && t.height > 0), style + " n=" + n + " positive");
  }
}

// gutter reduces tile size
const noG = BG.bentoLayout(container, "simple", 4, 0, 1);
const withG = BG.bentoLayout(container, "simple", 4, 20, 1);
ok(withG[0].width < noG[0].width, "gutter shrinks tiles");

// seed changes layout
const a = BG.bentoLayout(container, "random", 8, 8, 1);
const b = BG.bentoLayout(container, "random", 8, 8, 2);
const same = a.every((t, i) => Math.abs(t.left - b[i].left) < 1e-9 && Math.abs(t.top - b[i].top) < 1e-9);
ok(!same, "different seed changes random layout");

// centered has a large center-ish tile
const ct = BG.bentoLayout(container, "centered", 9, 8, 7);
const areas = ct.map((t) => t.width * t.height).sort((x, y) => y - x);
ok(areas[0] > areas[1], "centered has a largest tile");

console.log("geometry checks passed:", checks);
