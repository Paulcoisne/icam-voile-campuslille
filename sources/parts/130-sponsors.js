/* ===== 12. Ils nous ont fait confiance : fanions des partenaires, ruban photo ===== */
(function(){
  var lg=$("#logos");if(!lg)return;
  var S=[],yr="",mine="",counted=false,ys=$("#spYears"),cnt=$("#spCount"),cl=$("#spCountL");
  function mono(n){var w=String(n||"").trim().split(/\s+/).filter(Boolean);return((w[0]||"?").charAt(0)+(w[1]?w[1].charAt(0):"")).toUpperCase()}
  function srcOf(s){var u=safeUrl(s.logo);if(u)return u;return s.domain&&/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s.domain)?"/api/logo?domain="+encodeURIComponent(s.domain):""}
  function flag(s){var url=safeUrl(s.url),a=document.createElement(url?"a":"div"),src=srcOf(s);a.className="fan";
    if(url){a.href=url;a.target="_blank";a.rel="noopener";a.setAttribute("aria-label",s.name+", partenaire "+s.year+" (nouvel onglet)")}
    a.innerHTML='<span class="fl"><span class="fl-in"><span class="mark">'+(src?'<img src="'+esc(src)+'" alt="Logo '+esc(s.name)+'" loading="lazy">':'<span class="mono">'+esc(mono(s.name))+'</span>')+'</span><span class="sp-name">'+esc(s.name)+'</span><small>Partenaire '+esc(s.year||"")+(url?' · <u>Voir le site</u>':'')+'</small></span></span>';
    var im=$("img",a);if(im)im.onerror=function(){im.parentNode.innerHTML='<span class="mono">'+esc(mono(s.name))+'</span>'};
    return a}
  function you(){var a=document.createElement("a");a.className="fan you"+(mine?" mine":"");a.href=mine?"#contact":"#sim";
    a.innerHTML='<span class="fl"><span class="fl-in"><span class="mark">'+(mine?'<img alt="Votre logo" src="'+mine+'">':'<span class="mono">'+icon("plus")+'</span>')+'</span><span class="sp-name">'+(mine?"Votre fanion":"Votre logo ici")+'</span><small>'+(mine?"Prêt à être hissé en 2027":"Voyez-le d'abord sur notre bateau")+'</small></span></span>';
    return a}
  function years(){var o={};S.forEach(function(s){if(s.year)o[s.year]=1});return Object.keys(o).sort()}
  function paint(){
    var all=years(),shown=S.filter(function(s){return yr==="all"||!yr||String(s.year)===String(yr)});
    lg.innerHTML="";shown.forEach(function(s){lg.appendChild(flag(s))});lg.appendChild(you());lg.style.setProperty("--n",shown.length+1);
    var n=shown.length;
    if(!counted||EDIT)cnt.textContent=fr(n);
    cl.textContent=n?("partenaire"+(n>1?"s":"")+(yr&&yr!=="all"?" en "+yr:" au fil des éditions")):"partenaire pour l'instant : ce fanion vous attend";
    ys.hidden=all.length<2;
    if(all.length>1)ys.innerHTML=all.slice().reverse().concat(["all"]).map(function(y){return'<button type="button" data-y="'+y+'" aria-pressed="'+(String(y)===String(yr))+'">'+(y==="all"?"Toutes":y)+'</button>'}).join("")}
  ys.addEventListener("click",function(e){var b=e.target.closest("[data-y]");if(!b)return;yr=b.dataset.y;counted=true;paint()});
  ICV.on(function(D){S=Array.isArray(D.sponsors)?D.sponsors:[];var all=years();if(!yr||(yr!=="all"&&all.indexOf(String(yr))<0))yr=all.length?all[all.length-1]:"all";paint()});
  /* le fanion du visiteur : son logo, dès qu'il l'a choisi dans le simulateur */
  document.addEventListener("simlogo",function(e){var L=e.detail&&e.detail.logo,u="";
    if(L&&L.preview){try{u=L.preview.toDataURL("image/png")}catch(x){u=""}}
    mine=u;var old=$(".fan.you",lg);if(old)lg.replaceChild(you(),old)});
  /* le décompte se joue une fois, à l'arrivée du mur */
  onView($("#bunting"),function(){var n=$$(".fan",lg).length-1;counted=true;countUp(cnt,Math.max(0,n))},.35);
})();
