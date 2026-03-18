// app.js — Grid Composer Core Logic

// ══ COLOR ENGINE — k-means LAB (Adobe Color method) ══
function rgbToLab(r,g,b){let R=r/255,G=g/255,B=b/255;R=R>.04045?Math.pow((R+.055)/1.055,2.4):R/12.92;G=G>.04045?Math.pow((G+.055)/1.055,2.4):G/12.92;B=B>.04045?Math.pow((B+.055)/1.055,2.4):B/12.92;let X=R*.4124564+G*.3575761+B*.1804375,Y=R*.2126729+G*.7151522+B*.072175,Z=R*.0193339+G*.119192+B*.9503041;X/=.95047;Z/=1.08883;const f=v=>v>.008856?Math.cbrt(v):(7.787*v)+16/116;return[116*f(Y)-16,500*(f(X)-f(Y)),200*(f(Y)-f(Z))]}
function labToRgb(L,a,b){let Y=(L+16)/116,X=a/500+Y,Z=Y-b/200;X=(Math.pow(X,3)>.008856?Math.pow(X,3):(X-16/116)/7.787)*.95047;Y=(Math.pow(Y,3)>.008856?Math.pow(Y,3):(Y-16/116)/7.787);Z=(Math.pow(Z,3)>.008856?Math.pow(Z,3):(Z-16/116)/7.787)*1.08883;let R=X*3.2404542+Y*-1.5371385+Z*-.4985314,G=X*-.969266+Y*1.8760108+Z*.041556,B=X*.0556434+Y*-.2040259+Z*1.0572252;R=R>.0031308?1.055*Math.pow(R,1/2.4)-.055:12.92*R;G=G>.0031308?1.055*Math.pow(G,1/2.4)-.055:12.92*G;B=B>.0031308?1.055*Math.pow(B,1/2.4)-.055:12.92*B;return[Math.round(Math.max(0,Math.min(255,R*255))),Math.round(Math.max(0,Math.min(255,G*255))),Math.round(Math.max(0,Math.min(255,B*255)))]}
function labDist(a,b){return Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2)}
function rgbToHex(r,g,b){return'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}

function extractColors(img, k=5) {
  const cv = document.getElementById('cv')
  const MAX = 80
  let w = img.width, h = img.height
  if (w > MAX || h > MAX) { const r = Math.min(MAX/w, MAX/h); w = Math.round(w*r); h = Math.round(h*r) }
  cv.width = w; cv.height = h
  const ctx = cv.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h).data
  const px = []
  for (let i = 0; i < data.length; i += 16) {
    if (data[i+3] < 128) continue
    px.push(rgbToLab(data[i], data[i+1], data[i+2]))
  }
  if (!px.length) return []
  // k-means++ init
  const c = [px[Math.floor(Math.random() * px.length)]]
  for (let ci = 1; ci < k; ci++) {
    const d = px.map(p => Math.min(...c.map(cc => labDist(p, cc))))
    const total = d.reduce((a,b) => a+b, 0)
    let r = Math.random() * total
    for (let pi = 0; pi < px.length; pi++) { r -= d[pi]; if (r <= 0) { c.push([...px[pi]]); break } }
    if (c.length <= ci) c.push([...px[Math.floor(Math.random() * px.length)]])
  }
  // iterate
  let asgn = new Array(px.length).fill(0)
  for (let it = 0; it < 10; it++) {
    for (let pi = 0; pi < px.length; pi++) {
      let best = 0, bd = Infinity
      for (let ci = 0; ci < k; ci++) { const dd = labDist(px[pi], c[ci]); if (dd < bd) { bd = dd; best = ci } }
      asgn[pi] = best
    }
    for (let ci = 0; ci < k; ci++) {
      const cp = px.filter((_,pi) => asgn[pi] === ci)
      if (!cp.length) continue
      c[ci] = [cp.reduce((s,p)=>s+p[0],0)/cp.length, cp.reduce((s,p)=>s+p[1],0)/cp.length, cp.reduce((s,p)=>s+p[2],0)/cp.length]
    }
  }
  const cnt = new Array(k).fill(0)
  asgn.forEach(ci => cnt[ci]++)
  return c.map((cc,ci) => {
    const [r,g,b] = labToRgb(cc[0],cc[1],cc[2])
    return { hex: rgbToHex(r,g,b), pct: Math.round(cnt[ci]/px.length*100) }
  }).sort((a,b) => b.pct - a.pct).slice(0, 5)
}

function estimateKelvin(colors) {
  if (!colors.length) return 6500
  const hex = colors[0].hex
  const r = parseInt(hex.slice(1,3), 16), b = parseInt(hex.slice(5,7), 16)
  const rb = r / (b + 1)
  if (rb > 3.5) return 1900; if (rb > 2.5) return 2800; if (rb > 1.8) return 3500
  if (rb > 1.3) return 4500; if (rb > 1.0) return 5800; if (rb > 0.7) return 7200
  if (rb > 0.5) return 8500; return 9800
}

async function compressImage(dataUrl, maxDim=800, quality=0.75) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const cv2 = document.createElement('canvas')
      let w = img.width, h = img.height
      if (w > maxDim || h > maxDim) { const r = Math.min(maxDim/w, maxDim/h); w = Math.round(w*r); h = Math.round(h*r) }
      cv2.width = w; cv2.height = h
      cv2.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(cv2.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}

