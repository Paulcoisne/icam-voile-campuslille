/* ===== 5. Vocabulaire : allures, anatomie, glossaire, quiz ===== */

/* --- Allures : l'angle du bateau par rapport au vent --- */
(function(){
  var svg=$("#alSvg");if(!svg)return;
  var ns="http://www.w3.org/2000/svg",R=170,i,out='';
  out+='<circle class="ring" r="'+R+'"/>';
  for(i=0;i<360;i+=10){var a=i*Math.PI/180,l=i%30===0?14:8;out+='<line class="tick" x1="'+(Math.sin(a)*(R-l)).toFixed(1)+'" y1="'+(-Math.cos(a)*(R-l)).toFixed(1)+'" x2="'+(Math.sin(a)*R).toFixed(1)+'" y2="'+(-Math.cos(a)*R).toFixed(1)+'"/>'}
  [45,90,135,180].forEach(function(d){[1,-1].forEach(function(s){if(d===180&&s===-1)return;var a=d*Math.PI/180;out+='<text class="tk" x="'+(s*Math.sin(a)*(R+17)).toFixed(1)+'" y="'+(-Math.cos(a)*(R+17)+4).toFixed(1)+'">'+d+'°</text>'})});
  var w=35*Math.PI/180;
  out+='<path class="nogo" d="M0 0 L'+(-Math.sin(w)*R).toFixed(1)+' '+(-Math.cos(w)*R).toFixed(1)+' A'+R+' '+R+' 0 0 1 '+(Math.sin(w)*R).toFixed(1)+' '+(-Math.cos(w)*R).toFixed(1)+'Z"/><text class="ngl" x="0" y="-118">zone interdite</text>';
  [-32,0,32].forEach(function(x){out+='<path class="wind" d="M'+x+' -226 V-184 M'+(x-7)+' -193 L'+x+' -182 L'+(x+7)+' -193"/>'});
  out+='<text class="windt" x="64" y="-204">Vent</text>';
  out+='<g id="alBoat"><path class="hull" d="M0 -80C20 -52 22 24 12 70L-12 70C-22 24 -20 -52 0 -80Z"/><path class="deck" d="M-9 36L9 36L11 56L-11 56Z"/><g id="alSails"></g><g id="alSpi" opacity="0"></g><circle cx="0" cy="-18" r="4" fill="#0b2a45"/></g>';
  svg.innerHTML=out;
  var boat=$("#alBoat"),sails=$("#alSails"),spi=$("#alSpi"),range=$("#alRange"),tack=$("#alTack"),cur=45,tw=45;
  function txt(sel,attr){var e=$("#alData ["+attr+'="'+sel+'"]');return e?e.textContent:""}
  function bin(a){return a<35?"debout":a<55?"pres":a<75?"bonplein":a<105?"travers":a<140?"largue":a<170?"grandlargue":"arriere"}
  function f1(n){return n.toFixed(1)}
  /* voile vue du dessus : lentille entre le point d'attache et la pointe, ventre côté sous le vent */
  function lens(x0,y0,x1,y1,sg,belly){var vx=x1-x0,vy=y1-y0,l=Math.sqrt(vx*vx+vy*vy)||1,px=sg*vy/l,py=-sg*vx/l,cx=(x0+x1)/2+px*belly,cy=(y0+y1)/2+py*belly;
    return"M"+f1(x0)+" "+f1(y0)+"Q"+f1(cx)+" "+f1(cy)+" "+f1(x1)+" "+f1(y1)+"Z"}
  function draw(a){
    /* s = -1 : tribord amures (vent par la droite, bateau tourné vers la gauche du vent) ; s = +1 : bâbord amures */
    var s=tack.checked?1:-1,b=clamp((a-30)*.58,4,86)*Math.PI/180,j=b*.7,mx=0,my=-18,L=84;
    var ex=s*Math.sin(b)*L,ey=my+Math.cos(b)*L,jx=s*Math.sin(j)*64,jy=-74+Math.cos(j)*64;
    var op=clamp((a-100)/16,0,1),off=-s*clamp((a-118)*.55,-6,34);
    sails.innerHTML='<path class="sail" d="'+lens(mx,my,ex,ey,s,a>=120?26:18)+'"/>'+
      '<line x1="'+mx+'" y1="'+my+'" x2="'+f1(ex)+'" y2="'+f1(ey)+'" stroke="#0b2a45" stroke-width="2.4" stroke-linecap="round"/>'+
      '<g opacity="'+f1(1-op)+'"><path class="sail" d="'+lens(0,-74,jx,jy,s,9)+'"/></g>';
    spi.setAttribute("opacity",f1(op));
    spi.innerHTML=op>0?'<path class="spi" d="M0 -76C'+f1(off-74)+' -118 '+f1(off-44)+' -176 '+f1(off)+' -170C'+f1(off+44)+' -176 '+f1(off+74)+' -118 0 -76Z"/><path class="spi2" d="M0 -76C'+f1(off-30)+' -110 '+f1(off-14)+' -150 '+f1(off)+' -170"/>':"";
    boat.setAttribute("transform","rotate("+f1(s*a)+")")}
  function read(a){var k=bin(a);$("#alDeg").textContent=Math.round(a);$("#alName").textContent=txt(k,"data-k");$("#alDesc").textContent=txt(k,"data-d");
    $("#alSide").textContent=a<35?"":txt(tack.checked?"babord":"tribord","data-k");
    $$(".al-quick button").forEach(function(b){b.classList.toggle("on",Math.abs(+b.dataset.a-a)<6)});
    }
  var raf=0;
  function go(a,fast){tw=a;cancelAnimationFrame(raf);if(fast||reduce||EDIT){cur=a;draw(cur);read(cur);return}
    (function step(){var d=tw-cur;if(Math.abs(d)<.6){cur=tw}else cur+=d*.22;draw(cur);read(cur);if(cur!==tw)raf=requestAnimationFrame(step)})()}
  range.addEventListener("input",function(){go(+range.value,true)});
  $$(".al-quick button").forEach(function(b){b.addEventListener("click",function(){range.value=b.dataset.a;go(+b.dataset.a)})});
  tack.addEventListener("change",function(){go(+range.value,true)});
  ICV.on(function(){go(+range.value,true)});
})();

