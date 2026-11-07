/* ===== 6. Objectifs : panneaux d'équipes, escalier, roue des compétences ===== */
(function(){
  /* trois équipes : un panneau ouvert à la fois */
  var trio=$("#trio");if(trio){
    var panels=$$(".tr",trio),hov=window.matchMedia&&matchMedia("(hover:hover) and (min-width:861px)").matches;
    function open(p){panels.forEach(function(x){var on=x===p;x.classList.toggle("on",on);$(".tr-h",x).setAttribute("aria-expanded",on)})}
    panels.forEach(function(p){$(".tr-h",p).addEventListener("click",function(){open(p)});
      if(hov)p.addEventListener("mouseenter",function(){open(p)})});
  }
  /* escalier : se monte une fois à l'écran */
  var st=$("#stairs");if(st)onView(st,function(){st.classList.add("in")},.3);

  /* roue des compétences */
  var svg=$("#skSvg");if(!svg)return;
  var ICONS=["briefcase","compass","wrench","users","bolt","leaf"],rad=Math.PI/180,R0=104,R1=186,GAP=3.2,out="";
  function pt(r,a){return[r*Math.sin(a*rad),-r*Math.cos(a*rad)]}
  ICONS.forEach(function(ic,i){
    var a0=i*60+GAP,a1=(i+1)*60-GAP,p0=pt(R1,a0),p1=pt(R1,a1),p2=pt(R0,a1),p3=pt(R0,a0),m=pt((R0+R1)/2,i*60+30);
    out+='<g class="sk-arc" data-k="'+i+'" role="button" tabindex="0"><path d="M'+p0[0].toFixed(1)+' '+p0[1].toFixed(1)+'A'+R1+' '+R1+' 0 0 1 '+p1[0].toFixed(1)+' '+p1[1].toFixed(1)+'L'+p2[0].toFixed(1)+' '+p2[1].toFixed(1)+'A'+R0+' '+R0+' 0 0 0 '+p3[0].toFixed(1)+' '+p3[1].toFixed(1)+'Z"/>'+
      '<svg class="ic" x="'+(m[0]-19).toFixed(1)+'" y="'+(m[1]-19).toFixed(1)+'" width="38" height="38" aria-hidden="true"><use href="#i-'+ic+'"/></svg></g>'});
  svg.innerHTML=out;
  var arcs=$$(".sk-arc",svg),pans=$$(".sk-p"),pics=$$(".sk-i"),cen=$("#skC");
  function pick(i){arcs.forEach(function(a,k){a.classList.toggle("on",k===i);a.setAttribute("aria-pressed",k===i)});
    pans.forEach(function(p,k){p.classList.toggle("on",k===i)});pics.forEach(function(p,k){p.classList.toggle("on",k===i)});
    var h=$("h4",pans[i]);if(h)cen.textContent=h.textContent}
  function label(){arcs.forEach(function(a,k){var h=$("h4",pans[k]);a.setAttribute("aria-label",h?h.textContent:"Compétence "+(k+1))})}
  arcs.forEach(function(a,k){a.addEventListener("click",function(){pick(k)});a.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();pick(k)}});
    a.addEventListener("mouseenter",function(){if(window.matchMedia&&matchMedia("(hover:hover)").matches)pick(k)})});
  label();pick(0);
  ICV.on(function(){label();var on=arcs.map(function(a){return a.classList.contains("on")}).indexOf(true);pick(on<0?0:on)});
  /* une compétence tous les 6 s tant que personne n'a touché la roue */
  var touched=false,timer=null,vis=false;
  $("#skills").addEventListener("pointerdown",function(){touched=true;clearInterval(timer)});
  $("#skills").addEventListener("focusin",function(){touched=true;clearInterval(timer)});
  if(!reduce&&!EDIT)onView($("#skills"),function(){var i=0;timer=setInterval(function(){if(touched)return clearInterval(timer);i=(i+1)%6;pick(i)},5200)},.5);
})();

