/* ===== 11. Simulation de logo : bateau (vidéo suivie, WebGL) et veste de quart (3D, three.js) =====
   Un seul logo (par nom de domaine ou fichier) alimente les deux simulateurs.
   Chaque simulateur ne se charge qu'à l'approche de la section : vidéo + suivi pour le bateau, three.js + maillage pour la veste. */
(function(){
"use strict";
var msg=$("#simmsg");
function say(t,err){msg.textContent=t||"";msg.className=err?"err":""}
var CFG0={surfaces:{main:{enabled:true,checked:true,scale:90,label:"Grand-voile"},spin:{enabled:true,checked:true,scale:92,label:"Spinnaker"},hull:{enabled:true,checked:true,scale:94,label:"Coque"}},
  watermark:{enabled:true,opacity:90,size:13},demoText:"VOTRE LOGO",demoLogo:"",jacket:{enabled:true}};
var CFG=JSON.parse(JSON.stringify(CFG0));
var SIM={logo:null,user:false,subs:[],cfgSubs:[],recapSubs:[]};
function onLogo(f){SIM.subs.push(f);if(SIM.logo)f(SIM.logo)}
function onCfg(f){SIM.cfgSubs.push(f)}

/* ---------- Préparation des logos (partagée) ---------- */
function pot(n){return Math.max(64,Math.min(1024,Math.pow(2,Math.round(Math.log(n)/Math.LN2))))}
function toTex(c){var o=document.createElement("canvas");o.width=pot(c.width);o.height=pot(c.height);o.getContext("2d").drawImage(c,0,0,o.width,o.height);return o}
function prepare(img,label){
  var w0=img.naturalWidth||img.width||0,h0=img.naturalHeight||img.height||0,svgLike=!w0||!h0;if(svgLike){w0=800;h0=400}
  var k=Math.min(6,1024/Math.max(w0,h0)),w=Math.max(1,Math.round(w0*k)),h=Math.max(1,Math.round(h0*k));
  var c=document.createElement("canvas");c.width=w;c.height=h;var g=c.getContext("2d");g.drawImage(img,0,0,w,h);
  var id;try{id=g.getImageData(0,0,w,h)}catch(e){return null}
  var d=id.data,N=w*h,x,y,o,border=[];
  for(x=0;x<w;x++){border.push(x,(h-1)*w+x)}for(y=0;y<h;y++){border.push(y*w,y*w+w-1)}
  var op=border.filter(function(p){return d[p*4+3]>200});
  if(op.length>border.length*.5){
    /* couleur de fond la plus fréquente sur le bord (tolère les coins arrondis et le bruit JPEG) */
    var bins={},best=null,bc=0;op.forEach(function(p){var key=(d[p*4]>>4)+"_"+(d[p*4+1]>>4)+"_"+(d[p*4+2]>>4);bins[key]=(bins[key]||0)+1;if(bins[key]>bc){bc=bins[key];best=p}});
    if(bc>op.length*.45){var mr=d[best*4],mg=d[best*4+1],mb=d[best*4+2];
      var dist=function(p){var a=p*4;return Math.sqrt(Math.pow(d[a]-mr,2)+Math.pow(d[a+1]-mg,2)+Math.pow(d[a+2]-mb,2))};
      var T=52,seen=new Uint8Array(N),st=op.filter(function(p){return dist(p)<T});st.forEach(function(p){seen[p]=1});
      while(st.length){var p=st.pop();d[p*4+3]=0;x=p%w;y=(p-x)/w;
        for(var q=0;q<4;q++){var nx=x+(q===0?1:q===1?-1:0),ny=y+(q===2?1:q===3?-1:0);if(nx<0||ny<0||nx>=w||ny>=h)continue;var qq=ny*w+nx;if(seen[qq])continue;seen[qq]=1;
          var dd=dist(qq);if(dd<T)st.push(qq);else if(dd<T*1.8)d[qq*4+3]=Math.min(d[qq*4+3],Math.round(255*(dd-T)/(T*.8)))}}}}
  var minx=w,miny=h,maxx=-1,maxy=-1,lum=0,cnt=0;
  for(y=0;y<h;y++)for(x=0;x<w;x++){o=(y*w+x)*4;if(d[o+3]>24){if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;lum+=(.299*d[o]+.587*d[o+1]+.114*d[o+2])*d[o+3]/255;cnt+=d[o+3]/255}}
  if(maxx<0)return null;g.putImageData(id,0,0);
  var pad=Math.round(Math.max(maxx-minx,maxy-miny)*.03),cw=maxx-minx+1+2*pad,ch=maxy-miny+1+2*pad;
  var prev=document.createElement("canvas");prev.width=cw;prev.height=ch;prev.getContext("2d").drawImage(c,minx-pad,miny-pad,cw,ch,0,0,cw,ch);
  return{tex:toTex(prev),preview:prev,aspect:cw/ch,dark:(lum/Math.max(cnt,1))/255<.38,small:!svgLike&&Math.max(img.naturalWidth,img.naturalHeight)<100,label:label}}
function textLogo(name){var c=document.createElement("canvas"),g=c.getContext("2d"),f="800 120px Saira, Arial, Helvetica, sans-serif";g.font=f;
  var tw=Math.ceil(g.measureText(name).width)+40;c.width=Math.min(tw,4000);c.height=170;g.font=f;g.fillStyle="#0f2c47";g.textBaseline="middle";g.fillText(name,20,88);
  return{tex:toTex(c),preview:c,aspect:c.width/c.height,dark:true,label:"Texte"}}

var thumbBox=$("#simpreview"),thumb=$("#simthumb"),srcTxt=$("#simsrc");
function setLogo(L,note,isUser){
  if(!L){say("Ce logo est vide ou illisible. Essayez un autre fichier.",true);return}
  SIM.logo=L;SIM.user=!!isUser;
  if(isUser){thumb.src=L.preview.toDataURL();thumbBox.hidden=false;srcTxt.textContent=L.label}
  say(note||"");SIM.subs.forEach(function(f){try{f(L)}catch(e){if(window.console)console.error(e)}});
  document.dispatchEvent(new CustomEvent("simlogo",{detail:{logo:SIM.user?L:null}}));recap()}
function imgFromUrl(u,cb,err){var im=new Image();im.onload=function(){cb(im)};im.onerror=err||function(){};im.src=u}
function demo(){if(SIM.user)return;
  if(CFG.demoLogo)imgFromUrl(CFG.demoLogo,function(im){if(!SIM.user)setLogo(prepare(im,"Démonstration"),"",false)},function(){setLogo(textLogo(CFG.demoText||"VOTRE LOGO"),"",false)});
  else setLogo(textLogo(CFG.demoText||"VOTRE LOGO"),"",false)}

/* logo par nom de domaine */
$("#simform").addEventListener("submit",function(e){e.preventDefault();
  var raw=$("#simdom").value.trim().toLowerCase(),dom=raw.replace(/^https?:\/\//,"").replace(/^www\./,"").split(/[\/?#:]/)[0];
  if(!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(dom)){say("Saisissez un nom de domaine, par exemple : votre-entreprise.fr",true);return}
  var name=dom.split(".")[0].replace(/-/g," ").toUpperCase();say("Recherche du logo de "+dom+"...");
  fetch("/api/logo?domain="+encodeURIComponent(dom)).then(function(r){if(!r.ok)throw 0;var src=r.headers.get("x-logo-source")||"";return r.blob().then(function(b){return{b:b,src:src}})})
  .then(function(x){var u=URL.createObjectURL(x.b);imgFromUrl(u,function(im){var L=prepare(im,"Logo trouvé sur "+dom);URL.revokeObjectURL(u);if(!L)return fallback();
      setLogo(L,x.src==="favicon"||x.src==="icon"||L.small?"Seule l'icône du site a été trouvée. Importez votre logo pour un rendu net.":"Logo trouvé. S'il ne convient pas, importez votre fichier.",true)},function(){URL.revokeObjectURL(u);fallback()})}).catch(fallback);
  function fallback(){var L=textLogo(name);L.label="Nom de l'entreprise (logo introuvable)";setLogo(L,"Logo introuvable automatiquement pour "+dom+" : nous affichons le nom. Importez votre logo pour un rendu exact.",true)}});
/* logo importé */
$("#simfile").addEventListener("change",function(){var f=this.files&&this.files[0];this.value="";if(!f)return;
  if(!/^image\/(png|jpe?g|webp|svg\+xml|gif)$/.test(f.type)){say("Format non pris en charge. Utilisez un fichier PNG, SVG, JPG ou WebP.",true);return}
  if(f.size>10*1024*1024){say("Fichier trop lourd : 10 Mo maximum.",true);return}
  var u=URL.createObjectURL(f);imgFromUrl(u,function(im){setLogo(prepare(im,"Fichier : "+f.name),"Logo importé et intégré aux deux simulateurs.",true);URL.revokeObjectURL(u)},function(){say("Image illisible. Essayez un PNG ou un SVG.",true)})});

/* ---------- Récapitulatif (pour le formulaire de contact) ---------- */
var jkSummary=function(){return[]};
function recap(){
  var L=SIM.logo,lines=["Simulation de logo · Icam Voile Lille","","Logo : "+(SIM.user&&L?L.label:"pas encore choisi (démonstration)")];
  var spots=[].slice.call(document.querySelectorAll(".spots input")).filter(function(i){return i.checked&&!i.parentNode.hidden}).map(function(i){return i.parentNode.textContent.trim().toLowerCase()});
  lines.push("Bateau (J80) : "+(spots.length?spots.join(", "):"aucun emplacement"));
  if(CFG.jacket&&CFG.jacket.enabled!==false){var j=jkSummary();lines.push("Veste de quart :"+(j.length?"":" aucun logo placé"));j.forEach(function(t){lines.push("  "+t)})}
  var ta=$("#simRecap");if(ta)ta.value=lines.join("\n")}
window.SIM_RECAP=function(){recap();return $("#simRecap").value};
$("#simCopy").addEventListener("click",function(){var s=$("#simRecap"),b=this;recap();
  (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(s.value):Promise.reject()).catch(function(){s.select();try{document.execCommand("copy")}catch(e){}}).then(function(){b.textContent="Copié";setTimeout(function(){b.textContent="Copier le récapitulatif"},1600)})});
document.querySelectorAll(".spots input").forEach(function(i){i.addEventListener("change",recap)});

/* ---------- Réglages de l'admin ---------- */
function applyCfg(c){c=c||{};var cs=c.surfaces||{};CFG=Object.assign({},CFG0,c);CFG.surfaces={};
  ["main","spin","hull"].forEach(function(k){CFG.surfaces[k]=Object.assign({},CFG0.surfaces[k],cs[k]||{})});
  CFG.watermark=Object.assign({},CFG0.watermark,c.watermark||{});CFG.jacket=Object.assign({},CFG0.jacket,c.jacket||{});
  var jkOn=CFG.jacket.enabled!==false;$("#simJacket").hidden=!jkOn;$("#simGrid").classList.toggle("one",!jkOn);document.querySelector(".sim-tabs").hidden=!jkOn;
  SIM.cfgSubs.forEach(function(f){f()});demo();recap()}
window.addEventListener("simcfg",function(e){applyCfg(e.detail)});

/* ---------- Simulateur bateau ---------- */
function initBoat(){
var cv=$("#simcv"),vid=$("#simvid"),load=$("#simload"),playBtn=$("#simplay"),seek=$("#simseek"),tc=$("#simtc"),whiteBox=$("#simwhite");
var gl=cv.getContext("webgl",{preserveDrawingBuffer:true,alpha:false,antialias:true,premultipliedAlpha:false});
if(!gl){say("Votre navigateur ne prend pas en charge WebGL : l'aperçu animé n'est pas disponible.",true);load.hidden=true;return}
var VS_FULL="attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
var FS_VID="precision mediump float;varying vec2 v;uniform sampler2D vid;void main(){gl_FragColor=vec4(texture2D(vid,vec2(v.x,1.-v.y)).rgb,1.);}";
var VS_MESH="attribute vec2 pos;attribute vec2 uv;uniform vec2 size;varying vec2 vuv;varying vec2 vscr;void main(){vuv=uv;vscr=pos/size;gl_Position=vec4(pos.x/size.x*2.-1.,1.-pos.y/size.y*2.,0.,1.);}";
var FS_MESH=[
"precision highp float;varying vec2 vuv;varying vec2 vscr;",
"uniform sampler2D vid,logo;uniform vec4 rect;uniform float alpha,kind,white,lref;",
"vec3 hsv(vec3 c){vec4 K=vec4(0.,-1./3.,2./3.,-1.);vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));float d=q.x-min(q.w,q.y);return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x);}",
"void main(){",
" vec2 lu=(vuv-rect.xy)/rect.zw;if(lu.x<0.||lu.y<0.||lu.x>1.||lu.y>1.)discard;",
" vec4 L=texture2D(logo,lu);",
" if(kind>1.5){gl_FragColor=vec4(L.rgb,L.a*alpha);return;}",
" vec3 c=texture2D(vid,vscr).rgb;vec3 s=hsv(c);float lum=dot(c,vec3(.299,.587,.114));float sh=clamp(lum/max(lref,.15),.35,1.35);",
" float key;vec3 col;",
" if(kind<.5){key=clamp((.56-s.y)/.14,0.,1.)*clamp((s.z-.30)/.10,0.,1.);col=L.rgb*clamp(c/max(lref,.3),0.,1.15);}",
" else{float hu=s.x*360.;key=clamp((s.y-.28)/.15,0.,1.)*smoothstep(183.,195.,hu)*(1.-smoothstep(255.,267.,hu))*clamp((s.z-.16)/.1,0.,1.);",
"  col=mix(L.rgb,vec3(1.),white)*sh;}",
" gl_FragColor=vec4(col,L.a*key*alpha);}"].join("\n");
function shader(t,src){var s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
function program(vs,fs,attrs,unis){var p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));attrs.forEach(function(a,i){gl.bindAttribLocation(p,i,a)});gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));var u={};unis.forEach(function(n){u[n]=gl.getUniformLocation(p,n)});return{p:p,u:u}}
var PV,PM;
try{PV=program(VS_FULL,FS_VID,["p"],["vid"]);PM=program(VS_MESH,FS_MESH,["pos","uv"],["size","vid","logo","rect","alpha","kind","white","lref"])}catch(e){say("Initialisation graphique impossible sur cet appareil.",true);return}
var fullBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,fullBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
var meshBuf=gl.createBuffer(),idxCache={};
function idx(gw,gh){var k=gw+"x"+gh;if(idxCache[k])return idxCache[k];var a=[];for(var j=0;j<gh-1;j++)for(var i=0;i<gw-1;i++){var n=j*gw+i;a.push(n,n+1,n+gw,n+1,n+gw+1,n+gw)}
  var b=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(a),gl.STATIC_DRAW);return idxCache[k]={b:b,n:a.length}}
