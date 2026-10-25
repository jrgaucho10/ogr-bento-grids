(function () {
  "use strict";

  var cs = new CSInterface();
  var STORE_KEY = "ogr.bento.settings.v1";

  var state = {
    doc: null,
    selCount: 0,
    selWidth: 0,
    selHeight: 0,
    unit: "px",
    busy: false,
    refreshing: false,
    lastLayer: null,
    shuffleSeed: 1,
    settings: {
      style: "simple",
      sections: 6,
      radius: 8,
      gutter: 12,
      color: "#8b5cf6",
      stroke: "#ffffff",
      strokeWidth: 0.5,
      target: "selection",
      replace: true
    }
  };

  function $(id) { return document.getElementById(id); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function arg(v) { return '"' + String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; }
  function flag(v) { return v ? 1 : 0; }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.settings)); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      var key;
      for (key in state.settings) {
        if (Object.prototype.hasOwnProperty.call(state.settings, key) &&
            Object.prototype.hasOwnProperty.call(saved, key)) {
          state.settings[key] = saved[key];
        }
      }
    } catch (e) {}
  }

  function evalScript(script) {
    return new Promise(function (resolve, reject) {
      cs.evalScript(script, function (result) {
        var value = result === undefined || result === null ? "" : String(result);
        if (!value || value === "undefined" || value === "null" || value === "EvalScript error.") {
          reject(new Error("Illustrator could not run the script. Is a document open?"));
          return;
        }
        if (value.indexOf("ERR|") === 0) {
          reject(new Error(value.slice(4) || "Illustrator reported an error."));
          return;
        }
        resolve(value);
      });
    });
  }

  function refreshContext() {
    if (state.busy || state.refreshing) return;
    state.refreshing = true;
    evalScript("GB_info()").then(function (res) {
      if (res === "NODOC") { applyDoc(null); return; }
      var p = res.split("|");
      if (p[0] !== "OK") throw new Error(p[1] || "Could not read document.");
      state.doc = { name: p[1], width: num(p[2]), height: num(p[3]), unit: p[4] };
      state.unit = p[4];
      state.selCount = num(p[5]);
      state.selWidth = num(p[6]);
      state.selHeight = num(p[7]);
      applyDoc(state.doc);
    }).catch(function () { applyDoc(state.doc); }).then(function () { state.refreshing = false; });
  }

  function applyDoc(doc) {
    state.doc = doc;
    if (!doc) { state.selCount = 0; state.selWidth = 0; state.selHeight = 0; }
    $("docDot").classList.toggle("live", !!doc);
    $("docName").textContent = doc ? doc.name : "No document";
    var badge = $("selBadge");
    if (!doc) { badge.textContent = "—"; badge.classList.remove("has-sel"); }
    else if (state.selCount > 0) { badge.textContent = state.selCount + (state.selCount === 1 ? " object" : " objects"); badge.classList.add("has-sel"); }
    else { badge.textContent = "No selection"; badge.classList.remove("has-sel"); }

    var notice = $("bentoNotice");
    if (!doc) notice.textContent = "Open a document to begin.";
    else if (state.selCount === 0) notice.textContent = "Draw a rectangle, then select it.";
    else notice.textContent = state.selCount + " object(s) selected.";
    notice.classList.toggle("is-ready", !!doc && state.selCount > 0);

    syncTargetAvailability();
    syncCreateState();
  }

  function syncTargetAvailability() {
    var btn = document.querySelector('[data-group="target"] button[data-value="selection"]');
    if (!btn) return;
    var disabled = !state.doc || state.selCount === 0;
    btn.disabled = disabled;
    if (disabled && state.settings.target === "selection") {
      state.settings.target = "artboard";
      markGroup("target", "artboard");
      save();
    }
  }

  function syncCreateState() {
    var btn = $("createBtn");
    btn.disabled = state.busy || !state.doc;
  }

  function setBusy(busy) {
    state.busy = busy;
    var btn = $("createBtn");
    if (busy) { btn.disabled = true; $("createLabel").textContent = "Working…"; }
    else { $("createLabel").textContent = "Generate grid"; syncCreateState(); }
  }

  function switchNotNeeded() {}

  function markGroup(group, value) {
    var wrap = document.querySelector('[data-group="' + group + '"]');
    if (!wrap) return;
    Array.prototype.forEach.call(wrap.querySelectorAll("button[data-value]"), function (btn) {
      var active = btn.getAttribute("data-value") === value;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function onGroupChange(group, value) {
    var s = state.settings;
    if (group === "style") s.style = value;
    else if (group === "target") s.target = value;
    else if (group === "color") { s.color = value; $("fillColor").value = value; }
    save();
  }

  function updateRange(input) {
    var min = num(input.min); var max = num(input.max); var value = num(input.value);
    var pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
    input.style.setProperty("--range-fill", pct + "%");
    var out = $(input.id + "Out");
    if (out) {
      if (input.id === "sections") out.textContent = Math.round(value);
      else if (input.id === "corners") out.textContent = Math.round(value);
      else if (input.id === "gutter") out.textContent = Math.round(value);
      else if (input.id === "strokeWidth") out.textContent = Number(value).toFixed(1);
    }
  }

  function hydrate() {
    var s = state.settings;
    markGroup("style", s.style);
    markGroup("target", s.target);
    markGroup("color", s.color);
    $("sections").value = s.sections;
    $("corners").value = s.radius;
    $("gutter").value = s.gutter;
    $("strokeWidth").value = s.strokeWidth;
    $("fillColor").value = s.color;
    $("replacePrev").checked = !!s.replace;
    Array.prototype.forEach.call(document.querySelectorAll('input[type="range"]'), updateRange);
  }

  function buildCommand() {
    var s = state.settings;
    if (!state.doc) throw new Error("Open a document first.");
    if (s.target === "selection" && state.selCount === 0) throw new Error("Select a rectangle first, or target the artboard.");
    var payload = {
      style: s.style,
      sections: num(s.sections),
      radius: num(s.radius),
      gutter: num(s.gutter),
      color: s.color,
      stroke: s.stroke,
      strokeWidth: num(s.strokeWidth),
      target: s.target,
      replace: s.replace ? 1 : 0,
      seed: state.shuffleSeed
    };
    return "GB_generate(" + arg(JSON.stringify(payload)) + ")";
  }

  function handleResult(res) {
    var p = res.split("|");
    if (p[0] === "OK") {
      if (p[1]) state.lastLayer = p[1];
      toast(p[2] || "Grid created");
      return;
    }
    toast(p[1] || "Could not create the grid.", true);
  }

  function generate() {
    if (state.busy) return;
    var cmd;
    try { cmd = buildCommand(); }
    catch (e) { toast(e.message, true); return; }
    setBusy(true);
    evalScript(cmd).then(function (res) { handleResult(res); return refreshContext(); })
      .catch(function (e) { toast(e.message || "Could not create the grid.", true); })
      .then(function () { setBusy(false); refreshContext(); });
  }

  function shuffle() {
    state.shuffleSeed = state.shuffleSeed + 1;
    generate();
  }

  function finalise() {
    if (state.busy) return;
    if (!state.doc) { toast("Open a document first.", true); return; }
    setBusy(true);
    evalScript("GB_finalise()").then(function (res) {
      var p = res.split("|");
      if (p[0] === "OK") toast(p[2] || "Finalised");
      else toast(p[1] || "Nothing to finalise.", true);
    }).catch(function (e) { toast(e.message || "Nothing to finalise.", true); })
      .then(function () { setBusy(false); });
  }

  function makeGuides() {
    if (state.busy) return;
    if (!state.doc) { toast("Open a document first.", true); return; }
    setBusy(true);
    evalScript("GB_makeGuides()").then(function (res) {
      var p = res.split("|");
      if (p[0] === "OK") toast(p[2] || "Converted to guides");
      else toast(p[1] || "Could not make guides.", true);
    }).catch(function (e) { toast(e.message || "Could not make guides.", true); })
      .then(function () { setBusy(false); });
  }

  function clearGrids() {
    if (state.busy) return;
    if (!state.doc) { toast("Open a document first.", true); return; }
    setBusy(true);
    evalScript("GB_clear()").then(function (res) {
      var p = res.split("|");
      if (p[0] === "OK") { state.lastLayer = null; toast(p[2] || "Grid layers removed"); }
      else toast(p[1] || "Nothing to clear.", true);
    }).catch(function (e) { toast(e.message || "Nothing to clear.", true); })
      .then(function () { setBusy(false); });
  }

  var toastTimer = 0;
  function toast(message, isError) {
    var el = $("toast");
    el.textContent = message;
    el.classList.toggle("error", !!isError);
    el.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { el.classList.remove("show"); }, isError ? 3800 : 2400);
  }

  function applyTheme() {
    var env = cs.getHostEnvironment();
    var skin = env && env.appSkinInfo;
    var color = skin && skin.panelBackgroundColor && skin.panelBackgroundColor.color;
    var luminance = color ? 0.2126 * color.red + 0.7152 * color.green + 0.0722 * color.blue : 30;
    document.body.classList.toggle("light", luminance > 140);
  }
  function applyPlatform() {
    var isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
    if (isMac) return;
    var key = document.querySelector("#createBtn .key");
    if (key) key.textContent = "Ctrl+↵";
  }

  function bind() {
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (btn) {
      btn.addEventListener("click", function () { /* no tabs */ });
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-group]"), function (group) {
      group.addEventListener("click", function (event) {
        var btn = event.target.closest ? event.target.closest("button[data-value]") : null;
        if (!btn || btn.disabled) return;
        var value = btn.getAttribute("data-value");
        var groupName = group.getAttribute("data-group");
        markGroup(groupName, value);
        onGroupChange(groupName, value);
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('input[type="range"]'), function (input) {
      updateRange(input);
      input.addEventListener("input", function () {
        updateRange(input);
        var s = state.settings;
        var id = input.id;
        if (id === "sections") s.sections = num(input.value);
        else if (id === "corners") s.radius = num(input.value);
        else if (id === "gutter") s.gutter = num(input.value);
        else if (id === "strokeWidth") s.strokeWidth = num(input.value);
        save();
      });
    });

    $("fillColor").addEventListener("input", function (e) {
      var v = e.target.value;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        state.settings.color = v;
        markGroup("color", v);
        save();
      }
    });

    $("replacePrev").addEventListener("change", function (e) {
      state.settings.replace = e.target.checked;
      save();
    });

    $("createBtn").addEventListener("click", generate);
    $("shuffleBtn").addEventListener("click", shuffle);
    $("finaliseBtn").addEventListener("click", finalise);
    $("guidesBtn").addEventListener("click", makeGuides);
    $("clearBtn").addEventListener("click", clearGrids);

    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!$("createBtn").disabled) generate();
      }
    });

    window.addEventListener("focus", refreshContext);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) refreshContext(); });
    cs.addEventListener("com.adobe.csxs.events.ThemeColorChanged", applyTheme);
  }

  function init() {
    load();
    applyTheme();
    applyPlatform();
    bind();
    hydrate();
    refreshContext();
    window.setInterval(refreshContext, 1600);
  }

  init();
})();
