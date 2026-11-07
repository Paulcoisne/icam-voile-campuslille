/* ===== 3. Icam Voile : mur des membres, organigramme, saison, réseaux ===== */
var POLE_ICON={"Bureau":"briefcase","CCE":"sail","Com":"camera","Événement interne":"calendar","Événement externe":"pin"};
var teamEl=$("#team"),pop=null,popBtn=null;
function fullName(m){return((m.prenom||"")+" "+(m.nom||"")).trim()}
function memberInitials(m){return((m.prenom||"").charAt(0)+(m.nom||"").charAt(0)).toUpperCase()}
var SIL='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.2"/><path d="M3.5 22c.6-4.9 4-7.6 8.5-7.6s7.9 2.7 8.5 7.6z"/></svg>';
function renderTeam(T){
  var groups=[],ix={};POLES.forEach(function(p){ix[p]=groups.length;groups.push({n:p,m:[]})});
  (T||[]).forEach(function(m){var k=canonPole(m.team)||(m.team||"").trim()||"Autre";if(!(k in ix)){ix[k]=groups.length;groups.push({n:k,m:[]})}groups[ix[k]].m.push(m)});
  teamEl.innerHTML="";
  groups.forEach(function(g){
    $$('.cnt[data-count="'+g.n+'"]').forEach(function(c){c.textContent=g.m.length?g.m.length+" membre"+(g.m.length>1?"s":""):""});
    if(!g.m.length)return;
    g.m.sort(function(a,b){return(b.lead?1:0)-(a.lead?1:0)});
    var s=document.createElement("section");s.className="pg";s.id="pole-"+poleKey(g.n);
    s.innerHTML='<div class="pg-h">'+icon(POLE_ICON[g.n]||"users")+'<h4>'+esc(g.n)+'</h4><span>'+g.m.length+' membre'+(g.m.length>1?'s':'')+'</span></div><div class="faces"></div>';
    var box=s.lastChild;
    g.m.forEach(function(m){
      var ph=safeUrl(m.photo),nm=fullName(m),ini=memberInitials(m),b=document.createElement("button");
      b.type="button";b.className="mb"+(m.lead?" lead":"");b._m=m;b._p=g.n;
      b.setAttribute("aria-label",(nm||m.role||"Membre")+(m.role&&nm?", "+m.role:"")+", pôle "+g.n);
      b.innerHTML='<span class="pic'+(ph||ini?"":" sil")+'">'+(ph?faceImg(m,""):ini?esc(ini):SIL)+'</span>'+(m.lead?'<span class="tag">Responsable</span>':'');
      box.appendChild(b)});
    teamEl.appendChild(s)})}
ICV.on(function(D){renderTeam(D.team)});

/* fiche qui apparaît au survol (toucher sur mobile) */
function ensurePop(){if(pop)return pop;pop=document.createElement("div");pop.className="mpop";pop.id="mpop";pop.setAttribute("role","tooltip");document.body.appendChild(pop);return pop}
function showPop(b){var m=b._m,p=ensurePop(),nm=fullName(m);
  var rows=[["Promotion",m.promo],["Niveau de voile",m.voile],["Qualité / compétence",m.qualite],["Défi sportif le plus fou",m.defi]].filter(function(r){return r[1]&&String(r[1]).trim()});
  p.innerHTML='<h5>'+esc(nm||m.role||"Membre")+'</h5><p class="r">'+esc(nm&&m.role?m.role:"")+(nm&&m.role?" · ":"")+'Pôle '+esc(b._p)+'</p>'+(rows.length?'<dl>'+rows.map(function(r){return'<div><dt>'+r[0]+'</dt><dd>'+esc(r[1])+'</dd></div>'}).join("")+'</dl>':"");
  if(!nm&&m.role)p.querySelector(".r").textContent="Pôle "+b._p;
  p.classList.add("show");
  var r=b.getBoundingClientRect(),pw=p.offsetWidth,ph=p.offsetHeight,vw=document.documentElement.clientWidth,x=Math.min(Math.max(8,r.left+r.width/2-pw/2),vw-pw-8),y=r.top-ph-12;
  if(y<8)y=r.bottom+12;p.style.left=x+"px";p.style.top=y+"px";b.setAttribute("aria-describedby","mpop");popBtn=b;b.classList.add("open")}