function mkTex(){var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return t}
var tVid=mkTex(),tLogo=mkTex(),tWm=mkTex();
function upload(tex,canvas){gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
  gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR)}

var TRACK=null,LOGO=null,WM=null,lastT=0,on={},userWhite=null,ready=false,userLogo=false;
var KIND={hull:0,main:0,spin:1},ORDER=["hull","main","spin"];

function bindMeshAttribs(){gl.bindBuffer(gl.ARRAY_BUFFER,meshBuf);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,16,8)}
function fitRect(asp,la,scale){var s=scale/100,w=Math.min(s*asp,s*la),h=w/la;if(h>s){h=s;w=h*la}return[(1-w/asp)/2,(1-h)/2,w/asp,h]}
function draw(t){
  if(!ready||!TRACK)return;
  var W=cv.width,H=cv.height,f=Math.max(0,Math.min(TRACK.n-1,Math.round(t*TRACK.fps))),sx=W/TRACK.W,sy=H/TRACK.H;
  gl.viewport(0,0,W,H);gl.disable(gl.BLEND);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tVid);
  if(vid.readyState>=2)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,vid);
  gl.useProgram(PV.p);gl.uniform1i(PV.u.vid,0);gl.bindBuffer(gl.ARRAY_BUFFER,fullBuf);gl.disableVertexAttribArray(1);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(PM.p);
  gl.uniform2f(PM.u.size,W,H);gl.uniform1i(PM.u.vid,0);gl.uniform1i(PM.u.logo,1);
  if(LOGO){
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tLogo);
    var white=userWhite===null?(LOGO.dark?1:0):(userWhite?1:0);
    ORDER.forEach(function(sf){var sc=CFG.surfaces[sf];if(!sc||!sc.enabled||!on[sf])return;(TRACK.surfaces[sf]||[]).forEach(function(sg){
      if(f<sg.s||f>sg.e)return;var a=1;if(sg.fi&&f<sg.s+sg.fi)a=(f-sg.s+1)/(sg.fi+1);if(sg.fo&&f>sg.e-sg.fo)a=Math.min(a,(sg.e-f+1)/(sg.fo+1));
      var nn=sg.gw*sg.gh,k=(f-sg.s)*nn*2,v=new Float32Array(nn*4);
      for(var n=0;n<nn;n++){var i=n%sg.gw,j=(n-i)/sg.gw;v[n*4]=sg.p[k+n*2]/10*sx;v[n*4+1]=sg.p[k+n*2+1]/10*sy;v[n*4+2]=i/(sg.gw-1);v[n*4+3]=j/(sg.gh-1)}
      gl.bindBuffer(gl.ARRAY_BUFFER,meshBuf);gl.bufferData(gl.ARRAY_BUFFER,v,gl.DYNAMIC_DRAW);bindMeshAttribs();
      var r=fitRect(sg.asp,LOGO.aspect,+sc.scale||90);gl.uniform4f(PM.u.rect,r[0],r[1],r[2],r[3]);
      gl.uniform1f(PM.u.alpha,a);gl.uniform1f(PM.u.kind,KIND[sf]);gl.uniform1f(PM.u.white,white);gl.uniform1f(PM.u.lref,(sg.l[f-sg.s]||600)/1000);
      var I=idx(sg.gw,sg.gh);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,I.b);gl.drawElements(gl.TRIANGLES,I.n,gl.UNSIGNED_SHORT,0)})})}
  if(WM&&CFG.watermark.enabled){
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tWm);
    var hh=H*(+CFG.watermark.size||13)/100,ww=hh*WM.aspect,m=H*.03,x1=W-m,x0=x1-ww,y1=H-m,y0=y1-hh;
    gl.bindBuffer(gl.ARRAY_BUFFER,meshBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([x0,y0,0,0,x1,y0,1,0,x0,y1,0,1,x1,y1,1,1]),gl.DYNAMIC_DRAW);bindMeshAttribs();
    gl.uniform4f(PM.u.rect,0,0,1,1);gl.uniform1f(PM.u.alpha,(+CFG.watermark.opacity||90)/100);gl.uniform1f(PM.u.kind,2);
    var I2=idx(2,2);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,I2.b);gl.drawElements(gl.TRIANGLES,I2.n,gl.UNSIGNED_SHORT,0)}
  seek.value=f;tc.textContent=(f/TRACK.fps).toFixed(1).replace(".",",")+" s";
}


