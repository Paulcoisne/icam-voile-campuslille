/* ===== Éditeur de mise en page (onglet « Mise en page ») =====
   - arbre des blocs de la page (glisser-déposer, masquer, filtrer)
   - sélection directe sur la page, déplacement à la souris, double-clic pour écrire
   - panneau de droite : contenu (textes, liens, images), affichage par appareil, style par appareil
   - bibliothèque de blocs, couleurs et polices du site, annuler / rétablir
   Tout est enregistré dans le contenu publié (layout, styles, theme, custom, links, removed, dups, texts, images).
   Le moteur qui applique ces réglages est dans le site (000-core.js) : l'aperçu est la vraie page. */
(function () {
"use strict";
var A = window.ADM;
if (!A) return;
var $ = A.$, esc = A.esc;

var DEVS = { d: { w: 1280, name: "Ordinateur" }, t: { w: 768, name: "Tablette" }, m: { w: 390, name: "Mobile" } };
var OWN = ["layout", "styles", "theme", "custom", "links", "removed", "dups", "texts", "images"];
var S = { page: "index", dev: "d", sel: null, hover: null, open: {}, filter: "", undo: [], redo: [], drag: null, tdrag: null, ck: null, ct: 0 };
var FR = null, W = null, DOC = null, IC = null, built = false, tick = null, keyOn = false, reflow = null;

/* ---------- petits outils ---------- */
function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function C() { return A.C; }
function ensure() {
  var c = C(); c.layout = c.layout || {}; c.layout.order = c.layout.order || {}; c.layout.hide = c.layout.hide || {};
  c.styles = c.styles || {}; c.theme = c.theme || {}; c.custom = c.custom || {}; c.links = c.links || {};
  c.removed = c.removed || []; c.dups = c.dups || []; c.texts = c.texts || {}; c.images = c.images || {};
}
function trunc(t, n) { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; }
function newId() { var c = C(), id; do { id = Math.random().toString(36).slice(2, 7); } while (!/^[a-z0-9]{5}$/.test(id) || c.custom[id] || c.dups.some(function (d) { return d.id === id; })); return id; }
function colorHex(v) {
  v = String(v || "").trim(); if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) return ("#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]).toLowerCase();
  var m = v.match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/);
  if (m) return "#" + [m[1], m[2], m[3]].map(function (n) { return ("0" + (+n).toString(16)).slice(-2); }).join("");
  return "";
}

/* ---------- annuler / rétablir (instantanés des parties modifiées par l'éditeur) ---------- */
function snap() { var o = {}; OWN.forEach(function (k) { o[k] = JSON.stringify(C()[k] === undefined ? null : C()[k]); }); return o; }
function restore(o) { OWN.forEach(function (k) { var v = JSON.parse(o[k]); if (v === null) delete C()[k]; else C()[k] = v; }); ensure(); }
/* À appeler AVANT de modifier le contenu. coalesce : les réglages successifs d'un même champ ne font qu'une étape. */
function push(coalesce) {
  var now = Date.now();
  if (coalesce && S.ck === coalesce && now - S.ct < 1500) { S.ct = now; return; }
  S.ck = coalesce || null; S.ct = now;
  S.undo.push(snap()); if (S.undo.length > 80) S.undo.shift();
  S.redo = []; syncBtns();
}
function undo() { if (!S.undo.length) return; S.redo.push(snap()); restore(S.undo.pop()); S.ck = null; A.dirty(); refresh(); syncBtns(); }
function redo() { if (!S.redo.length) return; S.undo.push(snap()); restore(S.redo.pop()); S.ck = null; A.dirty(); refresh(); syncBtns(); }
function syncBtns() { var u = $("#layUndo"), r = $("#layRedo"); if (u) u.disabled = !S.undo.length; if (r) r.disabled = !S.redo.length; }

/* ---------- blocs de la page ---------- */
function blkEl(k) { return (DOC && k) ? DOC.querySelector('[data-blk="' + String(k).replace(/["\\]/g, "") + '"]') : null; }
function isBlk(e) { return !!(e && e.nodeType === 1 && e.dataset && e.dataset.blk && !e.hasAttribute("data-icv-ui")); }
function inUI(e) { return !!(e && e.closest && e.closest("[data-icv-ui]")); }
function parentCont(e) { var p = e && e.parentElement; return (p && p.hasAttribute("data-cont") && isBlk(p)) ? p : null; }
function kidsOf(cont) { return [].slice.call(cont.children).filter(isBlk); }
function keysOf(cont) { return kidsOf(cont).map(function (k) { return k.dataset.blk; }); }
function removedEl(e) { return !!(e.closest && e.closest(".icv-removed")); }
function vis(e) { var r = e.getBoundingClientRect(); return r.width > 0 || r.height > 0; }
function blkParent(e) { var p = e.parentElement; while (p && !isBlk(p)) p = p.parentElement; return p; }
var TAGN = { P: "Paragraphe", H1: "Grand titre", H2: "Titre", H3: "Sous-titre", H4: "Intertitre", LI: "Élément", ARTICLE: "Carte", FIGURE: "Photo", DETAILS: "Définition", A: "Lien", UL: "Liste", SECTION: "Section", HEADER: "Entrée", MAIN: "Page", DIV: "Bloc", NAV: "Menu", FOOTER: "Pied de page", IMG: "Image" };
var KINDN = { ch: "Page entière", sec: "Chapitre", sp: "Contenu de la section", fact: "Chiffres clés", vx: "Cartes des valeurs", gx: "Colonnes", gc: "Cartes", val: "Valeurs partagées" };
function labelOf(e) {
  if (!e) return "";
  var cb = e.dataset.cb, c = C().custom[cb];
  if (cb && c) return (c.label || (IC && IC.CB[c.type] && IC.CB[c.type].label) || "Bloc ajouté");
  var cp = e.dataset.dup ? " (copie)" : "";
  if (e.dataset.label) return e.dataset.label + cp;
  var t = trunc(e.textContent, 36), n = TAGN[e.tagName] || "Bloc";
  if (e.hasAttribute("data-cont")) n = KINDN[e.dataset.cont] || n;
  return (t && !e.hasAttribute("data-cont") ? n + " · " + t : n) + cp;
}

/* ---------- affichage par appareil ---------- */
function hideState(k) { var h = C().layout.hide[k] || {}; return { d: !!h.d, t: !!h.t, m: !!h.m, any: !!(h.d || h.t || h.m), all: !!(h.d && h.t && h.m) }; }
function setHide(k, dev, v) {
  push("hide:" + k + dev); var H = C().layout.hide;
  H[k] = H[k] || {}; if (v) H[k][dev] = true; else delete H[k][dev];
  if (!Object.keys(H[k]).length) delete H[k];
  A.dirty(); light(); treeUI(); syncHideBoxes();
}
function toggleHideAll(k) {
  push(); var H = C().layout.hide;
  if (hideState(k).any) delete H[k]; else H[k] = { d: true, t: true, m: true };
  A.dirty(); light(); treeUI(); syncHideBoxes();
}

/* ---------- styles par appareil ---------- */
function stGet(k, dev, p) { var s = C().styles[k]; return (s && s[dev] && s[dev][p] != null) ? s[dev][p] : ""; }
function okVal(p, v) {
  v = String(v == null ? "" : v).trim(); if (!v) return true; var t = IC && IC.CSSP[p]; if (!t) return false;
  if (/[;{}<>\\]|url\(|expression|@import/i.test(v)) return false;
  return typeof t === "function" ? !!t(v) : t.test(v);
}
function stSet(k, dev, p, v) {
  push("st:" + k + ":" + dev + ":" + p); var St = C().styles; v = String(v == null ? "" : v).trim();
  if (v === "") {
    if (St[k] && St[k][dev]) { delete St[k][dev][p]; if (!Object.keys(St[k][dev]).length) delete St[k][dev]; if (!Object.keys(St[k]).length) delete St[k]; }
  } else { St[k] = St[k] || {}; St[k][dev] = St[k][dev] || {}; St[k][dev][p] = v; }
  A.dirty(); light();
}

/* ---------- rendu de l'aperçu ---------- */
function preview() { return Object.assign({}, C(), { hidden: [] }); }
function render() { if (W && W.__icv) { try { W.__icv.render(preview()); } catch (e) { if (window.console) console.error(e); } } }
function light() { if (W && W.__icv) { try { W.__icv.layout(preview()); } catch (e) { if (window.console) console.error(e); } } overlays(); }
function refresh() { ensure(); render(); treeUI(); inspector(); overlays(); }
function commit(msg) { A.dirty(); refresh(); if (msg) A.toast(msg); }
/* ---------- opérations sur la structure ---------- */
function scrollToSel() { var e = blkEl(S.sel); if (e && W) { var r = e.getBoundingClientRect(); if (r.top < 60 || r.bottom > W.innerHeight - 20) e.scrollIntoView({ block: "center" }); } overlays(); }
function moveBlock(key, contKey, beforeKey) {
  var src = blkEl(key), cont = blkEl(contKey); if (!src || !cont || src === cont || src.contains(cont)) return;
  var oldCont = parentCont(src), keys = keysOf(cont).filter(function (k) { return k !== key; });
  var idx = beforeKey ? keys.indexOf(beforeKey) : keys.length; if (idx < 0) idx = keys.length;
  keys.splice(idx, 0, key);
  var same = oldCont === cont;
  if (same && keysOf(cont).join("|") === keys.join("|")) return;
  push(); ensure();
  if (oldCont && !same) { var ok = oldCont.dataset.blk, ol = C().layout.order[ok]; if (ol) C().layout.order[ok] = ol.filter(function (k) { return k !== key; }); }
  C().layout.order[contKey] = keys;
  S.sel = key; commit(); scrollToSel();
}
function step(key, dir) {
  var e = blkEl(key), pc = parentCont(e);
  if (!pc) { A.toast("Ce bloc ne se déplace pas seul : sélectionnez le bloc qui le contient.", true); return; }
  var keys = keysOf(pc), i = keys.indexOf(key), j = i + dir;
  while (j >= 0 && j < keys.length && removedEl(blkEl(keys[j]))) j += dir;
  if (j < 0 || j >= keys.length) return;
  push(); ensure(); keys.splice(i, 1); keys.splice(j, 0, key); C().layout.order[pc.dataset.blk] = keys; commit(); scrollToSel();
}
function del(key) {
  var e = blkEl(key); if (!e) return;
  if (e.tagName === "MAIN") { A.toast("La page entière ne peut pas être supprimée.", true); return; }
  push(); ensure(); var c = C();
  if (e.dataset.cb) {
    var id = e.dataset.cb; delete c.custom[id];
    Object.keys(c.texts).forEach(function (t) { if (t.indexOf("cb." + id + ".") === 0) delete c.texts[t]; });
    Object.keys(c.images).forEach(function (t) { if (t.indexOf("cb." + id + ".") === 0) delete c.images[t]; });
    Object.keys(c.layout.order).forEach(function (o) { c.layout.order[o] = c.layout.order[o].filter(function (k) { return k !== key; }); });
  } else if (e.dataset.dup) {
    c.dups = c.dups.filter(function (d) { return d.id !== e.dataset.dup; });
    Object.keys(c.layout.order).forEach(function (o) { c.layout.order[o] = c.layout.order[o].filter(function (k) { return k !== key; }); });
  } else if (c.removed.indexOf(key) < 0) c.removed.push(key);
  S.sel = null; commit("Bloc supprimé. Vous pouvez le rétablir sous la liste de gauche (Annuler fonctionne aussi).");
}
function dup(key) {
  var e = blkEl(key); if (!e) return; if (e.tagName === "MAIN") return; ensure(); var c = C(), pc = parentCont(e), ck = pc && pc.dataset.blk;
  if (e.dataset.cb) {
    var o = c.custom[e.dataset.cb]; if (!o) return; push(); var id = newId();
    c.custom[id] = JSON.parse(JSON.stringify(o)); c.custom[id].label = (o.label || (IC.CB[o.type] || {}).label || "Bloc") + " (copie)";
    ["texts", "images"].forEach(function (g) { Object.keys(c[g]).slice().forEach(function (t) { if (t.indexOf("cb." + e.dataset.cb + ".") === 0) c[g]["cb." + id + "." + t.slice(("cb." + e.dataset.cb + ".").length)] = c[g][t]; }); });
    var par = blkEl(o.parent), keys = par ? keysOf(par) : [], i = keys.indexOf(key); keys.splice(i < 0 ? keys.length : i + 1, 0, "blk.cb." + id); c.layout.order[o.parent] = keys;
    S.sel = "blk.cb." + id; commit("Bloc dupliqué."); scrollToSel(); return;
  }
  if (e.id || e.querySelector("[id]")) { A.toast("Ce bloc contient des éléments uniques (ancres, simulateurs) : il ne peut pas être dupliqué.", true); return; }
  push(); var nid = newId(); c.dups.push({ id: nid, src: key, after: key });
  if (ck && c.layout.order[ck]) { var l = c.layout.order[ck], p = l.indexOf(key); l.splice(p < 0 ? l.length : p + 1, 0, key + "~" + nid); }
  S.sel = key + "~" + nid; commit("Bloc dupliqué : modifiez son texte."); scrollToSel();
}
var LIB = [
  ["title", "Titre", "Un intertitre"], ["text", "Paragraphe", "Un texte libre"], ["image", "Image", "Photo avec légende"], ["button", "Bouton", "Texte et lien"], ["callout", "Encadré", "Titre et message"],
  ["columns", "Deux colonnes", "Deux textes côte à côte"], ["video", "Vidéo YouTube", "Lecteur intégré"], ["space", "Espace vide", "Aère la page"], ["divider", "Séparateur", "Ligne de séparation"], ["section", "Section complète", "Nouvelle section avec titre"]
];
function addBlock(type, parentKey, afterKey) {
  var par = blkEl(parentKey), T = IC.CB[type]; if (!par || !T) return; push(); ensure(); var c = C(), id = newId();
  c.custom[id] = { type: type, parent: parentKey, label: T.label, props: {} };
  var keys = keysOf(par).filter(function (k) { return k !== "blk.cb." + id; }), i = afterKey ? keys.indexOf(afterKey) : -1;
  keys.splice(i < 0 ? keys.length : i + 1, 0, "blk.cb." + id); c.layout.order[parentKey] = keys;
  S.sel = "blk.cb." + id; commit("Bloc ajouté : modifiez-le à droite ou directement sur la page."); scrollToSel();
  var ne = blkEl(S.sel); if (ne) ne.scrollIntoView({ block: "center" });
}

/* ---------- arbre des blocs ---------- */
function nodes(root) {
  var out = { kids: [] };
  (function walk(par, node) {
    [].slice.call(par.children).forEach(function (c) {
      if (c.hasAttribute("data-icv-ui") || c.tagName === "SCRIPT" || c.tagName === "STYLE") return;
      if (isBlk(c)) { var n = { el: c, key: c.dataset.blk, kids: [] }; node.kids.push(n); walk(c, n); } else walk(c, node);
    });
  })(root, out);
  /* éléments hors <main> (menu, pied de page) : regroupés, ils sont communs aux pages */
  var mains = out.kids.filter(function (n) { return n.el.tagName === "MAIN"; }), others = out.kids.filter(function (n) { return n.el.tagName !== "MAIN"; });
  if (others.length) mains.push({ el: null, key: "__common", label: "Menu et pied de page (communs aux pages)", kids: others });
  return mains;
}
function row(n, depth, open) {
  var e = n.el, r = el("div", "tr");
  if (!e) { r.className = "tr grp"; r.dataset.k = n.key; r.style.paddingLeft = (4 + depth * 14) + "px"; r.innerHTML = '<button class="ar" tabindex="-1">' + (open ? "▾" : "▸") + '</button><span class="nm"><i>' + esc(n.label) + '</i></span>'; return r; }
  var k = n.key, hs = hideState(k); r.className = "tr" + (S.sel === k ? " sel" : "") + (hs.all ? " hid" : "");
  r.dataset.k = k; r.style.paddingLeft = (4 + depth * 14) + "px"; r.draggable = !!parentCont(e);
  var lb = labelOf(e);
  r.innerHTML = '<button class="ar' + (n.kids.length ? "" : " no") + '" tabindex="-1" aria-label="' + (open ? "Replier" : "Déplier") + '">' + (open ? "▾" : "▸") + '</button><span class="nm" title="' + esc(lb) + '">' + esc(lb) + '</span>' +
    (e.dataset.cb ? '<span class="kd cb">ajouté</span>' : "") + (e.dataset.dup ? '<span class="kd dp">copie</span>' : "") +
    (e.tagName === "MAIN" ? "" : '<button class="eye' + (hs.any ? " on" : "") + '" tabindex="-1" title="' + (hs.any ? "Afficher de nouveau" : "Masquer sur tous les écrans") + '">' + (hs.any ? "⊘" : "◉") + '</button>');
  return r;
}
function treeUI() {
  var rows = $("#layRows"); if (!rows) return; var box = $("#layTree"), top = box.scrollTop; rows.innerHTML = "";
  if (!DOC) return;
  var q = (S.filter || "").toLowerCase().trim();
  function lab(n) { return n.el ? labelOf(n.el).toLowerCase() : String(n.label || "").toLowerCase(); }
  function any(n) { return lab(n).indexOf(q) >= 0 || n.kids.some(any); }
  (function walk(list, depth) {
    list.forEach(function (n) {
      if (n.el && removedEl(n.el)) return; if (q && !any(n)) return;
      var open = q ? true : (S.open[n.key] !== undefined ? S.open[n.key] : (n.key === "__common" ? false : depth < 2));
      rows.appendChild(row(n, depth, open)); if (open) walk(n.kids, depth + 1);
    });
  })(nodes(DOC.body), 0);
  box.scrollTop = top; removedUI();
}
function removedUI() {
  var b = $("#layRm"); if (!b) return; var R = (C().removed || []).filter(function (k) { return blkEl(k); }); b.innerHTML = ""; b.style.display = R.length ? "block" : "none"; if (!R.length) return;
  b.appendChild(el("b", null, "Blocs supprimés (" + R.length + ")"));
  R.forEach(function (k) { var x = el("button", "btn sec sm", "Rétablir « " + esc(trunc(labelOf(blkEl(k)), 26)) + " »"); x.style.cssText = "display:flex;margin-top:6px;width:100%"; x.onclick = function () { push(); C().removed = C().removed.filter(function (y) { return y !== k; }); commit(); }; b.appendChild(x); });
}
function openPathTo(k) { var e = blkEl(k); while (e) { var p = blkParent(e); if (!p) break; S.open[p.dataset.blk] = true; e = p; } }
function clearInd() { var rows = $("#layRows"); if (rows) [].forEach.call(rows.querySelectorAll(".drop-before,.drop-after,.drop-into"), function (x) { x.classList.remove("drop-before", "drop-after", "drop-into"); }); }
function dropAt(r, e) {
  var src = blkEl(S.tdrag), tg = blkEl(r.dataset.k); if (!src || !tg || src === tg || src.contains(tg)) return null;
  var pcs = parentCont(src), kind = pcs && pcs.dataset.cont; if (!kind) return null;
  var b = r.getBoundingClientRect(), y = (e.clientY - b.top) / b.height;
  if (tg.hasAttribute("data-cont") && tg.dataset.cont === kind && y > .25 && y < .75) return { cls: "drop-into", cont: tg.dataset.blk, before: null };
  var pc = parentCont(tg); if (!pc || pc.dataset.cont !== kind) return null;
  if (y < .5) return { cls: "drop-before", cont: pc.dataset.blk, before: tg.dataset.blk };
  var nx = tg.nextElementSibling; while (nx && (!isBlk(nx) || nx === src)) nx = nx.nextElementSibling;
  return { cls: "drop-after", cont: pc.dataset.blk, before: nx ? nx.dataset.blk : null };
}
function bindTree() {
  var rows = $("#layRows");
  rows.addEventListener("click", function (e) {
    var r = e.target.closest(".tr"); if (!r) return; var k = r.dataset.k;
    if (e.target.closest(".ar")) { var open = r.querySelector(".ar").textContent === "▾"; S.open[k] = !open; treeUI(); return; }
    if (e.target.closest(".eye")) { toggleHideAll(k); return; }
    if (r.classList.contains("grp")) { S.open[k] = !(S.open[k]); treeUI(); return; }
    selectKey(k, { scroll: true });
  });
  rows.addEventListener("mouseover", function (e) { var r = e.target.closest(".tr"); var k = r && !r.classList.contains("grp") ? r.dataset.k : null; if (k !== S.hover) { S.hover = k; overlays(); } });
  rows.addEventListener("mouseleave", function () { S.hover = null; overlays(); });
  rows.addEventListener("dragstart", function (e) { var r = e.target.closest && e.target.closest(".tr"); if (!r || !r.draggable) { e.preventDefault(); return; } S.tdrag = r.dataset.k; e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", S.tdrag); } catch (x) {} r.classList.add("dragging"); });
  rows.addEventListener("dragover", function (e) { if (!S.tdrag) return; clearInd(); var r = e.target.closest(".tr"); if (!r || r.classList.contains("grp")) return; var t = dropAt(r, e); if (!t) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; r.classList.add(t.cls); });
  rows.addEventListener("drop", function (e) { if (!S.tdrag) return; clearInd(); var r = e.target.closest(".tr"); if (!r || r.classList.contains("grp")) return; var t = dropAt(r, e); if (!t) return; e.preventDefault(); var k = S.tdrag; S.tdrag = null; moveBlock(k, t.cont, t.before); });
  rows.addEventListener("dragend", function () { S.tdrag = null; clearInd(); [].forEach.call(rows.querySelectorAll(".dragging"), function (x) { x.classList.remove("dragging"); }); });
  $("#layFilter").addEventListener("input", function () { S.filter = this.value; treeUI(); });
}

/* ---------- sélection, survol, repères sur la page ---------- */
function selectKey(k, opt) {
  opt = opt || {}; var prev = S.sel; S.sel = k || null;
  if (S.sel) openPathTo(S.sel);
  treeUI(); if (prev !== S.sel || opt.force) inspector(); overlays();
  if (S.sel && opt.scroll) scrollToSel();
  var r = S.sel && $("#layRows") && $("#layRows").querySelector('.tr[data-k="' + S.sel.replace(/["\\]/g, "") + '"]'); if (r && r.scrollIntoView) r.scrollIntoView({ block: "nearest" });
}
var UICSS = "html{scroll-behavior:auto!important}#icv-ui{position:absolute;left:0;top:0;width:0;height:0;z-index:2147483000;font:600 12px/1.2 Arial,sans-serif}" +
  "#icv-ui .ov{position:absolute;pointer-events:none;box-sizing:border-box;display:none}" +
  "#icv-ui .hov{border:2px solid #2f7fff;background:rgba(47,127,255,.07)}" +
  "#icv-ui .hov .tag{position:absolute;left:-2px;top:-21px;background:#2f7fff;color:#fff;padding:3px 7px;border-radius:4px 4px 0 0;white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis}" +
  "#icv-ui .hov.in .tag{top:0;border-radius:0 0 4px 0}" +
  "#icv-ui .sel{border:2px solid #ff7a2f;box-shadow:inset 0 0 0 1px rgba(255,255,255,.75)}" +
  "#icv-ui .bar{position:absolute;left:-2px;top:-35px;display:flex;gap:2px;background:#0b2a45;border-radius:6px;padding:3px;pointer-events:auto;box-shadow:0 6px 18px rgba(0,0,0,.35);white-space:nowrap}" +
  "#icv-ui .bar.in{top:4px;left:4px}" +
  "#icv-ui .bar button{border:0;border-radius:4px;background:#fff;color:#0b2a45;font:700 11px Arial,sans-serif;padding:5px 7px;cursor:pointer}" +
  "#icv-ui .bar button:hover{background:#ffe3d0}#icv-ui .bar button.del{background:#ffdcd6;color:#9b1c10}#icv-ui .bar button.mv{cursor:grab;background:#ff7a2f}" +
  "#icv-ui .bar .nm{color:#c9d8e6;padding:0 6px;align-self:center;max-width:170px;overflow:hidden;text-overflow:ellipsis}" +
  "#icv-ui .drop{background:#ff7a2f;border-radius:2px;box-shadow:0 0 0 2px rgba(255,255,255,.8)}" +
  "#icv-ui .ghost{position:fixed;display:none;background:#0b2a45;color:#fff;padding:4px 9px;border-radius:5px;pointer-events:none;box-shadow:0 6px 18px rgba(0,0,0,.35)}" +
  "body.icv-dragging,body.icv-dragging *{cursor:grabbing!important;user-select:none!important}.icv-dragsrc{opacity:.35!important}" +
  "[data-edit][contenteditable=true]{outline:2px solid #ff7a2f!important;outline-offset:2px;background:rgba(255,236,190,.35);cursor:text!important}";
function ensureUI() {
  if (DOC.getElementById("icv-ui")) return;
  var st = DOC.createElement("style"); st.id = "icv-ui-css"; st.textContent = UICSS; DOC.head.appendChild(st);
  var ui = DOC.createElement("div"); ui.id = "icv-ui"; ui.setAttribute("data-icv-ui", "1");
  ui.innerHTML = '<div class="ov hov" id="ovH"><span class="tag"></span></div><div class="ov sel" id="ovS"><div class="bar" id="ovBar"><b class="nm"></b>' +
    '<button class="mv" data-a="move" title="Maintenez et glissez pour déplacer ce bloc">⠿ Déplacer</button><button data-a="up" title="Sélectionner le bloc qui contient celui-ci">Parent</button>' +
    '<button data-a="prev" title="Monter d\'un cran (Alt + ↑)">▲</button><button data-a="next" title="Descendre d\'un cran (Alt + ↓)">▼</button>' +
    '<button data-a="dup" title="Dupliquer (Ctrl + D)">Dupliquer</button><button data-a="hide" title="Masquer / afficher sur cet appareil">Masquer</button><button class="del" data-a="del" title="Supprimer (Suppr)">Supprimer</button></div></div>' +
    '<div class="ov drop" id="ovD"></div><div class="ghost" id="ovG"></div>';
  DOC.body.appendChild(ui);
}
function place(ov, e) {
  var r = e.getBoundingClientRect(); ov.style.display = "block";
  ov.style.left = (r.left + W.scrollX) + "px"; ov.style.top = (r.top + W.scrollY) + "px"; ov.style.width = r.width + "px"; ov.style.height = r.height + "px"; return r;
}
function overlays() {
  if (!DOC || !DOC.getElementById("icv-ui")) return;
  var os = DOC.getElementById("ovS"), oh = DOC.getElementById("ovH"), s = S.sel && blkEl(S.sel), h = S.hover && blkEl(S.hover);
  if (s && !removedEl(s) && vis(s)) {
    var r = place(os, s), bar = os.querySelector(".bar"); bar.classList.toggle("in", r.top < 42);
    os.querySelector(".nm").textContent = trunc(labelOf(s), 22);
    var hb = bar.querySelector('[data-a="hide"]'), hs = hideState(S.sel)[S.dev]; hb.textContent = hs ? "Afficher" : "Masquer";
    bar.querySelector('[data-a="move"]').style.display = parentCont(s) ? "" : "none";
    bar.querySelector('[data-a="prev"]').style.display = bar.querySelector('[data-a="next"]').style.display = parentCont(s) ? "" : "none";
    bar.querySelector('[data-a="up"]').style.display = blkParent(s) ? "" : "none";
  } else os.style.display = "none";
  if (h && h !== s && !S.drag && !removedEl(h) && vis(h)) { var q = place(oh, h); oh.classList.toggle("in", q.top < 24); oh.querySelector(".tag").textContent = labelOf(h); } else oh.style.display = "none";
}
function ovAction(a) {
  var k = S.sel; if (!k) return;
  if (a === "up") { var p = blkParent(blkEl(k)); if (p) selectKey(p.dataset.blk, { scroll: false }); }
  else if (a === "prev") step(k, -1); else if (a === "next") step(k, 1);
  else if (a === "dup") dup(k); else if (a === "del") del(k);
  else if (a === "hide") setHide(k, S.dev, !hideState(k)[S.dev]);
}

/* ---------- glisser un bloc directement sur la page ---------- */
function startPageDrag(ev) {
  var e = blkEl(S.sel), pc = e && parentCont(e); if (!e || !pc) return;
  ev.preventDefault(); ev.stopPropagation();
  S.drag = { key: S.sel, el: e, kind: pc.dataset.cont, x: ev.clientX, y: ev.clientY, t: null };
  DOC.body.classList.add("icv-dragging"); e.classList.add("icv-dragsrc");
  try { ev.target.setPointerCapture(ev.pointerId); } catch (x) {}
  var g = DOC.getElementById("ovG"); g.textContent = "⠿ " + trunc(labelOf(e), 30); g.style.display = "block"; moveGhost();
  DOC.addEventListener("pointermove", dragMove, true); DOC.addEventListener("pointerup", dragEnd, true); DOC.addEventListener("pointercancel", cancelDrag, true);
  W.requestAnimationFrame(dragLoop);
}
function moveGhost() { var g = DOC.getElementById("ovG"); if (g && S.drag) { g.style.left = (S.drag.x + 14) + "px"; g.style.top = (S.drag.y + 12) + "px"; } }
function dragMove(e) { if (!S.drag) return; S.drag.x = e.clientX; S.drag.y = e.clientY; moveGhost(); }
function dragLoop() {
  if (!S.drag) return; var d = S.drag, h = W.innerHeight;
  if (d.y < 90) W.scrollBy(0, -Math.ceil((90 - d.y) / 4)); else if (d.y > h - 90) W.scrollBy(0, Math.ceil((d.y - (h - 90)) / 4));
  dragTarget(); W.requestAnimationFrame(dragLoop);
}
function dragTarget() {
  var d = S.drag, x = d.x, y = d.y, best = null;
  var conts = [].slice.call(DOC.querySelectorAll('[data-cont="' + d.kind + '"]')).filter(function (c) { return c !== d.el && !d.el.contains(c) && isBlk(c) && !removedEl(c) && vis(c); });
  conts.forEach(function (c) { var r = c.getBoundingClientRect(); if (x >= r.left - 10 && x <= r.right + 10 && y >= r.top - 10 && y <= r.bottom + 10) { var a = r.width * r.height; if (!best || a < best.a) best = { c: c, a: a, r: r }; } });
  if (!best) { var md = 1e9; conts.forEach(function (c) { var r = c.getBoundingClientRect(), dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom), dd = Math.hypot(dx, dy); if (dd < md) { md = dd; best = { c: c, r: r }; } }); if (md > 200) best = null; }
  var line = DOC.getElementById("ovD");
  if (!best) { d.t = null; line.style.display = "none"; return; }
  var kids = kidsOf(best.c).filter(function (k) { return k !== d.el && !removedEl(k) && vis(k); }), ln;
  if (!kids.length) { d.t = { cont: best.c.dataset.blk, before: null }; ln = { v: false, x: best.r.left, y: best.r.top + 4, w: best.r.width, h: 0 }; }
  else {
    var near = null, nd = 1e12;
    kids.forEach(function (k) { var r = k.getBoundingClientRect(), dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom), dd = dx * dx + dy * dy; if (dd < nd) { nd = dd; near = k; } });
    var r = near.getBoundingClientRect();
    var rowish = kids.some(function (k) { if (k === near) return false; var q = k.getBoundingClientRect(); return Math.abs(q.top - r.top) < Math.min(q.height, r.height) * .5; });
    var after = rowish ? (x > r.left + r.width / 2) : (y > r.top + r.height / 2), idx = kids.indexOf(near) + (after ? 1 : 0), bf = idx < kids.length ? kids[idx] : null;
    d.t = { cont: best.c.dataset.blk, before: bf ? bf.dataset.blk : null };
    ln = rowish ? { v: true, x: after ? r.right : r.left, y: r.top, h: r.height } : { v: false, x: r.left, y: after ? r.bottom : r.top, w: r.width };
  }
  line.style.display = "block";
  if (ln.v) { line.style.left = (ln.x + W.scrollX - 2) + "px"; line.style.top = (ln.y + W.scrollY) + "px"; line.style.width = "4px"; line.style.height = ln.h + "px"; }
  else { line.style.left = (ln.x + W.scrollX) + "px"; line.style.top = (ln.y + W.scrollY - 2) + "px"; line.style.width = ln.w + "px"; line.style.height = "4px"; }
}
function endDrag() {
  DOC.removeEventListener("pointermove", dragMove, true); DOC.removeEventListener("pointerup", dragEnd, true); DOC.removeEventListener("pointercancel", cancelDrag, true);
  DOC.body.classList.remove("icv-dragging"); if (S.drag && S.drag.el) S.drag.el.classList.remove("icv-dragsrc");
  ["ovG", "ovD"].forEach(function (i) { var n = DOC.getElementById(i); if (n) n.style.display = "none"; });
  var d = S.drag; S.drag = null; return d;
}
function dragEnd() { var d = endDrag(); if (d && d.t) moveBlock(d.key, d.t.cont, d.t.before); overlays(); }
function cancelDrag() { endDrag(); overlays(); }
/* ---------- événements dans la page (aperçu) ---------- */
function onMove(e) {
  if (S.drag || inUI(e.target)) return;
  var b = e.target.closest && e.target.closest("[data-blk]"), k = b ? b.dataset.blk : null;
  if (k !== S.hover) { S.hover = k; overlays(); }
}
function onClick(e) {
  var ui = e.target.closest && e.target.closest("[data-icv-ui]");
  if (ui) { var bt = e.target.closest("button[data-a]"); e.preventDefault(); e.stopPropagation(); if (bt && bt.dataset.a !== "move") ovAction(bt.dataset.a); return; }
  var ed = e.target.closest && e.target.closest("[data-edit][contenteditable=true]");
  if (ed) { if (e.target.closest("a")) e.preventDefault(); return; }
  e.preventDefault(); e.stopPropagation();
  var b = e.target.closest && e.target.closest("[data-blk]");
  if (b) selectKey(b.dataset.blk, { scroll: false }); else selectKey(null);
}
function onDbl(e) { if (inUI(e.target)) return; var t = e.target.closest && e.target.closest("[data-edit]"); if (t) { e.preventDefault(); startTextEdit(t); } }
function startTextEdit(t) {
  if (t.isContentEditable) return;
  var key = t.dataset.edit; t.contentEditable = "true"; t.spellcheck = true; t.focus();
  function inp() { push("tx:" + key); var h = W.__icv.sanitize(t.innerHTML).replace(/&nbsp;| /g, " "); if (A.norm(h) === A.defHtml(key)) delete C().texts[key]; else C().texts[key] = h; A.dirty(); overlays(); }
  function kd(e) { if (e.key === "Enter") { e.preventDefault(); DOC.execCommand("insertLineBreak"); } else if (e.key === "Escape") { e.stopPropagation(); t.blur(); } }
  function pst(e) { e.preventDefault(); var x = (e.clipboardData || W.clipboardData).getData("text/plain"); DOC.execCommand("insertText", false, x); }
  function end() { t.removeAttribute("contenteditable"); t.removeEventListener("input", inp); t.removeEventListener("keydown", kd); t.removeEventListener("paste", pst); t.removeEventListener("blur", end); inspector(); overlays(); }
  t.addEventListener("input", inp); t.addEventListener("keydown", kd); t.addEventListener("paste", pst); t.addEventListener("blur", end);
}
function onKey(e) {
  var t = e.target, tag = (t.tagName || "").toLowerCase(), typing = t.isContentEditable || tag === "input" || tag === "textarea" || tag === "select";
  var mod = e.ctrlKey || e.metaKey, kk = (e.key || "").toLowerCase();
  if (mod && !typing && kk === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (mod && !typing && kk === "y") { e.preventDefault(); redo(); return; }
  if (typing) return;
  if (e.key === "Escape") { if (S.drag) cancelDrag(); else selectKey(null); return; }
  if (!S.sel) return;
  if (e.key === "Delete") { e.preventDefault(); del(S.sel); }
  else if (mod && kk === "d") { e.preventDefault(); dup(S.sel); }
  else if (e.altKey && e.key === "ArrowUp") { e.preventDefault(); step(S.sel, -1); }
  else if (e.altKey && e.key === "ArrowDown") { e.preventDefault(); step(S.sel, 1); }
}
function setup() {
  IC = W.__icv.ICV; ensureUI();
  DOC.addEventListener("pointermove", onMove, true); DOC.addEventListener("click", onClick, true); DOC.addEventListener("dblclick", onDbl, true);
  DOC.addEventListener("submit", function (e) { e.preventDefault(); }, true); DOC.addEventListener("keydown", onKey, true);
  DOC.addEventListener("scroll", overlays, true); W.addEventListener("resize", overlays);
  DOC.addEventListener("mouseleave", function () { S.hover = null; overlays(); });
  DOC.getElementById("ovBar").addEventListener("pointerdown", function (e) { var b = e.target.closest("button"); if (!b) return; if (b.dataset.a === "move") startPageDrag(e); }, true);
}

/* ---------- chargement et mise à l'échelle de l'aperçu ---------- */
function loadFrame() {
  var f = A.pageFile(S.page); S.sel = null; S.hover = null; DOC = null; W = null; treeUI(); inspector();
  FR.onload = function () {
    W = FR.contentWindow; DOC = FR.contentDocument;
    Promise.resolve(W.__icvReady).then(function () {
      setTimeout(function () {
        if (!W || !W.__icv) { A.toast("Impossible de charger la page dans l'éditeur.", true); return; }
        setup(); ensure(); render(); treeUI(); inspector(); fit(); overlays();
      }, 150);
    });
  };
  FR.src = "/" + (f === "index.html" ? "" : f) + "?edition=" + Date.now();
}
function fit() {
  var st = $("#layStage"), wrap = $("#layScale"); if (!st || !st.clientWidth || !FR) return;
  var w = DEVS[S.dev].w, k = Math.min(1, (st.clientWidth - 12) / w), H = Math.max(300, st.clientHeight - 6);
  wrap.style.width = Math.round(w * k) + "px"; wrap.style.height = H + "px";
  FR.style.width = w + "px"; FR.style.height = Math.round(H / k) + "px"; FR.style.transform = "scale(" + k + ")";
  clearTimeout(reflow); reflow = setTimeout(overlays, 250);
}

/* ---------- panneau de droite : contenu, affichage, style ---------- */
function fld(lbl, ctrl) { var l = el("label", null, esc(lbl)); l.appendChild(ctrl); return l; }
function rowOf(cls, kids) { var r = el("div", "row" + (cls ? " " + cls : "")); kids.forEach(function (k) { r.appendChild(k); }); return r; }
function contLabel(c) { if (c.dataset.label) return c.dataset.label; var p = blkParent(c); return p ? labelOf(p) : labelOf(c); }
function colorOf(v) { v = String(v || ""); if (/rgba\([^)]*,\s*0\)\s*$/.test(v) || v === "transparent") return ""; return colorHex(v); }
function inText(k, p, ph) {
  var i = el("input"); i.type = "text"; i.value = stGet(k, S.dev, p); i.placeholder = ph || "";
  i.oninput = function () { var ok = okVal(p, i.value); i.classList.toggle("bad", !ok); if (ok) stSet(k, S.dev, p, i.value); };
  return i;
}
function inSel(k, p, opts) {
  var s = el("select"); s.innerHTML = '<option value="">(par défaut)</option>' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join("");
  s.value = stGet(k, S.dev, p); s.onchange = function () { stSet(k, S.dev, p, s.value); }; return s;
}
function inColor(k, p, cs) {
  var w = el("div", "colr"), c = el("input"), t = el("input"), x = el("button", "x", "×"), cur = stGet(k, S.dev, p);
  c.type = "color"; t.type = "text"; x.type = "button"; x.title = "Revenir à la valeur d'origine"; t.value = cur; t.placeholder = colorOf(cs[p]) || "d'origine"; c.value = colorHex(cur) || colorOf(cs[p]) || "#000000";
  c.oninput = function () { t.value = c.value; t.classList.remove("bad"); stSet(k, p === "color" || true ? S.dev : S.dev, p, c.value); };
  t.oninput = function () { var ok = okVal(p, t.value); t.classList.toggle("bad", !ok); if (ok) { stSet(k, S.dev, p, t.value); var hx = colorHex(t.value); if (hx) c.value = hx; } };
  x.onclick = function () { t.value = ""; t.classList.remove("bad"); stSet(k, S.dev, p, ""); c.value = colorOf(cs[p]) || "#000000"; };
  w.appendChild(c); w.appendChild(t); w.appendChild(x); return w;
}
function inAlign(k) {
  var w = el("div", "al"), cur = stGet(k, S.dev, "text-align");
  [["left", "Gauche"], ["center", "Centre"], ["right", "Droite"], ["justify", "Justifié"]].forEach(function (o) {
    var b = el("button", cur === o[0] ? "on" : "", o[1]); b.type = "button"; b.title = "Texte aligné : " + o[1].toLowerCase();
    b.onclick = function () { var on = b.classList.contains("on"); [].forEach.call(w.children, function (x) { x.classList.remove("on"); }); if (!on) b.classList.add("on"); stSet(k, S.dev, "text-align", on ? "" : o[0]); };
    w.appendChild(b);
  });
  return w;
}
function inPad4(k, pre, cs) {
  var w = el("div", "pad4"); ["top", "right", "bottom", "left"].forEach(function (s) { var p = pre + "-" + s, i = inText(k, p, cs.getPropertyValue(p)); i.title = (pre === "margin" ? "Marge " : "Marge intérieure ") + { top: "du haut", right: "de droite", bottom: "du bas", left: "de gauche" }[s]; w.appendChild(i); });
  return w;
}
function grp(title, open, build) {
  var d = el("details"); d.open = S.gopen && S.gopen[title] !== undefined ? S.gopen[title] : !!open;
  d.appendChild(el("summary", null, esc(title))); var inn = el("div", "in"); build(inn); d.appendChild(inn);
  d.addEventListener("toggle", function () { S.gopen = S.gopen || {}; S.gopen[title] = d.open; }); return d;
}
var WEIGHTS = [["400", "Normal"], ["500", "Moyen"], ["600", "Demi-gras"], ["700", "Gras"], ["800", "Extra-gras"]];
function styleUI(k, e) {
  var cs = W.getComputedStyle(e), wrap = el("div"), dev = S.dev;
  var sc = el("div", "scope", dev === "d" ? "<b>Ordinateur</b> : ces réglages valent pour tous les écrans, sauf si l'appareil Tablette ou Mobile les remplace." : "<b>" + DEVS[dev].name + "</b> : ces réglages s'ajoutent à ceux d'Ordinateur et ne valent que sur cet appareil. Changez d'appareil avec les boutons au-dessus de la page.");
  var sb = el("div", "ib"); sb.appendChild(sc);
  var hasText = !!(e.textContent || "").trim(), hasImg = !!(e.tagName === "IMG" || e.tagName === "FIGURE" || e.querySelector("img")), hasKids = e.children.length > 0;
  var fonts = Object.keys(IC.FONTS).map(function (n) { return [n, n]; });
  wrap.appendChild(sb);
  wrap.appendChild(grp("Texte", hasText, function (b) {
    b.appendChild(rowOf("", [fld("Police", inSel(k, "font-family", fonts)), fld("Taille", inText(k, "font-size", cs.fontSize))]));
    b.appendChild(rowOf("c3", [fld("Graisse", inSel(k, "font-weight", WEIGHTS)), fld("Style", inSel(k, "font-style", [["normal", "Normal"], ["italic", "Italique"]])), fld("Casse", inSel(k, "text-transform", [["none", "Normale"], ["uppercase", "MAJUSCULES"], ["lowercase", "minuscules"], ["capitalize", "Initiales"]]))]));
    b.appendChild(rowOf("", [fld("Couleur du texte", inColor(k, "color", cs)), fld("Alignement", inAlign(k))]));
    b.appendChild(rowOf("c3", [fld("Interligne", inText(k, "line-height", cs.lineHeight === "normal" ? "1.4" : "")), fld("Lettres", inText(k, "letter-spacing", cs.letterSpacing)), fld("Décor", inSel(k, "text-decoration", [["none", "Aucun"], ["underline", "Souligné"], ["line-through", "Barré"]]))]));
  }));
  wrap.appendChild(grp("Fond et bordure", false, function (b) {
    b.appendChild(rowOf("", [fld("Couleur de fond", inColor(k, "background-color", cs)), fld("Opacité (0 à 1)", inText(k, "opacity", cs.opacity))]));
    b.appendChild(rowOf("c3", [fld("Arrondi", inText(k, "border-radius", cs.borderTopLeftRadius)), fld("Épaisseur", inText(k, "border-width", cs.borderTopWidth)), fld("Trait", inSel(k, "border-style", [["none", "Aucun"], ["solid", "Plein"], ["dashed", "Tirets"], ["dotted", "Points"]]))]));
    b.appendChild(rowOf("", [fld("Couleur du trait", inColor(k, "border-color", cs)), fld("Ombre", inSel(k, "shadow", [["none", "Aucune"], ["sm", "Légère"], ["md", "Moyenne"], ["lg", "Forte"]]))]));
  }));
  wrap.appendChild(grp("Espacement", false, function (b) {
    b.appendChild(el("p", "hint", "Marges extérieures (haut, droite, bas, gauche)")); b.appendChild(inPad4(k, "margin", cs));
    b.appendChild(el("p", "hint", "Marges intérieures")); b.appendChild(inPad4(k, "padding", cs));
    if (hasKids) b.appendChild(rowOf("c1", [fld("Écart entre les éléments", inText(k, "gap", cs.gap === "normal" ? "" : cs.gap))]));
  }));
  wrap.appendChild(grp("Taille", false, function (b) {
    b.appendChild(rowOf("", [fld("Largeur", inText(k, "width", Math.round(e.getBoundingClientRect().width) + "px")), fld("Largeur maximale", inText(k, "max-width", cs.maxWidth))]));
    b.appendChild(rowOf("", [fld("Hauteur", inText(k, "height", "auto")), fld("Hauteur minimale", inText(k, "min-height", cs.minHeight))]));
  }));
  if (hasKids) wrap.appendChild(grp("Disposition des éléments", false, function (b) {
    b.appendChild(rowOf("", [fld("Affichage", inSel(k, "display", [["block", "Bloc"], ["flex", "Souple (flex)"], ["grid", "Grille"], ["inline-block", "En ligne"], ["none", "Masqué"]])), fld("Colonnes (grille)", inSel(k, "grid-columns", [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"]]))]));
    b.appendChild(rowOf("", [fld("Direction", inSel(k, "flex-direction", [["row", "En ligne"], ["column", "En colonne"], ["row-reverse", "En ligne inversée"], ["column-reverse", "En colonne inversée"]])), fld("Retour à la ligne", inSel(k, "flex-wrap", [["wrap", "Oui"], ["nowrap", "Non"]]))]));
    b.appendChild(rowOf("", [fld("Alignement horizontal", inSel(k, "justify-content", [["flex-start", "Début"], ["center", "Centre"], ["flex-end", "Fin"], ["space-between", "Espacé"], ["space-around", "Réparti"]])), fld("Alignement vertical", inSel(k, "align-items", [["flex-start", "Haut"], ["center", "Milieu"], ["flex-end", "Bas"], ["stretch", "Étiré"]]))]));
  }));
  if (hasImg) wrap.appendChild(grp("Image", false, function (b) {
    b.appendChild(rowOf("", [fld("Ajustement", inSel(k, "object-fit", [["cover", "Remplir (recadrer)"], ["contain", "Entière"]])), fld("Cadrage (ex. 50% 30%)", inText(k, "object-position", "50% 50%"))]));
    b.appendChild(rowOf("c1", [fld("Proportions (ex. 16 / 9)", inText(k, "aspect-ratio", ""))]));
  }));
  return wrap;
}
function contentUI(k, e) {
  var wrap = el("div"), any = false, c = C();
  if (e.dataset.cb && c.custom[e.dataset.cb]) {
    var o = c.custom[e.dataset.cb], id = e.dataset.cb; any = true; o.props = o.props || {};
    var nm = el("input"); nm.type = "text"; nm.value = o.label || ""; nm.oninput = function () { push("lb:" + id); o.label = nm.value; A.dirty(); treeUI(); };
    wrap.appendChild(rowOf("c1", [fld("Nom du bloc (dans la liste de gauche)", nm)]));
    if (o.type === "button") { var hr = el("input"); hr.type = "text"; hr.placeholder = "https://… ou #contact"; hr.value = o.props.href || ""; hr.oninput = function () { var ok = !hr.value || !!W.__icv.safeHref(hr.value); hr.classList.toggle("bad", !ok); if (!ok) return; push("hr:" + id); o.props.href = hr.value; A.dirty(); clearTimeout(S.rt); S.rt = setTimeout(render, 250); }; wrap.appendChild(rowOf("c1", [fld("Adresse du bouton", hr)])); }
    if (o.type === "video") { var yt = el("input"); yt.type = "text"; yt.placeholder = "https://www.youtube.com/watch?v=…"; yt.value = o.props.yt || ""; yt.oninput = function () { var v = yt.value.trim(), m = v.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,20})/), id2 = m ? m[1] : v, ok = !v || /^[A-Za-z0-9_-]{6,20}$/.test(id2); yt.classList.toggle("bad", !ok); if (!ok) return; push("yt:" + id); o.props.yt = id2; A.dirty(); clearTimeout(S.rt); S.rt = setTimeout(render, 300); }; wrap.appendChild(rowOf("c1", [fld("Lien de la vidéo YouTube", yt)])); }
  }
  var tx = [].slice.call(e.querySelectorAll("[data-edit]")); if (e.hasAttribute("data-edit")) tx.unshift(e);
  tx = tx.filter(function (t) { return !inUI(t) && !removedEl(t); });
  tx.slice(0, 8).forEach(function (t) {
    any = true; var key = t.dataset.edit, hasA = !!t.querySelector("a"), ta = el("textarea"), kind = TAGN[t.tagName] || "Texte", lab = el("label", "txt", esc(kind) + (c.texts[key] != null ? ' <span class="pill">modifié</span>' : ""));
    ta.value = A.toEditable(t); ta.rows = Math.min(6, Math.max(1, Math.ceil(ta.value.length / 38) + ta.value.split("\n").length - 1));
    if (hasA) { ta.disabled = true; lab.appendChild(ta); lab.appendChild(el("p", "hint", "Ce texte contient un lien : double-cliquez dessus dans la page pour le modifier.")); }
    else {
      ta.oninput = function () { push("tx:" + key); var html = A.fromEditable(ta.value); if (A.norm(html) === A.defHtml(key)) delete c.texts[key]; else c.texts[key] = html; t.innerHTML = html; A.dirty(); overlays(); };
      lab.appendChild(ta);
    }
    wrap.appendChild(lab);
  });
  if (tx.length > 8) wrap.appendChild(el("p", "hint", (tx.length - 8) + " autres textes dans ce bloc : sélectionnez un bloc plus petit dans la liste ou sur la page."));
  var links = (e.tagName === "A" ? [e] : [].slice.call(e.querySelectorAll("a"))).filter(function (a) { return (a.dataset.edit || a.dataset.blk) && !inUI(a); });
  links.slice(0, 5).forEach(function (a) {
    any = true; var key = a.dataset.edit || a.dataset.blk, i = el("input"); i.type = "text"; i.value = a.getAttribute("href") || ""; i.placeholder = "https://…, #contact, mailto:…";
    i.oninput = function () {
      var v = i.value.trim(), ok = !v || !!W.__icv.safeHref(v); i.classList.toggle("bad", !ok); if (!ok) return;
      push("lk:" + key); if (v) c.links[key] = v; else delete c.links[key]; A.dirty(); if (v) a.setAttribute("href", v); else { clearTimeout(S.rt); S.rt = setTimeout(render, 250); }
    };
    wrap.appendChild(fld("Adresse du lien · " + trunc(a.textContent, 24), i));
  });
  var ims = (e.matches("[data-img],[data-bg]") ? [e] : []).concat([].slice.call(e.querySelectorAll("[data-img],[data-bg]"))).filter(function (x) { return !inUI(x); });
  ims.slice(0, 4).forEach(function (im) {
    any = true; var key = im.dataset.img || im.dataset.bg, src = im.dataset.img ? im.getAttribute("src") : ((im.getAttribute("style") || "").match(/url\(['"]?([^'")]+)/) || [, ""])[1];
    var box = el("div", "row c1"), th = el("div"); th.style.cssText = "aspect-ratio:16/9;border-radius:6px;background:#dde6ee center/cover no-repeat;margin-bottom:6px;background-image:url('" + esc(A.imgSrc(src)) + "')";
    var tl = el("div", "tools"), b1 = el("button", "btn sec sm", "Changer l'image…"), b2 = el("button", "btn sec sm", "Image d'origine"); b1.type = b2.type = "button";
    b1.onclick = function () { pickImage(function (u) { push(); c.images[key] = u; A.dirty(); render(); inspector(); }); };
    b2.onclick = function () { if (c.images[key] == null) return; push(); delete c.images[key]; A.dirty(); render(); inspector(); }; b2.disabled = c.images[key] == null;
    tl.appendChild(b1); tl.appendChild(b2); var w2 = el("div"); w2.appendChild(el("p", "hint", im.dataset.bg ? "Image de fond" : "Image")); w2.appendChild(th); w2.appendChild(tl); box.appendChild(w2); wrap.appendChild(box);
  });
  if (!any) wrap.appendChild(el("p", "hint", "Ce bloc ne contient ni texte, ni lien, ni image directement modifiables. Sélectionnez un élément plus petit, ou réglez son style ci-dessous."));
  return wrap;
}
function syncHideBoxes() { [].forEach.call(document.querySelectorAll("#layInsp [data-hd]"), function (cb) { cb.checked = !hideState(S.sel)[cb.dataset.hd]; }); }
function inspector() {
  var box = $("#layInsp"); if (!box) return; var top = box.scrollTop, k = S.sel, e = k && DOC && blkEl(k); box.innerHTML = "";
  if (!DOC) { box.innerHTML = '<div class="empty">Chargement de la page…</div>'; return; }
  if (!e) {
    box.innerHTML = '<div class="empty"><b>Aucun bloc sélectionné</b><p>Cliquez sur un élément de la page ou sur une ligne de la liste de gauche. Cliquez sur « Parent » pour viser le bloc qui le contient.</p><div class="tools"><button class="btn sm" data-q="add">+ Ajouter un bloc</button><button class="btn sec sm" data-q="theme">Couleurs et polices</button></div><p class="hint" style="margin-top:14px">Raccourcis : Suppr = supprimer · Ctrl+D = dupliquer · Alt+↑ ou ↓ = déplacer · Échap = désélectionner · Ctrl+Z = annuler · double-clic sur un texte = l\'écrire.</p></div>';
    box.querySelector('[data-q="add"]').onclick = openLib; box.querySelector('[data-q="theme"]').onclick = openTheme; return;
  }
  var h = el("div", "ih"), cr = el("div", "crumbs"), chain = [], p = e; h.appendChild(el("h3", null, esc(labelOf(e))));
  while ((p = blkParent(p))) chain.unshift(p); chain.slice(-4).forEach(function (a) { var b = el("button", null, esc(trunc(labelOf(a), 22))); b.type = "button"; b.onclick = function () { selectKey(a.dataset.blk, { scroll: true }); }; cr.appendChild(b); cr.appendChild(document.createTextNode(" › ")); });
  cr.appendChild(document.createTextNode(TAGN[e.tagName] ? "ce bloc" : "ce bloc")); h.appendChild(cr); box.appendChild(h);

  var ib = el("div", "ib"), tl = el("div", "tools"), pc = parentCont(e);
  [["▲ Monter", function () { step(k, -1); }, !pc], ["▼ Descendre", function () { step(k, 1); }, !pc], ["Dupliquer", function () { dup(k); }, e.tagName === "MAIN"], ["Supprimer", function () { del(k); }, e.tagName === "MAIN"]].forEach(function (a) {
    var b = el("button", "btn sm " + (a[0] === "Supprimer" ? "dang" : "sec"), a[0]); b.type = "button"; b.onclick = a[1]; b.disabled = a[2]; tl.appendChild(b);
  });
  ib.appendChild(tl);
  if (pc) {
    var kind = pc.dataset.cont, sel = el("select"), opts = [];
    [].forEach.call(DOC.querySelectorAll('[data-cont="' + kind + '"]'), function (c) { if (c !== pc && c !== e && !e.contains(c) && isBlk(c) && !removedEl(c)) opts.push(c); });
    if (opts.length) {
      sel.innerHTML = '<option value="">Déplacer vers…</option>' + opts.map(function (c) { return '<option value="' + esc(c.dataset.blk) + '">' + esc("À la fin de : " + trunc(contLabel(c), 44)) + "</option>"; }).join("");
      sel.onchange = function () { if (sel.value) moveBlock(k, sel.value, null); }; sel.style.marginTop = "8px"; ib.appendChild(sel);
    }
  }
  box.appendChild(ib);

  var vb = el("div", "ib"); vb.appendChild(el("h4", null, "Affichage"));
  var vr = el("div", "row c3"); ["d", "t", "m"].forEach(function (d) { var l = el("label", "chk"); l.innerHTML = '<input type="checkbox" data-hd="' + d + '"> ' + DEVS[d].name; l.firstChild.checked = !hideState(k)[d]; l.firstChild.onchange = function () { setHide(k, d, !this.checked); }; vr.appendChild(l); });
  vb.appendChild(vr); vb.appendChild(el("p", "hint", "Décochez un appareil pour masquer ce bloc sur celui-ci. Dans l'aperçu, un bloc masqué apparaît estompé avec un cadre rouge.")); box.appendChild(vb);

  var cb = el("div", "ib"); cb.appendChild(el("h4", null, "Contenu")); cb.appendChild(contentUI(k, e)); box.appendChild(cb);
  box.appendChild(styleUI(k, e));
  var fb = el("div", "ib"), rs = el("button", "btn sec sm", "Réinitialiser le style de ce bloc"); rs.type = "button";
  rs.onclick = function () { if (!C().styles[k] && !C().layout.hide[k]) { A.toast("Ce bloc n'a pas de réglage de style."); return; } push(); delete C().styles[k]; delete C().layout.hide[k]; A.dirty(); light(); inspector(); treeUI(); };
  fb.appendChild(rs);
  if (pc && C().layout.order[pc.dataset.blk]) { var ro = el("button", "btn sec sm", "Rétablir l'ordre d'origine de la liste"); ro.type = "button"; ro.style.marginLeft = "6px"; ro.onclick = function () { push(); delete C().layout.order[pc.dataset.blk]; commit(); }; fb.appendChild(ro); }
  box.appendChild(fb); box.scrollTop = top;
}

/* ---------- bibliothèque de blocs ---------- */
var LIBSEL = "title";
function openLib() {
  if (!DOC) { A.toast("La page se charge : réessayez dans un instant."); return; }
  var g = $("#libGrid"); g.innerHTML = "";
  LIB.forEach(function (t) { var b = el("button", t[0] === LIBSEL ? "on" : "", "<b>" + esc(t[1]) + "</b><span>" + esc(t[2]) + "</span>"); b.type = "button"; b.onclick = function () { LIBSEL = t[0]; [].forEach.call(g.children, function (x) { x.classList.toggle("on", x === b); }); fillWhere(); }; g.appendChild(b); });
  fillWhere(); $("#libModal").hidden = false;
}
function fillWhere() {
  var sel = $("#libWhere"), kind = LIBSEL === "section" ? "sec" : "sp", opts = [], cur = S.sel && blkEl(S.sel), anc = cur;
  while (anc && !(parentCont(anc) && parentCont(anc).dataset.cont === kind)) anc = blkParent(anc);
  if (anc) opts.push({ v: parentCont(anc).dataset.blk + "|" + anc.dataset.blk, t: "Juste après « " + trunc(labelOf(anc), 40) + " »" });
  [].forEach.call(DOC.querySelectorAll('[data-cont="' + kind + '"]'), function (c) { if (isBlk(c) && !removedEl(c)) opts.push({ v: c.dataset.blk + "|", t: "À la fin de : " + trunc(contLabel(c), 50) }); });
  sel.innerHTML = opts.map(function (o) { return '<option value="' + esc(o.v) + '">' + esc(o.t) + "</option>"; }).join("");
}

/* ---------- couleurs et polices ---------- */
var THEME_COLORS = [["--abyss", "Bleu nuit (fonds sombres)", "#0b2a45"], ["--deep", "Bleu très foncé (dégradés)", "#071d31"], ["--navy", "Bleu marine (accents)", "#175082"], ["--sea", "Bleu mer", "#2a7ab8"],
  ["--signal", "Orange signal (accent principal)", "#ff7a2f"], ["--signal-soft", "Orange clair", "#ffb06e"], ["--signal-ink", "Orange foncé (textes accent)", "#c4510e"], ["--foam", "Fond clair des pages", "#eef4f8"],
  ["--chalk", "Blanc cassé", "#f7fafc"], ["--ink", "Texte principal", "#0f2c47"], ["--muted", "Texte secondaire", "#4f6b84"], ["--line", "Traits et bordures", "#d3e0ea"], ["--sky", "Bleu ciel", "#9fd3ff"]];
function setTheme(v, val) { push("th:" + v); if (val) C().theme[v] = val; else delete C().theme[v]; A.dirty(); light(); }
function openTheme() {
  if (!DOC) { A.toast("La page se charge : réessayez dans un instant."); return; }
  var b = $("#themeBody"); b.innerHTML = ""; var g = el("div", "thgrid");
  THEME_COLORS.forEach(function (c) {
    var w = el("div", "colr"), ci = el("input"), t = el("input"), x = el("button", "x", "×"), cur = C().theme[c[0]] || "";
    ci.type = "color"; t.type = "text"; x.type = "button"; x.title = "Couleur d'origine"; t.value = cur; t.placeholder = c[2]; ci.value = colorHex(cur) || c[2];
    ci.oninput = function () { t.value = ci.value; t.classList.remove("bad"); setTheme(c[0], ci.value); };
    t.oninput = function () { var ok = !t.value || /^#[0-9a-f]{3,8}$/i.test(t.value.trim()); t.classList.toggle("bad", !ok); if (ok) { setTheme(c[0], t.value.trim()); var hx = colorHex(t.value); if (hx) ci.value = hx; } };
    x.onclick = function () { t.value = ""; ci.value = c[2]; setTheme(c[0], ""); };
    w.appendChild(ci); w.appendChild(t); w.appendChild(x); g.appendChild(fld(c[1], w));
  });
  b.appendChild(g); var fr = el("div", "thgrid"); fr.style.marginTop = "14px";
  [["--display", "Police des titres", "Saira Condensed"], ["--text", "Police des textes", "Saira"]].forEach(function (f) {
    var s = el("select"); s.innerHTML = '<option value="">(d\'origine : ' + f[2] + ")</option>" + Object.keys(IC.FONTS).map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + "</option>"; }).join("");
    s.value = C().theme[f[0]] || ""; s.onchange = function () { setTheme(f[0], s.value); }; fr.appendChild(fld(f[1], s));
  });
  b.appendChild(fr); b.appendChild(el("p", "hint", "Les polices Oswald, Barlow Condensed, Montserrat, Poppins et Playfair Display sont chargées depuis Google Fonts quand elles sont utilisées."));
  $("#themeModal").hidden = false;
}

/* ---------- choix d'une image du site ---------- */
var MANI = null;
function closePick() { $("#pickModal").hidden = true; }
function pickImage(done) {
  var g = $("#pickGrid"); g.innerHTML = ""; var up = $("#pickUp"); up.innerHTML = "";
  up.appendChild(A.fileButton("Importer une image", function (f) { A.toast("Envoi de l'image…"); A.uploadImage(f, 1600).then(function (u) { closePick(); done(u); }).catch(function (e) { A.toast(e.message, true); }); }));
  (MANI ? Promise.resolve(MANI) : fetch("/assets/site-manifest.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) { MANI = j.files || []; return MANI; }).catch(function () { return []; }))
    .then(function (files) { files.filter(function (f) { return /^assets\/(img|uploads)\/.+\.(webp|jpe?g|png|svg)$/i.test(f.path); }).forEach(function (f) { var b = el("button"); b.type = "button"; b.title = f.path; b.style.backgroundImage = "url('/" + f.path + "')"; b.onclick = function () { closePick(); done(f.path); }; g.appendChild(b); }); });
  $("#pickModal").hidden = false;
}

/* ---------- remise à zéro ---------- */
function resetAll() {
  if (!confirm("Remettre toute la mise en page à l'origine ?\n\nL'ordre des blocs, les styles, les couleurs, les blocs ajoutés, les copies et les suppressions seront annulés. Vos textes, images, équipe et budget sont conservés.\n\nVous pourrez annuler avec le bouton « Annuler »."))return;
  push(); var c = C(); ensure();
  Object.keys(c.custom).forEach(function (id) { ["texts", "images"].forEach(function (g) { Object.keys(c[g]).forEach(function (t) { if (t.indexOf("cb." + id + ".") === 0) delete c[g][t]; }); }); });
  c.layout = { order: {}, hide: {} }; c.styles = {}; c.theme = {}; c.custom = {}; c.removed = []; c.dups = []; S.sel = null; commit("Mise en page remise à l'origine. Le bouton « Annuler » la rétablit.");
}

/* ---------- mise en route ---------- */
function build() {
  built = true; FR = $("#layFrame");
  $("#layTree").innerHTML = '<div class="tf"><input id="layFilter" type="search" placeholder="Filtrer les blocs…" aria-label="Filtrer les blocs"></div><div id="layRows"></div><div class="rm" id="layRm" style="display:none"></div>';
  bindTree();
  $("#layPage").onchange = function () { S.page = this.value; loadFrame(); };
  [].forEach.call(document.querySelectorAll("#layDev button"), function (b) { b.onclick = function () { S.dev = b.dataset.d; [].forEach.call(document.querySelectorAll("#layDev button"), function (x) { x.classList.toggle("on", x === b); }); fit(); inspector(); setTimeout(overlays, 300); }; });
  $("#layUndo").onclick = undo; $("#layRedo").onclick = redo; $("#layAdd").onclick = openLib; $("#layTheme").onclick = openTheme; $("#layReset").onclick = resetAll;
  $("#libCancel").onclick = function () { $("#libModal").hidden = true; };
  $("#libOk").onclick = function () { var v = ($("#libWhere").value || "").split("|"); if (!v[0]) { A.toast("Choisissez où placer le bloc.", true); return; } $("#libModal").hidden = true; addBlock(LIBSEL, v[0], v[1] || null); };
  $("#themeClose").onclick = function () { $("#themeModal").hidden = true; inspector(); };
  $("#themeReset").onclick = function () { if (!Object.keys(C().theme).length) { $("#themeModal").hidden = true; return; } push(); C().theme = {}; A.dirty(); light(); openTheme(); A.toast("Couleurs et polices d'origine rétablies."); };
  $("#pickClose").onclick = closePick;
  if (window.ResizeObserver) new ResizeObserver(fit).observe($("#layStage")); window.addEventListener("resize", fit);
}
function keyBind(on) { if (on === keyOn) return; keyOn = on; if (on) document.addEventListener("keydown", onKey); else document.removeEventListener("keydown", onKey); }
function open() {
  if (!built) build(); ensure(); keyBind(true); syncBtns();
  if (!FR.getAttribute("src")) { S.page = ($("#layPage") && $("#layPage").value) || "index"; loadFrame(); }
  else { fit(); if (W && W.__icv) refresh(); }
  if (!tick) tick = setInterval(overlays, 500);
}
function close() { if (!built) return; keyBind(false); if (tick) { clearInterval(tick); tick = null; } }
window.LAYOUT = { open: open, close: close, undo: undo, redo: redo, state: S, select: selectKey, move: moveBlock, add: addBlock, del: del, dup: dup, step: step, setHide: setHide, stSet: stSet, theme: setTheme };
})();
