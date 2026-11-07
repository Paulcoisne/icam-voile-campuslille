/* ===== 4. La CCE : défis, bande-annonce ===== */

initTabs($("#defi"));

/* bande-annonce : chargée au clic seulement */
var ytBtn=$("#yt");
ytBtn.addEventListener("click",function(){var id=ytBtn.dataset.id;if(!id||!/^[A-Za-z0-9_-]{6,20}$/.test(id))return;
  var f=document.createElement("iframe");f.src="https://www.youtube-nocookie.com/embed/"+id+"?rel=0&autoplay=1";f.title="Bande-annonce de la Course Croisière EDHEC";
  f.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";f.allowFullscreen=true;f.referrerPolicy="strict-origin-when-cross-origin";
  ytBtn.innerHTML="";ytBtn.appendChild(f);ytBtn.style.cursor="default"});
ICV.on(function(D){var id=D.youtube&&/^[A-Za-z0-9_-]{6,20}$/.test(D.youtube)?D.youtube:DEFAULTS.youtube;
  if(ytBtn.dataset.id!==id&&!ytBtn.querySelector("iframe"))ytBtn.dataset.id=id;else if(ytBtn.dataset.id!==id){ytBtn.dataset.id=id}});
