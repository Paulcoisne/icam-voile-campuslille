/* ===== 2. L'Icam : les quatre valeurs (toutes visibles, regard au choix, lignes qui se répondent) ===== */
(function(){
  var root=$("#vx");if(!root)return;
  function lens(l){root.dataset.lens=l;$$("[data-l]",root).forEach(function(b){b.setAttribute("aria-pressed",b.dataset.l===l)})}
  function clear(card){$$("li.pair",card).forEach(function(li){li.classList.remove("pair")})}
  function pair(li){var card=li.closest(".vx-c"),ul=li.parentNode,side=li.closest(".vx-s")?"s":"a",i=[].indexOf.call(ul.children,li),other=$(side==="s"?".vx-a":".vx-s",card);
    clear(card);li.classList.add("pair");var t=other&&other.querySelectorAll("li")[i];if(t)t.classList.add("pair")}
  root.addEventListener("click",function(e){if(EDIT)return;var b=e.target.closest("[data-l]");if(b){lens(b.dataset.l);return}
    var li=e.target.closest(".vx-cols li");if(li){if(li.classList.contains("pair")&&!(window.matchMedia&&matchMedia("(hover:hover)").matches))clear(li.closest(".vx-c"));else pair(li)}});
  root.addEventListener("mouseover",function(e){if(EDIT)return;var li=e.target.closest(".vx-cols li");if(li)pair(li)});
  root.addEventListener("mouseout",function(e){var c=e.target.closest&&e.target.closest(".vx-c");if(c&&!c.contains(e.relatedTarget))clear(c)});
  root.addEventListener("focusin",function(e){var li=e.target.closest(".vx-cols li");if(li)pair(li)});
  root.addEventListener("focusout",function(e){var c=e.target.closest&&e.target.closest(".vx-c");if(c&&!c.contains(e.relatedTarget))clear(c)});
  lens("both");
})();
