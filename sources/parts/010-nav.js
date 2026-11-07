/* ===== Navigation, repère latéral, onglets génériques ===== */
var nav=$("#nav"),burger=$("#burger");
burger.addEventListener("click",function(){var o=nav.classList.toggle("open");burger.setAttribute("aria-expanded",o);burger.setAttribute("aria-label",o?"Fermer le menu":"Ouvrir le menu")});
$$("#links a").forEach(function(a){a.addEventListener("click",function(){nav.classList.remove("open");burger.setAttribute("aria-expanded","false")})});

/* Repère latéral : une graduation par bloc portant data-rail, dans l'ordre réel de la page (suit les déplacements faits depuis l'admin) */
var spy=null;
function chapOf(el){var c=el.closest&&el.closest(".chapter");return c?c.dataset.chap:(el.dataset.chap||"")}
function setActive(id){$$("#rail a").forEach(function(a){a.classList.toggle("on",a.dataset.part===id)});
  var el=document.getElementById(id),ch=el?chapOf(el):"";$$("#links a[data-chap]").forEach(function(a){a.classList.toggle("on",a.dataset.chap===ch)})}
function buildRail(){var ol=$("#rail");if(!ol)return;ol.innerHTML="";if(spy){spy.disconnect();spy=null}
  var els=$$("[data-rail]").filter(function(el){return el.id&&!el.hidden&&!el.closest(".icv-removed")});
  els.forEach(function(el){var li=document.createElement("li");li.innerHTML='<a href="#'+esc(el.id)+'" data-part="'+esc(el.id)+'"><span>'+esc(el.dataset.rail)+'</span><i></i></a>';ol.appendChild(li)});
  if("IntersectionObserver" in window){spy=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)setActive(e.target.id)})},{rootMargin:"-45% 0px -50% 0px"});els.forEach(function(el){spy.observe(el)})}}
$$("#links a[data-page]").forEach(function(a){a.classList.toggle("on",a.dataset.page===document.body.dataset.page)});
ICV.post(buildRail);

/* Onglets génériques : .tabs [role=tab][aria-controls] + .tp. Les panneaux restent dans le HTML (textes modifiables). */
function initTabs(root,onChange){
  var tabs=$$('[role=tab]',root);if(!tabs.length)return;
  function sel(t,focus){tabs.forEach(function(x){var on=x===t;x.setAttribute("aria-selected",on);x.tabIndex=on?0:-1;var p=document.getElementById(x.getAttribute("aria-controls"));if(p)p.hidden=!on});
    if(focus)t.focus();if(onChange)onChange(t)}
  tabs.forEach(function(t,i){t.addEventListener("click",function(){sel(t)});
    t.addEventListener("keydown",function(e){var k=e.key,n=k==="ArrowRight"||k==="ArrowDown"?1:k==="ArrowLeft"||k==="ArrowUp"?-1:0;if(!n)return;e.preventDefault();sel(tabs[(i+n+tabs.length)%tabs.length],true)})});
  var cur=tabs.filter(function(t){return t.getAttribute("aria-selected")==="true"})[0]||tabs[0];sel(cur);
  return{select:function(k){var t=typeof k==="number"?tabs[k]:k;if(t)sel(t)}}}

/* Cartes recto/verso */
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest(".flip");if(!b||EDIT)return;var on=b.classList.toggle("on");b.setAttribute("aria-pressed",on)});
$$(".flip").forEach(function(b){b.setAttribute("aria-pressed","false")});

/* Bandes photo : flèches */
function bindReel(box,prev,next){if(!box||!prev||!next)return;
  function by(d){var f=box.querySelector(".gal-i");box.scrollBy({left:d*(f?f.getBoundingClientRect().width+14:360),behavior:reduce?"auto":"smooth"})}
  prev.onclick=function(){by(-1)};next.onclick=function(){by(1)}}
