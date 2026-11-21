/*
 * Lootle drawings. Everything you see that is not text is an SVG built here:
 * the night skyline, the vault door and lock, what is inside the vault, the
 * shutters and the cat. No game rules live in this file.
 */
window.LootleArt = (function () {
var $=function(id){return document.getElementById(id)},R=function(a,b){return a+Math.random()*(b-a)},v=function(n){return 'var(--'+n+')'};
var seed=7;function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647}

/* shared gradients */
var defs=document.createElementNS('http://www.w3.org/2000/svg','svg');defs.setAttribute('width','0');defs.setAttribute('height','0');defs.style.position='absolute';
defs.innerHTML='<defs>'+
'<linearGradient id="gSteel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b57a0"/><stop offset=".5" stop-color="#2b3470"/><stop offset="1" stop-color="#1b2252"/></linearGradient>'+
'<linearGradient id="gSteelR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2252"/><stop offset="1" stop-color="#3a4590"/></linearGradient>'+
'<linearGradient id="gChrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f6ff"/><stop offset=".45" stop-color="#8790b8"/><stop offset=".6" stop-color="#dfe3f7"/><stop offset="1" stop-color="#5a638d"/></linearGradient>'+
'<linearGradient id="gGoldTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b3"/><stop offset="1" stop-color="#f5c645"/></linearGradient>'+
'<linearGradient id="gGoldFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1b327"/><stop offset="1" stop-color="#a87412"/></linearGradient>'+
'<linearGradient id="gBrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe9a6"/><stop offset=".5" stop-color="#d9a52e"/><stop offset="1" stop-color="#8b6510"/></linearGradient>'+
'<radialGradient id="gMoon" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fffdf2"/><stop offset="1" stop-color="#e9dfc0"/></radialGradient>'+
'<radialGradient id="gHalo"><stop offset="0" stop-color="#f6efdc" stop-opacity=".35"/><stop offset="1" stop-color="#f6efdc" stop-opacity="0"/></radialGradient>'+
'<radialGradient id="gLamp"><stop offset="0" stop-color="#f5b82e" stop-opacity=".55"/><stop offset="1" stop-color="#f5b82e" stop-opacity="0"/></radialGradient>'+
'<linearGradient id="gBeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f5b82e" stop-opacity=".34"/><stop offset="1" stop-color="#f5b82e" stop-opacity="0"/></linearGradient>'+
'<linearGradient id="gFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#232a66"/><stop offset="1" stop-color="#1a2052"/></linearGradient>'+
'<linearGradient id="gNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1030"/><stop offset="1" stop-color="#070919"/></linearGradient>'+
'<linearGradient id="gStone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fffaf0"/><stop offset=".55" stop-color="#efe6cf"/><stop offset="1" stop-color="#b9ae90"/></linearGradient>'+
'<linearGradient id="gCone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a6" stop-opacity=".55"/><stop offset="1" stop-color="#f5b82e" stop-opacity=".05"/></linearGradient>'+
'<radialGradient id="gRivet" cx=".35" cy=".3"><stop offset="0" stop-color="#aab3e6"/><stop offset="1" stop-color="#1b2252"/></radialGradient>'+
'<filter id="fBlur"><feGaussianBlur stdDeviation="6"/></filter><filter id="fSoft"><feGaussianBlur stdDeviation="1.2"/></filter>'+
'</defs>';
document.body.appendChild(defs);

/* ---------- front scene ---------- */
var s='';
for(var i=0;i<60;i++)s+='<circle class="tw" style="animation-delay:'+(rnd()*3).toFixed(2)+'s" cx="'+(rnd()*390).toFixed(0)+'" cy="'+(rnd()*200).toFixed(0)+'" r="'+(rnd()<.15?1.4:.8)+'" fill="#f6efdc"/>';
s+='<circle cx="296" cy="84" r="110" fill="url(#gHalo)"/><circle cx="296" cy="84" r="44" fill="url(#gMoon)"/><g fill="#cfc5a4" opacity=".55"><circle cx="282" cy="72" r="7"/><circle cx="310" cy="98" r="5"/><circle cx="302" cy="64" r="3"/><circle cx="286" cy="100" r="2.5"/></g>';
s+='<g class="cloud" opacity=".55" filter="url(#fSoft)"><ellipse cx="40" cy="120" rx="50" ry="7" fill="#3b448c"/><ellipse cx="74" cy="113" rx="32" ry="6" fill="#3b448c"/></g><g class="cloud" style="animation-delay:-22s" opacity=".4" filter="url(#fSoft)"><ellipse cx="30" cy="66" rx="60" ry="6" fill="#3b448c"/></g>';
s+='<path class="beam" d="M150 392L92 -40h116z" fill="url(#gBeam)"/>';
function tower(x,w,h,fill,lit,top){var y=392-h,o='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'"/>';
  if(top==1)o+='<rect x="'+(x+w/2-1)+'" y="'+(y-26)+'" width="2" height="26" fill="#070919"/><circle class="flick" cx="'+(x+w/2)+'" cy="'+(y-27)+'" r="2.2" fill="#f0485a"/>';
  if(top==2)o+='<rect x="'+(x+8)+'" y="'+(y-16)+'" width="18" height="12" rx="2" fill="#070919"/><path d="M'+(x+8)+' '+(y-16)+'l9-7 9 7z" fill="#070919"/><path d="M'+(x+11)+' '+(y-4)+'v4M'+(x+23)+' '+(y-4)+'v4" stroke="#070919" stroke-width="2"/>';
  if(top==3)o+='<path d="M'+x+' '+y+'l'+(w/2)+' -22 '+(w/2)+' 22z" fill="'+fill+'"/>';
  for(var wy=y+12;wy<376;wy+=15)for(var wx=x+6;wx<x+w-8;wx+=11)if(rnd()<lit)o+='<rect '+(rnd()<.1?'class="flick" ':'')+'x="'+wx+'" y="'+wy+'" width="4.5" height="7.5" fill="'+(rnd()<.8?'#f5c85a':'#bfe6ff')+'" opacity="'+(rnd()<.5?.95:.5)+'"/>';return o}
s+=tower(18,46,150,'url(#gFar)',.16,3)+tower(92,36,214,'url(#gFar)',.16,1)+tower(230,42,188,'url(#gFar)',.16,0)+tower(326,44,166,'url(#gFar)',.16,3);
s+='<ellipse cx="195" cy="300" rx="260" ry="26" fill="#3b448c" opacity=".35" filter="url(#fBlur)"/>';
s+=tower(-8,52,232,'url(#gNear)',.26,2)+tower(40,46,292,'url(#gNear)',.26,1)+tower(292,52,322,'url(#gNear)',.26,0)+tower(340,58,222,'url(#gNear)',.26,2);
/* the bank */
s+='<ellipse cx="195" cy="386" rx="150" ry="18" fill="#f5b82e" opacity=".14" filter="url(#fBlur)"/>';
s+='<rect x="104" y="374" width="182" height="18" fill="url(#gStone)"/><rect x="112" y="364" width="166" height="10" fill="url(#gStone)"/><rect x="112" y="372" width="166" height="2" fill="#000" opacity=".2"/>';
s+='<rect x="122" y="232" width="146" height="132" fill="#141a46"/>';
s+='<path d="M112 222l83-54 83 54z" fill="url(#gStone)"/><path d="M134 216l61-38 61 38z" fill="#1b2252"/><path d="M134 216l61-38 61 38" fill="none" stroke="#f5b82e" stroke-width="1" opacity=".7"/><rect x="112" y="222" width="166" height="12" fill="url(#gStone)"/><rect x="112" y="232" width="166" height="2.5" fill="#000" opacity=".25"/>';
s+='<circle cx="195" cy="202" r="11" fill="#fffaf0" stroke="#f5b82e" stroke-width="1.5"/><path d="M195 195v7l5 3" stroke="#070919" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
for(var c=0;c<6;c++){var cx=128+c*26.4;if(c==2||c==3)continue;s+='<rect x="'+cx+'" y="240" width="13" height="118" fill="url(#gStone)"/><g stroke="#000" stroke-width=".7" opacity=".12"><path d="M'+(cx+3.5)+' 242v114M'+(cx+6.5)+' 242v114M'+(cx+9.5)+' 242v114"/></g><rect x="'+(cx-2.5)+'" y="234" width="18" height="7" rx="1" fill="url(#gStone)"/><rect x="'+(cx-2.5)+'" y="357" width="18" height="7" rx="1" fill="url(#gStone)"/>'}
s+='<path d="M176 364v-74a19 19 0 0 1 38 0v74z" fill="url(#gBrass)"/><path d="M180 364v-73a15 15 0 0 1 30 0v73z" fill="none" stroke="#8b6510" stroke-width="1"/><rect x="194.300" y="274" width="1.400" height="90" fill="#8b6510"/><circle cx="189" cy="324" r="2.2" fill="#070919"/><circle cx="201" cy="324" r="2.2" fill="#070919"/><ellipse cx="195" cy="300" rx="40" ry="60" fill="url(#gLamp)" opacity=".5"/>';
s+='<rect x="146" y="244" width="98" height="16" fill="#070919"/><rect x="146" y="244" width="98" height="16" fill="none" stroke="#f5b82e" stroke-width=".8"/><text x="195" y="255.500" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="8.500" letter-spacing="2.600" fill="#f5c85a">FIRST NATIONAL</text>';
function lamp(x){return '<circle cx="'+x+'" cy="318" r="30" fill="url(#gLamp)"/><path d="M'+x+' 392v-68" stroke="#070919" stroke-width="2.500"/><path d="M'+(x-5)+' 324h10l-2-9h-6z" fill="#ffe9a6"/><path d="M'+(x-7)+' 314h14" stroke="#070919" stroke-width="2"/>'}
s+=lamp(96)+lamp(294);
s+='<g class="laser" stroke="#f0485a" stroke-width="1.200"><line x1="122" y1="300" x2="176" y2="330"/><line x1="268" y1="290" x2="214" y2="336"/></g><g class="laser" stroke="#f0485a" stroke-width="4" opacity=".25" filter="url(#fSoft)"><line x1="122" y1="300" x2="176" y2="330"/><line x1="268" y1="290" x2="214" y2="336"/></g>';
$('sky').innerHTML=s;

/* ---------- door ---------- */
function rivets(y){var o='';for(var x=18;x<390;x+=44)o+='<circle cx="'+x+'" cy="'+y+'" r="3.600" fill="url(#gRivet)"/>';return o}
function hazard(y){var o='<rect x="0" y="'+y+'" width="390" height="10" fill="#d9a52e"/>';for(var x=-8;x<400;x+=20)o+='<path d="M'+x+' '+(y+10)+'l8-10h8l-8 10z" fill="#070919"/>';return o+'<rect x="0" y="'+y+'" width="390" height="1" fill="#fff" opacity=".35"/>'}
function panel(x,y,w,h){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="18" fill="url(#gSteelR)"/><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="18" fill="none" stroke="#070919" stroke-width="1.500" opacity=".7"/><rect x="'+(x+1.500)+'" y="'+(y+2)+'" width="'+(w-3)+'" height="'+(h-3)+'" rx="17" fill="none" stroke="#aab3e6" stroke-width=".8" opacity=".35"/>'}
function doorHalf(top){
  var o='<rect width="390" height="170" fill="url(#gSteel)"/>';
  for(var y=3;y<170;y+=4)o+='<rect x="0" y="'+y+'" width="390" height=".6" fill="#fff" opacity="'+(.02+((y*7)%5)*.008).toFixed(3)+'"/>';
  o+='<rect x="0" y="'+(top?0:150)+'" width="390" height="20" fill="#141a46" opacity=".8"/>'+rivets(top?10:160);
  o+=panel(34,top?44:22,130,top?88:112)+panel(226,top?44:22,130,top?88:112);
  if(top){
    o+='<text x="99" y="109" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="54" fill="#aab3e6" opacity=".5" id="bigN2">04</text><text x="99" y="107.500" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="54" fill="#141a46" id="bigN">04</text>';
    o+='<g transform="translate(252 60)"><rect width="78" height="30" rx="4" fill="#070919"/><rect x=".5" y=".5" width="77" height="29" rx="4" fill="none" stroke="#aab3e6" stroke-width=".6" opacity=".4"/><circle cx="14" cy="15" r="4.500" fill="#f0485a" class="flick"/><circle cx="14" cy="15" r="9" fill="#f0485a" opacity=".2"/><circle cx="29" cy="15" r="4.500" fill="#3fd0b6" opacity=".3"/><rect x="41" y="8" width="30" height="14" rx="2" fill="#0d1338"/><text x="56" y="18.500" text-anchor="middle" font-family="monospace" font-size="8.500" fill="#3fd0b6">ARMED</text></g>';
    o+='<g transform="translate(252 100)" stroke="#141a46" stroke-width="2.500" stroke-linecap="round"><line x1="0" y1="0" x2="78" y2="0"/><line x1="0" y1="8" x2="78" y2="8"/><line x1="0" y1="16" x2="78" y2="16"/></g>';
    o+=hazard(160)+'<rect x="0" y="150" width="390" height="10" fill="#000" opacity=".25"/>';
  }else{
    o+=hazard(0)+'<rect x="0" y="10" width="390" height="10" fill="#000" opacity=".3"/>';
    o+='<g transform="translate(65 44)"><circle cx="34" cy="34" r="32" fill="url(#gChrome)"/><circle cx="34" cy="34" r="27" fill="#070919"/><path d="M14 44a24 24 0 0 1 40 0" fill="none" stroke="#3fd0b6" stroke-width="3"/><path d="M47 25a24 24 0 0 1 7 19" fill="none" stroke="#f0485a" stroke-width="3"/><g stroke="#f6efdc" stroke-width=".8" opacity=".7"><path d="M34 12v5M18 20l3 4M50 20l-3 4M12 34h5M56 34h-5"/></g><line x1="34" y1="36" x2="47" y2="20" stroke="#f6efdc" stroke-width="2" stroke-linecap="round"/><circle cx="34" cy="36" r="3.500" fill="url(#gChrome)"/><path d="M16 20a24 24 0 0 1 14-9" fill="none" stroke="#fff" stroke-width="2" opacity=".18" stroke-linecap="round"/></g>';
    o+='<g transform="translate(248 40)"><rect width="86" height="40" rx="3" fill="url(#gBrass)"/><rect x="3" y="3" width="80" height="34" rx="1.500" fill="none" stroke="#8b6510" stroke-width="1"/><circle cx="7" cy="7" r="1.500" fill="#8b6510"/><circle cx="79" cy="7" r="1.500" fill="#8b6510"/><circle cx="7" cy="33" r="1.500" fill="#8b6510"/><circle cx="79" cy="33" r="1.500" fill="#8b6510"/><text x="43" y="18" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="8" letter-spacing="1" fill="#3d2c05">LOOTLE &amp; SONS</text><text x="43" y="30" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="7.500" fill="#3d2c05">Vault No. 0410</text></g>';
    o+='<rect x="282" y="92" width="16" height="38" rx="8" fill="url(#gChrome)"/><rect x="284" y="96" width="3" height="30" rx="1.500" fill="#fff" opacity=".5"/>';
  }
  var by=top?134:20;
  o+='<rect class="bolt l" x="148" y="'+by+'" width="54" height="14" rx="3" fill="url(#gChrome)"/><rect class="bolt r" x="188" y="'+by+'" width="54" height="14" rx="3" fill="url(#gChrome)"/>';
  return o}
$('htop').innerHTML=doorHalf(true);$('hbot').innerHTML=doorHalf(false);

/* lock: a chrome spoked wheel, an engraved brass dial and a steel knob */
var W='<circle cx="88" cy="88" r="80" fill="none" stroke="url(#gChrome)" stroke-width="8"/><circle cx="88" cy="88" r="84" fill="none" stroke="#070919" stroke-width="1" opacity=".6"/><circle cx="88" cy="88" r="76" fill="none" stroke="#070919" stroke-width="1" opacity=".6"/>';
for(var a=0;a<6;a++){var r=a*60*Math.PI/180,sx=Math.sin(r),cy=Math.cos(r);W+='<line x1="'+(88+58*sx).toFixed(1)+'" y1="'+(88-58*cy).toFixed(1)+'" x2="'+(88+78*sx).toFixed(1)+'" y2="'+(88-78*cy).toFixed(1)+'" stroke="url(#gChrome)" stroke-width="7" stroke-linecap="round"/><circle cx="'+(88+80*sx).toFixed(1)+'" cy="'+(88-80*cy).toFixed(1)+'" r="7.500" fill="url(#gChrome)" stroke="#070919" stroke-width="1"/>'}
$('wheel').innerHTML=W;
var F='';for(var t=0;t<100;t++){var ra=t*3.6*Math.PI/180,big=t%10==0,mid=t%5==0,r1=big?44:mid?47:50;F+='<line x1="'+(58+r1*Math.sin(ra)).toFixed(1)+'" y1="'+(58-r1*Math.cos(ra)).toFixed(1)+'" x2="'+(58+54*Math.sin(ra)).toFixed(1)+'" y2="'+(58-54*Math.cos(ra)).toFixed(1)+'" stroke="#2a1e03" stroke-width="'+(big?1.6:mid?1.1:.6)+'"/>'}
for(var n=0;n<100;n+=10){var na=n*3.6*Math.PI/180;F+='<text x="'+(58+36*Math.sin(na)).toFixed(1)+'" y="'+(58-36*Math.cos(na)+3).toFixed(1)+'" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="8.500" fill="#2a1e03">'+n+'</text>'}
$('face').innerHTML=F;

/* inside the vault: a room in perspective, with one of three hauls */
function bar(x,y){return '<path d="M'+(x+6)+' '+y+'h44l6 14h-56z" fill="url(#gGoldTop)"/><path d="M'+x+' '+(y+14)+'h56v8h-56z" fill="url(#gGoldFront)"/><path d="M'+(x+12)+' '+(y+4)+'h18" stroke="#fff" stroke-width="1.500" opacity=".7" stroke-linecap="round"/><path d="M'+x+' '+(y+22)+'h56" stroke="#000" opacity=".35"/>'}
function room(){
  var I='<rect width="390" height="340" fill="#060817"/><path d="M0 0h390v340H0z" fill="#0d1338"/><path d="M90 40h210v190H90z" fill="#141a46"/><path d="M0 0l90 40v190L0 340zM390 0l-90 40v190l90 110z" fill="#101641"/><path d="M0 340l90-110h210l90 110z" fill="#1b2252"/>';
  I+='<g stroke="#070919" stroke-width="1" opacity=".5"><path d="M0 0l90 40M390 0l-90 40M0 340l90-110M390 340l-90-110"/></g>';
  for(var c=0;c<6;c++)for(var r=0;r<5;r++){I+='<rect x="'+(98+c*33)+'" y="'+(48+r*35)+'" width="29" height="31" rx="2" fill="url(#gSteelR)" stroke="#070919" stroke-width=".8"/><circle cx="'+(112.500+c*33)+'" cy="'+(63.500+r*35)+'" r="2.500" fill="url(#gBrass)"/><rect x="'+(104+c*33)+'" y="'+(70+r*35)+'" width="17" height="2" rx="1" fill="#070919" opacity=".5"/>'}
  for(var k=1;k<5;k++){I+='<path d="M'+(k*18)+' '+(k*8)+'v'+(340-k*30)+'" stroke="#070919" opacity=".35"/><path d="M'+(390-k*18)+' '+(k*8)+'v'+(340-k*30)+'" stroke="#070919" opacity=".35"/>'}
  I+='<path d="M150 0h90l70 340H80z" fill="url(#gCone)"/><ellipse cx="195" cy="296" rx="120" ry="20" fill="#f5b82e" opacity=".18" filter="url(#fBlur)"/>';
  return I}
var HAUL={
gold:function(){var o='<ellipse cx="195" cy="304" rx="110" ry="9" fill="#000" opacity=".45"/>';for(var row=0;row<4;row++)for(var k=0;k<4-row;k++)o+=bar(83+row*29+k*58,280-row*22);return o+'<g fill="#fff"><path class="tw" d="M150 232l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path class="tw" style="animation-delay:.8s" d="M248 258l1.500 4.500 4.500 1.500-4.500 1.500-1.500 4.500-1.500-4.500-4.500-1.500 4.500-1.500z"/></g>'},
art:function(){return '<ellipse cx="195" cy="312" rx="96" ry="8" fill="#000" opacity=".45"/><path d="M150 312l20-60M240 312l-20-60M195 312v-40" stroke="#3d2c05" stroke-width="5" stroke-linecap="round"/><rect x="118" y="112" width="154" height="150" rx="3" fill="url(#gBrass)"/><rect x="124" y="118" width="142" height="138" fill="none" stroke="#8b6510" stroke-width="1.500"/><rect x="132" y="126" width="126" height="122" fill="#1d3a6b"/><circle cx="226" cy="156" r="14" fill="#fff3c4"/><path d="M132 216q30-40 58-10t68-24v66H132z" fill="#2f6b5b"/><path d="M132 232q40-22 70-4t56-10v30H132z" fill="#3e8f6a"/><path d="M150 248v-34l8-10 8 10v34z" fill="#12233f"/><path d="M132 126h126v122H132z" fill="none" stroke="#000" opacity=".35" stroke-width="3"/><path d="M136 130l40 0-40 50z" fill="#fff" opacity=".1"/><rect x="170" y="266" width="50" height="10" rx="2" fill="url(#gBrass)"/><text x="195" y="274" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="7" fill="#3d2c05">The Missing One</text>'},
gems:function(){var o='<ellipse cx="195" cy="312" rx="80" ry="8" fill="#000" opacity=".45"/><path d="M160 312l8-70h54l8 70z" fill="#7a1f3d"/><path d="M160 312l8-70h8l-6 70z" fill="#000" opacity=".25"/><rect x="150" y="230" width="90" height="14" rx="3" fill="url(#gBrass)"/><path d="M152 230v-70h86v70" fill="#bfe6ff" opacity=".12" stroke="#dff3ff" stroke-width="1.200"/><path d="M160 166l10 0-10 40z" fill="#fff" opacity=".22"/>';
  function gem(x,y,sz,c1,c2){return '<g transform="translate('+x+' '+y+') scale('+sz+')"><path d="M-12-4l6-8h12l6 8-12 16z" fill="'+c1+'"/><path d="M-12-4h24l-12 16z" fill="'+c2+'"/><path d="M-6-12l6 8 6-8M-12-4l6-8M12-4l-6-8" fill="none" stroke="#fff" stroke-width=".8" opacity=".7"/></g>'}
  o+=gem(195,200,1.9,'#dff6ff','#8fd3ff')+gem(168,214,.9,'#ffc2d4','#ff5c8a')+gem(222,214,.9,'#c9ffe6','#3fd0b6')+'<g fill="#fff"><path class="tw" d="M214 176l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path class="tw" style="animation-delay:1s" d="M172 190l1.500 4.500 4.500 1.500-4.500 1.500-1.500 4.500-1.500-4.500-4.500-1.500 4.500-1.500z"/></g>';return o}};
HAUL.coins=function(){var o='<ellipse cx="195" cy="306" rx="70" ry="7" fill="#000" opacity=".45"/><g transform="rotate(-8 150 290)"><rect x="118" y="282" width="62" height="26" rx="2" fill="#7fd8a6"/><rect x="122" y="286" width="54" height="18" rx="1" fill="none" stroke="#2f8f63" stroke-width="1"/><circle cx="149" cy="295" r="6" fill="none" stroke="#2f8f63" stroke-width="1"/></g>';
  [[196,296],[214,300],[232,296],[205,288],[223,290],[214,281]].forEach(function(c){o+='<ellipse cx="'+c[0]+'" cy="'+(c[1]+3)+'" rx="12" ry="5" fill="url(#gGoldFront)"/><ellipse cx="'+c[0]+'" cy="'+c[1]+'" rx="12" ry="5" fill="url(#gGoldTop)"/><ellipse cx="'+c[0]+'" cy="'+c[1]+'" rx="8" ry="3" fill="none" stroke="#a87412" stroke-width=".8"/>'});return o};
HAUL.cash=function(){var o='<ellipse cx="195" cy="306" rx="100" ry="8" fill="#000" opacity=".45"/>';
  function wad(x,y){return '<path d="M'+x+' '+(y+16)+'l8-16h54l8 16z" fill="#a6ebc4"/><rect x="'+x+'" y="'+(y+16)+'" width="70" height="9" fill="#4fae7c"/><path d="M'+(x+28)+' '+y+'h14l3 16h-20z" fill="#fffdf2"/><rect x="'+(x+25)+'" y="'+(y+16)+'" width="20" height="9" fill="#e9dfc0"/><path d="M'+x+' '+(y+25)+'h70" stroke="#000" opacity=".3"/>'}
  for(var r=0;r<3;r++)for(var k=0;k<3-r;k++)o+=wad(88+r*37+k*74,280-r*25);return o};
var TIERS=[
 {n:'Loose change',c:'#aab6c9',s:12,p:'+$1K',h:'coins',said:'61 in 100 said that',q:'Everyone says that.'},
 {n:'Tidy sum',c:'#3fd0b6',s:38,p:'+$2K',h:'cash',said:'22 in 100 said that',q:'Not bad.'},
 {n:'Rare find',c:'#6db3ff',s:64,p:'+$4K',h:'gold',said:'9 in 100 said that',q:'Ooh. Shiny.'},
 {n:'Big score',c:'#b78cff',s:85,p:'+$7K',h:'art',said:'Only 4 in 100 said that',q:'Now we\'re talking.'},
 {n:'The Perfect Crime',c:'#f5b82e',s:100,p:'+$10K',h:'gems',said:'Nobody else said that',q:'Nobody saw that coming.'}];
var tier=3,forced=false;
function fill(){$('inside').innerHTML=room();$('haul').innerHTML=HAUL[TIERS[tier].h]()}
fill();
var d='';for(var q=0;q<16;q++)d+='<i style="left:'+R(15,85).toFixed(0)+'%;top:'+R(20,90).toFixed(0)+'%;animation-delay:-'+R(0,6).toFixed(1)+'s"></i>';$('dust').innerHTML=d;

/* shutters */
function teeth(top){var o=top?'M0 0h390v150':'M0 190h390V0',x=390;while(x>0){o+='l-15 18l-15 -18';x-=30}return o+'z'}
function shutter(top){var o='<defs><linearGradient id="gShut'+(top?1:2)+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+(top?'#ff6b7d':'#b8283c')+'"/><stop offset="1" stop-color="'+(top?'#d93349':'#8a1629')+'"/></linearGradient></defs><path d="'+teeth(top)+'" fill="url(#gShut'+(top?1:2)+')"/>';
  for(var y=top?10:40;y<(top?140:186);y+=22)o+='<rect y="'+y+'" width="390" height="1.500" fill="#000" opacity=".22"/><rect y="'+(y+1.500)+'" width="390" height="1" fill="#fff" opacity=".12"/>';
  return o}
$('stop').innerHTML=shutter(true)+'<rect y="92" width="390" height="24" fill="#070919"/><text x="195" y="109" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="11" letter-spacing="7" fill="#ff6b7d">ALARM  ·  ALARM  ·  ALARM</text>';
$('sbot').innerHTML=shutter(false);

/* ---------- the cat burglar: a sleek silhouette ---------- */
var fit={coat:'black',hat:'',neck:''};
var COAT={black:{f:'#070919',rim:'#8f9ad0'},tux:{f:'#070919',rim:'#8f9ad0',chest:'#fffdf2'},ginger:{f:'#d2742a',rim:'#ffd9ae',stripe:'#9c4d12'},siamese:{f:'#eadcc0',rim:'#ffffff',point:'#3b2a22'}};
function cat(mood){
  var c=COAT[fit.coat],f=c.f,id=mood+Math.random().toString(36).slice(2,7),o='<svg viewBox="0 0 120 120">';
  if(mood=='idle')o+='<g transform="translate(2 66)"><path d="M6 14c-8 12-6 36 16 36s24-24 16-36z" fill="#efe6cf"/><path d="M6 14c-8 12-6 36 16 36" fill="none" stroke="#b9ae90" stroke-width="2"/><path d="M8 14l4-9h20l4 9z" fill="#8b6510"/><text x="22" y="40" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="15" fill="#3d2c05">$</text></g>';
  if(mood=='win')o+='<g transform="translate(4 86)"><path d="M6 0h44l6 14h-56z" fill="url(#gGoldTop)"/><path d="M0 14h56v8h-56z" fill="url(#gGoldFront)"/></g>';
  var tail=mood=='oops'?'M86 108c18 2 26-10 22-24l5-3-6-2 3-6-7 2-1-6-4 6':'M86 108c22 4 28-22 12-34';
  o+='<path class="tail" d="'+tail+'" fill="none" stroke="'+(c.point||f)+'" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>';
  var body='M40 114c-4-30 4-50 22-50s28 22 26 50z';
  o+='<path d="'+body+'" fill="'+f+'"/><clipPath id="b'+id+'"><path d="'+body+'"/></clipPath>';
  if(c.chest)o+='<path clip-path="url(#b'+id+')" d="M52 66c2 26 4 40 10 50 6-10 8-24 10-50z" fill="'+c.chest+'"/>';
  if(c.stripe)o+='<g clip-path="url(#b'+id+')" stroke="'+c.stripe+'" stroke-width="4" stroke-linecap="round"><path d="M38 84l12 4M36 98l12 2M90 84l-12 4M92 98l-12 2"/></g>';
  var ear=c.point||f;
  o+=(mood=='oops'?'<path d="M40 40L26 30l22 2zM84 40l14-10-22 2z" fill="'+ear+'"/>':'<path d="M40 34L36 8l20 16zM84 34l4-26-20 16z" fill="'+ear+'"/>');
  o+='<ellipse cx="62" cy="46" rx="28" ry="24" fill="'+f+'"/>';
  if(c.point)o+='<ellipse cx="62" cy="52" rx="15" ry="13" fill="'+c.point+'" opacity=".85"/>';
  if(c.stripe)o+='<g stroke="'+c.stripe+'" stroke-width="3" stroke-linecap="round"><path d="M56 24v7M62 23v8M68 24v7"/></g>';
  o+='<path d="M88 12c8 20 6 44 2 60M90 74c4 14 2 30 0 40" fill="none" stroke="'+c.rim+'" stroke-width="1.300" opacity=".7" stroke-linecap="round"/>';
  o+='<rect x="35" y="35" width="54" height="17" rx="8.500" fill="url(#gBrass)"/>';
  if(mood=='win')o+='<path d="M44 45q6-7 12 0M68 45q6-7 12 0" fill="none" stroke="#070919" stroke-width="3" stroke-linecap="round"/>';
  else if(mood=='oops')o+='<circle cx="50" cy="43.500" r="6" fill="#fffdf2"/><circle cx="74" cy="43.500" r="6" fill="#fffdf2"/><circle cx="50" cy="43.500" r="2" fill="#070919"/><circle cx="74" cy="43.500" r="2" fill="#070919"/>';
  else o+='<path d="M43 43.500q7-7 14 0q-7 7-14 0zM67 43.500q7-7 14 0q-7 7-14 0z" fill="#fffdf2"/><ellipse cx="50" cy="43.500" rx="1.600" ry="3.400" fill="#070919"/><ellipse cx="74" cy="43.500" rx="1.600" ry="3.400" fill="#070919"/>';
  o+='<path d="M59 58h6l-3 3.500z" fill="#f0485a"/><g stroke="'+c.rim+'" stroke-width=".8" stroke-linecap="round" opacity=".8"><path d="M52 60l-16-3M52 63l-15 3M72 60l16-3M72 63l15 3"/></g>';
  o+=WEAR[fit.neck]||'';o+=WEAR[fit.hat]||'';
  if(mood=='oops')o+='<path d="M98 26c-4 7-4 12 0 12s4-5 0-12z" fill="#bfe6ff"/>';
  return o+'</svg>'}
var WEAR={
 cap:'<path d="M38 26c2-14 46-14 48 0z" fill="#394384"/><path d="M36 26h58c2 0 2 4 0 4H36z" fill="#27305f"/><circle cx="62" cy="15" r="2.500" fill="#27305f"/>',
 beret:'<ellipse cx="60" cy="22" rx="27" ry="10" fill="#b8283c" transform="rotate(-8 60 22)"/><path d="M62 11l3-6" stroke="#b8283c" stroke-width="3" stroke-linecap="round"/>',
 tophat:'<rect x="44" y="-6" width="36" height="30" rx="2" fill="#12163a"/><rect x="44" y="14" width="36" height="6" fill="#b8283c"/><rect x="34" y="22" width="56" height="6" rx="3" fill="#12163a"/><rect x="47" y="-3" width="3" height="16" fill="#fff" opacity=".18"/>',
 crown:'<path d="M40 26l-4-22 14 10 12-16 12 16 14-10-4 22z" fill="url(#gBrass)"/><rect x="40" y="22" width="44" height="6" rx="2" fill="url(#gGoldFront)"/><circle cx="62" cy="14" r="3.500" fill="#f0485a"/><circle cx="47" cy="17" r="2.500" fill="#3fd0b6"/><circle cx="77" cy="17" r="2.500" fill="#8fd3ff"/>',
 bow:'<path d="M62 72l-14-8v16zM62 72l14-8v16z" fill="#b8283c"/><circle cx="62" cy="72" r="4" fill="#f0485a"/>',
 pearls:'<g fill="#fffdf2" stroke="#b9ae90" stroke-width=".6"><circle cx="44" cy="68" r="3.200"/><circle cx="50" cy="72" r="3.200"/><circle cx="56" cy="74.500" r="3.200"/><circle cx="62" cy="75.500" r="3.200"/><circle cx="68" cy="74.500" r="3.200"/><circle cx="74" cy="72" r="3.200"/><circle cx="80" cy="68" r="3.200"/></g>',
 scarf:'<path d="M40 66q22 14 44 0v9q-22 14-44 0z" fill="#3fd0b6"/><path d="M70 78l4 24h10l-4-26z" fill="#3fd0b6"/><path d="M72 88h9M73 96h9" stroke="#136657" stroke-width="2"/>'};
function dress(){document.querySelectorAll('[data-cat]').forEach(function(e){e.innerHTML=cat(e.dataset.cat)})}
dress();

/* shop icons and small pictures */
function ic(d){return '<svg viewBox="0 0 64 58" aria-hidden="true">'+d+'</svg>'}
function mini(k){var keep=JSON.stringify(fit),m={tux:'coat',ginger:'coat',siamese:'coat',black:'coat',cap:'hat',beret:'hat',tophat:'hat',crown:'hat',bow:'neck',pearls:'neck',scarf:'neck'}[k];fit={coat:'black',hat:'',neck:''};fit[m]=k;var o=cat('plain').replace('<svg viewBox="0 0 120 120">','<svg viewBox="14 -8 96 96" aria-hidden="true">');fit=JSON.parse(keep);return o}
var ICON={
 hourglass:ic('<path d="M18 6h28M18 52h28" stroke="url(#gBrass)" stroke-width="5" stroke-linecap="round"/><path d="M22 8c0 16 20 14 20 21s-20 5-20 21h20c0-16-20-14-20-21s20-5 20-21z" fill="#bfe6ff" opacity=".25" stroke="#dff3ff" stroke-width="1.500"/><path d="M26 48c2-8 10-8 12 0z" fill="url(#gGoldTop)"/><path d="M32 30v12" stroke="#f5c645" stroke-width="2" stroke-dasharray="2 3"/>'),
 hairpin:ic('<path d="M14 44L44 14a6 6 0 0 1 8 8L26 48" fill="none" stroke="url(#gChrome)" stroke-width="4" stroke-linecap="round"/><circle cx="48" cy="18" r="2" fill="#070919"/>'),
 scope:ic('<path d="M20 6v16a12 12 0 0 0 24 0V6" fill="none" stroke="url(#gChrome)" stroke-width="4" stroke-linecap="round"/><path d="M32 34v6c0 8 16 8 16 0v-4" fill="none" stroke="#aab0d6" stroke-width="3"/><circle cx="48" cy="32" r="7" fill="url(#gChrome)" stroke="#070919"/><circle cx="48" cy="32" r="3" fill="#070919"/>'),
 dynamite:ic('<g transform="rotate(-18 32 32)"><rect x="14" y="22" width="12" height="30" rx="3" fill="#d93349"/><rect x="26" y="22" width="12" height="30" rx="3" fill="#f0485a"/><rect x="38" y="22" width="12" height="30" rx="3" fill="#d93349"/><rect x="12" y="32" width="40" height="7" fill="#070919"/><path d="M32 22c0-10 10-6 12-14" fill="none" stroke="#efe6cf" stroke-width="2"/><circle cx="44" cy="7" r="4" fill="#ffe08a" class="tw"/></g>'),
 key:ic('<circle cx="20" cy="20" r="12" fill="none" stroke="url(#gBrass)" stroke-width="6"/><path d="M28 28l24 24M44 44l6-6M38 38l5-5" stroke="url(#gBrass)" stroke-width="6" stroke-linecap="round"/>')};
var SLOT={tux:'coat',ginger:'coat',siamese:'coat',cap:'hat',beret:'hat',tophat:'hat',crown:'hat',bow:'neck',pearls:'neck',scarf:'neck'};
var PIC={
 doors:'<svg viewBox="0 0 92 76"><g fill="url(#gSteel)" stroke="#070919"><path d="M10 66V30a12 12 0 0 1 24 0v36z"/><path d="M34 66V24a12 12 0 0 1 24 0v42z"/><path d="M58 66V30a12 12 0 0 1 24 0v36z"/></g><g fill="url(#gBrass)"><circle cx="22" cy="44" r="4"/><circle cx="46" cy="42" r="5"/><circle cx="70" cy="44" r="4"/></g><text x="46" y="18" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="10" fill="#f5c85a">x10</text></svg>',
 dial:'<svg viewBox="0 0 92 76"><circle cx="46" cy="38" r="27" fill="url(#gBrass)" stroke="#5b430c" stroke-width="1.500"/><g class="spin"><circle cx="46" cy="38" r="11" fill="url(#gChrome)"/><rect x="44" y="18" width="4" height="22" rx="2" fill="#070919"/></g><path d="M41 5h10l-5 8z" fill="#fffdf2"/><text x="78" y="42" font-family="Georgia,serif" font-weight="700" font-size="11" fill="#b78cff">85</text></svg>',
 loot:'<svg viewBox="0 0 92 76"><path d="M30 0h32l22 76H8z" fill="url(#gCone)"/><g transform="translate(18 40) scale(.6)"><path d="M6 0h44l6 14h-56z" fill="url(#gGoldTop)"/><path d="M0 14h56v8h-56z" fill="url(#gGoldFront)"/></g><g transform="translate(42 40) scale(.6)"><path d="M6 0h44l6 14h-56z" fill="url(#gGoldTop)"/><path d="M0 14h56v8h-56z" fill="url(#gGoldFront)"/></g><g transform="translate(30 27) scale(.6)"><path d="M6 0h44l6 14h-56z" fill="url(#gGoldTop)"/><path d="M0 14h56v8h-56z" fill="url(#gGoldFront)"/></g><path class="tw" d="M70 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff"/></svg>',
 risk:'<svg viewBox="0 0 92 76"><circle cx="30" cy="38" r="20" fill="#b78cff"/><text x="30" y="43" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="15" fill="#070919">85</text><path d="M54 38h10m-4-4l4 4-4 4" stroke="#f5c85a" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="76" cy="38" r="11" fill="none" stroke="#f0485a" stroke-width="1.500" stroke-dasharray="3 3"/><text x="76" y="42" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="11" fill="#f0485a">?</text></svg>',
 shut:'<svg viewBox="0 0 92 76"><rect width="92" height="76" fill="#070919"/><path class="chomp1" d="M0 0h92v34l-6 6-6-6-6 6-6-6-6 6-6-6-6 6-6-6-6 6-6-6-6 6-6-6-6 6-6-6-6 6-4-4z" fill="#f0485a"/><path class="chomp2" d="M0 76h92V42l-6-6-6 6-6-6-6 6-6-6-6 6-6-6-6 6-6-6-6 6-6-6-6 6-6-6-6 6-6-6-2 2z" fill="#b8283c"/></svg>',
 shop:'<svg viewBox="0 0 92 76"><g transform="translate(14 8)">'+ICON.dynamite.replace(/<\/?svg[^>]*>/g,'')+'</g></svg>'};
var STEPS=[['doors','Ten doors a night','One question on each. You get three goes and the clock\'s running.'],['dial','Say something nobody else would','Every answer scores out of 100. Obvious ones barely move the dial. Odd ones spin it.'],['loot','The rarer it is, the better the haul','Loose change for the obvious. Gold, paintings and jewels for the ones only you thought of.'],['risk','Take it, or risk it','Happy with that? Take it. Feeling clever? Give a rarer answer and trade up. Get it wrong and you leave with nothing.'],['shut','Three misses and you\'re out','The door slams and that one pays nothing. On to the next.'],['shop','Spend it at the fence','Tools for the hard doors. Hats for the cat. Only one of those is useful.']];
return {
  TIERS: TIERS, ICON: ICON, PIC: PIC, STEPS: STEPS, SLOT: SLOT, mini: mini, cat: cat, dress: dress,
  /** Get or set what the cat is wearing: { coat, hat, neck }. */
  fit: function (next) { if (next) { fit = next; dress(); } return fit; },
  /** Fill the vault with the haul for a loot level (0 to 4). */
  haul: function (i) { tier = i; fill(); }
};
})();
