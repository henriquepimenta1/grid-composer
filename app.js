// app.js — GridAI Core Logic

// ══ COLOR ENGINE (k-means LAB) ═══════════════════════
function rgbToLab(r,g,b){let R=r/255,G=g/255,B=b/255;R=R>.04045?Math.pow((R+.055)/1.055,2.4):R/12.92;G=G>.04045?Math.pow((G+.055)/1.055,2.4):G/12.92;B=B>.04045?Math.pow((B+.055)/1.055,2.4):B/12.92;let X=R*.4124564+G*.3575761+B*.1804375,Y=R*.2126729+G*.7151522+B*.072175,Z=R*.0193339+G*.119192+B*.9503041;X/=.95047;Z/=1.08883;const f=v=>v>.008856?Math.cbrt(v):(7.787*v)+16/116;return[116*f(Y)-16,500*(f(X)-f(Y)),200*(f(Y)-f(Z))]}
function labToRgb(L,a,b){let Y=(L+16)/116,X=a/500+Y,Z=Y-b/200;X=(Math.pow(X,3)>.008856?Math.pow(X,3):(X-16/116)/7.787)*.95047;Y=(Math.pow(Y,3)>.008856?Math.pow(Y,3):(Y-16/116)/7.787);Z=(Math.pow(Z,3)>.008856?Math.pow(Z,3):(Z-16/116)/7.787)*1.08883;let R=X*3.2404542+Y*-1.5371385+Z*-.4985314,G=X*-.969266+Y*1.8760108+Z*.041556,B=X*.0556434+Y*-.2040259+Z*1.0572252;R=R>.0031308?1.055*Math.pow(R,1/2.4)-.055:12.92*R;G=G>.0031308?1.055*Math.pow(G,1/2.4)-.055:12.92*G;B=B>.0031308?1.055*Math.pow(B,1/2.4)-.055:12.92*B;return[Math.round(Math.max(0,Math.min(255,R*255))),Math.round(Math.max(0,Math.min(255,G*255))),Math.round(Math.max(0,Math.min(255,B*255)))]}
function labDist(a,b){return Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2)}
function rgbToHex(r,g,b){return'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}
function extractColors(img,k=5){const cv=document.getElementById('cv');const MAX=80;let w=img.width,h=img.height;if(w>MAX||h>MAX){const r=Math.min(MAX/w,MAX/h);w=Math.round(w*r);h=Math.round(h*r)}cv.width=w;cv.height=h;const ctx=cv.getContext('2d');ctx.drawImage(img,0,0,w,h);const data=ctx.getImageData(0,0,w,h).data;const px=[];for(let i=0;i<data.length;i+=16){if(data[i+3]<128)continue;px.push(rgbToLab(data[i],data[i+1],data[i+2]))}if(!px.length)return[];const c=[px[Math.floor(Math.random()*px.length)]];for(let ci=1;ci<k;ci++){const d=px.map(p=>Math.min(...c.map(cc=>labDist(p,cc))));const t=d.reduce((a,b)=>a+b,0);let r=Math.random()*t;for(let pi=0;pi<px.length;pi++){r-=d[pi];if(r<=0){c.push([...px[pi]]);break}}if(c.length<=ci)c.push([...px[Math.floor(Math.random()*px.length)]])}let asgn=new Array(px.length).fill(0);for(let it=0;it<10;it++){for(let pi=0;pi<px.length;pi++){let b=0,bd=Infinity;for(let ci=0;ci<k;ci++){const dd=labDist(px[pi],c[ci]);if(dd<bd){bd=dd;b=ci}}asgn[pi]=b}for(let ci=0;ci<k;ci++){const cp=px.filter((_,pi)=>asgn[pi]===ci);if(!cp.length)continue;c[ci]=[cp.reduce((s,p)=>s+p[0],0)/cp.length,cp.reduce((s,p)=>s+p[1],0)/cp.length,cp.reduce((s,p)=>s+p[2],0)/cp.length]}}const cnt=new Array(k).fill(0);asgn.forEach(ci=>cnt[ci]++);return c.map((cc,ci)=>{const[r,g,b]=labToRgb(cc[0],cc[1],cc[2]);return{hex:rgbToHex(r,g,b),pct:Math.round(cnt[ci]/px.length*100)}}).sort((a,b)=>b.pct-a.pct).slice(0,5)}
function estimateKelvin(colors){if(!colors.length)return 6500;const hex=colors[0].hex;const r=parseInt(hex.slice(1,3),16),b=parseInt(hex.slice(5,7),16);const rb=r/(b+1);if(rb>3.5)return 1900;if(rb>2.5)return 2800;if(rb>1.8)return 3500;if(rb>1.3)return 4500;if(rb>1.0)return 5800;if(rb>0.7)return 7200;if(rb>0.5)return 8500;return 9800}

// ══ IMAGE COMPRESSION ════════════════════════════════
// Resize + compress to JPEG before sending — avoids Render payload limit
async function compressImage(dataUrl, maxDim=800, quality=0.75) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const cv2 = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        const r = Math.min(maxDim/w, maxDim/h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      cv2.width = w; cv2.height = h;
      cv2.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(cv2.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

// ══ STATE ═══════════════════════════════════════════
const HARMONIES=[
  {id:'complementary',name:'Complementar',dot:'linear-gradient(135deg,#C4853A,#3A5870)'},
  {id:'analogous',name:'Análogo',dot:'linear-gradient(135deg,#4A8A9A,#5A8A6A)'},
  {id:'split',name:'Split Complementar',dot:'linear-gradient(135deg,#C4853A,#3A7870,#3A4A88)'},
  {id:'triad',name:'Tríade',dot:'linear-gradient(135deg,#C4853A,#3A7A9A,#8A3A9A)'},
  {id:'monochrome',name:'Monocromático',dot:'linear-gradient(135deg,#0A2A3A,#4A9AB8)'},
  {id:'square',name:'Quadrado',dot:'linear-gradient(135deg,#C4853A,#3A8A4A,#8A3A7A)'},
  {id:'shades',name:'Sombras',dot:'linear-gradient(135deg,#111,#1C3040)'},
  {id:'custom',name:'IA decide',dot:'linear-gradient(135deg,#888,#444)'},
];
const PATTERNS=[
  {id:'checkerboard',name:'Xadrez',cells:[false,true,false,true,false,true]},
  {id:'columns',name:'Colunas',cells:[false,false,true,false,false,true]},
  {id:'rows',name:'Linhas',cells:[true,true,true,false,false,false]},
  {id:'diagonal',name:'Diagonal',cells:[false,false,true,false,true,false]},
  {id:'free',name:'Livre (IA)',cells:[null,null,null,null,null,null]},
];
let selH='complementary',selP='checkerboard',selC='temperature',photos=[],igPhotos=[],planSize=3,igMode='skip';

// ══ CONTRAST AXES ════════════════════════════════════
const CONTRAST_AXES=[
  {
    id:'temperature',
    icon:'🌡️',
    name:'Temperatura',
    sub:'Quente vs Frio · Kelvin',
    prompt:'Eixo de contraste: TEMPERATURA. Use Kelvin para definir slots quentes (laranjas/dourados, Kelvin baixo) e frios (teals/azuis, Kelvin alto). Alterne quente↔frio conforme o padrão escolhido.',
    useKelvin:true,
  },
  {
    id:'luminance',
    icon:'☀️',
    name:'Luminância',
    sub:'Claro vs Escuro · independe de cor',
    prompt:'Eixo de contraste: LUMINANCIA. Ignore temperatura e alterne fotos claras (highlights dominantes, muito céu aberto, areia branca) com fotos escuras (sombras profundas, florestas densas, interior). Funciona mesmo que todas as fotos sejam quentes.',
    useKelvin:false,
  },
  {
    id:'subject',
    icon:'🔭',
    name:'Plano / Sujeito',
    sub:'Close · Paisagem · Detalhe',
    prompt:'Eixo de contraste: TIPO DE PLANO. Alterne entre: RETRATO (pessoa próxima, rosto dominante), PAISAGEM (figura pequena ou ausente, ambiente dominante), DETALHE (close de textura, equipamento, elemento isolado). Crie ritmo pelo tipo de enquadramento.',
    useKelvin:false,
  },
  {
    id:'saturation',
    icon:'🎨',
    name:'Saturação',
    sub:'Vívido vs Dessaturado',
    prompt:'Eixo de contraste: SATURACAO. Alterne fotos de alta saturação (cores intensas, pôr do sol vibrante, verde floresta saturado) com fotos dessaturadas (névoa, cinza, mist, tons neutros). Cria ritmo visual mesmo com temperaturas similares.',
    useKelvin:false,
  },
  {
    id:'combined',
    icon:'✦',
    name:'Combinado (IA)',
    sub:'IA escolhe o melhor eixo',
    prompt:'Eixo de contraste: COMBINADO. Analise o conjunto de fotos e escolha automaticamente o eixo de contraste que gera a maior harmonia visual entre os slots. Pode combinar temperatura + luminância + tipo de plano conforme necessário. Explica qual eixo foi escolhido no harmony_note.',
    useKelvin:true,
  },
];

// ══ INIT ════════════════════════════════════════════
function init(){renderHarmonies();renderPatterns();renderContrast();setupDrop();kUpdate();applyTranslations()}

function renderHarmonies(){
  document.getElementById('hm-list').innerHTML=HARMONIES.map(h=>
    `<div class="hchip ${h.id===selH?'on':''}" onclick="selHarmony('${h.id}')">
      <div class="hchip-dot" style="background:${h.dot}"></div>${h.name}
    </div>`).join('');
}
function renderPatterns(){
  document.getElementById('pat-list').innerHTML=PATTERNS.map(p=>{
    const cells=p.cells.map(v=>`<div class="pm ${v===true?'w':''}"></div>`).join('');
    return`<div class="pchip ${p.id===selP?'on':''}" onclick="selPattern('${p.id}')">
      <div class="pg-mini">${cells}</div>${p.name}</div>`;
  }).join('');
}
function selHarmony(id){selH=id;renderHarmonies()}
function selPattern(id){selP=id;renderPatterns()}

function renderContrast(){
  document.getElementById('contrast-list').innerHTML=CONTRAST_AXES.map(a=>
    `<div class="cchip ${a.id===selC?'on':''}" onclick="selContrast('${a.id}')">
      <span class="cchip-icon">${a.icon}</span>
      <div class="cchip-body">
        <span class="cchip-name">${a.name}</span>
        <span class="cchip-sub">${a.sub}</span>
      </div>
    </div>`).join('');
  // Show/hide Kelvin section
  const axis=CONTRAST_AXES.find(a=>a.id===selC);
  const ks=document.getElementById('kelvin-section');
  if(ks)ks.className='sb-section kelvin-section'+(axis?.useKelvin?'':' dim');
}
function selContrast(id){selC=id;renderContrast()}
function kUpdate(){
  const w=document.getElementById('kw').value,c=document.getElementById('kc').value;
  document.getElementById('kwv').textContent=w+'K';
  document.getElementById('kcv').textContent=c+'K';
  document.getElementById('kdiff').textContent=(c-w)+'K';
}
function setPlan(n,btn){
  planSize=n;
  document.querySelectorAll('.topbar-center .plan-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('go').disabled=photos.length<planSize;
}
function setPlanM(n,btn){
  planSize=n;
  document.querySelectorAll('.plan-tabs-mobile .plan-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('go').disabled=photos.length<planSize;
}
function setIG(mode){
  igMode=mode;
  document.getElementById('ig-skip').className='ig-opt'+(mode==='skip'?' on':'');
  document.getElementById('ig-up-opt').className='ig-opt'+(mode==='upload'?' on':'');
  document.getElementById('ig-up-area').style.display=mode==='upload'?'block':'none';
  document.getElementById('ig-note').style.display=mode==='skip'?'block':'none';
}

// ══ UPLOAD ══════════════════════════════════════════
function setupDrop(){
  const dz=document.getElementById('dz');
  dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag')});
  dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
  dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');handleFiles(e.dataTransfer.files)});
  dz.addEventListener('click',()=>document.getElementById('fin').click());
}

async function handleFiles(files){
  const rem=12-photos.length;
  const toAdd=Array.from(files).slice(0,rem).filter(f=>f.type.startsWith('image/'));
  if(!toAdd.length)return;
  setStatus(`Processando ${toAdd.length} foto(s)...`,'');
  for(const file of toAdd){
    const raw=await readFile(file);
    const img=await loadImg(raw);
    const colors=extractColors(img,5);
    const kelvin=estimateKelvin(colors);
    // Compress for API sending (smaller payload)
    const compressed=await compressImage(raw,800,0.75);
    photos.push({file,dataUrl:raw,compressed,colors,kelvin});
    renderThumbs();updateCnt();
  }
  // Show payload estimate
  const estKB=photos.reduce((s,p)=>s+Math.round(p.compressed.length*.75/1024),0);
  setStatus(`✓ ${photos.length} foto(s) prontas · ~${estKB}KB comprimido · k-means LAB`,'ok');
  document.getElementById('go').disabled=photos.length<planSize;
}

function setStatus(msg,cls){
  const el=document.getElementById('exts');
  el.className='up-status'+(cls?' '+cls:'');
  el.innerHTML=cls?`<div class="status-dot"></div>${msg}`:msg;
}

function readFile(f){return new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsDataURL(f)})}
function loadImg(s){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=s})}

async function handleIG(files){
  igPhotos=[];const g=document.getElementById('ig-grid');g.innerHTML='';
  for(const f of Array.from(files).slice(0,3)){
    const url=await readFile(f);const img=await loadImg(url);
    igPhotos.push({dataUrl:url,colors:extractColors(img,5),kelvin:estimateKelvin(extractColors(img,5))});
    const c=document.createElement('div');c.className='igmc';c.innerHTML=`<img src="${url}">`;g.appendChild(c);
  }
  while(g.children.length<3){const c=document.createElement('div');c.className='igmc';c.innerHTML='<div class="igmc-e">+</div>';g.appendChild(c)}
}

function renderThumbs(){
  document.getElementById('thumbs').innerHTML=photos.map((p,i)=>{
    const pal=(p.colors||[]).slice(0,5).map(c=>`<div class="tp" style="background:${c.hex}"></div>`).join('');
    return`<div class="thumb" draggable="true" ondragstart="dragStart(${i})" ondragover="dragOver(event)" ondrop="drop(event,${i})">
      <img src="${p.dataUrl}"><div class="tov"></div>
      <div class="tdel" onclick="removePhoto(${i})">✕</div>
      <div class="tn">${i+1}</div><div class="tpal">${pal}</div>
    </div>`;
  }).join('');
}
function updateCnt(){document.getElementById('pcnt').textContent=`${photos.length} foto${photos.length!==1?'s':''}`}
function removePhoto(i){
  photos.splice(i,1);renderThumbs();updateCnt();
  document.getElementById('go').disabled=photos.length<planSize;
  if(!photos.length)setStatus('','');
}
function clearAll(){
  photos=[];renderThumbs();updateCnt();
  document.getElementById('fin').value='';
  document.getElementById('go').disabled=true;
  document.getElementById('results').classList.remove('show');
  document.getElementById('results').innerHTML='';
  hideErr();setStatus('','');
}
let dragI=null;
function dragStart(i){dragI=i}
function dragOver(e){e.preventDefault()}
function drop(e,i){e.preventDefault();if(dragI===null||dragI===i)return;const m=photos.splice(dragI,1)[0];photos.splice(i,0,m);dragI=null;renderThumbs()}

// ══ ERROR HANDLING ═══════════════════════════════════
function showErr(msg){
  document.getElementById('err-msg').textContent=msg;
  document.getElementById('err').classList.add('show');
  document.getElementById('err').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function hideErr(){document.getElementById('err').classList.remove('show')}

// ══ COMPOSE ══════════════════════════════════════════
async function compose(){
  if(photos.length<planSize)return;
  hideErr();
  document.getElementById('results').classList.remove('show');
  document.getElementById('results').innerHTML='';
  document.getElementById('loading').classList.add('show');
  document.getElementById('go').disabled=true;
  step(1);
  try{
    const H=HARMONIES.find(h=>h.id===selH),P=PATTERNS.find(p=>p.id===selP);
    const kw=document.getElementById('kw').value,kc=document.getElementById('kc').value;
    const colorCtx=photos.map((p,i)=>
      `FOTO ${i+1}: kelvin~${p.kelvin}K temp=${p.kelvin<5000?'QUENTE':'FRIO'} cores=[${(p.colors||[]).map(c=>c.hex+'('+c.pct+'%)').join(' ')}]`
    ).join('\n');
    const igCtx=igPhotos.length>0
      ?'\nULTIMAS 3 FOTOS DO GRID (continuidade):\n'+igPhotos.map((p,i)=>`IG${i+1}: kelvin~${p.kelvin}K cores=[${(p.colors||[]).map(c=>c.hex+'('+c.pct+'%)').join(' ')}]`).join('\n')
      :'';
    step(2);

    // Use compressed images for API call
    const content=[];
    photos.forEach((p,i)=>{
      const b64=p.compressed.split(',')[1];
      content.push({type:'image',source:{type:'base64',media_type:'image/jpeg',data:b64}});
      content.push({type:'text',text:`[FOTO ${i+1}]`});
    });
    step(3);
    content.push({type:'text',text:buildPrompt(H,P,kw,kc,colorCtx,igCtx,planSize)});

    const res=await fetch('/api/analyze',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization': 'Bearer ' + authToken
      },
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:4000,messages:[{role:'user',content}]})
    });

    const data=await res.json();
    if(!res.ok){
      if(data.code==='NO_CREDITS'){
        throw new Error('Sem créditos disponíveis. Clique no saldo no topo para comprar mais.')
      }
      throw new Error(data.error?.message||data.error||`HTTP ${res.status}`)
    }

    const raw=data.content.filter(b=>b.type==='text').map(b=>b.text).join('');
    step(4);

    const cleaned=raw.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
    let parsed;
    try{parsed=JSON.parse(cleaned)}
    catch{
      const m=cleaned.match(/\{[\s\S]*\}/);
      if(m){try{parsed=JSON.parse(m[0].replace(/,\s*([}\]])/g,'$1'))}catch{}}
      if(!parsed){
        const a=cleaned.match(/"plan"\s*:\s*(\[[\s\S]*?\])/);
        if(a)parsed={plan:JSON.parse(a[1])};
        else throw new Error('JSON inválido — resposta: '+cleaned.slice(0,300));
      }
    }
    renderResults(parsed,H);
    loadCredits(); // atualiza saldo após análise
  }catch(e){
    showErr(e.message);
  }finally{
    document.getElementById('loading').classList.remove('show');
    document.getElementById('go').disabled=false;
  }
}

