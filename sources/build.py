#!/usr/bin/env python3
"""Assemble les pages du site Icam Voile (public/*.html) à partir de src/parts et src/pages.json.

Usage : python3 sources/build.py   (depuis le dossier du site ; ou python3 build.py <dossier_du_site>)

- pages.json     : liste des pages (fichier, titre, description) et des parties qui les composent.
                   Une entrée {"chapter": "who", "label": "...", "parts": [...]} regroupe des parties dans un « chapitre ».
- parts/*.html   : corps de page. parts/*.css : styles. parts/*.js : scripts (une seule fonction anonyme par page).
- defaults.json  : contenu par défaut (injecté dans chaque page ET écrit dans assets/content-default.json).

Attributs automatiques dans le HTML :
- data-e      -> data-edit="<partie>.<mots-du-texte>"   (clé de texte stable, liée au texte)
- data-blk    -> clé de bloc stable "blk.<partie>.<nom>" ajoutée :
                 * aux li, figure, article, p, h2, h3, details (sauf data-nblk),
                 * aux enfants directs d'un conteneur (data-cont="type"), pour pouvoir les réordonner,
                 * à tout élément portant data-cont ou data-label (sections, sous-parties, conteneurs).
  Le nom vient, dans l'ordre : de l'id, du data-label, de la classe (conteneurs), du texte.
"""
import html as H, json, os, re, sys, unicodedata

SRC = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.dirname(SRC)   # par défaut : le dossier qui contient sources/
if not os.path.isdir(os.path.join(SITE, "public")):
    sys.exit("Dossier du site introuvable (il doit contenir public/) : " + SITE + "\nUsage : python3 sources/build.py   (depuis le dossier du site)")
PARTS = os.path.join(SRC, "parts")


def slug(s, words=5, maxlen=34):
    s = unicodedata.normalize("NFD", H.unescape(s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    out = "-".join(s.split()[:words])[:maxlen].strip("-")
    return out or "texte"


def part_prefix(name):
    # 040-icam -> icam ; 030-ch1 -> ch ; 010-nav -> nav
    base = re.sub(r"^\d+-", "", name)
    return re.sub(r"\d+$", "", base) or base


VOID = {"br", "img", "input", "hr", "meta", "link", "source", "area", "col", "embed", "wbr"}
TAG_RE = re.compile(r"<(/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*?)?)(/?)>")
ATTR_RE = re.compile(r'([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|\'[^\']*\'|[^\s"\'>]+))?')
AUTO_TAGS = {"li", "figure", "article", "p", "h2", "h3", "details"}


def parse_attrs(s):
    out = {}
    for m in ATTR_RE.finditer(s or ""):
        v = m.group(2)
        if v is not None and v[:1] in "\"'":
            v = v[1:-1]
        out[m.group(1)] = v
    return out


def inner_html(html, start, tag):
    """Contenu entre l'ouverture (qui finit à start) et la fermeture équilibrée de <tag>."""
    depth = 1
    pos = start
    pat = re.compile(r"<(/?)%s\b[^>]*>" % re.escape(tag), re.I)
    while True:
        m = pat.search(html, pos)
        if not m:
            return html[start:start + 400]
        if m.group(1):
            depth -= 1
            if depth == 0:
                return html[start:m.start()]
        else:
            depth += 1
        pos = m.end()


def plain(h):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h)).strip()


def block_base(tag, A, html, end):
    if A.get("id"):
        return slug(A["id"], 4, 30)
    if A.get("data-label"):
        return slug(A["data-label"], 6, 40)
    inner = inner_html(html, end, tag)
    if "data-cont" in A:
        cls = (A.get("class") or "").split()
        return slug(cls[0], 3, 24) if cls else tag.lower()
    txt = plain(inner)
    if txt:
        return slug(txt)
    m = re.search(r'alt="([^"]+)"', inner)
    if m:
        return slug(m.group(1))
    cls = (A.get("class") or "").split()
    return slug(cls[0], 3, 24) if cls else tag.lower()