// ══ STATE ════════════════════════════════════════════
const HARMONIES = [
  {
    id:'complementary', name:'Complementar',
    dot:'linear-gradient(135deg,#C4853A,#3A5870)',
    colors:['#C4853A','#3A5870'],
    angle:'180°',
    when:'Máximo contraste. Fotos de pôr do sol (laranja) intercaladas com mar ou floresta (teal). O par mais impactante do círculo cromático.',
    example:'🌅 laranja + 🌊 teal',
    feel:'Dramático · energético · forte',
  },
  {
    id:'analogous', name:'Análogo',
    dot:'linear-gradient(135deg,#4A8A9A,#5A8A6A,#8A9A4A)',
    colors:['#4A8A9A','#5A8A6A','#8A9A4A'],
    angle:'0–60°',
    when:'Cores vizinhas no círculo. Feed suave e coeso. Ideal para natureza verde-azul ou tons terrosos.',
    example:'🟢 verde + 🔵 azul-verde',
    feel:'Suave · harmonioso · natural',
  },
  {
    id:'split', name:'Split Complementar',
    dot:'linear-gradient(135deg,#C4853A,#3A7870,#3A4A88)',
    colors:['#C4853A','#3A7870','#3A4A88'],
    angle:'±30°',
    when:'Contraste forte mas menos agressivo que o complementar. Cor dominante vs dois vizinhos do oposto.',
    example:'🟠 laranja + 🔵 teal + 🟦 azul',
    feel:'Vibrante · sofisticado · equilibrado',
  },
  {
    id:'triad', name:'Tríade',
    dot:'linear-gradient(135deg,#C4853A,#3A7A9A,#8A3A9A)',
    colors:['#C4853A','#3A7A9A','#8A3A9A'],
    angle:'120°',
    when:'Três cores igualmente espaçadas. Feed colorido. Funciona bem quando cada foto tem uma cor dominante diferente.',
    example:'🟠 laranja + 🔵 azul + 🟣 roxo',
    feel:'Colorido · vibrante · criativo',
  },
  {
    id:'monochrome', name:'Monocromático',
    dot:'linear-gradient(135deg,#0A2A3A,#1A5A7A,#4A9AB8)',
    colors:['#0A2A3A','#1A5A7A','#4A9AB8'],
    angle:'1 matiz',
    when:'Um único matiz em diferentes saturações e luminâncias. Feed minimalista e elegante. Ótimo para paisagens em azul ou feeds terrosos.',
    example:'🔵 azul escuro → azul médio → azul claro',
    feel:'Elegante · minimalista · coeso',
  },
  {
    id:'square', name:'Quadrado',
    dot:'linear-gradient(135deg,#C4853A,#3A8A4A,#3A5870,#8A3A7A)',
    colors:['#C4853A','#3A8A4A','#3A5870','#8A3A7A'],
    angle:'4×90°',
    when:'Quatro cores em quadrado no círculo. Feed rico e complexo. Difícil de executar mas muito impactante.',
    example:'🟠 + 🟢 + 🔵 + 🟣',
    feel:'Complexo · rico · arrojado',
  },
  {
    id:'shades', name:'Sombras',
    dot:'linear-gradient(135deg,#0A0E12,#142028,#1C3040)',
    colors:['#0A0E12','#142028','#1C3040'],
    angle:'dark',
    when:'Tons escuros e sombrios, baixa saturação. Feed cinematográfico. Ideal para aventura noturna, grutas, florestas densas.',
    example:'⬛ preto + 🌑 cinza escuro + azul noite',
    feel:'Misterioso · cinematográfico · dramático',
  },
  {
    id:'custom', name:'IA decide',
    dot:'linear-gradient(135deg,#888,#444)',
    colors:['#888888','#444444'],
    angle:'auto',
    when:'A IA analisa suas fotos e escolhe a harmonia que melhor se aplica ao conjunto. Ideal quando você não tem certeza.',
    example:'🤖 análise automática do conjunto',
    feel:'Adaptativo · otimizado para suas fotos',
  },
]

const PATTERNS = [
  {
    id:'checkerboard', name:'Xadrez',
    cells:[false,true,false,true,false,true],
    when:'Alterna duas fotos de perfil opostas em cada posição. O padrão mais clássico do Instagram — cria ritmo visual imediato e fácil de executar.',
    example:'🟠 frio · quente 🔵\n🔵 quente · frio 🟠',
    feel:'Rítmico · dinâmico · fácil de manter',
  },
  {
    id:'columns', name:'Colunas',
    cells:[false,false,true,false,false,true],
    when:'Uma coluna inteira com um perfil, outra coluna com outro. Cria faixas verticais no feed. Exige consistência de cor por coluna.',
    example:'frio | frio | quente\nfrio | frio | quente',
    feel:'Estruturado · limpo · editorial',
  },
  {
    id:'rows', name:'Linhas',
    cells:[true,true,true,false,false,false],
    when:'Cada linha do grid tem um perfil diferente. Conta uma história por faixa horizontal. Ideal para separar viagens ou momentos distintos.',
    example:'quente quente quente\nfrio   frio   frio',
    feel:'Narrativo · por capítulos · bold',
  },
  {
    id:'diagonal', name:'Diagonal',
    cells:[false,false,true,false,true,false],
    when:'Contraste em diagonal — mais sofisticado que o xadrez. Cria fluxo visual em zig-zag pelo feed.',
    example:'frio  · frio  · quente\nfrio  · quente · frio',
    feel:'Sofisticado · fluido · moderno',
  },
  {
    id:'free', name:'Livre (IA)',
    cells:[null,null,null,null,null,null],
    when:'A IA decide o melhor arranjo para o seu conjunto específico de fotos, sem seguir um padrão rígido. Ideal quando as fotos têm paletas variadas.',
    example:'🤖 arranjo otimizado pela IA',
    feel:'Flexível · otimizado · adaptativo',
  },
]

