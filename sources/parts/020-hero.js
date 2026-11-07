/* ===== 1. Entrée : chronomètre, compas ===== */
(function(){
  var target=new Date(RACE_START).getTime(),cd={d:$('[data-cd="d"]'),h:$('[data-cd="h"]'),m:$('[data-cd="m"]'),s:$('[data-cd="s"]')};
  function p2(n){return String(n).padStart(2,"0")}
  function tick(){var s=Math.max(0,Math.floor((target-Date.now())/1000));
    cd.d.textContent=Math.floor(s/86400);cd.h.textContent=p2(Math.floor(s%86400/3600));cd.m.textContent=p2(Math.floor(s%3600/60));cd.s.textContent=p2(s%60)}
  tick();setInterval(tick,1000);

  /* cap et distance Lille, Les Sables-d'Olonne (grand cercle) */
  var A=[50.6292,3.0573],B=[46.4961,-1.7829],rad=Math.PI/180;
  var dl=(B[1]-A[1])*rad,p1=A[0]*rad,p2r=B[0]*rad,dp=p2r-p1;
  var h=Math.pow(Math.sin(dp/2),2)+Math.cos(p1)*Math.cos(p2r)*Math.pow(Math.sin(dl/2),2),dist=2*6371*Math.asin(Math.sqrt(h));
  var y=Math.sin(dl)*Math.cos(p2r),x=Math.cos(p1)*Math.sin(p2r)-Math.sin(p1)*Math.cos(p2r)*Math.cos(dl),brg=(Math.atan2(y,x)/rad+360)%360;
  var pts=["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSO","SO","OSO","O","ONO","NO","NNO"];
  var svg=$("#compass"),g=$("#ticks"),out='<circle class="ring" cx="70" cy="70" r="64"/>';
  for(var i=0;i<72;i++){var a=i*5*rad,major=i%18===0,mid=i%9===0,r1=64,r2=major?52:mid?57:60;
    out+='<line x1="'+(70+Math.sin(a)*r1).toFixed(1)+'" y1="'+(70-Math.cos(a)*r1).toFixed(1)+'" x2="'+(70+Math.sin(a)*r2).toFixed(1)+'" y2="'+(70-Math.cos(a)*r2).toFixed(1)+'" stroke="'+(major?"#fff":"#ffffff66")+'" stroke-width="'+(major?2:1)+'"/>'}
  [["N",0],["E",90],["S",180],["O",270]].forEach(function(c){var a=c[1]*rad;out+='<text class="'+(c[0]==="N"?"n":"")+'" x="'+(70+Math.sin(a)*40).toFixed(1)+'" y="'+(70-Math.cos(a)*40+4).toFixed(1)+'">'+c[0]+'</text>'});
  g.innerHTML=out;svg.style.setProperty("--brg",brg.toFixed(1)+"deg");
  var bEl=$("#brg"),dEl=$("#dist"),txt=Math.round(brg)+"";
  function paint(){bEl.textContent=txt;dEl.textContent="à vol d'oiseau, environ "+fr(Math.round(dist/10)*10)+" km (cap "+pts[Math.round(brg/22.5)%16]+")"}
  paint();
  onView(svg,function(){svg.classList.add("go");if(reduce||EDIT){bEl.textContent=txt;return}
    var t0=performance.now();(function f(t){var q=Math.min((t-t0)/1800,1),e=1-Math.pow(1-q,3);bEl.textContent=Math.round(brg*e);if(q<1)requestAnimationFrame(f);else bEl.textContent=txt})(t0)},.5);
})();