function glLogo(L){LOGO=L;gl.activeTexture(gl.TEXTURE1);upload(tLogo,L.tex);if(userWhite===null)whiteBox.checked=L.dark;draw(lastT)}
function boatCfg(){document.querySelectorAll(".spots input").forEach(function(i){var s=CFG.surfaces[i.value];var lab=i.parentNode;lab.hidden=!s.enabled;lab.lastChild.textContent=s.label;i.checked=!!s.checked;on[i.value]=i.checked});draw(lastT);recap()}
/* --- Synchronisation image par image --- */
if("requestVideoFrameCallback" in vid){var cb=function(now,meta){lastT=meta.mediaTime;draw(lastT);vid.requestVideoFrameCallback(cb)};vid.requestVideoFrameCallback(cb)}
else{(function loop(){if(!vid.paused){lastT=vid.currentTime;draw(lastT)}requestAnimationFrame(loop)})()}
vid.addEventListener("seeked",function(){lastT=vid.currentTime;draw(lastT)});
vid.addEventListener("loadeddata",function(){ready=true;load.hidden=true;draw(vid.currentTime)});
vid.addEventListener("error",function(){load.textContent="La vidéo n'a pas pu être chargée."});
vid.src="assets/j80.mp4";vid.load();
fetch("assets/track2.json").then(function(r){return r.json()}).then(function(j){TRACK=j;seek.max=j.n-1;draw(lastT)}).catch(function(){say("Données de suivi indisponibles : rechargez la page.",true)});