/* --- Anatomie d'un voilier : schéma et points cliquables --- */
(function(){
  var svg=$("#anSvg");if(!svg)return;
  svg.innerHTML=
   '<defs><linearGradient id="spg" x1="0" x2="1"><stop offset="0" stop-color="#ff7a2f"/><stop offset=".55" stop-color="#ffb06e"/><stop offset="1" stop-color="#2a7ab8"/></linearGradient></defs>'+
   '<path d="M300 312L322 312L328 366L296 366Z" fill="#9fb6cb"/><ellipse cx="312" cy="372" rx="26" ry="8" fill="#7f9bb3"/><path d="M82 262L98 262L106 328L90 328Z" fill="#9fb6cb"/>'+
   '<path d="M64 258L546 244C540 282 508 308 448 314L156 314C104 308 72 286 64 258Z" fill="#f3f8fc"/><path d="M66 267L542 252" stroke="#ff7a2f" stroke-width="6" fill="none"/>'+
   '<path d="M262 246L284 226L372 226L388 245Z" fill="#cfdde9"/>'+
   '<path d="M340 24L546 244M340 24L70 252" stroke="#9fb6cb" stroke-width="1.5" fill="none"/>'+
   '<g id="anJib"><path d="M366 52Q380 150 352 236L530 227Z" fill="#eaf3fa" stroke="#9fb6cb" stroke-width="1.5"/></g>'+
   '<path d="M336 30Q204 104 112 222L336 226Z" fill="#f3f8fc" stroke="#9fb6cb" stroke-width="1.5"/>'+
   '<path d="M340 246V22" stroke="#cfdae5" stroke-width="6" stroke-linecap="round"/><path d="M340 230L108 224" stroke="#cfdae5" stroke-width="5" stroke-linecap="round"/>'+
   '<path d="M118 224L150 246M150 246L132 246" stroke="#9fb6cb" stroke-width="1.5" fill="none"/>'+
   '<path d="M92 258L150 232" stroke="#9fb6cb" stroke-width="3" stroke-linecap="round"/>'+
   '<g id="anSpiG" opacity="0"><path d="M344 26C470 -8 636 76 590 200C575 240 548 246 540 246C520 170 450 90 344 26Z" fill="url(#spg)" stroke="#ffffff88" stroke-width="1.5"/></g>'+
   '<path class="sea" d="M0 300Q40 290 80 300T160 300T240 300T320 300T400 300T480 300T560 300T640 300L640 400L0 400Z"/><path d="M0 300Q40 290 80 300T160 300T240 300T320 300T400 300T480 300T560 300T640 300" fill="none" stroke="#2a7ab8" stroke-width="2.5"/>';
  var root=$("#anat"),hs=$$(".hs",root),defs=$$(".an-def",root),spi=$("#anSpiG"),jib=$("#anJib"),toggle=$("#anSpi"),hover=window.matchMedia&&matchMedia("(hover:hover)").matches;
  function select(k){hs.forEach(function(h){h.classList.toggle("on",h.dataset.k===k)});defs.forEach(function(d){d.classList.toggle("on",d.dataset.k===k)})}
  hs.forEach(function(h){h.addEventListener("click",function(){select(h.dataset.k)});h.addEventListener("mouseenter",function(){if(hover)select(h.dataset.k)});h.addEventListener("focus",function(){select(h.dataset.k)})});
  toggle.addEventListener("change",function(){var on=toggle.checked,h=$(".hs.spi",root);spi.setAttribute("opacity",on?1:0);jib.setAttribute("opacity",on?.3:1);h.hidden=!on;if(on)select("spi");else if(h.classList.contains("on"))select("main")});
  select("main");
})();

