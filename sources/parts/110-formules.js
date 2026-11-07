/* ===== 10. Formules : tableau, vue mobile, aide au choix selon le budget ===== */
(function(){
  var T=[],P=[],hl=2,tbl=$("#tiers"),mob=$("#tiers-m"),pr=$("#pickR"),pv=$("#pickV"),pt=$("#pickT"),pm=$("#pickMsg"),pg=$("#pickGo"),mobIdx=2;
  function ptxt(t){return eur(+t.price||0)+(t.plus?" et +":"")}
  function cell(v){return v===1||v===true?'<span class="ok" role="img" aria-label="Inclus">'+icon("check")+'</span>':(v===0||v===""||v==null||v===false)?'<span class="no" role="img" aria-label="Non inclus">—</span>':'<b class="tv">'+esc(v)+'</b>'}
  function short(l){return String(l).split(/\s+(?:\(|→|-->)/)[0]}
  function val(r,i){return P[r]&&P[r][i+1]}
  function build(){
    var head='<tr><th class="corner" scope="col">Contreparties</th>'+T.map(function(t,i){return'<th data-c="'+i+'" scope="col"><button class="tn" type="button">'+esc(t.id)+'</button><span class="tprice">'+esc(ptxt(t))+'</span>'+(t.limited?'<span class="pill">Places limitées</span>':"")+'</th>'}).join("")+'</tr>';
    var body=P.map(function(row,r){return'<tr><th scope="row">'+esc(row[0])+'</th>'+T.map(function(t,i){return'<td data-c="'+i+'">'+cell(row[i+1])+'</td>'}).join("")+'</tr>'}).join("");
    var foot='<tr><td></td>'+T.map(function(t,i){return'<td data-c="'+i+'"><a class="btn sm" href="#contact" data-pick="'+esc(t.id)+'">Choisir <span>'+esc(t.id)+'</span></a></td>'}).join("")+'</tr>';
    $("thead",tbl).innerHTML=head;$("tbody",tbl).innerHTML=body;$("tfoot",tbl).innerHTML=foot;
    /* vue mobile */
    mob.innerHTML='<div class="tabs" role="tablist" aria-label="Formules">'+T.map(function(t,i){return'<button type="button" role="tab" id="tm-t'+i+'" aria-selected="false" data-m="'+i+'">'+esc(t.id)+" · "+esc(ptxt(t))+'</button>'}).join("")+'</div><div class="tm-body" id="tmBody"></div>';
    $$("[data-m]",mob).forEach(function(b){b.addEventListener("click",function(){mobIdx=+b.dataset.m;hilite(mobIdx)})});
  }
  function mobPanel(i){var t=T[i];if(!t)return;
    $("#tmBody").innerHTML='<div class="tm-h"><b>'+esc(t.id)+'</b><span>'+esc(ptxt(t))+'</span></div><ul>'+P.map(function(row){var v=row[i+1],on=!(v===0||v===""||v==null||v===false);return'<li class="'+(on?"":"off")+'"><span>'+esc(row[0])+'</span>'+cell(v)+'</li>'}).join("")+'</ul><div class="tm-f"><a class="btn" href="#contact" data-pick="'+esc(t.id)+'">Choisir '+esc(t.id)+'</a></div>'}
  function hilite(i){hl=i;
    $$("[data-c]",tbl).forEach(function(e){e.classList.toggle("hl",+e.dataset.c===i)});
    $$("[data-m]",mob).forEach(function(b){var on=+b.dataset.m===i;b.setAttribute("aria-selected",on)});
    mobPanel(i)}
  /* aide au choix */
  function adds(i){var out=[];P.forEach(function(row,r){var v=val(r,i),p=i>0?val(r,i-1):0;if(v&&v!==p)out.push(short(row[0])+(v===1||v===true?"":" : "+v))});return out}
  function msg(idx){var t=T[idx],ad=adds(idx);
    return"<b>Formule "+esc(t.id)+"</b>. "+(idx>0?"Par rapport à "+esc(T[idx-1].id)+" : ":"Elle comprend : ")+esc(ad.slice(0,3).join(" ; "))+(ad.length>3?" ; et "+(ad.length-3)+" autre"+(ad.length>4?"s":"")+".":".")}
  function suggest(){
    var a=+pr.value,idx=-1;T.forEach(function(t,i){if(a>=(+t.price||0))idx=i});
    pv.textContent=eur(a);
    if(idx<0){pt.textContent="";pm.innerHTML="À partir de <b>"+eur(+(T[0]&&T[0].price)||0)+"</b>, vous devenez partenaire. Un autre montant\u00a0? Un don défiscalisable ou un apport en nature sont possibles : contactez-nous.";pg.hidden=true;return}
    pg.hidden=false;pt.textContent=T[idx].id;pg.dataset.pick=T[idx].id;pm.innerHTML=msg(idx);
    hilite(idx)}
  function render(D){T=D.tiers||[];P=D.perks||[];if(!T.length)return;
    var feat=T.map(function(t){return!!t.featured}).indexOf(true);if(hl>=T.length)hl=feat>=0?feat:Math.min(2,T.length-1);
    pr.max=Math.ceil(((+T[T.length-1].price||0)*1.2)/500)*500;
    build();hilite(hl);suggest_keep()}
  function suggest_keep(){if(pr.dataset.touched)suggest()}
  ICV.on(render);
  tbl.addEventListener("click",function(e){var c=e.target.closest("[data-c]");if(!c||e.target.closest("a"))return;hilite(+c.dataset.c)});
  pr.addEventListener("input",function(){pr.dataset.touched=1;suggest()});
  /* valeurs initiales de l'aide au choix, sans déplacer la mise en évidence par défaut */
  ICV.on(function(){if(pr.dataset.touched||!T.length)return;var a=+pr.value,idx=-1;T.forEach(function(t,i){if(a>=(+t.price||0))idx=i});pv.textContent=eur(a);
    if(idx>=0){pt.textContent=T[idx].id;pg.dataset.pick=T[idx].id;pm.innerHTML=msg(idx)}});
})();
