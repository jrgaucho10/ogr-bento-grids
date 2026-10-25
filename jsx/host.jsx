#target illustrator
#include "lib/geometry.jsx"

/*
 * OGR Bento Grids host
 * Generates bento grid layouts as plain vector rectangles on their own layer.
 */

var BG_PREFIX = "OGR Bento / ";
var BG_VERSION = "0.1.0";

function gbErr(e) {
  var msg = "";
  try { msg = e.message; } catch (ignore) {}
  if (!msg) msg = String(e);
  msg = String(msg).replace(/\|/g, "/").replace(/[\r\n]+/g, " ");
  return "ERR|" + msg;
}

function gbColor(hex) {
  var h = String(hex === undefined || hex === null ? "#8b5cf6" : hex).replace(/[^0-9a-fA-F]/g, "");
  if (h.length === 3) {
    h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
  }
  if (h.length < 6) h = "8b5cf6";
  var c = new RGBColor();
  c.red = Math.min(255, parseInt(h.substr(0, 2), 16) || 0);
  c.green = Math.min(255, parseInt(h.substr(2, 2), 16) || 0);
  c.blue = Math.min(255, parseInt(h.substr(4, 2), 16) || 0);
  return c;
}

function gbUnits() {
  var factor = 1; var label = "pt";
  try {
    var u = app.activeDocument.rulerUnits;
    if (u === RulerUnits.Millimeters) { factor = 25.4 / 72; label = "mm"; }
    else if (u === RulerUnits.Centimeters) { factor = 2.54 / 72; label = "cm"; }
    else if (u === RulerUnits.Inches) { factor = 1 / 72; label = "in"; }
    else if (u === RulerUnits.Picas) { factor = 1 / 12; label = "pc"; }
    else if (u === RulerUnits.Pixels) { factor = 1; label = "px"; }
    else if (u === 5) { factor = 1; label = "px"; }
  } catch (e) {}
  return { factor: factor, label: label };
}

function gbNormRect(b) {
  var l = Math.min(b[0], b[2]);
  var r = Math.max(b[0], b[2]);
  var top = Math.max(b[1], b[3]);
  var bottom = Math.min(b[1], b[3]);
  return BG.rect(l, -top, r, -bottom);
}

function gbAIRect(r) {
  return [r.left, -r.top, r.right, -r.bottom];
}

function gbActiveArtboard() {
  var doc = app.activeDocument;
  var index = 0;
  try { index = doc.artboards.getActiveArtboardIndex(); } catch (e) {}
  var b = doc.artboards[index].artboardRect;
  return gbNormRect(b);
}

function gbSelectionRect() {
  var doc = app.activeDocument;
  if (!doc.selection || doc.selection.length === 0) return null;
  var l = 1e12, t = -1e12, r = -1e12, b = 1e12, found = false, i, gb;
  for (i = 0; i < doc.selection.length; i++) {
    try {
      gb = doc.selection[i].geometricBounds;
      l = Math.min(l, gb[0], gb[2]); r = Math.max(r, gb[0], gb[2]);
      t = Math.max(t, gb[1], gb[3]); b = Math.min(b, gb[1], gb[3]); found = true;
    } catch (e) {}
  }
  if (!found) return null;
  return BG.rect(l, -t, r, -b);
}

function gbCaptureSelection(doc) {
  var out = []; var sel = doc.selection; var i;
  if (!sel) return out;
  for (i = 0; i < sel.length; i++) out.push(sel[i]);
  return out;
}

function gbRestoreSelection(doc, sel) {
  var keep = []; var i;
  if (sel) {
    for (i = 0; i < sel.length; i++) {
      try { if (sel[i].layer) keep.push(sel[i]); } catch (e) {}
    }
  }
  try { doc.selection = keep.length > 0 ? keep : null; } catch (e) {}
}

