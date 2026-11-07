/* ===== 9. Ce que votre entreprise y gagne : tout est visible, la formule choisie met en évidence ce qui est inclus ===== */
(function(){
  var root=$("#gx");if(!root)return;
  var chips=$("#gxChips"),sum=$("#gxSum"),tiers=[],cur=-1;
  function paint(){
    var inc=0,tot=0,max=Math.max(0,tiers.length-1);
    $$(".gc",root).forEach(function(c){if(c.classList.contains("icv-removed"))return;tot++;
      var r=Math.min(+c.dataset.r||0,max),on=cur<0||r<=cur;
      c.classList.toggle("in",cur>=0&&on);c.classList.toggle("off",cur>=0&&!on);if(on)inc++});
    $$("button",chips).forEach(function(b){b.setAttribute("aria-pressed",+b.dataset.i===cur)});
    sum.textContent=cur<0||!tiers[cur]?"":"Formule "+tiers[cur].id+" : "+inc+" avantage"+(inc>1?"s":"")+" sur "+tot+" pour votre entreprise."}
  ICV.on(function(D){tiers=D.tiers||[];if(cur>=tiers.length)cur=-1;
    chips.innerHTML='<button type="button" data-i="-1" aria-pressed="true">Toutes les formules</button>'+tiers.map(function(t,i){return'<button type="button" data-i="'+i+'">'+esc(t.id)+'</button>'}).join("");paint()});
  chips.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;cur=+b.dataset.i;paint()});
})();
