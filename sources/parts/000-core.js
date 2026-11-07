/* ===== Noyau : outils communs, contenu éditable, rendu ===== */
var DEFAULTS=/*DEFAULTS_JSON*/;
var RACE_START="2027-04-10T09:00:00+02:00";
var POLES=["Bureau","CCE","Com","Événement interne","Événement externe"];
var EDIT=/[?&]edition=/.test(location.search);
if(EDIT)document.documentElement.classList.add("edition");
var reduce=!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches);
function fr(n){return Math.round(n).toLocaleString("fr-FR")}
function eur(n){return fr(n)+" €"}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function safeUrl(u){u=String(u||"");return /^(https?:\/\/|\/api\/media\/|assets\/)/.test(u)?u:""}
function $(s,r){return(r||document).querySelector(s)}
function $$(s,r){return[].slice.call((r||document).querySelectorAll(s))}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function onView(el,fn,th,margin){if(!el)return;if(EDIT||!("IntersectionObserver" in window)){fn();return}
  var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){io.disconnect();fn()}},{threshold:th==null?.25:th,rootMargin:margin||"0px"});io.observe(el)}
function countUp(el,to,suffix){suffix=suffix||"";if(reduce||EDIT){el.textContent=fr(to)+suffix;return}
  var t0=performance.now();(function f(t){var p=Math.min((t-t0)/1300,1),e=1-Math.pow(1-p,3);el.textContent=fr(to*e)+suffix;if(p<1)requestAnimationFrame(f)})(t0)}
/* Compteurs : tout élément [data-n] s'anime à l'arrivée à l'écran */
function armCounters(root){$$("[data-n]",root).forEach(function(el){if(el.dataset.armed)return;el.dataset.armed=1;onView(el,function(){countUp(el,+el.dataset.n,el.dataset.suffix||"")},.4)})}
function faceImg(m,alt){var u=safeUrl(m&&m.photo);if(!u)return"";var z=Math.max(1,Math.min(4,+m.zoom||1)),x=Math.max(0,Math.min(100,m.fx==null||m.fx===""?50:+m.fx)),y=Math.max(0,Math.min(100,m.fy==null||m.fy===""?50:+m.fy));
  return'<img src="'+esc(u)+'" alt="'+esc(alt||"")+'" loading="lazy" style="object-position:'+x+'% '+y+'%;transform-origin:'+x+'% '+y+'%;transform:scale('+z+')">'}
function icon(id,cls){return'<svg class="ic'+(cls?" "+cls:"")+'" aria-hidden="true"><use href="#i-'+id+'"/></svg>'}

var ICV={R:[]};
ICV.on=function(f){ICV.R.push(f)};

/* ----- Pôles : noms canoniques et alias ----- */
function poleKey(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z]/g,"")}
var POLE_ALIAS={bureau:"Bureau",cce:"CCE",com:"Com",communication:"Com",
  eventinterne:"Événement interne",evenementinterne:"Événement interne",evenementsinternes:"Événement interne",eventsinternes:"Événement interne",
  eventexterne:"Événement externe",evenementexterne:"Événement externe",evenementsexternes:"Événement externe",eventsexternes:"Événement externe"};
function canonPole(s){var k=poleKey(s);return POLE_ALIAS[k]||null}

/* ----- Migration du contenu enregistré par l'ancienne version (avant les 13 parties) ----- */
function migrate(D){
  if(!D)return D;
  if(!(D.v>=2))D=migrate2(D);
  if(!(D.v>=3)){D=Object.assign({},D);D.v=3;
    var L=DEFAULTS.legacy||{};
    D.removed=(D.removed||[]).map(function(k){return L[k]||(/^blk\.[a-z]+\.\d+$/.test(k)?null:k)}).filter(Boolean);
    D.dups=(D.dups||[]).map(function(d){var s=L[d.src]||(/^blk\.[a-z]+\.\d+$/.test(d.src)?null:d.src),a=L[d.after]||(/^blk\.[a-z]+\.\d+$/.test(d.after||"")?null:d.after);return s?{id:d.id,src:s,after:a||s}:null}).filter(Boolean)}
  return D}
