/* ===== 13. Contact : parcours en trois temps, demande composée pas à pas, envoi ===== */
(function(){
  var f=$("#f");if(!f)return;
  var T=[],P=[],tierBox=$("#ctTier"),sum=$("#ctSum"),msg=$("#msg"),att=$("#ctAttach"),attCb=$("#ctSim"),NONE="Je ne sais pas encore",tier="";
  var GOOGLE="https://script.google.com/macros/s/AKfycbxXE1if0V5uULzHmGSBOEVixrsTmT0_Ffu-8WO_CVRpO9EG7n2FG2oemTuIxRD-wAo/exec";

  /* --- parcours : une étape ouverte à la fois, la photo suit --- */
  var steps=$$("#ctSteps li"),pics=$$("#ctPh .ph"),hov=window.matchMedia&&matchMedia("(hover:hover)").matches,touched=false,timer=null,cur=0;
  function openStep(i){cur=i;steps.forEach(function(li,k){var on=k===i;li.classList.toggle("on",on);$("button",li).setAttribute("aria-expanded",on)});pics.forEach(function(p,k){p.classList.toggle("on",k===i)})}
  function stopAuto(){touched=true;clearInterval(timer)}
  steps.forEach(function(li,k){var b=$("button",li);b.addEventListener("click",function(){stopAuto();openStep(k)});b.addEventListener("focus",stopAuto);if(hov)li.addEventListener("mouseenter",function(){stopAuto();openStep(k)})});
  if(!reduce&&!EDIT)onView($("#ctSteps"),function(){timer=setInterval(function(){if(touched)return clearInterval(timer);openStep((cur+1)%steps.length)},5600)},.5);

  /* --- la personne à contacter : visage de la présidence si une photo est fournie --- */
  var av=$("#ctAv");
  function paintPerson(D){var T0=(D.team||[]).filter(function(m){return/pr[ée]sident/i.test(m.role||"")&&!/vice/i.test(m.role||"")}),m=T0[0],nm=$("b",$(".ct-id")).textContent||"";
    var ini=nm.split(/\s+/).filter(Boolean).map(function(w){return w.charAt(0)}).slice(0,2).join("").toUpperCase();
    av.innerHTML=m&&safeUrl(m.photo)?faceImg(m,""):esc(ini)}
  function syncLinks(){var t=$("a[data-tel]"),m=$("a[data-mail]");
    if(t){var d=t.textContent.replace(/[^\d+]/g,"");if(d)t.href="tel:"+d}
    if(m){var e=m.textContent.trim();if(/^\S+@\S+\.\S+$/.test(e))m.href="mailto:"+e}}
  ["pointerdown","focusin","click"].forEach(function(ev){$(".ct-lines").addEventListener(ev,syncLinks)});
  $("[data-copy]").addEventListener("click",function(){var b=this,m=$("a[data-mail]"),t=m?m.textContent.trim():"";
    (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).catch(function(){var x=document.createElement("textarea");x.value=t;document.body.appendChild(x);x.select();try{document.execCommand("copy")}catch(e){}document.body.removeChild(x)}).then(function(){b.textContent="Copié";setTimeout(function(){b.textContent="Copier"},1600)})});

  /* --- formules proposées d'après le tableau --- */
  function ptxt(t){return eur(+t.price||0)+(t.plus?" et +":"")}
  function short(l){return String(l).split(/\s+(?:\(|→|-->)/)[0].replace(/[.\s]+$/,"")}
  function renderTiers(){
    tierBox.innerHTML='<label class="chip tier"><input type="radio" name="formule" value="'+NONE+'"'+(tier?"":" checked")+'/><span><b>Je ne sais pas encore</b><small>On en parle ensemble</small></span></label>'+
      T.map(function(t){return'<label class="chip tier"><input type="radio" name="formule" data-id="'+esc(t.id)+'" value="'+esc(t.id+" ("+ptxt(t)+")")+'"'+(t.id===tier?" checked":"")+'/><span><b>'+esc(t.id)+'</b><small>'+esc(ptxt(t))+'</small></span></label>'}).join("")}
  function curTier(){var r=$("input[name=formule]:checked",f);return r&&r.dataset.id||""}
  function type(){return(f.elements.type.value||"")}
  function paintSum(){var ty=type();tierBox.hidden=ty.indexOf("Sponsoring")!==0;
    if(ty.indexOf("Sponsoring")===0){var id=curTier(),i=T.map(function(t){return t.id}).indexOf(id);
      if(i<0){sum.innerHTML="<b>Vous hésitez\u00a0?</b> Choisissez « Je ne sais pas encore » : nous vous conseillons la formule la plus utile à vos objectifs lors du premier échange.";return}
      var inc=P.filter(function(r){var v=r[i+1];return!(v===0||v===""||v==null||v===false)}).map(function(r){var v=r[i+1];return short(r[0])+(v===1||v===true?"":" : "+v)});
      sum.innerHTML='<div class="sh2"><b>'+esc(T[i].id)+'</b><span>'+esc(ptxt(T[i]))+'</span></div><ul>'+inc.slice(0,4).map(function(x){return"<li>"+esc(x)+"</li>"}).join("")+'</ul><p>'+(inc.length>4?"et "+(inc.length-4)+" autre"+(inc.length>5?"s":"")+" contrepartie"+(inc.length>5?"s":"")+". ":"")+'<a href="#formules">Revoir le tableau</a></p>'}
    else if(ty.indexOf("Mécénat")===0)sum.innerHTML="<b>Vous préférez un don\u00a0?</b> Il est défiscalisable dans le cadre du mécénat. Nous en échangeons ensemble lors du premier contact.";
    else if(ty.indexOf("nature")>=0)sum.innerHTML="<b>Un apport en nature\u00a0?</b> Impression, transport, matériel : construisons une formule sur mesure.";
    else sum.innerHTML="<b>Une autre idée\u00a0?</b> Dites-nous ce que vous avez en tête dans le message : construisons une formule sur mesure."}
  ICV.on(function(D){T=D.tiers||[];P=D.perks||[];if(tier&&T.map(function(t){return t.id}).indexOf(tier)<0)tier="";renderTiers();paintSum();paintPerson(D);syncLinks()});
  f.addEventListener("change",function(e){if(e.target.name==="formule")tier=curTier();paintSum()});

  /* --- depuis le tableau des formules ou le simulateur --- */
  function attach(on){att.hidden=false;attCb.checked=on!==false}
  document.addEventListener("click",function(e){var a=e.target.closest("[data-pick]");if(!a)return;
    var r=$("input[name=type]",f);if(r){var ty=$$("input[name=type]",f)[0];ty.checked=true}
    tier=a.dataset.pick;renderTiers();paintSum();
    if(a.hasAttribute("data-recap"))attach(true)});
  document.addEventListener("simlogo",function(e){if(e.detail&&e.detail.logo&&att.hidden)attach(true)});

  /* --- envoi --- */
  function err(t,el){msg.textContent=t;if(el)try{el.focus()}catch(x){}}
  f.addEventListener("submit",function(ev){ev.preventDefault();
    var btn=$("button[type=submit]",f),v=function(n){return f.elements[n].value.trim()};
    if(f.elements.website.value)return;
    $$("[aria-invalid]",f).forEach(function(x){x.removeAttribute("aria-invalid")});
    var bad=["prenom","nom","ent"].filter(function(n){return!v(n)});if(!/^\S+@\S+\.\S+$/.test(v("mail")))bad.push("mail");
    bad.forEach(function(n){f.elements[n].setAttribute("aria-invalid","true")});
    if(bad.length){err("Complétez les champs marqués d'une étoile, avec une adresse e-mail valide.",f.elements[bad[0]]);return}
    if(!f.elements.rgpd.checked){err("Cochez la case d'accord pour que nous puissions vous recontacter.",f.elements.rgpd);return}
    var ty=type(),extra=[],how=v("how"),when=v("when");
    if(how||when)extra.push("Échange souhaité : "+[how&&how.toLowerCase(),when].filter(Boolean).join(", ")+".");
    if(!att.hidden&&attCb.checked&&window.SIM_RECAP){try{extra.push(window.SIM_RECAP())}catch(x){}}
    var d={rgpd:true,prenom:v("prenom"),nom:v("nom"),ent:v("ent"),fonction:v("fonction"),mail:v("mail"),tel:v("tel"),type:ty,formule:ty.indexOf("Sponsoring")===0?v("formule"):"",message:[v("message")].concat(extra).filter(Boolean).join("\n\n"),website:""};
    btn.disabled=true;msg.textContent="Envoi en cours...";
    function viaGoogle(){var p=new URLSearchParams();["prenom","nom","ent","fonction","mail","tel","type","formule","message","website"].forEach(function(k){p.append(k,d[k]||"")});
      return fetch(GOOGLE,{method:"POST",body:p}).then(function(r){return r.json()})}
    fetch("/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}).then(function(r){return r.json()}).catch(viaGoogle)
    .then(function(r){
      if(r&&r.ok){msg.textContent="";$("#ctOkT").textContent="Merci, "+d.prenom+".";f.reset();tier="";renderTiers();paintSum();att.hidden=true;f.classList.add("sent");var ok=$("#ctOk");ok.focus();if(ok.scrollIntoView)ok.scrollIntoView({block:"center",behavior:reduce?"auto":"smooth"})}
      else if(r&&r.erreur==="limite"){msg.textContent="Plusieurs demandes ont déjà été envoyées depuis ce poste : nous revenons vers vous rapidement."}
      else throw 0})
    .catch(function(){var m=$("a[data-mail]");msg.textContent="L'envoi n'a pas abouti. Réessayez dans un instant ou écrivez-nous directement"+(m?" à "+m.textContent.trim():"")+"."})
    .then(function(){btn.disabled=false})});
  $("#ctAgain").addEventListener("click",function(){f.classList.remove("sent");var i=f.elements.prenom;if(i)i.focus()});
})();