var userPaused=false;
function setPlaying(p){if(p){var pr=vid.play();if(pr&&pr.catch)pr.catch(function(){})}else vid.pause();playBtn.textContent=p?"❚❚":"▶";playBtn.setAttribute("aria-label",p?"Mettre en pause":"Lire")}
playBtn.addEventListener("click",function(){setPlaying(vid.paused);userPaused=vid.paused});
seek.addEventListener("input",function(){if(TRACK)vid.currentTime=(+seek.value+.25)/TRACK.fps});
var rec=null;
if("IntersectionObserver" in window){new IntersectionObserver(function(es){es.forEach(function(e){if(rec)return;if(e.isIntersecting){if(!userPaused)setPlaying(true)}else vid.pause()})},{threshold:.25}).observe(cv)}

/* filigrane Icam Voile */
imgFromUrl("assets/img/logo.webp",function(im){var s=256,c=document.createElement("canvas");c.width=s;c.height=s;var g=c.getContext("2d");
  g.fillStyle="#fff";g.beginPath();g.arc(s/2,s/2,s/2-2,0,Math.PI*2);g.fill();g.drawImage(im,s*.06,s*.06,s*.88,s*.88);WM={aspect:1};gl.activeTexture(gl.TEXTURE1);upload(tWm,c);draw(lastT)});


document.querySelectorAll(".spots input").forEach(function(i){i.addEventListener("change",function(){on[i.value]=i.checked;draw(lastT)})});
whiteBox.addEventListener("change",function(){userWhite=whiteBox.checked;draw(lastT)});
onLogo(glLogo);onCfg(boatCfg);boatCfg();
/* --- Exports --- */
document.getElementById("simshot").addEventListener("click",function(){draw(lastT);cv.toBlob(function(b){if(!b){say("Capture impossible sur ce navigateur.",true);return}
  var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="icam-voile-j80-logo.png";document.body.appendChild(a);a.click();a.remove()},"image/png")});