const CONTRAST_AXES = [
  {
    id:'temperature', icon:'🌡️', name:'Temperatura', sub:'Quente vs Frio · Kelvin',
    useKelvin:true,
    info:'Usa a temperatura de cor (Kelvin) como eixo. Fotos quentes têm Kelvin baixo (laranjas, dourados, pôr do sol). Fotos frias têm Kelvin alto (teals, azuis, névoa).\n\nIdeal para feeds com mix de pôr do sol + paisagem fria.',
    example:'🌅 quente (3200K) ↔ 🌊 frio (7500K)',
    prompt:'Eixo TEMPERATURA. Alterne slots quentes (Kelvin baixo, laranjas/dourados) e frios (Kelvin alto, teals/azuis).',
  },
  {
    id:'luminance', icon:'☀️', name:'Luminância', sub:'Claro vs Escuro',
    useKelvin:false,
    info:'Alterna pela luminosidade — independente de cor. Foto clara (céu aberto, areia, highlights) vs foto escura (gruta, floresta densa, interior).\n\nPerfeito para feeds todos quentes onde temperatura não cria contraste suficiente.',
    example:'☀️ claro (duna) ↔ 🌑 escuro (gruta)',
    prompt:'Eixo LUMINANCIA. Alterne fotos claras (céu aberto, areia, highlights) com fotos escuras (florestas, interior, sombras). Funciona mesmo que todas sejam quentes.',
  },
  {
    id:'subject', icon:'🔭', name:'Plano / Sujeito', sub:'Close · Paisagem · Detalhe',
    useKelvin:false,
    info:'Alterna pelo tipo de enquadramento. Retrato (pessoa próxima, rosto dominante) vs Paisagem (ambiente, figura pequena ou ausente) vs Detalhe (textura, equipamento).\n\nCria ritmo narrativo no feed sem depender de cor.',
    example:'🧍 retrato ↔ 🏔️ paisagem ↔ 🔍 detalhe',
    prompt:'Eixo TIPO DE PLANO. Alterne: RETRATO (pessoa próxima), PAISAGEM (ambiente dominante), DETALHE (textura/equipamento).',
  },
  {
    id:'saturation', icon:'🎨', name:'Saturação', sub:'Vívido vs Dessaturado',
    useKelvin:false,
    info:'Alterna entre fotos com cores intensas e saturadas vs fotos mais neutras, dessaturadas ou com névoa.\n\nFunciona muito bem para feeds de aventura com fotos de nevoeiro intercaladas com fotos de cores vivas.',
    example:'🎨 saturado (pôr do sol) ↔ 🌫️ muted (névoa)',
    prompt:'Eixo SATURACAO. Alterne fotos vívidas (cores intensas) com fotos dessaturadas (névoa, mist, cinza).',
  },
  {
    id:'combined', icon:'✦', name:'Combinado (IA)', sub:'IA escolhe o melhor eixo',
    useKelvin:true,
    info:'A IA analisa todas as fotos e escolhe automaticamente qual eixo de contraste gera o grid mais harmônico — podendo combinar temperatura, luminância e tipo de plano conforme necessário.',
    example:'🤖 análise automática do conjunto',
    prompt:'Eixo COMBINADO. Analise as fotos e escolha automaticamente o melhor eixo de contraste. Explique a escolha no harmony_note.',
  },
]

let selH = 'complementary', selP = 'checkerboard', selC = 'temperature'
let photos = Array(3).fill(null), igPhotos = [], planSize = 3, igMode = 'skip'

// ══ INIT ═════════════════════════════════════════════
function init() {
  renderHarmonies()
  renderPatterns()
  renderContrast()
  setupDrop()
  kUpdate()
  applyTranslations()
  renderUploadGrid()
}

function renderHarmonies() {
  document.getElementById('hm-list').innerHTML = HARMONIES.map(h =>
    `<div class="hchip ${h.id===selH?'on':''}" onclick="selHarmony('${h.id}')">
      <div class="hchip-dot" style="background:${h.dot}"></div>
      <span class="hchip-name">${h.name}</span>
      <button class="hchip-help" onclick="event.stopPropagation();showHarmonyInfo('${h.id}')" title="Saiba mais">?</button>
    </div>`).join('')
}

function renderPatterns() {
  document.getElementById('pat-list').innerHTML = PATTERNS.map(p => {
    const cells = p.cells.map(v => `<div class="pm ${v===true?'w':''}"></div>`).join('')
    return `<div class="pchip ${p.id===selP?'on':''}" onclick="selPattern('${p.id}')">
      <div class="pg-mini">${cells}</div>
      <span style="flex:1">${p.name}</span>
      <button class="hchip-help" onclick="event.stopPropagation();showPatternInfo('${p.id}')" title="Saiba mais">?</button>
    </div>`
  }).join('')
}

function renderContrast() {
  document.getElementById('contrast-list').innerHTML = CONTRAST_AXES.map(a =>
    `<div class="cchip ${a.id===selC?'on':''}" onclick="selContrast('${a.id}')">
      <span class="cchip-icon">${a.icon}</span>
      <div class="cchip-body">
        <span class="cchip-name">${a.name}</span>
        <span class="cchip-sub">${a.sub}</span>
      </div>
      <button class="hchip-help" onclick="event.stopPropagation();showContrastInfo('${a.id}')" title="Saiba mais">?</button>
    </div>`).join('')
  const axis = CONTRAST_AXES.find(a => a.id === selC)
  const ks = document.getElementById('kelvin-section')
  if (ks) ks.className = 'sb-section kelvin-section' + (axis?.useKelvin ? '' : ' dim')
}

function selHarmony(id) { selH = id; renderHarmonies() }
function selPattern(id)  { selP = id; renderPatterns() }
function selContrast(id) { selC = id; renderContrast() }

