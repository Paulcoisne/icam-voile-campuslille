/* ===== 8. Pourquoi des partenaires : chiffres clés liés au budget ===== */
(function(){
  function setNum(id,n){var el=document.getElementById(id);if(!el)return;el.dataset.n=n;el.textContent=/^w(Total|Already)$/.test(id)?eur(n):fr(n)}
  ICV.on(function(D){
    var L=(D.budget&&D.budget.lines)||[],total=L.reduce(function(s,l){return s+(+l.amount||0)},0),al=clamp(+(D.budget&&D.budget.already)||0,0,total);
    setNum("wTotal",total);setNum("wAlready",al);setNum("wLines",L.length)})
})();
