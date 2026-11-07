/* Téléchargement du site complet (.zip) depuis l'administration.

   Le zip est assemblé ici, dans le navigateur (aucune limite de taille côté serveur) :
   - public/ : toutes les pages et tous les fichiers listés par assets/site-manifest.json ;
   - le contenu enregistré dans l'admin (textes, images, équipe, budget, mise en page...) est intégré au script de
     chaque page et à assets/content-default.json : un site déployé à partir du zip s'affiche tel que vous l'avez laissé,
     même sur un Netlify vide ;
   - les images ajoutées par l'admin (/api/media/…) sont copiées dans public/assets/uploads/ ;
   - netlify/, package.json, README, scripts de déploiement et sources/ viennent de la route /api/admin/kit ;
     netlify/lib/kit.mjs est régénéré ici pour que le site déployé puisse à son tour se télécharger. */
(function () {
  "use strict";
  var A = window.ADM, btn = document.getElementById("dlSite");
  if (!A || !btn) return;

  var TOP = "icam-voile-site/";
  var TE = new TextEncoder(), TD = new TextDecoder();
  var MARK_A = "/*DEFAULTS_BEGIN*/", MARK_B = "/*DEFAULTS_END*/";
  var NOZIP = /\.(webp|png|jpe?g|gif|mp4|webm|gz|zip|woff2?|mp3|ogg)$/i;
  var MIME_EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" };
  var MEDIA_RE = /(^|[^A-Za-z0-9.:\/_-])\/api\/media\/([a-z0-9-]{8,64})/g;
  var KIT_HEAD = "// Fichier généré automatiquement (python3 sources/build.py, ou par l'export du site depuis l'administration) : ne pas modifier à la main.\n" +
    "// Contient le code du site (fonctions, configuration, sources) servi à l'administrateur par la route /api/admin/kit.\n" +
    "export default ";

  /* ---------- CRC-32 ---------- */
  var CRC = (function () {
    var t = new Uint32Array(256), n, k, c;
    for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
    return t;
  })();
  function crc32(u8) { var c = 0xFFFFFFFF, i, n = u8.length; for (i = 0; i < n; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

  /* ---------- Compression (deflate brut, fourni par le navigateur) ---------- */
  function deflate(u8) {
    var cs = new CompressionStream("deflate-raw"), w = cs.writable.getWriter();
    var out = new Response(cs.readable).arrayBuffer();
    w.write(u8).catch(function () {}); w.close().catch(function () {});
    return out.then(function (b) { return new Uint8Array(b); });
  }

  /* ---------- Écriture du zip ---------- */
  function Zip() {
    var d = new Date();
    this.parts = []; this.cd = []; this.off = 0; this.dirs = {};
    this.t = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
    this.d = (((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
    this.canDeflate = typeof CompressionStream === "function";
  }
  Zip.prototype.raw = function (u8) { this.parts.push(u8); this.off += u8.length; };
  Zip.prototype.put = async function (name, data, mode, isDir) {
    var nm = TE.encode(name), size = data.length, crc = isDir ? 0 : crc32(data), body = data, method = 0;
    if (!isDir && this.canDeflate && size > 256 && !NOZIP.test(name)) {
      try { var z = await deflate(data); if (z.length < size * 0.95) { body = z; method = 8; } } catch (e) { this.canDeflate = false; }
    }
    var h = new DataView(new ArrayBuffer(30)), off = this.off;
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, method ? 20 : 10, true); h.setUint16(6, 0x0800, true); h.setUint16(8, method, true);
    h.setUint16(10, this.t, true); h.setUint16(12, this.d, true); h.setUint32(14, crc, true); h.setUint32(18, body.length, true); h.setUint32(22, size, true);
    h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    this.raw(new Uint8Array(h.buffer)); this.raw(nm); if (body.length) this.raw(body);
    this.cd.push({ nm: nm, crc: crc, method: method, csize: body.length, size: size, off: off, ext: (((mode & 0xFFFF) << 16) | (isDir ? 0x10 : 0)) >>> 0 });
  };
  Zip.prototype.file = async function (path, data, mode) {
    var parts = path.split("/"), acc = "", i;
    for (i = 0; i < parts.length - 1; i++) { acc += parts[i] + "/"; if (!this.dirs[acc]) { this.dirs[acc] = 1; await this.put(acc, new Uint8Array(0), 0o40755, true); } }
    await this.put(path, data, mode || 0o100644, false);
  };
  Zip.prototype.finish = function () {
    var start = this.off, n = this.cd.length, i, c, h, e;
    if (n > 65000) throw new Error("Trop de fichiers pour un zip classique (" + n + ").");
    for (i = 0; i < n; i++) {
      c = this.cd[i]; h = new DataView(new ArrayBuffer(46));
      h.setUint32(0, 0x02014b50, true); h.setUint16(4, 0x0314, true); h.setUint16(6, c.method ? 20 : 10, true); h.setUint16(8, 0x0800, true); h.setUint16(10, c.method, true);
      h.setUint16(12, this.t, true); h.setUint16(14, this.d, true); h.setUint32(16, c.crc, true); h.setUint32(20, c.csize, true); h.setUint32(24, c.size, true);
      h.setUint16(28, c.nm.length, true); h.setUint16(30, 0, true); h.setUint16(32, 0, true); h.setUint16(34, 0, true); h.setUint16(36, 0, true);
      h.setUint32(38, c.ext, true); h.setUint32(42, c.off, true);
      this.raw(new Uint8Array(h.buffer)); this.raw(c.nm);
    }
    e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(4, 0, true); e.setUint16(6, 0, true); e.setUint16(8, n, true); e.setUint16(10, n, true);
    e.setUint32(12, this.off - start, true); e.setUint32(16, start, true); e.setUint16(20, 0, true);
    this.raw(new Uint8Array(e.buffer));
    return new Blob(this.parts, { type: "application/zip" });
  };

  /* ---------- Réseau ---------- */
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function fetchBytes(url, st) {
    var err, k, r;
    for (k = 0; k < 2; k++) {
      if (st.stop) throw new Error("Export annulé.");
      try {
        r = await fetch(url, { cache: "no-store", signal: st.ac.signal });
        if (!r.ok) throw new Error("erreur " + r.status);
        return { bytes: new Uint8Array(await r.arrayBuffer()), type: (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase() };
      } catch (e) { err = e; if (st.stop) throw new Error("Export annulé."); await sleep(350); }
    }
    throw err;
  }
  async function pool(items, n, worker) {
    var i = 0;
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, async function () {
      while (i < items.length) { var k = i++; await worker(items[k], k); }
    }));
  }

  /* ---------- Contenu : ce que l'admin affiche devient le contenu par défaut du site exporté ---------- */
  function bakeContent() {
    var C = JSON.parse(JSON.stringify(A.C)), DEF = JSON.parse(JSON.stringify(A.DEF || {}));
    var o = Object.assign({}, DEF, C);
    delete o.updatedAt; o.v = 3;
    if (DEF.legacy) o.legacy = DEF.legacy; else delete o.legacy;   // table de correspondance des anciennes clés (migration)
    if (!Array.isArray(o.team) || !o.budget) throw new Error("Le contenu de l'administration est incomplet : rechargez la page puis recommencez.");
    return o;
  }
  /* Images ajoutées par l'admin : copiées dans public/assets/uploads/ et liées en relatif (assets/uploads/…) */
  async function copyMedia(obj, st, files) {
    var txt = JSON.stringify(obj), ids = {}, m, map = {}, list;
    MEDIA_RE.lastIndex = 0;
    while ((m = MEDIA_RE.exec(txt))) ids[m[2]] = 1;
    list = Object.keys(ids);
    var done = 0;
    await pool(list, 3, async function (id) {
      try {
        var r = await fetchBytes("/api/media/" + id, st), ext = MIME_EXT[r.type];
        if (!ext) throw new Error("format inconnu");
        if (ext === "svg" && /<script|\son[a-z]+\s*=|javascript:/i.test(TD.decode(r.bytes))) throw new Error("SVG contenant du script");
        files.set("assets/uploads/" + id + "." + ext, r.bytes); map[id] = "assets/uploads/" + id + "." + ext;
      } catch (e) {
        if (st.stop) throw e;
        st.warn.push("Une image ajoutée (" + id.slice(0, 8) + "…) n'a pas pu être copiée (" + e.message + ") : son lien en ligne est conservé.");
      }
      st.step("Copie des images ajoutées (" + (++done) + " / " + list.length + ")", .12 + .08 * done / list.length);
    });
    MEDIA_RE.lastIndex = 0;
    return { obj: JSON.parse(txt.replace(MEDIA_RE, function (all, pre, id) { return map[id] ? pre + map[id] : all; })), n: Object.keys(map).length };
  }
  function bakePage(html, json) {
    var a = html.indexOf(MARK_A), b = html.indexOf(MARK_B);
    if (a < 0 || b < a) throw new Error("repères du contenu introuvables dans la page");
    return html.slice(0, a + MARK_A.length) + json + html.slice(b);
  }
  function pl(n, one, many) { return n + " " + (n > 1 ? many : one); }
  function summary(o) {
    var n = function (x) { return x && typeof x === "object" ? Object.keys(x).length : 0; }, out = [];
    var add = function (k, one, many) { if (k > 0) out.push(pl(k, one, many)); };
    add(n(o.texts), "texte modifié", "textes modifiés"); add(n(o.images), "image remplacée", "images remplacées");
    add((o.team || []).length, "membre", "membres"); add((o.sponsors || []).length, "sponsor", "sponsors");
    add(n(o.custom), "bloc ajouté", "blocs ajoutés"); add(n(o.layout && o.layout.order), "zone réordonnée", "zones réordonnées");
    add(n(o.styles), "élément stylé", "éléments stylés");
    return out.join(", ");
  }

  /* ---------- Fenêtre de suivi ---------- */
  var CSS = ".dlm{position:fixed;inset:0;z-index:60;background:rgba(11,42,69,.55);display:grid;place-items:center;padding:20px}.dlm[hidden]{display:none}" +
    ".dlb{background:#fff;border-radius:12px;padding:22px 24px;width:min(580px,100%);max-height:calc(100vh - 40px);overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.35)}" +
    ".dlb h2{font-size:20px;margin:0 0 4px}.dls{margin:6px 0 12px;min-height:22px}.dlp{height:10px;border-radius:99px;background:var(--line);overflow:hidden}" +
    ".dlp i{display:block;height:100%;width:0;background:var(--signal);border-radius:99px;transition:width .25s}" +
    ".dll{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:8px;font-size:14px}.dll li{padding-left:24px;position:relative}" +
    ".dll li:before{content:\"\\2713\";position:absolute;left:0;color:var(--ok);font-weight:700}.dll li.w:before{content:\"!\";color:var(--signal)}.dll li.e:before{content:\"\\2715\";color:var(--err)}" +
    ".dla{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}.dla a.btn{text-decoration:none}.dla [hidden]{display:none}";
  var M = null;
  function modal() {
    if (M) return M;
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    var d = document.createElement("div"); d.className = "dlm"; d.hidden = true; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-labelledby", "dlmT");
    d.innerHTML = '<div class="dlb"><h2 id="dlmT">Télécharger le site</h2><p class="dls" id="dlmS" aria-live="polite"></p>' +
      '<div class="dlp" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="dlmB"></i></div><ul class="dll" id="dlmL"></ul>' +
      '<div class="dla"><a class="btn sec" id="dlmA" hidden>Télécharger à nouveau</a><button type="button" class="btn sec" id="dlmX">Annuler</button></div></div>';
    document.body.appendChild(d);
    M = { box: d, status: d.querySelector("#dlmS"), bar: d.querySelector("#dlmB"), prog: d.querySelector(".dlp"), list: d.querySelector("#dlmL"), again: d.querySelector("#dlmA"), close: d.querySelector("#dlmX") };
    M.close.addEventListener("click", function () { if (RUN && !RUN.finished) RUN.cancel(); else hide(); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); M.close.click(); } });
    return M;
  }
  function hide() { if (!M) return; M.box.hidden = true; if (RUN && RUN.url) { URL.revokeObjectURL(RUN.url); RUN.url = null; } btn.focus(); }
  function line(cls, text) { var li = document.createElement("li"); if (cls) li.className = cls; li.textContent = text; M.list.appendChild(li); }

  /* ---------- Export ---------- */
  var RUN = null;
  function begin() {
    var ui = modal(), st = { stop: false, ac: new AbortController(), warn: [], finished: false, url: null, blob: null, name: "", info: null };
    st.step = function (label, frac) { ui.status.textContent = label; var p = Math.round(Math.max(0, Math.min(1, frac)) * 100); ui.bar.style.width = p + "%"; ui.prog.setAttribute("aria-valuenow", p); };
    st.cancel = function () { st.stop = true; st.ac.abort(); ui.status.textContent = "Annulation…"; };
    ui.list.innerHTML = ""; ui.again.hidden = true; ui.close.textContent = "Annuler"; ui.box.hidden = false; ui.close.focus();
    btn.disabled = true; RUN = st;
    return st;
  }
  async function run() {
    if (RUN && !RUN.finished) return;
    if (!A.C || !A.DEF) { A.toast("Le contenu n'est pas encore chargé : patientez un instant.", true); return; }
    var st = begin(), ui = M, files = new Map(), sizeTotal = 0, kitFiles = null;
    try {
      /* 1. liste des fichiers publics */
      st.step("Lecture de la liste des fichiers du site…", .01);
      var mf = JSON.parse(TD.decode((await fetchBytes("/assets/site-manifest.json", st)).bytes)).files;
      if (!Array.isArray(mf) || !mf.length) throw new Error("La liste des fichiers du site est vide.");

      /* 2. code du site (fonctions, configuration, sources) */
      st.step("Récupération du code du site (fonctions Netlify, sources)…", .04);
      try {
        var kj = await A.api("/api/admin/kit");
        kitFiles = kj && kj.files;
      } catch (e) {
        if (/^401$/.test(e.message)) throw e;
        throw new Error("Le serveur n'a pas fourni le code du site (" + e.message + "). Republiez le site avec le fichier deployer-… pour mettre à jour les fonctions Netlify, puis recommencez.");
      }
      if (!kitFiles || !kitFiles["netlify/functions/admin.mjs"]) throw new Error("Le code du site renvoyé par le serveur est incomplet. Republiez le site avec le fichier deployer-… puis recommencez.");

      /* 3. contenu de l'admin intégré + images ajoutées */
      st.step("Intégration de vos modifications au contenu du site…", .1);
      var baked = bakeContent(), media = await copyMedia(baked, st, files);
      baked = media.obj;
      var defPretty = JSON.stringify(baked, null, 1), defInline = JSON.stringify(baked).replace(/<\//g, "<\\/");
      files.set("assets/content-default.json", TE.encode(defPretty));

      /* 4. pages (avec le contenu intégré) */
      var pageFiles = {};
      for (var pi = 0; pi < A.PAGES.length; pi++) {
        var pf = A.PAGES[pi].file; pageFiles[pf] = 1;
        st.step("Récupération des pages (" + (pi + 1) + " / " + A.PAGES.length + ")…", .21 + .03 * pi / A.PAGES.length);
        var html = TD.decode((await fetchBytes("/" + pf, st)).bytes);
        try { files.set(pf, TE.encode(bakePage(html, defInline))); } catch (e) { throw new Error("Page " + pf + " : " + e.message + "."); }
      }

      /* 5. tous les autres fichiers publics */
      var todo = mf.filter(function (f) { return f && typeof f.path === "string" && !files.has(f.path) && !pageFiles[f.path] && f.path !== "assets/site-manifest.json" && !/(^|\/)\.\.(\/|$)/.test(f.path); });
      var total = todo.reduce(function (s, f) { return s + (f.size || 0); }, 0) || 1, got = 0, nfile = 0;
      await pool(todo, 4, async function (f) {
        try { files.set(f.path, (await fetchBytes("/" + f.path.split("/").map(encodeURIComponent).join("/"), st)).bytes); }
        catch (e) {
          if (st.stop) throw e;
          if (f.path === "assets/pages.json") throw new Error("Fichier indispensable introuvable : " + f.path + " (" + e.message + ").");
          st.warn.push("Fichier non récupéré : " + f.path + " (" + e.message + ").");
        }
        got += f.size || 0; nfile++;
        st.step("Récupération des fichiers du site (" + nfile + " / " + todo.length + ")…", .25 + .5 * Math.min(1, got / total));
      });

      /* 6. liste des fichiers du zip */
      var list = [];
      files.forEach(function (b, p) { if (p !== "assets/site-manifest.json") list.push({ path: p, size: b.length }); });
      list.sort(function (a, b) { return a.path < b.path ? -1 : a.path > b.path ? 1 : 0; });
      files.set("assets/site-manifest.json", TE.encode(JSON.stringify({ files: list })));

      var now = new Date(), when = now.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }), sum = summary(baked);
      var entries = [];
      Object.keys(kitFiles).forEach(function (p) { var k = kitFiles[p]; entries.push({ path: TOP + p, bytes: TE.encode(k.t), mode: k.x ? 0o100755 : 0o100644 }); });
      entries.push({ path: TOP + "netlify/lib/kit.mjs", bytes: TE.encode(KIT_HEAD + JSON.stringify(kitFiles) + ";\n"), mode: 0o100644 });
      entries.push({ path: TOP + "sources/defaults.json", bytes: TE.encode(defPretty), mode: 0o100644 });
      entries.push({ path: TOP + "EXPORT.txt", mode: 0o100644, bytes: TE.encode(
        "Export du site Icam Voile Lille : " + when + "\r\n\r\n" +
        "Ce dossier est le site complet, avec le contenu de l'administration tel qu'il était au moment du téléchargement" + (sum ? " (" + sum + ")" : "") + ".\r\n" +
        "- Le contenu est intégré aux pages (public/index.html, public/vocabulaire.html) et à public/assets/content-default.json : un site publié à partir de ce dossier s'affiche tel que vous l'avez laissé, même sur un Netlify neuf.\r\n" +
        "- Les images ajoutées depuis l'administration sont dans public/assets/uploads/" + (media.n ? " (" + pl(media.n, "image", "images") + ")" : "") + ".\r\n" +
        "- Pour mettre le site en ligne : voir README.md, partie « Déploiement » (double-clic sur deployer-windows.bat ou deployer-mac.command).\r\n" +
        "- Pour régénérer les pages après avoir modifié les sources : python3 sources/build.py\r\n" +
        "- Non inclus : les demandes reçues par le formulaire, les réglages d'e-mail et les variables d'environnement Netlify (mot de passe, clés).\r\n") });
      files.forEach(function (b, p) { entries.push({ path: TOP + "public/" + p, bytes: b, mode: 0o100644 }); });
      entries.sort(function (a, b) { return a.path < b.path ? -1 : a.path > b.path ? 1 : 0; });

      /* 7. zip */
      var z = new Zip(), i, nb = 0;
      for (i = 0; i < entries.length; i++) {
        if (st.stop) throw new Error("Export annulé.");
        await z.file(entries[i].path, entries[i].bytes, entries[i].mode); nb += entries[i].bytes.length; entries[i].bytes = null;
        if (i % 4 === 0) st.step("Création du zip (" + (i + 1) + " / " + entries.length + ")…", .76 + .22 * (i + 1) / entries.length);
      }
      var blob = z.finish(), d2 = function (n) { return (n < 10 ? "0" : "") + n; };
      st.name = "icam-voile-site-" + now.getFullYear() + "-" + d2(now.getMonth() + 1) + "-" + d2(now.getDate()) + ".zip";
      st.blob = blob; st.url = URL.createObjectURL(blob);
      st.info = { name: st.name, size: blob.size, entries: entries.length, public: list.length, uploads: media.n, kit: Object.keys(kitFiles).length + 1, summary: sum, warnings: st.warn.slice() };

      var a = document.createElement("a"); a.href = st.url; a.download = st.name; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();

      st.finished = true; st.step("Le zip est prêt : " + st.name + " (" + (blob.size / 1048576).toFixed(1).replace(".", ",") + " Mo). Le téléchargement a démarré.", 1);
      line("", pl(list.length, "fichier", "fichiers") + " du site : pages, photos, vidéo, simulateurs, administration.");
      if (sum) line("", "Contenu de l'administration intégré aux pages : " + sum + ".");
      if (media.n) line("", pl(media.n, "image ajoutée", "images ajoutées") + " depuis l'administration, copiée" + (media.n > 1 ? "s" : "") + " dans public/assets/uploads/.");
      line("", "Code Netlify (fonctions, configuration) et sources : " + pl(Object.keys(kitFiles).length + 1, "fichier", "fichiers") + ".");
      if (A.isDirty()) line("w", "Certaines modifications ne sont pas encore publiées : elles sont dans ce zip, mais pas encore visibles sur le site en ligne.");
      st.warn.forEach(function (w) { line("w", w); });
      line("", "Pour mettre le site en ligne : README.md, partie « Déploiement ».");
      ui.again.href = st.url; ui.again.download = st.name; ui.again.hidden = false; ui.close.textContent = "Fermer"; ui.close.focus();
      A.toast("Zip du site téléchargé.");
    } catch (e) {
      st.finished = true;
      var msg = e && e.message ? e.message : String(e);
      if (msg === "401") { ui.box.hidden = true; }
      else if (st.stop) { ui.box.hidden = true; A.toast("Export annulé."); }
      else { ui.status.textContent = "Le zip n'a pas pu être créé."; ui.bar.style.width = "0"; line("e", msg); ui.close.textContent = "Fermer"; ui.close.focus(); A.toast(msg, true); }
    } finally {
      st.finished = true; btn.disabled = false; files = null;
    }
  }

  btn.addEventListener("click", run);
  window.SITEZIP = { run: run, bakeContent: bakeContent, bakePage: bakePage, summary: summary, get last() { return RUN; } };
})();