// ── Generic info popover helper ───────────────────────
function showInfoPopover({ title, icon, body, example, feel, ctaLabel, ctaFn }) {
  document.getElementById('harmony-popover')?.remove()

  const pop = document.createElement('div')
  pop.id = 'harmony-popover'
  pop.style.cssText = `
    position:fixed;z-index:600;
    background:#1a1a1a;color:white;
    border-radius:12px;padding:16px;
    width:240px;box-shadow:0 8px 32px rgba(0,0,0,.4);
    font-family:var(--font);font-size:13px;line-height:1.5;
    animation:fadeUp .15s ease;
  `
  pop.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <strong style="font-size:14px">${icon ? icon + ' ' : ''}${title}</strong>
      <button onclick="document.getElementById('harmony-popover')?.remove()"
        style="background:rgba(255,255,255,.15);border:none;color:white;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1;font-family:var(--font)">✕</button>
    </div>
    <div style="font-size:12px;color:rgba(255,255,255,.8);margin-bottom:8px;white-space:pre-line">${body}</div>
    ${example ? `<div style="font-size:11px;margin-bottom:6px;background:rgba(255,255,255,.08);padding:6px 8px;border-radius:6px">${example}</div>` : ''}
    ${feel ? `<div style="font-size:11px;color:rgba(255,255,255,.45);font-style:italic;margin-bottom:10px">${feel}</div>` : ''}
    <button onclick="${ctaFn};document.getElementById('harmony-popover')?.remove()"
      style="width:100%;padding:8px;background:white;color:#1a1a1a;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font)">
      ${ctaLabel}
    </button>
  `

  // Position near click
  const rect = event?.target?.getBoundingClientRect()
  if (rect) {
    const top  = Math.min(rect.bottom + 8, window.innerHeight - 280)
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 256))
    pop.style.top  = top + 'px'
    pop.style.left = left + 'px'
  }

  document.body.appendChild(pop)
  setTimeout(() => {
    document.addEventListener('click', function closePop(e) {
      if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('click', closePop) }
    })
  }, 0)
}

// ── Harmony info popover ─────────────────────────────
function showHarmonyInfo(id) {
  const h = HARMONIES.find(x => x.id === id)
  if (!h) return

  document.getElementById('harmony-popover')?.remove()
  const colors = h.colors.map(c =>
    `<div style="width:24px;height:24px;border-radius:5px;background:${c};flex-shrink:0" title="${c}"></div>`
  ).join('')

  const pop = document.createElement('div')
  pop.id = 'harmony-popover'
  pop.style.cssText = `
    position:fixed;z-index:600;background:#1a1a1a;color:white;
    border-radius:12px;padding:16px;width:240px;
    box-shadow:0 8px 32px rgba(0,0,0,.4);
    font-family:var(--font);font-size:13px;line-height:1.5;
    animation:fadeUp .15s ease;
  `
  pop.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <strong style="font-size:14px">${h.name}</strong>
      <button onclick="document.getElementById('harmony-popover')?.remove()"
        style="background:rgba(255,255,255,.15);border:none;color:white;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1;font-family:var(--font)">✕</button>
    </div>
    <div style="display:flex;gap:5px;margin-bottom:10px;align-items:center">
      ${colors}
      <span style="font-size:11px;color:rgba(255,255,255,.5);margin-left:4px">${h.angle}</span>
    </div>
    <div style="font-size:12px;color:rgba(255,255,255,.8);margin-bottom:8px">${h.when}</div>
    <div style="font-size:11px;background:rgba(255,255,255,.08);padding:5px 8px;border-radius:6px;margin-bottom:6px">${h.example}</div>
    <div style="font-size:11px;color:rgba(255,255,255,.45);font-style:italic;margin-bottom:10px">${h.feel}</div>
    <button onclick="selHarmony('${h.id}');document.getElementById('harmony-popover')?.remove()"
      style="width:100%;padding:8px;background:white;color:#1a1a1a;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font)">
      Usar ${h.name}
    </button>
  `
  const rect = event?.target?.getBoundingClientRect()
  if (rect) {
    pop.style.top  = Math.min(rect.bottom + 8, window.innerHeight - 300) + 'px'
    pop.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 256)) + 'px'
  }
  document.body.appendChild(pop)
  setTimeout(() => {
    document.addEventListener('click', function closePop(e) {
      if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('click', closePop) }
    })
  }, 0)
}

// ── Pattern info popover ─────────────────────────────
function showPatternInfo(id) {
  const p = PATTERNS.find(x => x.id === id)
  if (!p) return
  showInfoPopover({
    title: p.name,
    icon: null,
    body: p.when,
    example: p.example,
    feel: p.feel,
    ctaLabel: `Usar ${p.name}`,
    ctaFn: `selPattern('${p.id}')`,
  })
}

// ── Contrast axis info popover ───────────────────────
function showContrastInfo(id) {
  const a = CONTRAST_AXES.find(x => x.id === id)
  if (!a) return
  showInfoPopover({
    title: a.name,
    icon: a.icon,
    body: a.info,
    example: a.example,
    feel: null,
    ctaLabel: `Usar ${a.name}`,
    ctaFn: `selContrast('${a.id}')`,
  })
}


function kUpdate() {
  const w = document.getElementById('kw').value
  const c = document.getElementById('kc').value
  document.getElementById('kwv').textContent = w + 'K'
  document.getElementById('kcv').textContent = c + 'K'
  document.getElementById('kdiff').textContent = (c - w) + 'K'
}

function setPlan(n, btn) {
  planSize = n
  document.querySelectorAll('.topbar-center .plan-tab').forEach(t => t.classList.remove('active'))
  btn.classList.add('active')
  // Resize photos array to new planSize
  photos.length = n
  for (let i = 0; i < n; i++) { if (photos[i] === undefined) photos[i] = null }
  renderUploadGrid()
}
function setPlanM(n, btn) {
  planSize = n
  document.querySelectorAll('.plan-tabs-mobile .plan-tab').forEach(t => t.classList.remove('active'))
  btn.classList.add('active')
  photos.length = n
  for (let i = 0; i < n; i++) { if (photos[i] === undefined) photos[i] = null }
  renderUploadGrid()
}
function setIG(mode) {
  igMode = mode
  document.getElementById('ig-skip').className   = 'ig-opt' + (mode==='skip'   ? ' on' : '')
  document.getElementById('ig-up-opt').className = 'ig-opt' + (mode==='upload' ? ' on' : '')
  document.getElementById('ig-up-area').style.display = mode === 'upload' ? 'block' : 'none'
  document.getElementById('ig-note').style.display    = mode === 'skip'   ? 'block' : 'none'
}

// ══ UPLOAD ═══════════════════════════════════════════
function setupDrop() {
  const dz = document.getElementById('dz')
  dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag') })
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'))
  dz.addEventListener('drop',      e => { e.preventDefault(); dz.classList.remove('drag'); handleFiles(e.dataTransfer.files) })
  dz.addEventListener('click',     () => document.getElementById('fin').click())
}