function migrate2(D){
  if(!D||D.v>=2)return D;
  var o=Object.assign({},D);o.v=2;
  o.team=(D.team||[]).map(function(m){var n=Object.assign({},m);delete n.motivation;delete n.anciennete;delete n.cce;delete n.origine;
    n.team=canonPole(n.team)||"CCE";return n});
  var imgs=D.images||{},keep={};["img.top.1","img.equipe.13","bg.contact"].forEach(function(k){if(imgs[k])keep[k]=imgs[k]});o.images=keep;
  o.gallery=Object.assign({},D.gallery||{});delete o.gallery.course;   /* la galerie « En course » n'existe plus (accueil simplifié) */
  var map={projet:["cce","vocab","obj"],equipe:["asso"],budget:["budget"],offres:["why","gain"],"formules-bloc":["formules"],simulateur:["sim"],sponsors:["sponsors"],contact:["contact"]},h=[];
  (D.hidden||[]).forEach(function(id){(map[id]||[]).forEach(function(x){if(h.indexOf(x)<0)h.push(x)})});o.hidden=h;
  o.removed=[];o.dups=[];
  return o}

function withDefaults(c){var d=DEFAULTS,o=Object.assign({},c),cs=c.sim||{};
  ["budget","tiers","perks","youtube","team","sponsors"].forEach(function(k){if(o[k]==null)o[k]=d[k]});
  if(!o.tiers.length)o.tiers=d.tiers;if(!o.perks.length)o.perks=d.perks;
  o.social=Object.assign({},d.social,c.social||{});
  o.sim=Object.assign({},d.sim,cs);o.sim.surfaces=Object.assign({},d.sim.surfaces,cs.surfaces||{});o.sim.watermark=Object.assign({},d.sim.watermark,cs.watermark||{});o.sim.jacket=Object.assign({},d.sim.jacket,cs.jacket||{});
  o.gallery=Object.assign({},c.gallery||{});
  return o}