var recBtn=document.getElementById("simrec");
recBtn.addEventListener("click",function(){
  if(rec){rec.stop();return}
  if(!cv.captureStream||!window.MediaRecorder){say("L'enregistrement vidéo n'est pas pris en charge par ce navigateur. Utilisez Chrome, Edge ou Firefox.",true);return}
  var types=["video/mp4;codecs=avc1","video/mp4","video/webm;codecs=vp9","video/webm"],mime=types.filter(function(t){return MediaRecorder.isTypeSupported(t)})[0]||"";
  var chunks=[];try{rec=new MediaRecorder(cv.captureStream(30),mime?{mimeType:mime,videoBitsPerSecond:8e6}:{})}catch(e){say("Enregistrement impossible sur ce navigateur.",true);rec=null;return}
  rec.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data)};
  rec.onstop=function(){var b=new Blob(chunks,{type:mime||"video/webm"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="icam-voile-j80-logo."+(/mp4/.test(mime)?"mp4":"webm");document.body.appendChild(a);a.click();a.remove();
    rec=null;vid.loop=true;recBtn.textContent="Enregistrer la vidéo";say("Vidéo enregistrée.");setPlaying(true)};
  vid.pause();vid.loop=false;vid.currentTime=0;
  var go=function(){vid.removeEventListener("seeked",go);rec.start(500);setPlaying(true)};vid.addEventListener("seeked",go);
  vid.addEventListener("ended",function stop(){vid.removeEventListener("ended",stop);if(rec&&rec.state!=="inactive")rec.stop()});
  recBtn.textContent="Arrêter l'enregistrement";say("Enregistrement en cours : 30 secondes, ne changez pas d'onglet.")});

}

/* ---------- Simulateur veste de quart (three.js) ---------- */
function loadScript(src){return new Promise(function(res,rej){var s=document.createElement("script");s.src=src;s.onload=res;s.onerror=function(){rej(new Error(src))};document.head.appendChild(s)})}
function getMesh(){
  function raw(){return fetch("assets/veste/veste.bin").then(function(r){if(!r.ok)throw new Error("mesh");return r.arrayBuffer()})}
  if(typeof DecompressionStream==="undefined")return raw();
  return fetch("assets/veste/veste.bin.gz").then(function(r){if(!r.ok||!r.body)throw new Error("gz");return new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()}).catch(raw)}
function initJacket(){
  var load=$("#jkLoad");
  var meshP=getMesh();
  loadScript("assets/vendor/three.min.js").then(function(){return Promise.all([loadScript("assets/vendor/OrbitControls.js"),loadScript("assets/vendor/DecalGeometry.js")])})
  .then(function(){return meshP}).then(function(buf){return new Promise(function(res){setTimeout(function(){res(buf)},30)})})
  .then(function(buf){buildJacket(buf)})
  .catch(function(e){load.hidden=false;load.textContent="La veste 3D n'a pas pu être chargée sur cet appareil. Le simulateur de bateau reste disponible.";if(window.console)console.error(e)})}
function buildJacket(buf){
const NV=109886,NF=221123,stage=$("#jkStage"),load=$("#jkLoad");
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.outputEncoding=THREE.sRGBEncoding;renderer.setPixelRatio(Math.min(devicePixelRatio,2));
stage.insertBefore(renderer.domElement,stage.firstChild);
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(32,1,0.05,20);cam.position.set(-2.4,0.02,0);
const controls=new THREE.OrbitControls(cam,renderer.domElement);
controls.enableDamping=true;controls.enablePan=false;controls.minDistance=0.8;controls.maxDistance=4;
scene.add(new THREE.HemisphereLight(0xffffff,0x667088,0.95));
const dl=new THREE.DirectionalLight(0xffffff,0.9);dl.position.set(2,3,2);scene.add(dl);
const dl2=new THREE.DirectionalLight(0xffffff,0.5);dl2.position.set(-2,1,-2);scene.add(dl2);
function resize(){const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height);cam.aspect=r.width/r.height;cam.updateProjectionMatrix()}
addEventListener("resize",resize);if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);resize();