async function handleFiles(files) {
  const toAdd = Array.from(files).filter(f => f.type.startsWith('image/'))
  if (!toAdd.length) return
  setStatus(`Processando ${toAdd.length} foto(s)...`, '')

  // Fill empty slots first, then append
  for (const file of toAdd) {
    // Find first empty slot
    let idx = -1
    for (let i = 0; i < planSize; i++) { if (!photos[i]) { idx = i; break } }
    if (idx === -1) break // all slots full

    const raw        = await readFile(file)
    const img        = await loadImg(raw)
    const colors     = extractColors(img, 5)
    const kelvin     = estimateKelvin(colors)
    const compressed = await compressImage(raw, 800, 0.75)
    photos[idx] = { file, dataUrl: raw, compressed, colors, kelvin }
    renderUploadGrid()
  }

  const filled = photos.filter(Boolean).length
  setStatus(`✓ ${filled} foto(s) · k-means LAB`, 'ok')
  document.getElementById('go').disabled = filled < planSize
}

function readFile(f) { return new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsDataURL(f) }) }
function loadImg(s)  { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s }) }

async function handleIG(files) {
  igPhotos = []
  const g = document.getElementById('ig-grid')
  g.innerHTML = ''
  for (const f of Array.from(files).slice(0, 3)) {
    const url = await readFile(f)
    const img = await loadImg(url)
    igPhotos.push({ dataUrl: url, colors: extractColors(img, 5), kelvin: estimateKelvin(extractColors(img, 5)) })
    const c = document.createElement('div')
    c.className = 'igmc'
    c.innerHTML = `<img src="${url}">`
    g.appendChild(c)
  }
  while (g.children.length < 3) {
    const c = document.createElement('div'); c.className = 'igmc'; c.innerHTML = '<div class="igmc-e">+</div>'; g.appendChild(c)
  }
}

// ── Upload grid ───────────────────────────────────────
// photos is now a sparse array: photos[i] = photo or null/undefined
// planSize determines how many slots to show

let slotTargetIdx = null
let ugDragging    = false
let ugDragIdx     = null

function renderUploadGrid() {
  const grid = document.getElementById('upload-grid')
  if (!grid) return
  const cells = []
  for (let i = 0; i < planSize; i++) {
    const photo = photos[i]
    if (photo) {
      const pal = (photo.colors||[]).slice(0,5).map(c=>`<div style="flex:1;background:${c.hex}"></div>`).join('')
      cells.push(`
        <div class="ugslot filled"
          draggable="true"
          ondragstart="ugDragStart(event,${i})"
          ondragover="ugDragOver(event)"
          ondrop="ugDrop(event,${i})"
          ondragend="ugDragEnd(event)"
          onclick="ugSlotClick(${i})">
          <img src="${photo.dataUrl}">
          <button class="ugslot-del" onclick="event.stopPropagation();removePhotoAt(${i})">✕</button>
          <div class="ugslot-n">${i+1}${i===0?' · 1ª':''}</div>
          <div class="ugslot-pal">${pal}</div>
        </div>`)
    } else {
      cells.push(`
        <div class="ugslot" onclick="openSlotPicker(${i})">
          <div class="ugslot-empty">
            <div class="ugslot-plus">+</div>
            <div class="ugslot-num">foto ${i+1}${i===0?' · 1ª a postar':''}</div>
          </div>
        </div>`)
    }
  }
  grid.innerHTML = cells.join('')
  updateCnt()
  document.getElementById('go').disabled = photos.filter(Boolean).length < planSize
}

function ugSlotClick(i) {
  if (ugDragging) return
  if (photos[i] && currentPlan.length > 0) {
    const s = currentPlan.find(x => (x.photo - 1) === i)
    if (s) { openPhotoModal(s.slot); return }
  }
  openSlotPicker(i)
}

function openSlotPicker(idx) {
  slotTargetIdx = idx
  const fin = document.getElementById('slot-fin')
  if (fin) { fin.value = ''; fin.click() }
}

async function handleSlotFile(files) {
  if (!files || !files.length || slotTargetIdx === null) return
  const file = files[0]
  if (!file.type.startsWith('image/')) return
  const raw        = await readFile(file)
  const img        = await loadImg(raw)
  const colors     = extractColors(img, 5)
  const kelvin     = estimateKelvin(colors)
  const compressed = await compressImage(raw, 800, 0.75)
  photos[slotTargetIdx] = { file, dataUrl: raw, compressed, colors, kelvin }
  slotTargetIdx = null
  renderUploadGrid()
  const filled = photos.filter(Boolean).length
  setStatus(`✓ ${filled} foto(s) · k-means LAB`, 'ok')
  document.getElementById('go').disabled = filled < planSize
}

function ugDragStart(e, i) {
  ugDragIdx = i; ugDragging = true
  e.currentTarget.classList.add('ugslot-drag')
  e.dataTransfer.effectAllowed = 'move'
}
function ugDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
function ugDragEnd(e)  { e.currentTarget.classList.remove('ugslot-drag'); setTimeout(()=>ugDragging=false, 50) }
function ugDrop(e, i) {
  e.preventDefault()
  if (ugDragIdx === null || ugDragIdx === i) return
  const tmp = photos[ugDragIdx]; photos[ugDragIdx] = photos[i]; photos[i] = tmp
  ugDragIdx = null; renderUploadGrid()
}

function removePhotoAt(i) {
  photos[i] = null
  renderUploadGrid()
  if (!photos.filter(Boolean).length) setStatus('', '')
}

function setStatus(msg, cls) {
  const el = document.getElementById('exts')
  el.className = 'up-status' + (cls ? ' ' + cls : '')
  el.innerHTML = cls ? `<div class="status-dot"></div>${msg}` : msg
}

function updateCnt() {
  const filled = photos.filter(Boolean).length
  document.getElementById('pcnt').textContent = `${filled} foto${filled!==1?'s':''}`
}

function clearAll() {
  photos = Array(planSize).fill(null)
  igPhotos = []
  renderUploadGrid()
  document.getElementById('fin').value = ''
  document.getElementById('go').disabled = true
  document.getElementById('results').classList.remove('show')
  document.getElementById('results').innerHTML = ''
  currentPlan = []
  hideErr(); setStatus('', '')
}