function step(n){
  ['s1','s2','s3','s4'].forEach((id,i)=>{
    document.getElementById(id).className='ld-s'+(i+1<n?' done':i+1===n?' now':'');
  });
  const m=['','Extraindo cores reais...','Analisando composição...','Testando combinações...','Montando plano...'];
  document.getElementById('ldtxt').textContent=m[n];
}

function buildPrompt(H,P,kw,kc,colorCtx,igCtx,size){
  const axis=CONTRAST_AXES.find(a=>a.id===selC);
  const kelvinLine=axis?.useKelvin?`Kelvin-Q=ate${kw}K Kelvin-F=acima${kc}K`:'(Kelvin é referência mas não é o eixo principal de contraste)';
  return`Especialista em color grading e grid Instagram outdoor/adventure.

CORES K-MEANS LAB EXTRAIDAS (valores reais do pixel):
${colorCtx}${igCtx}

CONFIG: Harmonia=${H.name} Padrao=${P.name} ${kelvinLine} Posts=${size}

${axis?.prompt||''}

Monte o melhor plano de ${size} posts. RETORNE APENAS JSON SEM MARKDOWN:
{"plan":[{"slot":1,"photo":N,"temp":"cool","kelvin":"7500K","contrast_role":"claro","type":"TIPO","harmony_role":"papel na harmonia","reason":"max 70 chars","preset":"ajustes PS/LR max 60 chars"}],"overview":"1 frase","harmony_note":"1 frase — mencione o eixo de contraste usado"}

Slots: ${Array.from({length:size},(_,i)=>i+1).join(', ')}
Fotos disponiveis: 1 a ${photos.length}
Kelvin: MENOR=quente/laranja MAIOR=frio/azul
contrast_role: para temperatura=warm/cool · luminância=light/dark · plano=portrait/landscape/detail · saturação=vivid/muted`;
}

