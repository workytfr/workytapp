import { useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView as RNWebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ComponentProps, ComponentType, Ref } from 'react';

// react-native-webview 14 accepte `ref` (forwardRef) mais ne le déclare plus
// dans ses types : on le réexpose pour garder injectJavaScript typé.
type WebViewHandle = { injectJavaScript: (js: string) => void };
const WebView = RNWebView as unknown as ComponentType<ComponentProps<typeof RNWebView> & { ref?: Ref<WebViewHandle> }>;
import { useColors } from '../lib/useColors';
import { spacing, typography } from '../lib/theme';

interface MindMapProps {
    visible: boolean;
    onClose: () => void;
    /** Reçoit le PNG de la carte mentale en base64 (sans préfixe data:). */
    onSave: (base64: string) => void;
}

// Éditeur de carte mentale autonome (canvas 2D) rendu dans une WebView.
// Aucune interpolation ${} ici : tout est du JS littéral côté WebView.
const BOARD_HTML = `<!doctype html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<style>
  html,body{margin:0;height:100%;overflow:hidden;background:#FDFAF4;font-family:-apple-system,system-ui,sans-serif;-webkit-user-select:none;user-select:none;}
  #bar{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#FFFDF8;border-bottom:1px solid #E4D3B8;flex-wrap:wrap;}
  .grp{display:flex;align-items:center;gap:6px;}
  .sep{width:1px;height:24px;background:#E4D3B8;margin:0 2px;}
  .sw{width:26px;height:26px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #E4D3B8;}
  .sw.active{box-shadow:0 0 0 2px #1A1512;transform:scale(1.1);}
  .btn{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 10px;border-radius:8px;background:#F5E9D6;color:#1A1512;font-weight:600;font-size:13px;border:none;gap:5px;}
  .btn.active{background:#FF6A1A;color:#fff;}
  .tool{width:34px;height:32px;font-size:16px;}
  #hint{position:absolute;left:0;right:0;bottom:0;padding:6px 10px;font-size:12px;color:#8A7B63;background:rgba(255,253,248,.9);text-align:center;pointer-events:none;}
  canvas{display:block;touch-action:none;background:#fff;}
  #edit{position:absolute;display:none;z-index:10;border:2px solid #FF6A1A;border-radius:8px;padding:6px 8px;font-size:15px;font-family:inherit;background:#fff;color:#1A1512;resize:none;box-shadow:0 4px 14px rgba(0,0,0,.15);outline:none;text-align:center;}
</style></head><body>
<div id="bar">
  <div class="grp">
    <button class="btn tool" id="add" title="Ajouter un nœud">＋</button>
    <button class="btn tool" id="shapeRect" title="Rectangle">▭</button>
    <button class="btn tool" id="shapeEll" title="Rond">◯</button>
  </div>
  <div class="sep"></div>
  <div class="grp" id="swatches">
    <span class="sw active" style="background:#1A1512" data-c="#1A1512"></span>
    <span class="sw" style="background:#FF6A1A" data-c="#FF6A1A"></span>
    <span class="sw" style="background:#2563EB" data-c="#2563EB"></span>
    <span class="sw" style="background:#D93636" data-c="#D93636"></span>
    <span class="sw" style="background:#0F9D63" data-c="#0F9D63"></span>
    <span class="sw" style="background:#7C3AED" data-c="#7C3AED"></span>
  </div>
  <div class="sep"></div>
  <div class="grp">
    <button class="btn tool" id="linkSolid" title="Lien flèche">→</button>
    <button class="btn tool" id="linkDash" title="Lien pointillé">⇢</button>
    <button class="btn tool" id="pen" title="Dessiner à main levée">✏️</button>
  </div>
  <div class="sep"></div>
  <div class="grp">
    <button class="btn tool" id="del" title="Supprimer">🗑</button>
    <button class="btn tool" id="zin" title="Zoom +">＋</button>
    <button class="btn tool" id="zout" title="Zoom −">−</button>
    <button class="btn" id="clear" title="Tout effacer">Effacer</button>
  </div>
</div>
<canvas id="c"></canvas>
<textarea id="edit" rows="1"></textarea>
<div id="hint">Astuce : « ＋ » ajoute un nœud · glisse pour déplacer · un lien puis touche 2 nœuds · double-touche pour éditer le texte.</div>
<script>
  var canvas=document.getElementById('c'), ctx=canvas.getContext('2d');
  var editEl=document.getElementById('edit');
  var nodes=[], edges=[], strokes=[], uid=1;
  var color='#1A1512', shape='rect';
  var view={ox:0,oy:0,scale:1};
  var mode='select';            // 'select' | 'link' | 'draw'
  var curStroke=null;
  var linkStyle='arrow';        // 'arrow' | 'dashed'
  var selected=null, linkSrc=null;
  var editing=null;
  var W=0,H=0,barH=0,dpr=window.devicePixelRatio||1;

  function resize(){
    barH=document.getElementById('bar').offsetHeight;
    W=window.innerWidth; H=window.innerHeight-barH;
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    canvas.width=W*dpr; canvas.height=H*dpr;
    draw();
  }
  window.addEventListener('resize',resize);

  function toWorld(sx,sy){ return {x:(sx-view.ox)/view.scale, y:(sy-view.oy)/view.scale}; }

  // Mesure/rafraîchit la taille d'un nœud selon son texte
  function measure(n){
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.font='600 15px -apple-system,system-ui,sans-serif';
    var words=(n.text||'').split(/\\s+/), lines=[], cur='';
    var max=150;
    for(var i=0;i<words.length;i++){
      var t=cur?cur+' '+words[i]:words[i];
      if(ctx.measureText(t).width>max && cur){ lines.push(cur); cur=words[i]; }
      else cur=t;
    }
    if(cur)lines.push(cur);
    if(lines.length===0)lines=[''];
    var wmax=0; for(var j=0;j<lines.length;j++)wmax=Math.max(wmax,ctx.measureText(lines[j]).width);
    n.lines=lines;
    n.w=Math.max(70,Math.min(max,wmax)+34);
    n.h=Math.max(44,lines.length*20+22);
  }

  function addNode(wx,wy){
    var n={id:uid++,x:wx,y:wy,text:'Idée',color:color,shape:shape};
    measure(n); nodes.push(n); selected=n; draw();
    startEdit(n,true);
  }

  function nodeAt(wx,wy){
    for(var i=nodes.length-1;i>=0;i--){
      var n=nodes[i];
      if(Math.abs(wx-n.x)<=n.w/2 && Math.abs(wy-n.y)<=n.h/2) return n;
    }
    return null;
  }

  // Point sur le bord du nœud dans la direction (dx,dy)
  function border(n,dx,dy){
    var hw=n.w/2, hh=n.h/2;
    if(n.shape==='ell'){
      var a=Math.atan2(dy,dx);
      return {x:n.x+hw*Math.cos(a), y:n.y+hh*Math.sin(a)};
    }
    var sx=dx===0?Infinity:hw/Math.abs(dx), sy=dy===0?Infinity:hh/Math.abs(dy);
    var s=Math.min(sx,sy);
    return {x:n.x+dx*s, y:n.y+dy*s};
  }

  function drawScene(g,ox,oy,scale){
    g.setTransform(dpr*scale,0,0,dpr*scale,dpr*ox,dpr*oy);
    // edges
    for(var i=0;i<edges.length;i++){
      var e=edges[i], a=byId(e.a), b=byId(e.b); if(!a||!b)continue;
      var dx=b.x-a.x, dy=b.y-a.y;
      var p1=border(a,dx,dy), p2=border(b,-dx,-dy);
      g.strokeStyle=e.color||'#8A7B63'; g.lineWidth=2.2; g.fillStyle=g.strokeStyle;
      g.setLineDash(e.style==='dashed'?[7,6]:[]);
      g.beginPath(); g.moveTo(p1.x,p1.y); g.lineTo(p2.x,p2.y); g.stroke();
      g.setLineDash([]);
      var ang=Math.atan2(p2.y-p1.y,p2.x-p1.x), ah=9;
      g.beginPath();
      g.moveTo(p2.x,p2.y);
      g.lineTo(p2.x-ah*Math.cos(ang-0.4),p2.y-ah*Math.sin(ang-0.4));
      g.lineTo(p2.x-ah*Math.cos(ang+0.4),p2.y-ah*Math.sin(ang+0.4));
      g.closePath(); g.fill();
    }
    // nodes
    for(var k=0;k<nodes.length;k++){
      var n=nodes[k]; if(!n.lines)measure(n);
      var hw=n.w/2, hh=n.h/2;
      g.lineWidth=(n===selected)?3:2; g.strokeStyle=n.color; g.fillStyle=tint(n.color);
      if(n.shape==='ell'){
        g.beginPath(); g.ellipse(n.x,n.y,hw,hh,0,0,Math.PI*2); g.fill(); g.stroke();
      } else {
        roundRect(g,n.x-hw,n.y-hh,n.w,n.h,12); g.fill(); g.stroke();
      }
      g.fillStyle=n.color; g.font='600 15px -apple-system,system-ui,sans-serif';
      g.textAlign='center'; g.textBaseline='middle';
      var ty=n.y-(n.lines.length-1)*10;
      for(var l=0;l<n.lines.length;l++){ g.fillText(n.lines[l],n.x,ty+l*20); }
      if(n===linkSrc){ g.strokeStyle='#FF6A1A'; g.lineWidth=2; g.setLineDash([4,4]);
        if(n.shape==='ell'){g.beginPath();g.ellipse(n.x,n.y,hw+5,hh+5,0,0,Math.PI*2);g.stroke();}
        else{roundRect(g,n.x-hw-5,n.y-hh-5,n.w+10,n.h+10,14);g.stroke();}
        g.setLineDash([]); }
    }
    // strokes (annotations à main levée, au-dessus)
    g.lineCap='round'; g.lineJoin='round'; g.setLineDash([]);
    for(var s=0;s<strokes.length;s++){
      var st=strokes[s]; if(!st.pts||st.pts.length===0)continue;
      g.strokeStyle=st.color; g.lineWidth=st.size;
      g.beginPath(); g.moveTo(st.pts[0].x,st.pts[0].y);
      for(var q=1;q<st.pts.length;q++)g.lineTo(st.pts[q].x,st.pts[q].y);
      if(st.pts.length===1)g.lineTo(st.pts[0].x+0.1,st.pts[0].y+0.1);
      g.stroke();
    }
  }

  function draw(){
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
    drawScene(ctx,view.ox,view.oy,view.scale);
  }

  function roundRect(g,x,y,w,h,r){ g.beginPath();
    g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r);
    g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
  function byId(id){ for(var i=0;i<nodes.length;i++)if(nodes[i].id===id)return nodes[i]; return null; }
  function tint(hex){ // fond très clair dérivé de la couleur de bordure
    var c=hex.replace('#',''); var r=parseInt(c.substr(0,2),16),gg=parseInt(c.substr(2,2),16),b=parseInt(c.substr(4,2),16);
    return 'rgba('+r+','+gg+','+b+',0.10)'; }

  // ---- Édition texte ----
  function startEdit(n,selAll){
    editing=n;
    var sx=view.ox+n.x*view.scale, sy=view.oy+n.y*view.scale+barH;
    editEl.style.display='block';
    editEl.style.width=Math.max(90,n.w*view.scale)+'px';
    editEl.style.left=(sx-Math.max(90,n.w*view.scale)/2)+'px';
    editEl.style.top=(sy-18)+'px';
    editEl.value=n.text||'';
    editEl.focus();
    if(selAll)editEl.select();
  }
  function commitEdit(){
    if(!editing)return;
    editing.text=editEl.value.trim()||'Idée'; measure(editing);
    editing=null; editEl.style.display='none'; draw();
  }
  editEl.addEventListener('blur',commitEdit);
  editEl.addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();editEl.blur();} });

  // ---- Interactions pointeur ----
  var drag=null, panStart=null, moved=false, lastTap=0, pinch=null;
  function pos(e){ var t=e.touches?e.touches[0]:e; var r=canvas.getBoundingClientRect(); return {x:t.clientX-r.left,y:t.clientY-r.top}; }

  function down(e){
    if(editing){ editEl.blur(); }
    if(e.touches&&e.touches.length===2){
      var r=canvas.getBoundingClientRect();
      var a={x:e.touches[0].clientX-r.left,y:e.touches[0].clientY-r.top};
      var b={x:e.touches[1].clientX-r.left,y:e.touches[1].clientY-r.top};
      pinch={d:Math.hypot(a.x-b.x,a.y-b.y),cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,scale:view.scale,ox:view.ox,oy:view.oy};
      if(curStroke){ strokes.pop(); curStroke=null; }
      drag=null; panStart=null; e.preventDefault(); return;
    }
    var p=pos(e), w=toWorld(p.x,p.y), n=nodeAt(w.x,w.y);
    moved=false;
    if(mode==='draw'){
      curStroke={color:color,size:3,pts:[{x:w.x,y:w.y}]}; strokes.push(curStroke); draw(); e.preventDefault(); return;
    }
    if(mode==='link'){
      if(n){ if(!linkSrc){linkSrc=n;} else if(linkSrc!==n){ edges.push({a:linkSrc.id,b:n.id,style:linkStyle,color:color}); linkSrc=null; setMode('select'); } draw(); }
      e.preventDefault(); return;
    }
    if(n){
      var now=Date.now();
      if(now-lastTap<300 && selected===n){ startEdit(n,true); lastTap=0; e.preventDefault(); return; }
      lastTap=now; selected=n; drag={n:n,dx:w.x-n.x,dy:w.y-n.y}; draw();
    } else {
      selected=null; panStart={x:p.x,y:p.y,ox:view.ox,oy:view.oy}; draw();
    }
    e.preventDefault();
  }
  function mv(e){
    if(pinch&&e.touches&&e.touches.length===2){
      var r=canvas.getBoundingClientRect();
      var a={x:e.touches[0].clientX-r.left,y:e.touches[0].clientY-r.top};
      var b={x:e.touches[1].clientX-r.left,y:e.touches[1].clientY-r.top};
      var d=Math.hypot(a.x-b.x,a.y-b.y); var f=d/pinch.d;
      var ns=Math.max(0.35,Math.min(2.5,pinch.scale*f));
      view.scale=ns;
      view.ox=pinch.cx-((pinch.cx-pinch.ox)/pinch.scale)*ns;
      view.oy=pinch.cy-((pinch.cy-pinch.oy)/pinch.scale)*ns;
      draw(); e.preventDefault(); return;
    }
    if(curStroke){ var pp=pos(e), ww=toWorld(pp.x,pp.y); curStroke.pts.push({x:ww.x,y:ww.y}); draw(); e.preventDefault(); return; }
    if(drag){ var p=pos(e), w=toWorld(p.x,p.y); drag.n.x=w.x-drag.dx; drag.n.y=w.y-drag.dy; moved=true; draw(); e.preventDefault(); }
    else if(panStart){ var q=pos(e); view.ox=panStart.ox+(q.x-panStart.x); view.oy=panStart.oy+(q.y-panStart.y); draw(); e.preventDefault(); }
  }
  function up(e){ drag=null; panStart=null; pinch=null; curStroke=null; }

  canvas.addEventListener('touchstart',down,{passive:false});
  canvas.addEventListener('touchmove',mv,{passive:false});
  canvas.addEventListener('touchend',up);
  canvas.addEventListener('mousedown',down); canvas.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);

  // ---- Barre d'outils ----
  function setMode(m){ mode=m; linkSrc=null;
    document.getElementById('linkSolid').classList.toggle('active',m==='link'&&linkStyle==='arrow');
    document.getElementById('linkDash').classList.toggle('active',m==='link'&&linkStyle==='dashed');
    document.getElementById('pen').classList.toggle('active',m==='draw');
    draw();
  }
  document.getElementById('pen').addEventListener('click',function(){ setMode(mode==='draw'?'select':'draw'); });
  document.getElementById('add').addEventListener('click',function(){
    var c=toWorld(W/2,H/2); addNode(c.x,c.y);
  });
  document.getElementById('shapeRect').addEventListener('click',function(){ shape='rect';
    if(selected){selected.shape='rect';draw();} this.classList.add('active');document.getElementById('shapeEll').classList.remove('active'); });
  document.getElementById('shapeEll').addEventListener('click',function(){ shape='ell';
    if(selected){selected.shape='ell';draw();} this.classList.add('active');document.getElementById('shapeRect').classList.remove('active'); });
  document.querySelectorAll('.sw').forEach(function(s){ s.addEventListener('click',function(){
    document.querySelectorAll('.sw').forEach(function(x){x.classList.remove('active')}); s.classList.add('active');
    color=s.getAttribute('data-c'); if(selected){selected.color=color;draw();}
  });});
  document.getElementById('linkSolid').addEventListener('click',function(){ linkStyle='arrow'; setMode(mode==='link'&&linkStyle==='arrow'?'select':'link'); });
  document.getElementById('linkDash').addEventListener('click',function(){ linkStyle='dashed'; setMode(mode==='link'?'select':'link'); setMode('link'); });
  document.getElementById('del').addEventListener('click',function(){
    if(!selected)return; var id=selected.id;
    nodes=nodes.filter(function(n){return n!==selected;});
    edges=edges.filter(function(e){return e.a!==id&&e.b!==id;});
    selected=null; draw();
  });
  document.getElementById('zin').addEventListener('click',function(){ zoomAt(1.2); });
  document.getElementById('zout').addEventListener('click',function(){ zoomAt(1/1.2); });
  function zoomAt(f){ var ns=Math.max(0.35,Math.min(2.5,view.scale*f)); var cx=W/2,cy=H/2;
    view.ox=cx-((cx-view.ox)/view.scale)*ns; view.oy=cy-((cy-view.oy)/view.scale)*ns; view.scale=ns; draw(); }
  document.getElementById('clear').addEventListener('click',function(){ nodes=[];edges=[];strokes=[];selected=null;linkSrc=null;draw(); });

  // ---- Export PNG (toute la carte, marge fixe) ----
  window.exportPNG=function(){
    commitEdit();
    if(nodes.length===0 && strokes.length===0){ if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(''); return; }
    var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
    for(var i=0;i<nodes.length;i++){var n=nodes[i];if(!n.lines)measure(n);
      minX=Math.min(minX,n.x-n.w/2);minY=Math.min(minY,n.y-n.h/2);
      maxX=Math.max(maxX,n.x+n.w/2);maxY=Math.max(maxY,n.y+n.h/2);}
    for(var s2=0;s2<strokes.length;s2++){var pts=strokes[s2].pts||[];for(var t=0;t<pts.length;t++){
      minX=Math.min(minX,pts[t].x);minY=Math.min(minY,pts[t].y);
      maxX=Math.max(maxX,pts[t].x);maxY=Math.max(maxY,pts[t].y);}}
    var m=40, cw=(maxX-minX)+m*2, ch=(maxY-minY)+m*2;
    var off=document.createElement('canvas'); off.width=cw*dpr; off.height=ch*dpr;
    var g=off.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
    g.fillStyle='#fff'; g.fillRect(0,0,cw,ch);
    var savedSel=selected, savedLink=linkSrc; selected=null; linkSrc=null;
    drawScene(g,m-minX,m-minY,1);
    selected=savedSel; linkSrc=savedLink;
    var d=off.toDataURL('image/png');
    if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(d.split(',')[1]||'');
  };

  resize();
</script></body></html>`;

export default function MindMap({ visible, onClose, onSave }: MindMapProps) {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const webRef = useRef<WebViewHandle>(null);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: colors.surface }}>
                <View style={[styles.bar, { paddingTop: insets.top + spacing.sm, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={onClose} hitSlop={10}>
                        <Text style={[styles.cancel, { color: colors.textSecondary }]}>Annuler</Text>
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Carte mentale</Text>
                    <TouchableOpacity onPress={() => webRef.current?.injectJavaScript('window.exportPNG(); true;')} hitSlop={10}>
                        <Text style={[styles.done, { color: colors.primary }]}>Ajouter</Text>
                    </TouchableOpacity>
                </View>
                <WebView
                    ref={webRef}
                    originWhitelist={['*']}
                    source={{ html: BOARD_HTML }}
                    style={{ flex: 1 }}
                    scrollEnabled={false}
                    keyboardDisplayRequiresUserAction={false}
                    onMessage={(e: WebViewMessageEvent) => {
                        const b64 = e.nativeEvent.data;
                        if (b64) onSave(b64);
                        else onClose();
                    }}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1 },
    cancel: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.base },
    title: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.lg },
    done: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.base },
});