// ══ ERRORS ═══════════════════════════════════════════
function showErr(msg) {
  document.getElementById('err-msg').textContent = msg
  document.getElementById('err').classList.add('show')
  document.getElementById('err').scrollIntoView({ behavior:'smooth', block:'nearest' })
}
function hideErr() { document.getElementById('err').classList.remove('show') }

// ══ COMPOSE ══════════════════════════════════════════
async function compose() {
  const filledPhotos = photos.filter(Boolean)
  if (filledPhotos.length < planSize) return
  hideErr()
  document.getElementById('results').classList.remove('show')
  document.getElementById('results').innerHTML = ''
  document.getElementById('loading').classList.add('show')
  document.getElementById('go').disabled = true
  step(1)

  try {
    const H  = HARMONIES.find(h => h.id === selH)
    const P  = PATTERNS.find(p => p.id === selP)
    const kw = document.getElementById('kw').value
    const kc = document.getElementById('kc').value

    // Use only filled slots, numbered by slot position
    const filledPhotos = photos.map((p,i) => p ? {p, slotIdx: i} : null).filter(Boolean)

    const colorCtx = filledPhotos.map(({p,slotIdx},i) =>
      `FOTO ${i+1}: kelvin~${p.kelvin}K temp=${p.kelvin<5000?'QUENTE':'FRIO'} cores=[${(p.colors||[]).map(c=>c.hex+'('+c.pct+'%)').join(' ')}]`
    ).join('\n')

    const igCtx = igPhotos.length > 0
      ? '\nULTIMAS 3 FOTOS DO GRID:\n' + igPhotos.map((p,i) =>
          `IG${i+1}: kelvin~${p.kelvin}K cores=[${(p.colors||[]).map(c=>c.hex+'('+c.pct+'%)').join(' ')}]`
        ).join('\n')
      : ''

    step(2)

    const content = []
    filledPhotos.forEach(({p},i) => {
      content.push({ type:'image', source:{ type:'base64', media_type:'image/jpeg', data:p.compressed.split(',')[1] } })
      content.push({ type:'text', text:`[FOTO ${i+1}]` })
    })
    step(3)
    content.push({ type:'text', text: buildPrompt(H,P,kw,kc,colorCtx,igCtx,planSize) })

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer ' + authToken },
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:4000, messages:[{ role:'user', content }] })
    })

    const data = await res.json()
    if (!res.ok) {
      if (data.code === 'NO_CREDITS') throw new Error(t('no_credits'))
      throw new Error(data.error?.message || data.error || `HTTP ${res.status}`)
    }

    const raw     = data.content.filter(b => b.type==='text').map(b => b.text).join('')
    step(4)

    const cleaned = raw.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim()
    let parsed
    try { parsed = JSON.parse(cleaned) }
    catch {
      const m = cleaned.match(/\{[\s\S]*\}/)
      if (m) { try { parsed = JSON.parse(m[0].replace(/,\s*([}\]])/g,'$1')) } catch {} }
      if (!parsed) {
        const a = cleaned.match(/"plan"\s*:\s*(\[[\s\S]*?\])/)
        if (a) parsed = { plan: JSON.parse(a[1]) }
        else throw new Error('JSON inválido — tente novamente.')
      }
    }

    renderResults(parsed, H)
    loadCredits()

  } catch(e) {
    showErr(e.message)
  } finally {
    document.getElementById('loading').classList.remove('show')
    document.getElementById('go').disabled = false
  }
}

function step(n) {
  ['s1','s2','s3','s4'].forEach((id,i) => {
    document.getElementById(id).className = 'ld-s' + (i+1<n?' done':i+1===n?' now':'')
  })
  const m = ['','Extraindo cores reais...','Analisando composição...','Testando combinações...','Montando plano...']
  document.getElementById('ldtxt').textContent = m[n]
}

function buildPrompt(H,P,kw,kc,colorCtx,igCtx,size) {
  const axis = CONTRAST_AXES.find(a => a.id === selC)
  const kelvinLine = axis?.useKelvin
    ? `Kelvin-Q=ate${kw}K Kelvin-F=acima${kc}K`
    : '(Kelvin é referência mas não é o eixo principal)'

  // Build grid position map — Instagram fills right→left, bottom→top
  // slot 1 = first to be posted = top-right position
  // For 3 posts:  pos [row0][col2]=slot1, [row0][col1]=slot2, [row0][col0]=slot3
  // For 6 posts:  row0 right→left = slots 1,2,3 | row1 right→left = slots 4,5,6
  const rows = Math.ceil(size / 3)
  let gridMap = ''
  for (let r = 0; r < rows; r++) {
    const rowSlots = []
    for (let c = 2; c >= 0; c--) {
      const slotNum = r * 3 + (2 - c) + 1
      if (slotNum <= size) rowSlots.push(`col${c+1}=slot${slotNum}`)
    }
    gridMap += `Linha ${r+1} (topo→base): ${rowSlots.join(' | ')}\n`
  }

  return `Especialista em color grading e grid Instagram outdoor/adventure.

REGRA CRÍTICA DE ORDEM DO INSTAGRAM:
O Instagram preenche o grid da DIREITA para ESQUERDA e de BAIXO para CIMA.
slot 1 = PRIMEIRO a ser postado = posição SUPERIOR DIREITA do grid.
slot ${size} = ÚLTIMO a ser postado = posição mais à ESQUERDA da linha mais nova.

MAPA DE POSIÇÕES DO GRID (${size} posts, ${rows} linha${rows>1?'s':''}):
${gridMap}
Exemplo xadrez correto para 6 posts:
  Linha 1: [slot3=frio][slot2=quente][slot1=frio]
  Linha 2: [slot6=quente][slot5=frio][slot4=quente]

CORES K-MEANS LAB (valores reais do pixel — use estes):
${colorCtx}${igCtx}

CONFIG: Harmonia=${H.name} Padrao=${P.name} ${kelvinLine} Posts=${size}

${axis?.prompt || ''}

Monte o melhor plano considerando as POSIÇÕES REAIS no grid do Instagram.
O padrão xadrez deve alternar na posição visual, não na ordem de slot.

REGRA ANTI-REPETIÇÃO: Evite colocar fotos com sujeito dominante similar em slots visualmente adjacentes (horizontais ou verticais). Se duas fotos têm o mesmo sujeito principal (pessoa com chapéu, cachoeira, duna), separe-as com pelo menos 1 slot de distância visual no grid.

RETORNE APENAS JSON SEM MARKDOWN:
{"plan":[{"slot":1,"photo":N,"grid_position":"top-right","temp":"cool","kelvin":"7500K","contrast_role":"frio","type":"TIPO","harmony_role":"papel na harmonia","reason":"max 70 chars","preset":"ajustes PS/LR max 60 chars"}],"overview":"1 frase","harmony_note":"1 frase com eixo usado"}

Slots: ${Array.from({length:size},(_,i)=>i+1).join(', ')}
Fotos: 1 a ${photos.filter(Boolean).length}
Kelvin: MENOR=quente/laranja MAIOR=frio/azul`
}