def process_html(html, prefix, used):
    """Ajoute data-edit (texte), data-blk (bloc) ; retire data-nblk. Suit la pile des éléments ouverts."""
    out, last, stack = [], 0, []
    for m in TAG_RE.finditer(html):
        closing, tag, attrs, selfclose = m.group(1), m.group(2), m.group(3) or "", m.group(4)
        low = tag.lower()
        if closing:
            for k in range(len(stack) - 1, -1, -1):
                if stack[k][0] == low:
                    del stack[k:]
                    break
            continue
        A = parse_attrs(attrs)
        new = attrs
        changed = False
        if "data-e" in A:
            key = prefix + "." + slug(plain(inner_html(html, m.end(), tag)))
            n = used.get(key, 0)
            used[key] = n + 1
            if n:
                key = "%s-%d" % (key, n + 1)
            new = re.sub(r"(?:^|\s)data-e(?=\s|$)", ' data-edit="%s"' % key, new, count=1)
            changed = True
        nblk = "data-nblk" in A
        parent_cont = bool(stack) and stack[-1][1]
        if "data-blk" not in A:
            want = ("data-cont" in A or "data-label" in A or
                    (not nblk and (low in AUTO_TAGS or parent_cont)))
            if want and low not in ("svg", "path", "g", "circle", "line", "text", "use", "symbol", "defs"):
                key = "blk.%s.%s" % (prefix, block_base(tag, A, html, m.end()))
                if re.fullmatch(r"blk\.[a-z0-9-]+\.\d+", key):
                    key = key.rsplit(".", 1)[0] + ".n" + key.rsplit(".", 1)[1]
                n = used.get(key, 0)
                used[key] = n + 1
                if n:
                    key = "%s-%d" % (key, n + 1)
                new += ' data-blk="%s"' % key
                changed = True
        if nblk:
            new = new.replace(" data-nblk", "")
            changed = True
        if changed:
            out.append(html[last:m.start()])
            out.append("<%s%s%s>" % (tag, new, selfclose))
            last = m.end()
        if not selfclose and low not in VOID:
            stack.append((low, "data-cont" in A))
    out.append(html[last:])
    return "".join(out)


def read(name, ext):
    p = os.path.join(PARTS, name + ext)
    return open(p, encoding="utf-8").read() if os.path.exists(p) else None


def flatten(entries):
    for e in entries:
        if isinstance(e, str):
            yield e
        else:
            for x in flatten(e["parts"]):
                yield x


def rewrite_home_links(html):
    """Sur les pages secondaires, les liens d'ancre du menu pointent vers la page d'accueil."""
    return re.sub(r'href="#(?!main")([^"]*)"', lambda m: 'href="index.html#%s"' % m.group(1), html)


def build_page(cfg, shell, dj, used_global):
    css, js, body = [], [], []
    used = {}
    seen = set()

    def add_part(name, home):
        pfx = part_prefix(name)
        c, j, h = read(name, ".css"), read(name, ".js"), read(name, ".html")
        if c is not None:
            css.append("/* ---- %s ---- */\n%s" % (name, c.strip()))
        if j is not None:
            js.append("/* ---- %s ---- */\n%s" % (name, j.strip()))
        if h is None:
            return ""
        if not home and name.endswith("-nav"):
            h = rewrite_home_links(h)
        return process_html(h, pfx, used)

    home = cfg.get("home", True)
    for e in cfg["parts"]:
        if isinstance(e, str):
            body.append(add_part(e, home))
        else:
            inner = "\n".join(add_part(n, home) for n in e["parts"])
            body.append('<div class="chapter" data-blk="blk.ch.%s" data-chap="%s" data-cont="sec" data-label="%s" id="ch-%s">\n%s\n</div>' % (
                e["chapter"], e["chapter"], H.escape(e["label"], quote=True), e["chapter"], inner))
    script = '(function(){\n"use strict";\n' + "\n".join(js) + "\n})();"
    script = script.replace("/*DEFAULTS_JSON*/", "/*DEFAULTS_BEGIN*/" + dj + "/*DEFAULTS_END*/")
    page = (shell.replace("<!--CSS-->", "\n".join(css)).replace("<!--BODY-->", "\n".join(body)).replace("<!--JS-->", script)
            .replace("{{PAGE}}", cfg.get("id", "index"))
            .replace("{{TITLE}}", H.escape(cfg["title"], quote=True))
            .replace("{{DESC}}", H.escape(cfg["description"], quote=True))
            .replace("{{OGTITLE}}", H.escape(cfg.get("og_title", cfg["title"]), quote=True))
            .replace("{{OGDESC}}", H.escape(cfg.get("og_description", cfg["description"]), quote=True)))
    return page, len("\n".join(css)), len(script)