/* --- Glossaire : filtre par catégorie et recherche --- */
(function(){
  var root=$("#glossary");if(!root)return;var cat="all",q="",items=$$("#terms details"),none=$(".gl-none",root);
  function norm(s){return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")}
  function apply(){var n=0;items.forEach(function(d){var ok=(cat==="all"||d.dataset.cat===cat)&&(!q||norm(d.textContent).indexOf(q)>=0);d.hidden=!ok&&!EDIT;if(ok)n++});none.hidden=n>0||EDIT}
  $$(".gl-cats button",root).forEach(function(b){b.addEventListener("click",function(){cat=b.dataset.c;$$(".gl-cats button",root).forEach(function(x){x.setAttribute("aria-pressed",x===b)});apply()})});
  $("#glq").addEventListener("input",function(){q=norm(this.value.trim());apply()});
})();

/* --- Quiz éclair --- */
(function(){
  var root=$("#quiz");if(!root)return;var qs=$$(".qz-q",root),end=$(".qz-end",root),next=$("#qzNext"),bar=$("#qzBar"),cnt=$("#qzCount"),i=0,score=0,done=0;
  function show(n){i=n;qs.forEach(function(q,k){q.hidden=k!==n;if(k===n){q.classList.remove("done");$$("button",q).forEach(function(b){b.disabled=false;b.className=""})}});end.hidden=true;
    cnt.textContent="Question "+(n+1)+" sur "+qs.length;next.disabled=true;next.textContent=n===qs.length-1?"Voir mon résultat":"Question suivante";next.hidden=false;bar.style.width=(done/qs.length*100)+"%"}
  function finish(){qs.forEach(function(q){q.hidden=true});end.hidden=false;next.hidden=true;cnt.textContent="Résultat";bar.style.width="100%";
    $("#qzTitle").textContent=score===qs.length?"Quatre sur quatre : prêt à embarquer\u00a0!":score>=qs.length-1?score+" sur "+qs.length+" : vous avez le pied marin.":score+" sur "+qs.length+" : un tour de glossaire et on y retourne ?";
    $("#qzText").textContent=score===qs.length?"Vous parlez déjà le langage du ponton. Reste à nous suivre sur l'eau.":"Les définitions sont juste au-dessus, et notre équipage répond volontiers à vos questions."}
  qs.forEach(function(q){$$(".qz-opts button",q).forEach(function(b){b.addEventListener("click",function(){if(q.classList.contains("done"))return;q.classList.add("done");done++;
    var ok=b.hasAttribute("data-ok");if(ok)score++;$$(".qz-opts button",q).forEach(function(x){x.disabled=true;if(x.hasAttribute("data-ok"))x.classList.add(x===b?"ok":"miss");else if(x===b)x.classList.add("ko")});
    next.disabled=false;bar.style.width=(done/qs.length*100)+"%"})})});
  next.addEventListener("click",function(){if(i<qs.length-1)show(i+1);else finish()});
  $("#qzAgain").addEventListener("click",function(){score=0;done=0;show(0)});
  if(EDIT){qs.forEach(function(q){q.hidden=false;q.classList.add("done")});end.hidden=false;next.hidden=true}else show(0);
})();