// ══ RENDER RESULTS ═══════════════════════════════════
// currentPlan is mutable — drag-and-drop updates it without re-calling API
let currentPlan = []
let currentHarmony = null

function renderResults(data, H) {
  currentPlan    = data.plan || []
  currentHarmony = H
  const results  = document.getElementById('results')

  const allColors = []
  currentPlan.forEach(s => {
    const p = photos[s.photo-1]
    if (p) (p.colors||[]).slice(0,2).forEach(c => { if (!allColors.includes(c.hex)) allColors.push(c.hex) })
  })

  const palHtml    = allColors.slice(0,10).map(hex => `<div class="ppal-c" style="background:${hex}"></div>`).join('')
  const userName   = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'user'

  results.innerHTML = `
    <div class="plan-post">
      <div class="pp-hdr">
        <div class="pp-user">
          <div class="pp-av">${userName[0].toUpperCase()}</div>
          <div>
            <div class="pp-name">${userName}</div>
            <div class="pp-sub">Próximos ${planSize} posts · ${H?.name||''}</div>
          </div>
        </div>
        <div class="pp-more">···</div>
      </div>
      <div class="pp-grid-wrap">
        <div class="pp-grid" id="result-grid"></div>
        <div class="pp-grid-hint">↕ Arraste para reordenar · sem consumir créditos</div>
      </div>
      <div class="pp-actions">
        <div class="pp-acts"><span class="pp-act">♡</span><span class="pp-act">💬</span><span class="pp-act">↗</span></div>
        <span class="pp-act">🔖</span>
      </div>
      <div class="pp-pal">${palHtml}</div>
      <div class="pp-caption"><strong>${userName}</strong> ${data.overview||''}</div>
      <div class="pp-harmony">${data.harmony_note||''}</div>
    </div>
    <div class="detail-panel">
      <div class="detail-hdr" id="detail-hdr-title">Detalhe por post</div>
      <div id="detail-cards"></div>
    </div>`

  renderGrid()
  renderDetails()

  results.classList.add('show')
  document.querySelector('.main').scrollTo({ top: 0, behavior: 'smooth' })
}

function renderGrid() {
  const grid = document.getElementById('result-grid')
  if (!grid) return

  // Instagram order: slot 1 = top-right, slot N = bottom-left
  // We need to render slots in reverse visual order (right→left per row)
  // Grid CSS: 3 columns, we place slot by visual position
  // slot 1 → col 3 (right), slot 2 → col 2, slot 3 → col 1 (left)
  // slot 4 → col 3 row 2, etc.

  const size = currentPlan.length
  // Build visual grid: array of visual positions left→right, top→bottom
  // Visual position [row][col] maps to slot number:
  //   col0=left, col1=mid, col2=right
  //   slot at visual(row,col) = row*3 + (2-col) + 1
  const visualCells = []
  const rows = Math.ceil(size / 3)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 3; c++) {
      const slotNum = r * 3 + (2 - c) + 1  // right→left: col2=slot1, col1=slot2, col0=slot3
      if (slotNum <= size) {
        const s = currentPlan.find(x => x.slot === slotNum) || currentPlan[slotNum - 1]
        visualCells.push({ slotNum, s })
      } else {
        visualCells.push(null) // empty filler
      }
    }
  }

  grid.innerHTML = visualCells.map((cell, vi) => {
    if (!cell) return `<div class="ppc empty"><span style="opacity:.2">·</span></div>`
    const { slotNum, s } = cell
    if (!s) return `<div class="ppc empty"><span>+${slotNum}</span></div>`
    const p  = photos[s.photo - 1]
    const iW = s.temp === 'warm'
    if (!p) return `<div class="ppc empty" data-slot="${slotNum}"><span>+${slotNum}</span></div>`
    return `<div class="ppc result-cell"
      data-slot="${slotNum}"
      data-vi="${vi}"
      draggable="true"
      ondragstart="gridDragStart(event,${slotNum})"
      ondragover="gridDragOver(event)"
      ondrop="gridDrop(event,${slotNum})"
      ondragend="gridDragEnd(event)"
      onclick="openPhotoModal(${slotNum})"
      style="cursor:pointer">
      <img src="${p.dataUrl}">
      <div class="ppc-badge">+${slotNum}</div>
      <div class="ppc-k">${s.kelvin}</div>
      <div class="ppc-dot" style="background:${iW?'#e8920a':'#1976d2'}"></div>
    </div>`
  }).join('')
}

function renderDetails() {
  const axis    = CONTRAST_AXES.find(a => a.id === selC)
  const container = document.getElementById('detail-cards')
  if (!container) return

  // Details shown in posting order (slot 1 first)
  const sorted = [...currentPlan].sort((a,b) => a.slot - b.slot)

  container.innerHTML = sorted.map(s => {
    const p  = photos[s.photo-1]; if (!p) return ''
    const iW = s.temp === 'warm'
    const palDots = (p.colors||[]).slice(0,5).map(c => `<div class="pr-pc" style="background:${c.hex}"></div>`).join('')
    const cBadge  = s.contrast_role
      ? `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:100px;background:#f3f4f6;color:#374151;">${axis?.icon||''} ${s.contrast_role}</span>`
      : ''
    const gridPos = getGridPosition(s.slot, currentPlan.length)
    return `<div class="post-row">
      <div class="pr-thumb"><img src="${p.dataUrl}"></div>
      <div class="pr-body">
        <div class="pr-top">
          <span class="pr-slot">+${s.slot}</span>
          <span class="pr-type">${s.type}</span>
          ${cBadge}
          <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:100px;background:#f3f4f6;color:#6b7280;">📍 ${gridPos}</span>
          <span class="pr-temp ${iW?'pr-tw':'pr-tc'}">${iW?'Quente':'Frio'}</span>
        </div>
        <div class="pr-reason">${s.reason}</div>
        <div class="pr-preset">⚙ ${s.preset}</div>
        <div class="pr-pal">${palDots}</div>
      </div>
    </div>`
  }).join('')
}