KIT_HEAD = ("// Fichier généré automatiquement (python3 sources/build.py, ou par l'export du site depuis l'administration) : ne pas modifier à la main.\n"
            "// Contient le code du site (fonctions, configuration, sources) servi à l'administrateur par la route /api/admin/kit.\n"
            "export default ")
KIT_ROOT = ["README.md", "deployer-mac.command", "deployer-windows.bat", "netlify.toml", "package.json"]
KIT_EXEC = {"deployer-mac.command"}
KIT_SKIP = {"netlify/lib/kit.mjs", "sources/defaults.json"}  # kit.mjs : le fichier lui-même ; defaults.json : remplacé à chaque export par le contenu à jour


def write_kit():
    """netlify/lib/kit.mjs : copie, embarquée dans la fonction admin, du code du site (fonctions, configuration, sources).
    La route /api/admin/kit la sert à l'administrateur : le bouton « Télécharger le site (.zip) » assemble le zip dans le navigateur."""
    if not os.path.isdir(os.path.join(SITE, "netlify", "functions")):
        return
    rels = [r for r in KIT_ROOT if os.path.isfile(os.path.join(SITE, r))]
    for base in ("netlify", "sources"):
        for root, dirs, names in os.walk(os.path.join(SITE, base)):
            dirs[:] = sorted(d for d in dirs if d != "__pycache__")
            for n in sorted(names):
                rel = os.path.relpath(os.path.join(root, n), SITE).replace(os.sep, "/")
                if rel not in KIT_SKIP and not n.endswith(".pyc") and not n.startswith("."):
                    rels.append(rel)
    kit = {}
    for rel in sorted(set(rels)):
        kit[rel] = {"t": open(os.path.join(SITE, rel), encoding="utf-8", newline="").read()}
        if rel in KIT_EXEC:
            kit[rel]["x"] = 1
    out = os.path.join(SITE, "netlify", "lib", "kit.mjs")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8", newline="").write(KIT_HEAD + json.dumps(kit, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + ";\n")
    print("kit.mjs            %5d Ko ; %d fichiers" % (os.path.getsize(out) // 1024, len(kit)))


def main():
    cfg = json.load(open(os.path.join(SRC, "pages.json"), encoding="utf-8"))
    defaults = json.load(open(os.path.join(SRC, "defaults.json"), encoding="utf-8"))
    dj = json.dumps(defaults, ensure_ascii=False, separators=(",", ":"))
    dj = dj.replace("</", "<\\/")  # un texte contenant </script> ne doit pas fermer le script de la page
    shell = open(os.path.join(SRC, "shell.html"), encoding="utf-8").read()
    pub = os.path.join(SITE, "public")
    os.makedirs(os.path.join(pub, "assets"), exist_ok=True)
    pages_out = []
    for pg in cfg["pages"]:
        html, ncss, njs = build_page(pg, shell, dj, {})
        open(os.path.join(pub, pg["file"]), "w", encoding="utf-8").write(html)
        pages_out.append({"id": pg.get("id", "index"), "file": pg["file"], "label": pg.get("label", pg["title"])})
        print("%-18s %5d Ko ; css %d Ko ; js %d Ko ; %d data-edit ; %d data-blk" % (
            pg["file"], len(html) // 1024, ncss // 1024, njs // 1024, html.count("data-edit="), html.count("data-blk=")))
    json.dump(defaults, open(os.path.join(pub, "assets", "content-default.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"pages": pages_out}, open(os.path.join(pub, "assets", "pages.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    # liste des fichiers publics (utilisée par l'export du site depuis l'admin)
    files = []
    for root, _, names in os.walk(pub):
        for n in sorted(names):
            p = os.path.join(root, n)
            rel = os.path.relpath(p, pub).replace(os.sep, "/")
            if rel == "assets/site-manifest.json":
                continue
            files.append({"path": rel, "size": os.path.getsize(p)})
    files.sort(key=lambda f: f["path"])
    json.dump({"files": files}, open(os.path.join(pub, "assets", "site-manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    write_kit()


if __name__ == "__main__":
    main()