const pos=new Float32Array(buf,0,NV*3),uv=new Float32Array(buf,NV*12,NV*2);
const n8=new Int8Array(buf,NV*20,NV*3),nor=new Float32Array(NV*3);for(let i=0;i<nor.length;i++)nor[i]=n8[i]/127;
const idx=new Uint32Array(buf.slice(NV*23,NV*23+NF*12));
const geo=new THREE.BufferGeometry();
geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setIndex(new THREE.BufferAttribute(idx,1));
const cx=new Float32Array(NF),cy=new Float32Array(NF),cz=new Float32Array(NF);
for(let f=0;f<NF;f++){const a=idx[3*f]*3,b=idx[3*f+1]*3,c=idx[3*f+2]*3;
cx[f]=(pos[a]+pos[b]+pos[c])/3;cy[f]=(pos[a+1]+pos[b+1]+pos[c+1])/3;cz[f]=(pos[a+2]+pos[b+2]+pos[c+2])/3}
const wsum=[],wn=[],wc=[],wmap=new Map(),rm=new Uint32Array(NV);
for(let i=0;i<NV;i++){const k=Math.round(pos[3*i]/.014)+','+Math.round(pos[3*i+1]/.014)+','+Math.round(pos[3*i+2]/.014);let j=wmap.get(k);if(j===undefined){j=wc.length;wmap.set(k,j);wsum.push(0,0,0);wn.push(0,0,0);wc.push(0)}rm[i]=j;wc[j]++;for(let c=0;c<3;c++){wsum[3*j+c]+=pos[3*i+c];wn[3*j+c]+=nor[3*i+c]}}
const WP=new Float32Array(wsum.length),WN=new Float32Array(wn.length);
for(let j=0;j<wc.length;j++){const l=Math.hypot(wn[3*j],wn[3*j+1],wn[3*j+2])||1;for(let c=0;c<3;c++){WP[3*j+c]=wsum[3*j+c]/wc[j];WN[3*j+c]=wn[3*j+c]/l}}
const wiA=[];for(let f=0;f<NF;f++){const a=rm[idx[3*f]],b=rm[idx[3*f+1]],c=rm[idx[3*f+2]];if(a!==b&&b!==c&&a!==c)wiA.push(a,b,c)}
(function(){const vn=new Float32Array(WP.length);
for(let t=0;t<wiA.length;t+=3){const a=wiA[t]*3,b=wiA[t+1]*3,c=wiA[t+2]*3;const ux=WP[b]-WP[a],uy=WP[b+1]-WP[a+1],uz=WP[b+2]-WP[a+2],vx=WP[c]-WP[a],vy=WP[c+1]-WP[a+1],vz=WP[c+2]-WP[a+2];
const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const q of [a,b,c]){vn[q]+=nx;vn[q+1]+=ny;vn[q+2]+=nz}}
for(let i=0;i<vn.length;i+=3){let l=Math.hypot(vn[i],vn[i+1],vn[i+2])||1,s=(vn[i]*WN[i]+vn[i+1]*WN[i+1]+vn[i+2]*WN[i+2])<0?-1:1;WN[i]=vn[i]/l*s;WN[i+1]=vn[i+1]/l*s;WN[i+2]=vn[i+2]/l*s}})();
const WI=new Uint32Array(wiA),WF=WI.length/3,wcx=new Float32Array(WF),wcy=new Float32Array(WF),wcz=new Float32Array(WF),wfx=new Float32Array(WF),wfy=new Float32Array(WF),wfz=new Float32Array(WF);
for(let f=0;f<WF;f++){const a=WI[3*f]*3,b=WI[3*f+1]*3,c=WI[3*f+2]*3;wcx[f]=(WP[a]+WP[b]+WP[c])/3;wcy[f]=(WP[a+1]+WP[b+1]+WP[c+1])/3;wcz[f]=(WP[a+2]+WP[b+2]+WP[c+2])/3;
const ux=WP[b]-WP[a],uy=WP[b+1]-WP[a+1],uz=WP[b+2]-WP[a+2],vx=WP[c]-WP[a],vy=WP[c+1]-WP[a+1],vz=WP[c+2]-WP[a+2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
const s=nx*(WN[a]+WN[b]+WN[c])+ny*(WN[a+1]+WN[b+1]+WN[c+1])+nz*(WN[a+2]+WN[b+2]+WN[c+2]);const sg=s<0?-1:1;wfx[f]=nx*sg;wfy[f]=ny*sg;wfz[f]=nz*sg}
const wNorA=new THREE.BufferAttribute(WN,3);
const wCol=new Float32Array(WP.length).fill(.03),wColA=new THREE.BufferAttribute(wCol,3);
const UP=new Float32Array(WP.length);for(let i=0;i<UP.length;i++)UP[i]=WP[i]-WN[i]*.006;
const jg=new THREE.BufferGeometry();jg.setAttribute('position',new THREE.BufferAttribute(UP,3));jg.setAttribute('normal',wNorA);jg.setAttribute('color',wColA);jg.setIndex(new THREE.BufferAttribute(WI,1));
const under=new THREE.Mesh(jg,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,metalness:0,side:THREE.DoubleSide}));scene.add(under);
const TEXURL="assets/veste/veste-tex.jpg";
const tex=new THREE.TextureLoader().load(TEXURL);tex.flipY=false;tex.encoding=THREE.sRGBEncoding;
const jacket=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:tex,roughness:.85,metalness:0,side:THREE.DoubleSide}));
const mPos=new Float32Array(pos.length+WP.length);mPos.set(pos);mPos.set(WP,pos.length);
const mNor=new Float32Array(nor.length+WN.length);mNor.set(nor);mNor.set(WN,nor.length);
const mPosA=new THREE.BufferAttribute(mPos,3),mNorA=new THREE.BufferAttribute(mNor,3);
const ofx=new Float32Array(NF),ofy=new Float32Array(NF),ofz=new Float32Array(NF);
for(let f=0;f<NF;f++){const a=idx[3*f]*3,b=idx[3*f+1]*3,c=idx[3*f+2]*3;const ux=pos[b]-pos[a],uy=pos[b+1]-pos[a+1],uz=pos[b+2]-pos[a+2],vx=pos[c]-pos[a],vy=pos[c+1]-pos[a+1],vz=pos[c+2]-pos[a+2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;const s=nx*(nor[a]+nor[b]+nor[c])+ny*(nor[a+1]+nor[b+1]+nor[c+1])+nz*(nor[a+2]+nor[b+2]+nor[c+2]),sg=s<0?-1:1;ofx[f]=nx*sg;ofy[f]=ny*sg;ofz[f]=nz*sg}
scene.add(jacket);

const ray=new THREE.Raycaster();
function cast(o,d){ray.set(o,d.clone().normalize());return ray.intersectObjects([jacket,under],false)[0]||null}
function smoothN(h){const f=h.face,n=new THREE.Vector3(),NA=h.object===jacket?nor:WN;
[f.a,f.b,f.c].forEach(i=>n.add(new THREE.Vector3(NA[3*i],NA[3*i+1],NA[3*i+2])));
n.normalize();if(n.dot(ray.ray.direction)>0)n.negate();return n}
function orient(n,ang){const m=new THREE.Matrix4(),up=Math.abs(n.y)>.95?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
m.lookAt(n,new THREE.Vector3(),up);const q=new THREE.Quaternion().setFromRotationMatrix(m);
q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),ang));return new THREE.Euler().setFromQuaternion(q)}