// Returns human-readable grid position for a slot
function getGridPosition(slotNum, total) {
  const rows = Math.ceil(total / 3)
  // slot 1 = top-right, fills right→left, top→bottom
  const row = Math.floor((slotNum - 1) / 3)      // 0=top
  const colFromRight = (slotNum - 1) % 3          // 0=right, 1=mid, 2=left
  const colLabels = ['direita', 'centro', 'esquerda']
  const rowLabel  = row === 0 ? 'topo' : row === rows-1 ? 'base' : `linha ${row+1}`
  return `${rowLabel} ${colLabels[colFromRight]}`
}

// ── Drag-and-drop on result grid (no credits consumed) ──
let gridDragSlot = null

function gridDragStart(e, slotNum) {
  gridDragSlot = slotNum
  e.currentTarget.style.opacity = '.4'
  e.dataTransfer.effectAllowed = 'move'
}
function gridDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  e.currentTarget.classList.add('drag-over')
}
function gridDragEnd(e) {
  e.currentTarget.style.opacity = ''
  document.querySelectorAll('.result-cell').forEach(el => el.classList.remove('drag-over'))
  gridDragSlot = null
}
function gridDrop(e, targetSlot) {
  e.preventDefault()
  e.currentTarget.classList.remove('drag-over')
  if (gridDragSlot === null || gridDragSlot === targetSlot) return

  // Swap photos between the two slots
  const fromIdx = currentPlan.findIndex(s => s.slot === gridDragSlot)
  const toIdx   = currentPlan.findIndex(s => s.slot === targetSlot)
  if (fromIdx === -1 || toIdx === -1) return

  // Swap photo references only (keep slot numbers intact)
  const tmpPhoto = currentPlan[fromIdx].photo
  currentPlan[fromIdx].photo = currentPlan[toIdx].photo
  currentPlan[toIdx].photo   = tmpPhoto

  // Also swap temp/kelvin/contrast info for visual consistency
  const tmpTemp     = currentPlan[fromIdx].temp
  const tmpKelvin   = currentPlan[fromIdx].kelvin
  currentPlan[fromIdx].temp   = currentPlan[toIdx].temp
  currentPlan[fromIdx].kelvin = currentPlan[toIdx].kelvin
  currentPlan[toIdx].temp     = tmpTemp
  currentPlan[toIdx].kelvin   = tmpKelvin

  renderGrid()
  renderDetails()
}

// ── Photo detail modal ────────────────────────────────
function openPhotoModal(slotNum) {
  // Don't open if we just finished a drag
  if (gridDragSlot !== null) return
  const s = currentPlan.find(x => x.slot === slotNum)
  if (!s) return
  const p = photos[s.photo - 1]
  if (!p) return

  const iW      = s.temp === 'warm'
  const gridPos = getGridPosition(slotNum, currentPlan.length)

  document.getElementById('pm-img').src             = p.dataUrl
  document.getElementById('pm-slot').textContent    = `+${slotNum}`
  document.getElementById('pm-type').textContent    = s.type || ''
  document.getElementById('pm-pos').textContent     = `📍 ${gridPos}`
  document.getElementById('pm-reason').textContent  = s.reason || ''
  document.getElementById('pm-harmony').textContent = s.harmony_role || ''
  document.getElementById('pm-preset').textContent  = s.preset || ''

  const tempEl = document.getElementById('pm-temp')
  tempEl.textContent = iW ? '🟠 Quente' : '🔵 Frio'
  tempEl.className   = `pm-temp ${iW ? 'pr-tw' : 'pr-tc'}`

  // Palette — click to copy hex
  document.getElementById('pm-palette').innerHTML = (p.colors || []).slice(0,5).map(c =>
    `<div class="pm-pc" style="background:${c.hex}" title="${c.hex} · ${c.pct}%"
      onclick="navigator.clipboard?.writeText('${c.hex}').then(()=>this.style.outline='2px solid #27ae60').catch(()=>{})">
    </div>`
  ).join('')

  document.getElementById('photo-modal').classList.add('open')
}

function closePhotoModal() {
  document.getElementById('photo-modal')?.classList.remove('open')
}

// Replace photo in current modal slot
function replaceSlotPhoto() {
  const slotEl = document.getElementById('pm-slot')
  if (!slotEl) return
  const slotNum = parseInt(slotEl.textContent.replace('+',''))
  const s = currentPlan.find(x => x.slot === slotNum)
  if (!s) return
  // Find photos index for this slot
  const photoIdx = s.photo - 1
  slotTargetIdx = photoIdx
  closePhotoModal()
  const fin = document.getElementById('slot-replace-fin')
  if (fin) { fin.value = ''; fin.click() }
}

// Remove photo from current modal slot
function removeSlotPhoto() {
  const slotEl = document.getElementById('pm-slot')
  if (!slotEl) return
  const slotNum = parseInt(slotEl.textContent.replace('+',''))
  const s = currentPlan.find(x => x.slot === slotNum)
  if (!s) return
  const photoIdx = s.photo - 1
  photos[photoIdx] = null
  closePhotoModal()
  renderUploadGrid()
  // Clear result since plan is now invalid
  document.getElementById('results').classList.remove('show')
  document.getElementById('results').innerHTML = ''
  currentPlan = []
}

async function handleSlotReplace(files) {
  await handleSlotFile(files)
}

// Close photo modal on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePhotoModal()
})