// ══ RENDER ═══════════════════════════════════════════
function renderResults(data,H){
  const plan=data.plan||[];
  const results=document.getElementById('results');

  // Collect unique palette colors
  const allColors=[];
  plan.forEach(s=>{const p=photos[s.photo-1];if(p)(p.colors||[]).slice(0,2).forEach(c=>{if(!allColors.includes(c.hex))allColors.push(c.hex)})});

  const gridCells=plan.map(s=>{
    const p=photos[s.photo-1];const iW=s.temp==='warm';
    if(!p)return`<div class="ppc empty"><span>+${s.slot}</span></div>`;
    return`<div class="ppc">
      <img src="${p.dataUrl}">
      <div class="ppc-badge">+${s.slot}</div>
      <div class="ppc-k">${s.kelvin}</div>
      <div class="ppc-dot" style="background:${iW?'#e8920a':'#1976d2'}"></div>
    </div>`;
  }).join('');

  const rows=[];for(let i=0;i<plan.length;i+=3)rows.push(plan.slice(i,i+3));
  const tempBadges=rows.map(row=>row.map(s=>`<span class="rt ${s.temp==='warm'?'rt-w':'rt-c'}">${s.temp==='warm'?'🟠':'🔵'} ${s.kelvin}</span>`).join('')).join('');
  const palHtml=allColors.slice(0,10).map(hex=>`<div class="ppal-c" style="background:${hex}"></div>`).join('');

  const details=plan.map(s=>{
    const p=photos[s.photo-1];if(!p)return'';const iW=s.temp==='warm';
    const palDots=(p.colors||[]).slice(0,5).map(c=>`<div class="pr-pc" style="background:${c.hex}"></div>`).join('');
    const axis=CONTRAST_AXES.find(a=>a.id===selC);
    const contrastBadge=s.contrast_role
      ?`<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:100px;background:#f3f4f6;color:#374151;margin-left:2px">${axis?.icon||''} ${s.contrast_role}</span>`
      :'';
    return`<div class="post-row">
      <div class="pr-thumb"><img src="${p.dataUrl}"></div>
      <div class="pr-body">
        <div class="pr-top">
          <span class="pr-slot">+${s.slot}</span>
          <span class="pr-type">${s.type}</span>
          ${contrastBadge}
          <span class="pr-temp ${iW?'pr-tw':'pr-tc'}">${iW?'Quente':'Frio'}</span>
        </div>
        <div class="pr-reason">${s.reason}</div>
        <div class="pr-preset">⚙ ${s.preset}</div>
        <div class="pr-pal">${palDots}</div>
      </div>
    </div>`;
  }).join('');

  results.innerHTML=`
    <div class="plan-post">
      <div class="pp-hdr">
        <div class="pp-user">
          <div class="pp-av">H</div>
          <div><div class="pp-name">henriq.eu</div><div class="pp-sub">Próximos ${planSize} posts · ${H?.name||''}</div></div>
        </div>
        <div class="pp-more">···</div>
      </div>
      <div class="pp-grid">${gridCells}</div>
      <div class="pp-actions">
        <div class="pp-acts"><span class="pp-act">♡</span><span class="pp-act">💬</span><span class="pp-act">↗</span></div>
        <span class="pp-act">🔖</span>
      </div>
      <div class="pp-pal">${palHtml}</div>
      <div class="pp-temps">${tempBadges}</div>
      <div class="pp-caption"><strong>henriq.eu</strong> ${data.overview||''}</div>
      <div class="pp-harmony">${data.harmony_note||''}</div>
    </div>
    <div class="detail-panel">
      <div class="detail-hdr">Detalhe por post</div>
      ${details}
    </div>`;

  results.classList.add('show');
  // Scroll main area to results
  document.querySelector('.main').scrollTo({top:0,behavior:'smooth'});
}
