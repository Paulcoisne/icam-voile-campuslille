/* ===== 7. Budget prévisionnel : postes, répartition, équivalences, photos liées ===== */
(function(){
  var lines=$("#lines"),split=$("#bSplit"),read=$("#bRead"),eq=$("#equiv"),photos=$$("#bPhotos .bd-i"),cap=$("#bCap"),cur=0,L=[],total=0;
  function setNum(id,n){var el=document.getElementById(id);el.dataset.n=n;el.dataset.suffix=" €";el.textContent=eur(n)}
  function pick(i){if(!L.length)return;i=clamp(i,0,L.length-1);cur=i;
    $$(".bd-l",lines).forEach(function(e,k){e.classList.toggle("on",k===i)});
    $$(".sp",split).forEach(function(e,k){e.classList.toggle("on",k===i)});
    var l=L[i],a=+l.amount||0;
    read.innerHTML="<b>"+esc(l.label)+"</b> · "+(total?Math.round(a/total*100):0)+" % du budget · "+eur(a);
    photos.forEach(function(p,k){p.classList.toggle("on",k===i%photos.length)});
    cap.textContent="Poste "+(i+1)+" · "+l.label}
  function render(D){
    var B=D.budget||{lines:[],equiv:[]};L=B.lines||[];
    total=L.reduce(function(s,l){return s+(+l.amount||0)},0);
    var already=clamp(+B.already||0,0,total),max=Math.max.apply(null,L.map(function(l){return+l.amount||0}).concat([1]));
    setNum("bTotal",total);setNum("bAlready",already);setNum("bRest",total-already);
    $("#bProg").style.width=(total?already/total*100:0)+"%";
    lines.innerHTML=L.map(function(l,i){return'<li class="bd-l" data-i="'+i+'" tabindex="0"><span class="bd-n num">'+(i+1)+'</span><div class="bd-t"><div class="bd-top"><b>'+esc(l.label)+'</b><span class="bd-a num">'+eur(+l.amount||0)+'</span></div>'+(l.detail?'<p>'+esc(l.detail)+'</p>':'')+'<div class="bd-bar"><i style="--w:'+((+l.amount||0)/max*100).toFixed(1)+'%"></i></div></div></li>'}).join("");
    split.innerHTML=L.map(function(l,i){return'<button type="button" class="sp'+(i%2?" b":"")+'" data-i="'+i+'" style="flex-grow:'+(+l.amount||0)+'" aria-label="'+esc(l.label)+'"><span>'+(i+1)+'</span></button>'}).join("");
    eq.innerHTML=(B.equiv||[]).map(function(e){return'<li><b class="num">'+eur(+e.amount||0)+'</b><span>'+esc(e.label)+'</span></li>'}).join("");
    pick(cur)}
  ICV.on(render);
  function idx(e){var t=e.target.closest&&e.target.closest("[data-i]");return t&&lines.contains(t)||t&&split.contains(t)?+t.dataset.i:-1}
  ["mouseover","focusin","click"].forEach(function(ev){[lines,split].forEach(function(box){box.addEventListener(ev,function(e){var t=e.target.closest("[data-i]");if(t&&box.contains(t))pick(+t.dataset.i)})})});
  onView(lines,function(){lines.classList.add("go")},.12);
  /* mobile : la photo collée suit la ligne qui défile, puis s'efface devant les équivalences */
  var mq=window.matchMedia("(max-width:900px)"),ph=$(".bd-ph"),eqBox=$(".bd-eq"),tick=false;
  function follow(){tick=false;if(!mq.matches||EDIT||!ph||!L.length)return;
    var pr=ph.getBoundingClientRect(),lr=lines.getBoundingClientRect(),y=Math.max(pr.bottom,0)+80,best=-1,bd=1e9;
    $$(".bd-l",lines).forEach(function(e,k){var r=e.getBoundingClientRect(),d=Math.abs((r.top+r.bottom)/2-y);if(d<bd){bd=d;best=k}});
    if(lr.top<innerHeight&&lr.bottom>0&&best>=0&&best!==cur)pick(best);
    if(eqBox){var er=eqBox.getBoundingClientRect();ph.classList.toggle("off",er.top<innerHeight*.55&&er.bottom>0)}}
  window.addEventListener("scroll",function(){if(!tick){tick=true;requestAnimationFrame(follow)}},{passive:true});
  window.addEventListener("resize",follow)
})();
