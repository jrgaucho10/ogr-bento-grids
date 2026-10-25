/*
 * OGR Bento Grids — geometry core
 * Pure, dependency-free bento layout math shared by the Illustrator host
 * and the browser preview. ExtendScript-safe (ES3, no JSON, no Array extras).
 *
 * Coordinate space: x right, y down (visual). Container rect {left,top,right,bottom}.
 */

var BG = (function () {
  var EPS = 0.000001;

  function rect(l, t, r, b) {
    l = Number(l); t = Number(t); r = Number(r); b = Number(b);
    if (r < l) { var tmp = l; l = r; r = tmp; }
    if (b < t) { var tmp2 = t; t = b; b = tmp2; }
    return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
  }

  function cloneRect(r) { return rect(r.left, r.top, r.right, r.bottom); }

  function center(r) { return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 }; }

  function inset(r, d) { return rect(r.left + d, r.top + d, r.right - d, r.bottom - d); }

  /* Seeded PRNG (mulberry32-ish, ES3 safe). */
  function rng(seed) {
    var s = (Number(seed) || 1) >>> 0;
    if (s === 0) s = 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = ((s ^ (s >>> 15)) * (1 | s)) | 0;
      t = ((t + (((t ^ (t >>> 7)) * (61 | t)) | 0)) ^ t) | 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function splitRect(leaf, ratio, vertical) {
    ratio = Math.max(0.05, Math.min(0.95, Number(ratio) || 0.5));
    if (vertical) {
      var x = leaf.left + leaf.width * ratio;
      return [rect(leaf.left, leaf.top, x, leaf.bottom),
              rect(x, leaf.top, leaf.right, leaf.bottom)];
    }
    var y = leaf.top + leaf.height * ratio;
    return [rect(leaf.left, leaf.top, leaf.right, y),
            rect(leaf.left, y, leaf.right, leaf.bottom)];
  }

  /* Pick the leaf to split. */
  function pickLeaf(leaves, style, r) {
    if (style === "random") {
      return Math.floor(r() * leaves.length);
    }
    // largest area
    var best = 0, bestArea = -1;
    for (var i = 0; i < leaves.length; i++) {
      var a = leaves[i].width * leaves[i].height;
      if (a > bestArea) { bestArea = a; best = i; }
    }
    return best;
  }

  function clampN(n) {
    n = Math.round(Number(n) || 4);
    if (n < 1) n = 1;
    if (n > 64) n = 64;
    return n;
  }

  /* Centered frame layout: one large center tile + surrounding bands. */
  function centeredLayout(container, n, seed) {
    var r = rng(seed);
    if (n < 5) {
      // fall back to simple
      return simpleLayout(container, n, seed);
    }
    var mx = container.width * 0.16;
    var my = container.height * 0.16;
    if (mx < 4) mx = 4;
    if (my < 4) my = 4;
    if (mx > container.width * 0.4) mx = container.width * 0.4;
    if (my > container.height * 0.4) my = container.height * 0.4;

    var centerRect = rect(container.left + mx, container.top + my,
                          container.right - mx, container.bottom - my);

    // four bands
    var bands = [
      rect(container.left, container.top, container.right, container.top + my),               // top
      rect(container.left, container.bottom - my, container.right, container.bottom),         // bottom
      rect(container.left, container.top + my, container.left + mx, container.bottom - my),   // left
      rect(container.right - mx, container.top + my, container.right, container.bottom - my)  // right
    ];

    var leaves = [centerRect];
    for (var i = 0; i < bands.length; i++) leaves.push(bands[i]);

    // need n leaves total; currently 5. Split largest band pieces (n-5) times.
    var splits = n - 5;
    for (var k = 0; k < splits; k++) {
      // pick largest among band leaves (index >=1)
      var best = 1, bestArea = -1;
      for (var i = 1; i < leaves.length; i++) {
        var a = leaves[i].width * leaves[i].height;
        if (a > bestArea) { bestArea = a; best = i; }
      }
      var leaf = leaves[best];
      leaves.splice(best, 1);
      // split orientation by aspect
      var vertical = leaf.width >= leaf.height;
      // random ratio
      var ratio = 0.4 + r() * 0.2;
      var parts = splitRect(leaf, ratio, vertical);
      leaves.push(parts[0], parts[1]);
    }
    return leaves;
  }

  function simpleLayout(container, n, seed) {
    var leaves = [cloneRect(container)];
    var r = rng(seed);
    for (var k = 0; k < n - 1; k++) {
      var idx = pickLeaf(leaves, "simple", r);
      var leaf = leaves[idx];
      leaves.splice(idx, 1);
      var vertical = leaf.width >= leaf.height;
      var parts = splitRect(leaf, 0.5, vertical);
      leaves.push(parts[0], parts[1]);
    }
    return leaves;
  }

  function brickLayout(container, n, seed) {
    var leaves = [cloneRect(container)];
    var r = rng(seed);
    for (var k = 0; k < n - 1; k++) {
      var idx = pickLeaf(leaves, "brick", r);
      var leaf = leaves[idx];
      leaves.splice(idx, 1);
      // prefer horizontal splits to create rows
      var vertical;
      if (k % 3 === 0) vertical = false;
      else vertical = leaf.width >= leaf.height * 1.2;
      var parts = splitRect(leaf, 0.5, vertical);
      leaves.push(parts[0], parts[1]);
    }
    return leaves;
  }

  function randomLayout(container, n, seed) {
    var leaves = [cloneRect(container)];
    var r = rng(seed);
    for (var k = 0; k < n - 1; k++) {
      var idx = pickLeaf(leaves, "random", r);
      var leaf = leaves[idx];
      leaves.splice(idx, 1);
      var vertical = r() > 0.5 ? (leaf.width >= leaf.height) : (leaf.width < leaf.height);
      var ratio = 0.3 + r() * 0.4;
      var parts = splitRect(leaf, ratio, vertical);
      leaves.push(parts[0], parts[1]);
    }
    return leaves;
  }

  function bentoLayout(container, style, sections, gutter, seed) {
    style = String(style || "simple").toLowerCase();
    var n = clampN(sections);
    var c = cloneRect(container);
    var leaves;
    if (style === "centered") leaves = centeredLayout(c, n, seed);
    else if (style === "brick") leaves = brickLayout(c, n, seed);
    else if (style === "random") leaves = randomLayout(c, n, seed);
    else leaves = simpleLayout(c, n, seed);

    // apply gutter inset
    var g = Number(gutter) || 0;
    var out = [];
    for (var i = 0; i < leaves.length; i++) {
      var L = leaves[i];
      var ir = rect(L.left + g / 2, L.top + g / 2, L.right - g / 2, L.bottom - g / 2);
      // ensure non-negative size
      if (ir.width < 1) { ir.right = ir.left + 1; ir.width = 1; }
      if (ir.height < 1) { ir.bottom = ir.top + 1; ir.height = 1; }
      out.push(ir);
    }
    return out;
  }

  return {
    rect: rect,
    cloneRect: cloneRect,
    center: center,
    inset: inset,
    rng: rng,
    splitRect: splitRect,
    bentoLayout: bentoLayout,
    styles: ["simple", "centered", "brick", "random"]
  };
})();