function gbLayer(name, replace) {
  var doc = app.activeDocument;
  var i, layer;
  if (replace) {
    for (i = doc.layers.length - 1; i >= 0; i--) {
      if (doc.layers[i].name === name) {
        try { doc.layers[i].locked = false; doc.layers[i].visible = true; doc.layers[i].remove(); } catch (e) {}
      }
    }
  }
  layer = null;
  for (i = 0; i < doc.layers.length; i++) {
    if (doc.layers[i].name === name) { layer = doc.layers[i]; break; }
  }
  if (!layer) {
    layer = doc.layers.add();
    layer.name = name;
  }
  try { layer.locked = false; layer.visible = true; } catch (e) {}
  doc.activeLayer = layer;
  return layer;
}

function gbClearLayers(doc) {
  var removed = 0; var i;
  for (i = doc.layers.length - 1; i >= 0; i--) {
    if (String(doc.layers[i].name).indexOf(BG_PREFIX) === 0) {
      try { doc.layers[i].locked = false; doc.layers[i].visible = true; doc.layers[i].remove(); removed++; } catch (e) {}
    }
  }
  return removed;
}

function gbDrawRect(layer, r, radius, fill, stroke, strokeWidth, opacity) {
  var aiTop = -r.top;
  var w = r.width;
  var h = r.height;
  var p;
  try {
    if (radius && radius > 0) {
      var rr = Math.min(radius, Math.min(w, h) / 2);
      p = layer.pathItems.roundedRectangle(aiTop, r.left, w, h, rr, rr);
    } else {
      p = layer.pathItems.rectangle(aiTop, r.left, w, h);
    }
  } catch (e) {
    p = layer.pathItems.add();
    p.setEntirePath([[r.left, -r.top],[r.right, -r.top],[r.right, -r.bottom],[r.left, -r.bottom]]);
    p.closed = true;
  }
  try {
    p.filled = true;
    p.fillColor = gbColor(fill);
    p.stroked = true;
    p.strokeColor = gbColor(stroke);
    p.strokeWidth = Math.max(0.1, Number(strokeWidth) || 0.5);
    p.opacity = opacity === undefined ? 100 : Math.max(0, Math.min(100, opacity));
  } catch (e) {}
  return p;
}

/* ── Info ────────────────────────────────────────────────── */

function GB_info() {
  try {
    if (app.documents.length === 0) return "NODOC";
    var doc = app.activeDocument;
    var u = gbUnits();
    var ab = gbActiveArtboard();
    var count = 0; var sw = 0; var sh = 0;
    if (doc.selection && doc.selection.length > 0) {
      count = doc.selection.length;
      var sr = gbSelectionRect();
      if (sr) { sw = sr.width * u.factor; sh = sr.height * u.factor; }
    }
    var name = String(doc.name).replace(/\|/g, "/").replace(/[\r\n]+/g, " ");
    return "OK|" + name + "|" +
      (Math.round(ab.width * u.factor * 10) / 10) + "|" +
      (Math.round(ab.height * u.factor * 10) / 10) + "|" +
      u.label + "|" + count + "|" +
      (Math.round(sw * 10) / 10) + "|" +
      (Math.round(sh * 10) / 10);
  } catch (e) { return gbErr(e); }
}

/* ── Generate ────────────────────────────────────────────── */