function hidePop(){if(pop)pop.classList.remove("show");if(popBtn){popBtn.classList.remove("open");popBtn.removeAttribute("aria-describedby")}popBtn=null}
var touchOnly=window.matchMedia&&matchMedia("(hover:none)").matches;
teamEl.addEventListener("mouseover",function(e){var b=e.target.closest(".mb");if(b&&b!==popBtn&&!touchOnly)showPop(b)});
teamEl.addEventListener("mouseout",function(e){var b=e.target.closest(".mb");if(b&&!b.contains(e.relatedTarget))hidePop()});
teamEl.addEventListener("focusin",function(e){var b=e.target.closest(".mb");if(b)showPop(b)});
teamEl.addEventListener("focusout",function(e){if(e.target.closest(".mb"))hidePop()});
teamEl.addEventListener("click",function(e){var b=e.target.closest(".mb");if(!b)return;if(popBtn===b)hidePop();else{hidePop();showPop(b)}});
document.addEventListener("click",function(e){if(!e.target.closest||!e.target.closest(".mb"))hidePop()});
document.addEventListener("keydown",function(e){if(e.key==="Escape")hidePop()});
window.addEventListener("scroll",function(){if(popBtn&&touchOnly===false)hidePop()},{passive:true});

/* organigramme : un clic mène aux membres du pôle */
$$(".onode").forEach(function(n){n.addEventListener("click",function(){var g=document.getElementById("pole-"+poleKey(n.dataset.pole));if(!g)return;
  g.scrollIntoView({behavior:reduce?"auto":"smooth",block:"center"});g.classList.add("flash");setTimeout(function(){g.classList.remove("flash")},1600)})});

/* saison : la ligne se remplit avec le défilement */
(function(){var ol=$("#season");if(!ol)return;var fill=document.createElement("i");fill.className="fill";ol.insertBefore(fill,ol.firstChild);var tick=0;
  function upd(){tick=0;var steps=$$(".st",ol);if(!steps.length)return;
    if(EDIT){steps.forEach(function(s){s.classList.add("on")});fill.style.height="calc(100% - 46px)";return}
    var mark=window.innerHeight*.62,top=ol.getBoundingClientRect().top,dots=steps.map(function(s){var r=$(".dot",s).getBoundingClientRect();return r.top+r.height/2});
    steps.forEach(function(s,i){s.classList.toggle("on",dots[i]<mark)});
    fill.style.top=(dots[0]-top)+"px";fill.style.height=clamp(mark-dots[0],0,dots[dots.length-1]-dots[0])+"px"}
  function req(){if(!tick)tick=requestAnimationFrame(upd)}
  window.addEventListener("scroll",req,{passive:true});window.addEventListener("resize",req);ICV.on(req);req()})();

/* réseaux */
var igEls=$$("[data-ig]"),igN=$('[data-count="ig"]'),liN=$('[data-count="li"]'),socialSeen=false,SOC=null;
function paintSocial(anim){var S=SOC;if(anim){countUp(igN,S.followers);countUp(liN,S.linkedin,"+")}else{igN.textContent=fr(S.followers);liN.textContent=fr(S.linkedin)+"+"}
  $("#goalbar").style.width=Math.min(100,S.followers/Math.max(1,S.goal)*100)+"%"}
function renderSocial(S){SOC=S;igEls.forEach(function(a){a.href=safeUrl(S.instagramUrl)||"#"});
  $("#goaltxt").textContent="Objectif "+fr(S.goal)+" abonnés avant le départ : encore "+fr(Math.max(0,S.goal-S.followers))+" à convaincre.";
  if(socialSeen||EDIT)paintSocial(false)}
onView(igN,function(){socialSeen=true;if(SOC)paintSocial(true)});
ICV.on(function(D){renderSocial(D.social)});