/* ----- Textes modifiables depuis l'admin ----- */
function richText(s){return esc(s).replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/\n/g,"<br>")}
var OKTAG={B:1,STRONG:1,I:1,EM:1,U:1,BR:1,A:1,SMALL:1,SPAN:1};
function sanitize(html){var t=document.createElement("template");t.innerHTML=String(html);
  (function walk(n){[].slice.call(n.childNodes).forEach(function(c){
    if(c.nodeType===3)return;if(c.nodeType!==1){c.remove();return}walk(c);
    if(c.tagName==="DIV"||c.tagName==="P"){var f=document.createDocumentFragment();if(c.previousSibling)f.appendChild(document.createElement("br"));while(c.firstChild)f.appendChild(c.firstChild);c.replaceWith(f);return}
    if(!OKTAG[c.tagName]){var g=document.createDocumentFragment();while(c.firstChild)g.appendChild(c.firstChild);c.replaceWith(g);return}
    var href=c.getAttribute("href");[].slice.call(c.attributes).forEach(function(a){c.removeAttribute(a.name)});
    if(c.tagName==="A"){if(href&&/^(https?:|mailto:|tel:|#|\/)/i.test(href)){c.setAttribute("href",href);if(/^https?:/i.test(href)){c.setAttribute("target","_blank");c.setAttribute("rel","noopener")}}}})})(t.content);
  return t.innerHTML}
function applyTexts(T){if(!T)return;$$("[data-edit]").forEach(function(el){var v=T[el.dataset.edit];if(typeof v!=="string")return;el.innerHTML=/[<&]/.test(v)?sanitize(v):richText(v);
  if(el.tagName==="LI")el.classList.toggle("icv-removed",!el.textContent.trim()&&!el.querySelector("img"));
  if(el.dataset.n!==undefined){var num=parseInt(el.textContent.replace(/[^0-9]/g,""),10);if(!isNaN(num))el.dataset.n=num}})}
function applyImages(I){if(!I)return;$$("[data-img]").forEach(function(el){var u=safeUrl(I[el.dataset.img]);if(u)el.src=u});
  $$("[data-bg]").forEach(function(el){var u=safeUrl(I[el.dataset.bg]);if(u)el.style.backgroundImage="url('"+u.replace(/'/g,"")+"')"})}
function safeHref(u){u=String(u||"").trim();return /^(https?:\/\/|mailto:|tel:|#|\/|assets\/|index\.html|vocabulaire\.html)/i.test(u)?u:""}
/* Liens modifiés depuis l'admin : D.links[clé du bloc ou du texte] = adresse */
var LINK0={};
function applyLinks(L){$$("a[data-edit],a[data-blk]").forEach(function(a){var id=a.dataset.edit||a.dataset.blk;
  if(!(id in LINK0))LINK0[id]=a.getAttribute("href");var u=safeHref((L||{})[a.dataset.edit]||(L||{})[a.dataset.blk]);
  if(u){a.setAttribute("href",u);if(/^https?:/i.test(u)){a.setAttribute("target","_blank");a.setAttribute("rel","noopener")}else{a.removeAttribute("target")}}
  else if(LINK0[id]!=null){a.setAttribute("href",LINK0[id])}})}
var SECTION_IDS=["icam","asso","cce","obj","budget","why","gain","formules","sim","sponsors","contact"];
function applySections(hidden){hidden=hidden||[];SECTION_IDS.forEach(function(id){var el=document.getElementById(id);if(el)el.hidden=hidden.indexOf(id)>=0});
  $$("[data-spy]").forEach(function(a){var ids=a.dataset.spy.split(" "),all=ids.every(function(id){return hidden.indexOf(id)>=0});if(!a.classList.contains("btn"))a.hidden=all})}

/* ----- Structure : blocs supprimés, dupliqués ou ajoutés depuis l'admin ----- */
function rekey(root,id){[root].concat($$("[data-edit],[data-img],[data-blk]",root)).forEach(function(e){["edit","img","blk"].forEach(function(k){if(e.dataset[k])e.dataset[k]=e.dataset[k]+"~"+id})})}
function blk(k){return k?document.querySelector('[data-blk="'+String(k).replace(/["\\]/g,"")+'"]'):null}
/* position d'origine de chaque bloc (repère) : permet de rétablir l'ordre avant d'appliquer celui de l'admin */
var MK=[];
function initMarkers(){if(MK.length||!document.querySelector("[data-cont]"))return;
  $$("[data-blk]").forEach(function(el){var p=el.parentElement;if(p&&p.hasAttribute("data-cont")){var m=document.createComment("");p.insertBefore(m,el);MK.push([el,m])}})}
function restoreOrder(){MK.forEach(function(x){var el=x[0],m=x[1];if(m.parentNode&&m.nextSibling!==el)m.parentNode.insertBefore(el,m.nextSibling)})}

/* Blocs ajoutés : chaque type fabrique son HTML ; les textes passent par data-edit (clé cb.<id>.<emplacement>) */
var CB={
  title:{label:"Titre",kind:"sp",html:function(i){return'<h3 class="sub" data-edit="cb.'+i+'.t">Nouveau titre</h3>'},tx:{t:"Nouveau titre"}},
  text:{label:"Paragraphe",kind:"sp",html:function(i){return'<p class="cb-p" data-edit="cb.'+i+'.t">Écrivez votre texte ici.</p>'},tx:{t:"Écrivez votre texte ici."}},
  image:{label:"Image",kind:"sp",html:function(i,p){return'<figure class="ph cb-img"><img alt="" data-img="cb.'+i+'.i" loading="lazy" src="'+esc(p&&p.src||"assets/img/g04.webp")+'"/><figcaption data-edit="cb.'+i+'.c">Légende de la photo</figcaption></figure>'},tx:{c:"Légende de la photo"}},
  button:{label:"Bouton",kind:"sp",html:function(i,p){return'<p class="cb-btn"><a class="btn" data-edit="cb.'+i+'.t" href="'+esc(safeHref(p&&p.href)||"#contact")+'">Texte du bouton</a></p>'},tx:{t:"Texte du bouton"}},
  callout:{label:"Encadré",kind:"sp",html:function(i){return'<div class="cb-call"><h4 data-edit="cb.'+i+'.t">Titre de l\u2019encadré</h4><p data-edit="cb.'+i+'.p">Un message important, une date, une annonce.</p></div>'},tx:{t:"Titre de l\u2019encadré",p:"Un message important, une date, une annonce."}},
  columns:{label:"Deux colonnes",kind:"sp",html:function(i){return'<div class="cb-cols"><div><h4 data-edit="cb.'+i+'.t1">Première colonne</h4><p data-edit="cb.'+i+'.p1">Votre texte.</p></div><div><h4 data-edit="cb.'+i+'.t2">Seconde colonne</h4><p data-edit="cb.'+i+'.p2">Votre texte.</p></div></div>'},tx:{t1:"Première colonne",p1:"Votre texte.",t2:"Seconde colonne",p2:"Votre texte."}},
  video:{label:"Vidéo YouTube",kind:"sp",html:function(i,p){var y=/^[A-Za-z0-9_-]{6,20}$/.test(p&&p.yt||"")?p.yt:"";return y?'<div class="cb-vid"><iframe allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin" src="https://www.youtube-nocookie.com/embed/'+y+'?rel=0" title="Vidéo"></iframe></div>':'<div class="cb-vid cb-vid-empty"><span>Collez le lien YouTube dans le panneau de droite.</span></div>'},tx:{}},
  space:{label:"Espace vide",kind:"sp",html:function(){return'<div class="cb-space" aria-hidden="true"></div>'},tx:{}},
  divider:{label:"Séparateur",kind:"sp",html:function(){return'<hr class="cb-hr"/>'},tx:{}},
  section:{label:"Section complète",kind:"sec",html:function(i){return'<div class="w" data-blk="blk.cb.'+i+'.w" data-cont="sp"><div class="spart" data-blk="blk.cb.'+i+'.sh" data-label="Titre de la section"><div class="sh"><h2 data-edit="cb.'+i+'.h">Titre de la nouvelle section</h2><p class="lead" data-edit="cb.'+i+'.l">Une phrase pour présenter cette section.</p></div></div></div>'},tx:{h:"Titre de la nouvelle section",l:"Une phrase pour présenter cette section."}}
};
ICV.CB=CB;
function buildCustom(D){var C=D.custom||{};Object.keys(C).forEach(function(id){var c=C[id],T=CB[c.type];if(!T||!/^[a-z0-9]{3,8}$/.test(id))return;
    var par=blk(c.parent);if(!par)return;var el;
    if(c.type==="section"){el=document.createElement("section");el.className="sec cb-sec"+(c.alt?" alt":"");el.id="cb-"+id;el.innerHTML=T.html(id,c.props)}
    else{el=document.createElement("div");el.className="spart cb cb-"+c.type;el.innerHTML=T.html(id,c.props)}
    el.dataset.cb=id;el.dataset.blk="blk.cb."+id;el.dataset.label=c.label||T.label;
    par.appendChild(el)})}
function applyStructure(D){$$("[data-dup]").forEach(function(e){e.remove()});$$("[data-cb]").forEach(function(e){e.remove()});
  initMarkers();restoreOrder();buildCustom(D);
  (D.dups||[]).forEach(function(d){var src=blk(d.src),after=blk(d.after||d.src)||src;if(!src||!after||src.querySelector("[id]"))return;
    var c=src.cloneNode(true);c.dataset.dup=d.id;c.classList.remove("icv-removed");rekey(c,d.id);after.parentNode.insertBefore(c,after.nextSibling)});
  $$(".icv-removed").forEach(function(e){e.classList.remove("icv-removed")});
  (D.removed||[]).forEach(function(k){var e=blk(k);if(e)e.classList.add("icv-removed")})}

/* ----- Mise en page : ordre des blocs, styles, thème (tout est modifiable depuis l'admin) ----- */
var FONTS={
  "Saira Condensed":{s:'"Saira Condensed","Arial Narrow","Roboto Condensed",Arial,sans-serif'},
  "Saira":{s:'"Saira","Segoe UI",Roboto,Helvetica,Arial,sans-serif'},
  "Oswald":{s:'"Oswald","Arial Narrow",Arial,sans-serif',g:"Oswald:wght@500;600;700"},
  "Barlow Condensed":{s:'"Barlow Condensed","Arial Narrow",Arial,sans-serif',g:"Barlow+Condensed:wght@500;600;700"},
  "Montserrat":{s:'"Montserrat","Segoe UI",Arial,sans-serif',g:"Montserrat:wght@400;500;600;700"},
  "Poppins":{s:'"Poppins","Segoe UI",Arial,sans-serif',g:"Poppins:wght@400;500;600;700"},
  "Playfair Display":{s:'"Playfair Display",Georgia,serif',g:"Playfair+Display:wght@500;700"},
  "Georgia":{s:'Georgia,"Times New Roman",serif'},
  "Système":{s:'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif'}
};
ICV.FONTS=FONTS;
var COL=/^(#[0-9a-fA-F]{3,8}|rgba?\([0-9 ,.%]+\)|transparent|currentColor|var\(--[a-z-]+\))$/,LEN=/^(-?\d+(\.\d+)?(px|rem|em|%|vw|vh|ch)?|auto|none)$/,NUM=/^-?\d+(\.\d+)?$/;
function kw(){var l=[].slice.call(arguments);return function(v){return l.indexOf(v)>=0}}
var SHADOW={none:"none",sm:"0 2px 8px #0b2a4526",md:"0 10px 28px #0b2a4530",lg:"0 24px 56px #0b2a4545"};
var CSSP={"color":COL,"background-color":COL,"border-color":COL,"font-size":LEN,"line-height":NUM,"letter-spacing":LEN,"font-weight":kw("400","500","600","700","800"),"font-style":kw("normal","italic"),
  "text-align":kw("left","center","right","justify"),"text-transform":kw("none","uppercase","lowercase","capitalize"),"text-decoration":kw("none","underline","line-through"),
  "margin-top":LEN,"margin-right":LEN,"margin-bottom":LEN,"margin-left":LEN,"padding-top":LEN,"padding-right":LEN,"padding-bottom":LEN,"padding-left":LEN,
  "width":LEN,"max-width":LEN,"height":LEN,"min-height":LEN,"border-radius":LEN,"border-width":LEN,"border-style":kw("none","solid","dashed","dotted"),"opacity":NUM,
  "display":kw("none","block","flex","grid","inline-block"),"gap":LEN,"flex-direction":kw("row","column","row-reverse","column-reverse"),
  "justify-content":kw("flex-start","center","flex-end","space-between","space-around"),"align-items":kw("flex-start","center","flex-end","stretch"),"flex-wrap":kw("wrap","nowrap"),
  "object-fit":kw("cover","contain"),"object-position":/^\d{1,3}% \d{1,3}%$/,"aspect-ratio":/^\d+(\.\d+)? ?\/ ?\d+(\.\d+)?$/,
  "grid-columns":/^[1-6]$/,"shadow":kw("none","sm","md","lg"),"font-family":function(v){return !!FONTS[v]}};
ICV.CSSP=CSSP;
function cssDecl(p){var o=[];Object.keys(p||{}).forEach(function(n){var v=String(p[n]).trim(),t=CSSP[n];if(!t||v===""||/[;{}<>\\]|url\(|expression|@import/i.test(v))return;
  if(!(typeof t==="function"?t(v):t.test(v)))return;
  if(t===LEN&&NUM.test(v)&&+v!==0)v+="px";
  if(n==="grid-columns")o.push("grid-template-columns:repeat("+v+",minmax(0,1fr))!important");
  else if(n==="shadow")o.push("box-shadow:"+SHADOW[v]+"!important");
  else if(n==="font-family")o.push("font-family:"+FONTS[v].s+"!important");
  else o.push(n+":"+v+"!important")});return o.join(";")}
var MQ={d:"",t:"@media (max-width:900px)",m:"@media (max-width:600px)"},HQ={d:"@media (min-width:901px)",t:"@media (min-width:601px) and (max-width:900px)",m:"@media (max-width:600px)"};
function selOf(k){k=String(k).replace(/[^A-Za-z0-9._~-]/g,"");return k?'[data-blk="'+k+'"],[data-edit="'+k+'"],[data-img="'+k+'"]':""}
function usedFonts(D){var f={},S=D.styles||{},T=D.theme||{};Object.keys(S).forEach(function(k){["d","t","m"].forEach(function(d){var n=S[k]&&S[k][d]&&S[k][d]["font-family"];if(FONTS[n])f[n]=1})});
  ["--display","--text"].forEach(function(v){if(FONTS[T[v]])f[T[v]]=1});return Object.keys(f)}
function ensureFonts(D){var need=usedFonts(D).filter(function(n){return FONTS[n].g});var id="icv-fonts",l=document.getElementById(id);
  if(!need.length){if(l)l.remove();return}var href="https://fonts.googleapis.com/css2?"+need.map(function(n){return"family="+FONTS[n].g}).join("&")+"&display=swap";
  if(!l){l=document.createElement("link");l.id=id;l.rel="stylesheet";document.head.appendChild(l)}if(l.getAttribute("href")!==href)l.setAttribute("href",href)}
var THEME_VARS=["--abyss","--deep","--navy","--sea","--signal","--signal-soft","--signal-ink","--foam","--chalk","--ink","--muted","--line","--sky","--display","--text"];
ICV.THEME_VARS=THEME_VARS;
function buildCSS(D){var out=[],S=D.styles||{},H=(D.layout||{}).hide||{},T=D.theme||{},tv=[];
  THEME_VARS.forEach(function(v){var x=T[v];if(x==null||x==="")return;if(v==="--display"||v==="--text"){if(FONTS[x])tv.push(v+":"+FONTS[x].s)}else if(COL.test(x))tv.push(v+":"+x)});
  if(tv.length)out.push(":root{"+tv.join(";")+"}");
  Object.keys(S).forEach(function(k){var sel=selOf(k);if(!sel)return;["d","t","m"].forEach(function(d){var c=cssDecl(S[k][d]);if(!c)return;var r=sel+"{"+c+"}";out.push(MQ[d]?MQ[d]+"{"+r+"}":r)})});
  Object.keys(H).forEach(function(k){var sel=selOf(k);if(!sel)return;["d","t","m"].forEach(function(d){if(!H[k][d])return;
    var r=EDIT?sel+"{opacity:.28!important;outline:2px dashed #e0462f!important;outline-offset:-2px}":sel+"{display:none!important}";out.push(HQ[d]+"{"+r+"}")})});
  return out.join("\n")}
ICV.buildCSS=buildCSS;
function applyLayout(D){var L=D.layout||{},O=L.order||{};
  Object.keys(O).forEach(function(ck){var cont=blk(ck);if(!cont||!Array.isArray(O[ck]))return;
    var want=O[ck].map(blk).filter(function(e){return e&&e!==cont&&!e.contains(cont)});if(!want.length)return;
    var kids=[].slice.call(cont.children),set=want,first=kids.length,ref=null,i;
    want.forEach(function(e){var x=kids.indexOf(e);if(x>=0&&x<first)first=x});
    for(i=first;i<kids.length;i++){if(set.indexOf(kids[i])<0){ref=kids[i];break}}
    want.forEach(function(e){cont.insertBefore(e,ref)})});
  var st=document.getElementById("icv-custom");if(!st){st=document.createElement("style");st.id="icv-custom";document.head.appendChild(st)}
  var css=buildCSS(D);if(st.textContent!==css)st.textContent=css;ensureFonts(D)}
ICV.P=[];ICV.post=function(f){ICV.P.push(f)};

/* ----- Galeries photo (ajout, retrait et ordre depuis l'admin) ----- */
var GAL={};
function galleryItems(D,name){var g=(D.gallery||{})[name];return Array.isArray(g)?g:(DEFAULTS.gallery[name]||[])}
GAL.strip=function(box,items){box.innerHTML=items.map(function(it,i){var u=safeUrl(it.src);return u?'<figure class="gal-i"><img src="'+esc(u)+'" alt="'+esc(it.cap||"Photo Icam Voile")+'" loading="lazy">'+(it.cap?'<figcaption>'+esc(it.cap)+'</figcaption>':'')+'</figure>':''}).join("")};
GAL.mosaic=function(box,items){box.innerHTML=items.map(function(it,i){var u=safeUrl(it.src);return u?'<figure class="gal-i m'+(i%6)+'"><img src="'+esc(u)+'" alt="'+esc(it.cap||"Photo Icam Voile")+'" loading="lazy">'+(it.cap?'<figcaption>'+esc(it.cap)+'</figcaption>':'')+'</figure>':''}).join("")};
GAL.prints=function(box,items){box.innerHTML=items.map(function(it,i){var u=safeUrl(it.src);return u?'<figure class="gal-i p'+(i%5)+'"><img src="'+esc(u)+'" alt="'+esc(it.cap||"Photo Icam Voile")+'" loading="lazy">'+(it.cap?'<figcaption>'+esc(it.cap)+'</figcaption>':'')+'</figure>':''}).join("")};
GAL.reel=function(box,items){var ok=items.filter(function(it){return safeUrl(it.src)});
  var one=ok.map(function(it){var u=safeUrl(it.src);return'<figure class="gal-i"><img src="'+esc(u)+'" alt="'+esc(it.cap||"Photo Icam Voile")+'" loading="lazy">'+(it.cap?'<figcaption>'+esc(it.cap)+'</figcaption>':'')+'</figure>'}).join("");
  var still=reduce||EDIT||ok.length<2,reps=still?1:Math.max(2,Math.ceil(3200/(ok.length*354)));
  var clone=one.replace(/<figure class="gal-i"/g,'<figure class="gal-i" aria-hidden="true"'),h=one;for(var k=1;k<reps;k++)h+=clone;
  box.innerHTML=ok.length?'<div class="rl-track" style="--rl-reps:'+reps+';--rl-d:'+Math.round(ok.length*8.8)+'s">'+h+'</div>':""};
ICV.on(function(D){$$("[data-gallery]").forEach(function(box){var items=galleryItems(D,box.dataset.gallery),t=box.dataset.gtype||"strip";
  (GAL[t]||GAL.strip)(box,items);box.hidden=!items.length&&!EDIT;box.dispatchEvent(new CustomEvent("galleryrender",{bubbles:true}))})});

/* ----- Rendu global ----- */
function renderAll(D){
  D=withDefaults(migrate(D));ICV.D=D;
  applyStructure(D);
  ICV.R.forEach(function(f){try{f(D)}catch(e){if(window.console)console.error(e)}});
  applyTexts(D.texts);applyImages(D.images);applyLinks(D.links);
  applyLayout(D);applySections(D.hidden);
  ICV.P.forEach(function(f){try{f(D)}catch(e){if(window.console)console.error(e)}});
  window.SIMCFG=D.sim||null;try{window.dispatchEvent(new CustomEvent("simcfg",{detail:D.sim||null}))}catch(e){}
  armCounters(document)}