function GB_generate(payloadStr) {
  try {
    if (app.documents.length === 0) return "ERR|Open a document first.";
    var doc = app.activeDocument;
    var payload;
    try { payload = eval("(" + String(payloadStr) + ")"); } catch (e) { payload = null; }
    if (!payload) return "ERR|Could not read panel settings.";

    var style = payload.style || "simple";
    var sections = Math.max(1, Math.min(64, Math.round(Number(payload.sections) || 4)));
    var radius = Math.max(0, Number(payload.radius) || 0);
    var gutter = Math.max(0, Number(payload.gutter) || 0);
    var color = payload.color || "#8b5cf6";
    var stroke = payload.stroke || "#ffffff";
    var strokeWidth = Math.max(0.1, Number(payload.strokeWidth) || 0.5);
    var seed = Number(payload.seed) || 1;
    var target = payload.target || "selection";
    var replace = payload.replace == 1;

    var keep = gbCaptureSelection(doc);
    var r;
    if (target === "selection") {
      r = gbSelectionRect();
      if (!r) r = gbActiveArtboard();
    } else {
      r = gbActiveArtboard();
    }
    if (!r || r.width < 1 || r.height < 1) return "ERR|Target area is too small.";

    var layerName = BG_PREFIX + "Grid";
    if (!replace) {
      // create a uniquely named layer so multiple grids can coexist
      var i = 1;
      var exists = true;
      while (exists) {
        exists = false;
        for (var k = 0; k < doc.layers.length; k++) {
          if (String(doc.layers[k].name) === layerName + (i === 1 ? "" : " " + i)) exists = true;
        }
        if (exists) i++;
        else break;
      }
      if (i > 1) layerName = layerName + " " + i;
    }
    var layer = gbLayer(layerName, replace == 1);
    // clear previous items on layer
    try {
      for (var i = layer.pathItems.length - 1; i >= 0; i--) layer.pathItems[i].remove();
      for (var i = layer.textFrames.length - 1; i >= 0; i--) layer.textFrames[i].remove();
      for (var i = layer.groupItems.length - 1; i >= 0; i--) layer.groupItems[i].remove();
    } catch (e) {}

    var tiles = BG.bentoLayout(r, style, sections, gutter, seed);
    var opacity = 90;
    var fill = payload.fill || color;
    for (var i = 0; i < tiles.length; i++) {
      gbDrawRect(layer, tiles[i], radius, fill, stroke, strokeWidth, opacity);
    }

    var count = layer.pathItems.length;
    gbRestoreSelection(doc, keep);
    return "OK|" + layer.name + "|" + count + " tiles - " + style;
  } catch (e) { return gbErr(e); }
}

/* ── Finalise ────────────────────────────────────────────── */

function GB_finalise() {
  try {
    if (app.documents.length === 0) return "ERR|Open a document first.";
    var doc = app.activeDocument;
    // rename any Bento grid layer to Final
    var renamed = 0;
    for (var i = 0; i < doc.layers.length; i++) {
      if (String(doc.layers[i].name).indexOf(BG_PREFIX) === 0) {
        try { doc.layers[i].name = BG_PREFIX + "Final"; renamed++; } catch (e) {}
      }
    }
    return "OK|" + renamed + "|Finalised " + renamed + " grid" + (renamed === 1 ? "" : "s");
  } catch (e) { return gbErr(e); }
}

/* ── Clear ───────────────────────────────────────────────── */

function GB_clear() {
  try {
    if (app.documents.length === 0) return "ERR|Open a document first.";
    var doc = app.activeDocument;
    var removed = gbClearLayers(doc);
    try { doc.selection = null; } catch (e) {}
    if (removed === 0) return "OK|0|No OGR Bento grids to clear.";
    return "OK|" + removed + "|Removed " + removed + " grid layer" + (removed === 1 ? "" : "s") + ".";
  } catch (e) { return gbErr(e); }
}

/* ── Guides (convert paths to guides) ────────────────────── */

function GB_makeGuides() {
  try {
    if (app.documents.length === 0) return "ERR|Open a document first.";
    var doc = app.activeDocument;
    var layer = null;
    for (var i = 0; i < doc.layers.length; i++) {
      if (String(doc.layers[i].name).indexOf(BG_PREFIX) === 0) { layer = doc.layers[i]; break; }
    }
    if (!layer) return "ERR|No OGR Bento grid layer found.";
    var count = 0;
    for (var i = 0; i < layer.pathItems.length; i++) {
      try { layer.pathItems[i].guides = true; count++; } catch (e) {}
    }
    return "OK|" + count + "|Converted " + count + " paths to guides.";
  } catch (e) { return gbErr(e); }
}