const items=[];let sel=null;
function rebuild(it){
const w=it.size,h=it.size/it.aspect,r=Math.hypot(w,h)*.5+.04,r2=r*r,p=it.pos,ids=[];
const nn=it.normal;for(let f=0;f<NF;f++){const dx=cx[f]-p.x,dy=cy[f]-p.y,dz=cz[f]-p.z;if(dx*dx+dy*dy+dz*dz<r2*1.5&&ofx[f]*nn.x+ofy[f]*nn.y+ofz[f]*nn.z>.2)ids.push(idx[3*f],idx[3*f+1],idx[3*f+2])}
for(let f=0;f<WF;f++){const dx=wcx[f]-p.x,dy=wcy[f]-p.y,dz=wcz[f]-p.z;if(dx*dx+dy*dy+dz*dz<r2*1.5&&wfx[f]*nn.x+wfy[f]*nn.y+wfz[f]*nn.z>.2)ids.push(WI[3*f]+NV,WI[3*f+1]+NV,WI[3*f+2]+NV)}
const g=new THREE.BufferGeometry();g.setAttribute('position',mPosA);g.setAttribute('normal',mNorA);g.setIndex(ids);
const tmp=new THREE.Mesh(g);tmp.updateMatrixWorld(true);
const dg=new THREE.DecalGeometry(tmp,p,orient(it.normal,it.angle),new THREE.Vector3(w,h,.24));
if(it.mesh){it.mesh.geometry.dispose();it.mesh.geometry=dg}else{
it.mesh=new THREE.Mesh(dg,new THREE.MeshStandardMaterial({map:it.tex,transparent:true,roughness:.8,polygonOffset:true,polygonOffsetFactor:-8,polygonOffsetUnits:-8,depthWrite:false}));scene.add(it.mesh)}
}
function place(it,h){it.pos=h.point.clone();it.normal=smoothN(h);rebuild(it)}

/* texture du logo partagé (fond blanc facultatif) */
function makeTex(L,white){const im=L.preview,k=Math.min(1,640/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*k)),h=Math.max(1,Math.round(im.height*k)),p=white?Math.round(Math.max(w,h)*.08):0;
const c=document.createElement('canvas'),x=c.getContext('2d');c.width=w+2*p;c.height=h+2*p;
if(white){x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height)}
x.drawImage(im,p,p,w,h);
const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return{tex:t,aspect:c.width/c.height,url:c.toDataURL()}}
function zoneName(it){const p=it.pos,c=Math.abs(p.z)<.04,g=p.z<0;
if(Math.abs(p.z)>.26)return g?'Manche gauche':'Manche droite';
if(p.x>0)return c?'Poitrine centrée':(g?'Poitrine gauche':'Poitrine droite');
if(p.y<-.12)return 'Bas du dos';
return c?'Dos centré':(g?'Dos côté gauche':'Dos côté droit')}
const listEl=$("#jkList"),sizeEl=$("#jkSize"),rotEl=$("#jkRot"),vsEl=$("#jkVs"),vrEl=$("#jkVr"),whiteEl=$("#jkWhite"),zoneEl=$("#jkZone");
function refresh(){
listEl.innerHTML='';
if(!items.length)listEl.innerHTML='<p class="empty">Aucun logo sur la veste. Choisissez un emplacement, puis ajoutez-le.</p>';
items.forEach(it=>{const d=document.createElement('div');d.className='item'+(it===sel?' sel':'');
d.innerHTML='<img src="'+it.url+'" alt=""><div><b></b><small></small></div>';
d.querySelector('b').textContent=zoneName(it);d.querySelector('small').textContent='Taille '+Math.round(it.size*100)+' %';
const x=document.createElement('button');x.type='button';x.textContent='Retirer';x.onclick=e=>{e.stopPropagation();remove(it)};d.appendChild(x);
d.onclick=()=>select(it);listEl.appendChild(d)});
const ok=!!sel;sizeEl.disabled=rotEl.disabled=!ok;
if(sel){sizeEl.value=sel.size;rotEl.value=Math.round(sel.angle*180/Math.PI);vsEl.textContent=Math.round(sel.size*100)+' %';vrEl.textContent=Math.round(sel.angle*180/Math.PI)+'°'}else{vsEl.textContent='';vrEl.textContent=''}
recap()}
jkSummary=()=>items.map((it,i)=>(i+1)+'. '+zoneName(it)+', taille '+Math.round(it.size*100)+' %'+(it.angle?', rotation '+Math.round(it.angle*180/Math.PI)+'°':''));
function select(it){sel=it;refresh()}
function remove(it){scene.remove(it.mesh);it.mesh.geometry.dispose();items.splice(items.indexOf(it),1);sel=items[items.length-1]||null;refresh()}
const ZONES={dc:[[-2,-.03,0],[1,0,0],.26],pg:[[2,.17,-.13],[-1,0,0],.1],pd:[[2,.17,.13],[-1,0,0],.1],mg:[[.02,.05,-2],[0,0,1],.09],md:[[.02,.05,2],[0,0,-1],.09],db:[[-2,-.22,0],[1,0,0],.16]};
function add(key){
const z=ZONES[key||zoneEl.value],L=SIM.logo;if(!z||!L)return;
const h=cast(new THREE.Vector3(...z[0]),new THREE.Vector3(...z[1]));
if(!h){say("Emplacement introuvable : cliquez directement sur la veste.",true);return}
const t=makeTex(L,whiteEl.checked),it={name:'Logo',tex:t.tex,aspect:t.aspect,url:t.url,size:z[2],angle:0};place(it,h);items.push(it);select(it)}
function retex(){const L=SIM.logo;if(!L)return;items.forEach(it=>{const t=makeTex(L,whiteEl.checked);if(it.tex&&it.tex.dispose)it.tex.dispose();it.tex=t.tex;it.aspect=t.aspect;it.url=t.url;if(it.mesh){it.mesh.material.map=t.tex;it.mesh.material.needsUpdate=true}rebuild(it)});refresh()}
$("#jkAdd").onclick=()=>add();
whiteEl.onchange=retex;
sizeEl.oninput=e=>{if(sel){sel.size=+e.target.value;rebuild(sel);refresh()}};
rotEl.oninput=e=>{if(sel){sel.angle=e.target.value*Math.PI/180;rebuild(sel);refresh()}};

/* interaction au pointeur : déplacer un logo, ou cliquer sur la veste pour y placer le logo sélectionné */
const dom=renderer.domElement;let drag=null,down=null,pend=null;
function ndc(e){const r=dom.getBoundingClientRect();return new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1)}
function pickJ(e){ray.setFromCamera(ndc(e),cam);return ray.intersectObjects([jacket,under],false)[0]||null}
dom.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};ray.setFromCamera(ndc(e),cam);
const hit=ray.intersectObjects(items.map(i=>i.mesh),false)[0];
if(hit){const it=items.find(i=>i.mesh===hit.object);select(it);drag=it;controls.enabled=false}},true);
dom.addEventListener('pointermove',e=>{if(!drag)return;pend=e;if(!pend.q){pend.q=1;requestAnimationFrame(()=>{const h=pickJ(pend);if(h&&drag)place(drag,h)})}});
addEventListener('pointerup',e=>{
if(drag){drag=null;controls.enabled=true;refresh()}
else if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<5&&sel&&e.target===dom){const h=pickJ(e);if(h){place(sel,h);refresh()}}
down=null});

/* vues */
const V={dos:[-2.4,.02,0],face:[2.4,.02,0],g:[0,.02,-2.4],d:[0,.02,2.4]};let anim=null,vis=false;
document.querySelectorAll('#jkViews button').forEach(b=>b.onclick=()=>{const t=new THREE.Vector3(...V[b.dataset.v]);anim={from:cam.position.clone(),to:t,k:0}});
if("IntersectionObserver" in window)new IntersectionObserver(es=>{vis=es[0].isIntersecting;if(vis)resize()},{threshold:0}).observe(stage);else vis=true;
(function loop(){requestAnimationFrame(loop);if(!vis&&!anim)return;
if(anim){anim.k=Math.min(1,anim.k+.06);const e=anim.k*anim.k*(3-2*anim.k);
const a=anim.from.clone().normalize(),b=anim.to.clone().normalize(),v=a.lerp(b,e);if(v.length()<.05)v.set(0,0,1);
cam.position.copy(v.normalize().multiplyScalar(THREE.MathUtils.lerp(anim.from.length(),anim.to.length(),e)));if(anim.k>=1)anim=null}
controls.update();renderer.render(scene,cam)})();

/* couleur de la doublure d'après la texture, puis première pose du logo */
const timg=new Image();timg.onload=()=>{const cv=document.createElement('canvas');cv.width=cv.height=1024;const cx2=cv.getContext('2d');cx2.drawImage(timg,0,0,1024,1024);const d=cx2.getImageData(0,0,1024,1024).data,s=new Float32Array(WP.length);
for(let i=0;i<NV;i++){const px=Math.min(1023,Math.max(0,Math.floor(uv[2*i]*1024))),py=Math.min(1023,Math.max(0,Math.floor(uv[2*i+1]*1024))),o=(py*1024+px)*4,j=rm[i];for(let c=0;c<3;c++)s[3*j+c]+=Math.pow(d[o+c]/255,2.2)}
for(let j=0;j<wc.length;j++)for(let c=0;c<3;c++)wCol[3*j+c]=s[3*j+c]/wc[j];wColA.needsUpdate=true;load.hidden=true;
onLogo(()=>retex());add('dc');refresh()};timg.src=TEXURL;
}

/* ---------- Démarrage à la demande ---------- */
var boatDone=false,jkDone=false;
function startBoat(){if(boatDone||EDIT)return;boatDone=true;try{initBoat()}catch(e){say("Le simulateur de bateau n'a pas pu démarrer sur cet appareil.",true);if(window.console)console.error(e)}}
function startJk(){if(jkDone||EDIT||CFG.jacket.enabled===false)return;jkDone=true;initJacket()}
function near(el,fn){if(!("IntersectionObserver" in window)){fn();return}var io=new IntersectionObserver(function(es){if(es.some(function(e){return e.isIntersecting})){io.disconnect();fn()}},{rootMargin:"600px 0px"});io.observe(el)}
var tabs=$$(".sim-tabs button");$("#simJacket").classList.add("off");
tabs.forEach(function(b){b.addEventListener("click",function(){var t=b.dataset.t;tabs.forEach(function(x){x.setAttribute("aria-pressed",x===b)});
  $("#simBoat").classList.toggle("off",t!=="boat");$("#simJacket").classList.toggle("off",t!=="jacket");(t==="boat"?startBoat:startJk)()})});
near($("#simBoat"),startBoat);near($("#simJacket"),startJk);
applyCfg(window.SIMCFG||null);
})();
