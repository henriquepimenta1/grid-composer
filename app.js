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
// repository = all uploaded photos (up to 12), unordered pool
// feedSlots  = sparse array [0..planSize-1], each slot = repo index or null
let repository = []   // {file, dataUrl, cropUrl, compressed, colors, kelvin}
let feedSlots  = [null, null, null]  // indices into repository
let igPhotos = [], planSize = 3, igMode = 'skip'

// Legacy alias so existing compose/renderResults code still works
Object.defineProperty(window, 'photos', {
  get() { return feedSlots.map(i => i !== null ? repository[i] : null) },
  configurable: true
})

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

function selHarmony(id) {
  selH = id
  renderHarmonies()
  if (currentPlan.length > 0) reorderByHarmony(id)
}
function selPattern(id) {
  selP = id
  renderPatterns()
  if (currentPlan.length > 0) reorderByAxis(selC)
}
function selContrast(id) {
  selC = id
  renderContrast()
  if (currentPlan.length > 0) reorderByAxis(id)
}

// ══ LOCAL REORDERING (no API call) ═══════════════════

// Returns LAB L* (luminosity 0-100) from a hex color
function hexToL(hex) {
  const r = parseInt(hex.slice(1,3),16)/255
  const g = parseInt(hex.slice(3,5),16)/255
  const b = parseInt(hex.slice(5,7),16)/255
  const toLinear = c => c > 0.04045 ? Math.pow((c+0.055)/1.055, 2.4) : c/12.92
  const Y = 0.2126729*toLinear(r) + 0.7151522*toLinear(g) + 0.0721750*toLinear(b)
  const fy = Y > 0.008856 ? Math.cbrt(Y) : 7.787*Y + 16/116
  return 116*fy - 16  // L* value 0–100
}

// Returns estimated saturation from colors array
function estimateSaturation(colors) {
  if (!colors?.length) return 0
  const hex = colors[0].hex
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  return max === 0 ? 0 : (max - min) / max  // simple saturation 0–1
}

// Core reorder: takes photo list, assigns to slots following current pattern
function applyReorder(scoredPhotos) {
  if (!scoredPhotos.length || !currentPlan.length) return

  // scoredPhotos: [{repoIdx, score, group}] — group is 'A' or 'B'
  // Visual pattern for current grid pattern:
  // checkerboard: A B A B A B A B A
  // columns:      A A B A A B A A B
  // rows:         A A A B B B A A A
  // diagonal:     A A B A B A A B A
  // free:         sort by score descending

  const size = currentPlan.length
  const rows = Math.ceil(size / 3)

  // Build visual slot order (left→right, top→bottom) mapped to slot numbers
  const visualToSlot = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 3; c++) {
      const slotNum = r * 3 + (2 - c) + 1  // Instagram: right→left
      if (slotNum <= size) visualToSlot.push(slotNum)
    }
  }

  // Determine which visual positions get group A vs B based on pattern
  const patternMap = {
    checkerboard: (vi) => vi % 2 === 0 ? 'A' : 'B',
    columns:      (vi) => vi % 3 === 2 ? 'B' : 'A',
    rows:         (vi) => Math.floor(vi / 3) % 2 === 0 ? 'A' : 'B',
    diagonal:     (vi) => (Math.floor(vi/3) + vi%3) % 2 === 0 ? 'A' : 'B',
    free:         ()   => 'A',  // all same group, sorted by score
  }
  const groupFn = patternMap[selP] || patternMap.checkerboard

  // Separate photos into A and B groups, sorted by score
  const groupA = scoredPhotos.filter(p => p.group === 'A').sort((a,b) => b.score - a.score)
  const groupB = scoredPhotos.filter(p => p.group === 'B').sort((a,b) => b.score - a.score)

  // If free pattern, just sort all by score
  if (selP === 'free') {
    const sorted = [...scoredPhotos].sort((a,b) => b.score - a.score)
    visualToSlot.forEach((slotNum, vi) => {
      const photo = sorted[vi]
      if (!photo) return
      const planItem = currentPlan.find(x => x.slot === slotNum)
      if (planItem) planItem.photo = photo.repoIdx + 1
    })
  } else {
    let aiA = 0, aiB = 0
    visualToSlot.forEach((slotNum, vi) => {
      const wantsGroup = groupFn(vi)
      let photo
      if (wantsGroup === 'A' && groupA[aiA]) { photo = groupA[aiA++] }
      else if (wantsGroup === 'B' && groupB[aiB]) { photo = groupB[aiB++] }
      else if (groupA[aiA]) { photo = groupA[aiA++] }
      else if (groupB[aiB]) { photo = groupB[aiB++] }
      if (!photo) return
      const planItem = currentPlan.find(x => x.slot === slotNum)
      if (planItem) planItem.photo = photo.repoIdx + 1
    })
  }

  // Update feedSlots to match new plan
  currentPlan.forEach(s => {
    feedSlots[s.slot - 1] = s.photo - 1
  })

  renderUploadGrid()
  renderDetails()
}

function reorderByAxis(axisId) {
  const photos = currentPlan.map(s => {
    const p = repository[s.photo - 1]
    if (!p) return null
    const repoIdx = s.photo - 1

    let score, group
    switch (axisId) {
      case 'temperature':
        score = p.kelvin
        group = p.kelvin < 5000 ? 'A' : 'B'
        break
      case 'luminance': {
        const L = p.colors?.length ? hexToL(p.colors[0].hex) : 50
        score = L
        group = L > 55 ? 'A' : 'B'
        break
      }
      case 'subject': {
        const t = (s.type || '').toUpperCase()
        score = t.includes('RETRATO') || t.includes('PESSOA') ? 2
              : t.includes('DETALHE') ? 1 : 0
        group = (t.includes('RETRATO') || t.includes('PESSOA') || t.includes('GRUPO')) ? 'B' : 'A'
        break
      }
      case 'saturation': {
        const sat = estimateSaturation(p.colors)
        score = sat
        group = sat > 0.35 ? 'A' : 'B'
        break
      }
      case 'combined':
      default: {
        // Pick the axis with highest variance among the photos
        const kelvins = currentPlan.map(x => repository[x.photo-1]?.kelvin || 5500)
        const kVar = Math.max(...kelvins) - Math.min(...kelvins)
        const lums  = currentPlan.map(x => {
          const ph = repository[x.photo-1]
          return ph?.colors?.length ? hexToL(ph.colors[0].hex) : 50
        })
        const lVar = Math.max(...lums) - Math.min(...lums)
        const bestAxis = kVar > 2000 ? 'temperature' : lVar > 20 ? 'luminance' : 'subject'
        return reorderByAxis(bestAxis), null
      }
    }
    return { repoIdx, score, group }
  }).filter(Boolean)

  applyReorder(photos)
}

function reorderByHarmony(harmonyId) {
  // Harmony reorder: classify photos by dominant hue, then arrange per harmony type
  const photos = currentPlan.map(s => {
    const p = repository[s.photo - 1]
    if (!p) return null
    const repoIdx = s.photo - 1
    const hex  = p.colors?.[0]?.hex || '#888888'
    const r    = parseInt(hex.slice(1,3),16)
    const g    = parseInt(hex.slice(3,5),16)
    const b    = parseInt(hex.slice(5,7),16)
    const max  = Math.max(r,g,b), min = Math.min(r,g,b)
    const d    = max - min
    let hue    = 0
    if (d > 0) {
      if (max===r)      hue = ((g-b)/d + (g<b?6:0)) * 60
      else if (max===g) hue = ((b-r)/d + 2) * 60
      else              hue = ((r-g)/d + 4) * 60
    }
    const warm = p.kelvin < 5000
    const L    = hexToL(hex)
    const sat  = estimateSaturation(p.colors)
    return { repoIdx, hue, warm, L, sat, kelvin: p.kelvin }
  }).filter(Boolean)

  let scored
  switch (harmonyId) {
    case 'complementary':
      // Alternate warm/cool — strongest contrast
      scored = photos.map(p => ({ ...p, score: p.warm ? 100 - p.kelvin/100 : p.kelvin/100, group: p.warm ? 'A' : 'B' }))
      break
    case 'analogous':
      // Group by hue proximity — warm together, cool together, sorted by hue
      scored = photos.map(p => ({ ...p, score: p.hue, group: p.hue < 180 ? 'A' : 'B' }))
      break
    case 'split':
    case 'triad':
    case 'square':
      // Alternate by hue thirds/quarters
      scored = photos.map(p => ({ ...p, score: p.hue, group: Math.floor(p.hue / 120) % 2 === 0 ? 'A' : 'B' }))
      break
    case 'monochrome':
      // Sort by luminosity within same hue family
      scored = photos.map(p => ({ ...p, score: p.L, group: p.L > 55 ? 'A' : 'B' }))
      break
    case 'shades':
      // Darkest photos alternate with less dark
      scored = photos.map(p => ({ ...p, score: p.L, group: p.L < 35 ? 'A' : 'B' }))
      break
    case 'custom':
    default:
      // Let axis decide — keep original AI order
      reorderByAxis(selC)
      return
  }

  applyReorder(scored)
}

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
  document.querySelectorAll('.feed-tab,.topbar-center .plan-tab').forEach(t => t.classList.remove('active'))
  btn.classList.add('active')
  // Resize feedSlots
  while (feedSlots.length < n) feedSlots.push(null)
  feedSlots.length = n
  renderUploadGrid()
  updateActionButtons()
}
function setPlanM(n, btn) { setPlan(n, btn) }
function setIG(mode) {
  igMode = mode
  document.getElementById('ig-skip').className   = 'ig-opt' + (mode==='skip'   ? ' on' : '')
  document.getElementById('ig-up-opt').className = 'ig-opt' + (mode==='upload' ? ' on' : '')
  document.getElementById('ig-up-area').style.display = mode === 'upload' ? 'block' : 'none'
  document.getElementById('ig-note').style.display    = mode === 'skip'   ? 'block' : 'none'
}

// ══ UPLOAD — REPOSITORY + FEED ══════════════════════
let repoDragIdx = null
let dragSource  = null  // 'repo' | 'feed' — tracks which area the drag started from

function setupDrop() {
  // Repo: accept file drops from OS
  const repoGrid = document.getElementById('repo-grid')
  if (repoGrid) {
    repoGrid.addEventListener('dragover',  e => { e.preventDefault() })
    repoGrid.addEventListener('drop', e => {
      e.preventDefault()
      // Only handle OS file drops (not internal drags)
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
    })
  }
}

function repoDragStart(e, i) {
  repoDragIdx = i
  dragSource  = 'repo'
  e.dataTransfer.setData('text/plain', String(i))
  e.dataTransfer.effectAllowed = 'copy'
  renderRepo()
}

function repoDragEnd(e) {
  repoDragIdx = null
  dragSource  = null
  renderRepo()
}

// ── Add files to REPOSITORY ───────────────────────────
async function handleFiles(files) {
  const toAdd = Array.from(files).filter(f => f.type.startsWith('image/'))
  if (!toAdd.length) return
  const remaining = 12 - repository.length
  const batch = toAdd.slice(0, remaining)
  setStatus(`Processando ${batch.length} foto(s)...`, '')
  for (const file of batch) {
    const raw        = await readFile(file)
    const img        = await loadImg(raw)
    const colors     = extractColors(img, 5)
    const kelvin     = estimateKelvin(colors)
    const compressed = await compressImage(raw, 800, 0.75)
    repository.push({ file, dataUrl: raw, compressed, colors, kelvin })
    renderRepo()
  }
  setStatus(`✓ ${repository.length} foto(s) no repositório`, 'ok')
  updateActionButtons()
}

function readFile(f) { return new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsDataURL(f) }) }
function loadImg(s)  { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s }) }

// ── Render REPOSITORY ─────────────────────────────────
function renderRepo() {
  const grid = document.getElementById('repo-grid')
  if (!grid) return
  // Thumbs
  const thumbsHtml = repository.map((p, i) => `
    <div class="repo-thumb ${repoDragIdx===i?'repo-dragging':''}"
      draggable="true"
      ondragstart="repoDragStart(event,${i})"
      ondragend="repoDragEnd(event)">
      <img src="${p.cropUrl || p.dataUrl}" alt="">
      <button class="repo-del" onclick="event.stopPropagation();removeFromRepo(${i})">✕</button>
    </div>`).join('')

  const addBtn = repository.length < 12
    ? `<div class="repo-add" id="repo-add" onclick="document.getElementById('fin').click()">
        <span style="font-size:22px;color:var(--text3)">+</span>
        <span style="font-size:11px;color:var(--text3);margin-top:2px">Adicionar</span>
       </div>`
    : ''

  grid.innerHTML = thumbsHtml + addBtn
  document.getElementById('pcnt').textContent = `${repository.length} / 12`
}

function removeFromRepo(i) {
  // Remove from repo and clear any feed slots pointing to it
  repository.splice(i, 1)
  feedSlots = feedSlots.map(s => {
    if (s === i) return null
    if (s > i)   return s - 1
    return s
  })
  renderRepo()
  renderUploadGrid()
  updateActionButtons()
}

// ── Render FEED grid ──────────────────────────────────
let slotTargetIdx = null
let ugDragging    = false
let ugDragIdx     = null

function renderUploadGrid() {
  const grid = document.getElementById('upload-grid')
  if (!grid) return
  const cells = []
  for (let i = 0; i < planSize; i++) {
    const repoIdx = feedSlots[i]
    const photo   = repoIdx !== null && repoIdx !== undefined ? repository[repoIdx] : null
    if (photo) {
      const pal      = (photo.colors||[]).slice(0,5).map(c=>`<div style="flex:1;background:${c.hex}"></div>`).join('')
      const hasInfo  = currentPlan.length > 0
      cells.push(`
        <div class="ugslot filled"
          draggable="true"
          ondragstart="ugDragStart(event,${i})"
          ondragover="ugDragOver(event)"
          ondrop="ugDropOrReplace(event,${i})"
          ondragleave="slotDragLeave(event)"
          ondragend="ugDragEnd(event)">
          <img src="${photo.cropUrl || photo.dataUrl}">
          <button class="ugslot-del" onclick="event.stopPropagation();clearSlot(${i})" title="Remover">✕</button>
          <div class="slot-actions">
            <button class="slot-act" onclick="event.stopPropagation();openCrop(${repoIdx})" title="Recortar">✂</button>
            <button class="slot-act ${hasInfo?'':'slot-act-dim'}" onclick="event.stopPropagation();openSlotInfo(${i})" title="${hasInfo?'Ver informações':'Sem análise ainda'}">ℹ</button>
          </div>
          <div class="ugslot-n">${i+1}${i===0?' · 1ª':''}</div>
          <div class="ugslot-pal">${pal}</div>
        </div>`)
    } else {
      cells.push(`
        <div class="ugslot"
          ondragover="slotDragOver(event)"
          ondragleave="slotDragLeave(event)"
          ondrop="slotDropFromRepo(event,${i})"
          onclick="openSlotPicker(${i})">
          <div class="ugslot-empty">
            <div class="ugslot-plus">+</div>
            <div class="ugslot-num">slot ${i+1}${i===0?' · 1ª a postar':''}</div>
          </div>
        </div>`)
    }
  }
  grid.innerHTML = cells.join('')
}

// Open info for a feed slot — palette if no AI plan, detail modal if AI ran
function openSlotInfo(slotIdx) {
  const repoIdx = feedSlots[slotIdx]
  if (repoIdx === null || repoIdx === undefined) return

  const p = repository[repoIdx]
  if (!p) return

  if (currentPlan.length > 0) {
    // Find plan item: feedSlots[slotIdx] = s.photo - 1
    const s = currentPlan.find(x => (x.photo - 1) === repoIdx)
    if (s) {
      openPhotoModalDirect(s, p, slotIdx)
      return
    }
  }
  // No plan or not found — show basic info from repo
  openPhotoModalFromRepo(repoIdx, slotIdx)
}

// Direct modal open — receives plan item + photo + slotIdx
function openPhotoModalDirect(s, p, slotIdx) {
  const iW      = s.temp === 'warm'
  const gridPos = getGridPosition(slotIdx + 1, planSize)

  document.getElementById('pm-img').src             = p.cropUrl || p.dataUrl
  document.getElementById('pm-slot').textContent    = `+${slotIdx + 1}`
  document.getElementById('pm-type').textContent    = s.type ? `· ${s.type}` : ''
  document.getElementById('pm-pos').textContent     = `📍 ${gridPos}`
  document.getElementById('pm-reason').textContent  = s.reason || '—'
  document.getElementById('pm-harmony').textContent = s.harmony_role || '—'

  const tempEl = document.getElementById('pm-temp')
  tempEl.textContent = iW ? `🟠 Quente · ${s.kelvin}` : `🔵 Frio · ${s.kelvin}`
  tempEl.className   = `pm-temp ${iW ? 'pr-tw' : 'pr-tc'}`

  renderPaletteInModal(p, slotIdx)
  document.getElementById('photo-modal').classList.add('open')
}

// Opens info modal using raw repo data (no AI plan needed)
function openPhotoModalFromRepo(repoIdx, slotIdx) {
  const p = repository[repoIdx]
  if (!p) return

  document.getElementById('pm-img').src          = p.cropUrl || p.dataUrl
  document.getElementById('pm-slot').textContent = `+${slotIdx + 1}`
  document.getElementById('pm-type').textContent = ''
  document.getElementById('pm-pos').textContent  = getGridPosition(slotIdx + 1, planSize)
  document.getElementById('pm-reason').textContent  = 'Sem análise de IA ainda.'
  document.getElementById('pm-harmony').textContent = 'Clique em "Compor" para obter análise completa.'

  const tempEl = document.getElementById('pm-temp')
  const iW = p.kelvin < 5000
  tempEl.textContent = iW ? `🟠 Quente · ${p.kelvin}K` : `🔵 Frio · ${p.kelvin}K`
  tempEl.className   = `pm-temp ${iW ? 'pr-tw' : 'pr-tc'}`

  renderPaletteInModal(p, 0)
  document.getElementById('photo-modal').classList.add('open')
}

// drop from repo onto feed slot
function slotDragOver(e) {
  e.preventDefault()
  e.currentTarget.classList.add('drop-hover')
}
function slotDragLeave(e) {
  e.currentTarget.classList.remove('drop-hover')
}
function slotDropFromRepo(e, slotIdx) {
  e.preventDefault()
  e.currentTarget.classList.remove('drop-hover')
  const repoIdx = parseInt(e.dataTransfer.getData('text/plain'))
  if (isNaN(repoIdx)) return
  feedSlots[slotIdx] = repoIdx
  renderUploadGrid()
  updateActionButtons()
}

// drag within feed to reorder
function ugDragStart(e, i) {
  ugDragIdx  = i
  ugDragging = true
  dragSource = 'feed'
  e.dataTransfer.setData('text/plain', 'feed')
  e.dataTransfer.effectAllowed = 'move'
}
function ugDragOver(e)  { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
function ugDragEnd(e)   { setTimeout(()=>{ ugDragging=false; dragSource=null }, 50) }
function ugDrop(e, i) {
  e.preventDefault()
  if (ugDragIdx === null || ugDragIdx === i) return
  const tmp = feedSlots[ugDragIdx]; feedSlots[ugDragIdx] = feedSlots[i]; feedSlots[i] = tmp
  ugDragIdx = null; renderUploadGrid(); updateActionButtons()
}

// Handles drop on filled slot — could be repo drag OR feed reorder
function ugDropOrReplace(e, i) {
  e.preventDefault()
  e.currentTarget.classList.remove('drop-hover')

  // Check if it's a repo drag (has text/plain with repo index, dragSource='repo')
  const raw = e.dataTransfer.getData('text/plain')
  const repoIdx = parseInt(raw)

  if (dragSource === 'repo' && !isNaN(repoIdx)) {
    // Drop from repository onto filled slot → replace
    feedSlots[i] = repoIdx
    renderUploadGrid()
    updateActionButtons()
    return
  }

  // Otherwise it's a feed reorder
  if (ugDragIdx === null || ugDragIdx === i) return
  const tmp = feedSlots[ugDragIdx]; feedSlots[ugDragIdx] = feedSlots[i]; feedSlots[i] = tmp
  ugDragIdx = null; renderUploadGrid(); updateActionButtons()
}

// click actions now handled by hover icon buttons

function openSlotPicker(idx) {
  slotTargetIdx = idx
  const fin = document.getElementById('slot-fin')
  if (fin) { fin.value = ''; fin.click() }
}

async function handleSlotFile(files) {
  if (!files || !files.length || slotTargetIdx === null) return
  const file = files[0]
  if (!file.type.startsWith('image/')) return
  // Add to repo first
  const raw        = await readFile(file)
  const img        = await loadImg(raw)
  const colors     = extractColors(img, 5)
  const kelvin     = estimateKelvin(colors)
  const compressed = await compressImage(raw, 800, 0.75)
  if (repository.length < 12) {
    repository.push({ file, dataUrl: raw, compressed, colors, kelvin })
    feedSlots[slotTargetIdx] = repository.length - 1
    renderRepo()
  }
  slotTargetIdx = null
  renderUploadGrid()
  updateActionButtons()
  setStatus(`✓ ${repository.length} foto(s) no repositório`, 'ok')
}

function clearSlot(i) {
  feedSlots[i] = null
  renderUploadGrid()
  updateActionButtons()
}

function setStatus(msg, cls) {
  const el = document.getElementById('exts')
  if (!el) return
  el.className = 'up-status' + (cls ? ' ' + cls : '')
  el.innerHTML = cls ? `<div class="status-dot"></div>${msg}` : msg
}

function updateCnt() {
  document.getElementById('pcnt').textContent = `${repository.length} / 12`
}

function updateActionButtons() {
  const hasRepo = repository.length > 0
  const go      = document.getElementById('go')
  const goAdv   = document.getElementById('go-advanced')
  const costEl  = document.getElementById('credit-cost')

  if (go)    go.disabled    = !hasRepo
  if (goAdv) goAdv.disabled = !hasRepo

  if (costEl && typeof updateCreditsUI === 'undefined') {
    costEl.textContent = 'temperatura · paleta · harmonia · 1 crédito'
  }
}

function clearAll() {
  repository = []
  feedSlots  = Array(planSize).fill(null)
  igPhotos   = []
  isManualMode = false
  renderRepo()
  renderUploadGrid()
  document.getElementById('fin').value = ''
  // Restore feed + mode panel visibility
  document.querySelectorAll('.upload-panel').forEach(el => el.style.display = '')
  const mp = document.getElementById('mode-panel')
  if (mp) mp.style.display = ''
  document.getElementById('results').classList.remove('show')
  document.getElementById('results').innerHTML = ''
  currentPlan = []
  hideErr(); setStatus('', '')
}

async function handleIG(files) {
  igPhotos = []
  const g = document.getElementById('ig-grid')
  if (!g) return
  g.innerHTML = ''
  for (const f of Array.from(files).slice(0, 3)) {
    const url = await readFile(f)
    const img = await loadImg(url)
    igPhotos.push({ dataUrl: url, colors: extractColors(img, 5), kelvin: estimateKelvin(extractColors(img, 5)) })
    const c = document.createElement('div'); c.className = 'igmc'
    c.innerHTML = `<img src="${url}">`; g.appendChild(c)
  }
  while (g.children.length < 3) {
    const c = document.createElement('div'); c.className = 'igmc'
    c.innerHTML = '<div class="igmc-e">+</div>'; g.appendChild(c)
  }
}

// ══ ERRORS ═══════════════════════════════════════════
function showErr(msg) {
  document.getElementById('err-msg').textContent = msg
  document.getElementById('err').classList.add('show')
  document.getElementById('err').scrollIntoView({ behavior:'smooth', block:'nearest' })
}
function hideErr() { document.getElementById('err').classList.remove('show') }

// ══ COMPOSE ══════════════════════════════════════════
async function compose(mode = 'basic') {
  const repoPhotos = repository.filter(Boolean)
  if (repoPhotos.length < 1) return

  const isAdvanced = mode === 'advanced'
  const creditCost = isAdvanced ? 5 : 1

  hideErr()
  document.getElementById('results').classList.remove('show')
  document.getElementById('results').innerHTML = ''
  document.getElementById('loading').classList.add('show')
  document.getElementById('go').disabled = true
  document.getElementById('go-advanced').disabled = true
  step(1)

  try {
    const H  = HARMONIES.find(h => h.id === selH)
    const P  = PATTERNS.find(p => p.id === selP)
    const kw = document.getElementById('kw').value
    const kc = document.getElementById('kc').value

    const colorCtx = repoPhotos.map((p,i) =>
      `FOTO ${i+1}: kelvin~${p.kelvin}K temp=${p.kelvin<5000?'QUENTE':'FRIO'} cores=[${(p.colors||[]).map(c=>c.hex+'('+c.pct+'%)').join(' ')}]`
    ).join('\n')

    const igCtx = igPhotos.length > 0
      ? '\nULTIMAS 3 FOTOS DO GRID:\n' + igPhotos.map((p,i) =>
          `IG${i+1}: kelvin~${p.kelvin}K cores=[${(p.colors||[]).map(c=>c.hex+'('+c.pct+'%)').join(' ')}]`
        ).join('\n')
      : ''

    let visualCtx = ''

    // ── Advanced: Stage 1 — visual description of each photo ──
    if (isAdvanced) {
      step(2)
      document.getElementById('ldtxt').textContent = 'Lendo as fotos...'

      const descContent = []
      repoPhotos.forEach((p,i) => {
        descContent.push({ type:'image', source:{ type:'base64', media_type:'image/jpeg', data:p.compressed.split(',')[1] } })
        descContent.push({ type:'text', text:`[FOTO ${i+1}]` })
      })
      descContent.push({ type:'text', text: `Analise cada foto e retorne APENAS JSON sem markdown:
{"photos":[{"id":1,"subject":"pessoa|paisagem|detalhe|grupo|animal","framing":"close|medio|aberto","energy":"estatico|dinamico","luminosity":"claro|medio|escuro","dominant_element":"descrição curta em português"}]}`
      })

      const descRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':'Bearer ' + authToken },
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens: 800,
          messages:[{ role:'user', content: descContent }],
          _creditOverride: 0  // first stage costs 0, second costs 2 total
        })
      })

      if (descRes.ok) {
        const descData = await descRes.json()
        const rawDesc  = descData.content?.filter(b=>b.type==='text').map(b=>b.text).join('') || ''
        try {
          const cleaned = rawDesc.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim()
          const parsed  = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned)
          if (parsed.photos) {
            visualCtx = '\nANÁLISE VISUAL DAS FOTOS:\n' + parsed.photos.map(ph =>
              `FOTO ${ph.id}: sujeito=${ph.subject} plano=${ph.framing} energia=${ph.energy} luminosidade=${ph.luminosity} elemento="${ph.dominant_element}"`
            ).join('\n')
          }
        } catch {}
      }
    }

    step(isAdvanced ? 3 : 2)

    const content = []
    repoPhotos.forEach((p,i) => {
      content.push({ type:'image', source:{ type:'base64', media_type:'image/jpeg', data:p.compressed.split(',')[1] } })
      content.push({ type:'text', text:`[FOTO ${i+1}]` })
    })
    step(isAdvanced ? 4 : 3)
    content.push({ type:'text', text: buildPrompt(H,P,kw,kc,colorCtx+visualCtx,igCtx,planSize,repoPhotos.length,isAdvanced) })

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer ' + authToken },
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages:[{ role:'user', content }],
        _creditCost: creditCost
      })
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
    document.getElementById('go-advanced').disabled = false
  }
}

function step(n) {
  ['s1','s2','s3','s4'].forEach((id,i) => {
    document.getElementById(id).className = 'ld-s' + (i+1<n?' done':i+1===n?' now':'')
  })
  const m = ['','Extraindo cores reais...','Analisando composição...','Testando combinações...','Montando plano...']
  document.getElementById('ldtxt').textContent = m[n]
}

function buildPrompt(H,P,kw,kc,colorCtx,igCtx,size,totalPhotos,isAdvanced=false) {
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

REGRA DE DIVERSIDADE VISUAL:
1. Nunca coloque dois slots com pessoa como sujeito dominante lado a lado (horizontal ou vertical).
2. Prefira intercalar: PAISAGEM · PESSOA · PAISAGEM ou DETALHE · PESSOA · PAISAGEM.
3. Se houver múltiplas fotos de grupo/multidão, trate como "pessoa" para fins desta regra.
4. Fotos de detalhe (equipamento, textura, close de objeto) funcionam como separador entre qualquer par.
5. Para feeds paisagem-dominante: alterne escala (panorama amplo vs plano fechado).

RETORNE APENAS JSON SEM MARKDOWN:
{"plan":[{"slot":1,"photo":N,"grid_position":"top-right","temp":"cool","kelvin":"7500K","contrast_role":"frio","type":"TIPO","harmony_role":"papel na harmonia","reason":"max 70 chars","preset":"ajustes PS/LR max 60 chars"}],"overview":"1 frase","harmony_note":"1 frase com eixo usado"}

Slots: ${Array.from({length:size},(_,i)=>i+1).join(', ')}
Fotos: 1 a ${totalPhotos}
Kelvin: MENOR=quente/laranja MAIOR=frio/azul`
}

// ══ RENDER RESULTS ═══════════════════════════════════
// currentPlan is mutable — drag-and-drop updates it without re-calling API
let currentPlan = []
let currentHarmony = null
let isManualMode = false

function renderResults(data, H) {
  currentPlan    = data.plan || []
  currentHarmony = H

  // Apply AI plan to feedSlots — the feed IS the result
  currentPlan.forEach(s => {
    const slotIdx = s.slot - 1  // slot 1 → feedSlots[0]
    if (slotIdx >= 0 && slotIdx < planSize) {
      feedSlots[slotIdx] = s.photo - 1  // photo 1 → repository[0]
    }
  })
  renderUploadGrid()

  // Show detail panel below the feed
  const allColors = []
  currentPlan.forEach(s => {
    const p = repository[s.photo-1]
    if (p) (p.colors||[]).slice(0,2).forEach(c => { if (!allColors.includes(c.hex)) allColors.push(c.hex) })
  })
  const palHtml = allColors.slice(0,10).map(hex => `<div class="ppal-c" style="background:${hex}"></div>`).join('')

  const results = document.getElementById('results')
  results.innerHTML = `
    <div class="plan-post-summary">
      <div class="pp-pal" style="padding:10px 16px 6px">${palHtml}</div>
      <div class="pp-harmony" style="padding:0 16px 14px;font-size:12px;color:var(--text3)">${data.harmony_note||''}</div>
      <div style="padding:0 16px 14px;font-size:12px;color:var(--text2)">${data.overview||''}</div>
    </div>
    <div class="detail-panel">
      <div class="detail-hdr">Detalhe por post · clique em ℹ no grid para ver</div>
      <div id="detail-cards"></div>
    </div>`
  renderDetails()
  results.classList.add('show')
  document.querySelector('.main').scrollTo({ top: 0, behavior: 'smooth' })
}

// ── Manual mode ───────────────────────────────────────
function activateManual() {
  isManualMode = true

  const filled = feedSlots.map((repoIdx, i) => {
    if (repoIdx === null || repoIdx === undefined) return null
    const p = repository[repoIdx]
    if (!p) return null
    return {
      slot: i + 1,
      photo: repoIdx + 1,
      temp: p.kelvin < 5000 ? 'warm' : 'cool',
      kelvin: p.kelvin + 'K',
      contrast_role: p.kelvin < 5000 ? 'quente' : 'frio',
      type: 'Manual',
      harmony_role: 'Organização manual',
      reason: 'Ordem definida manualmente',
    }
  }).filter(Boolean)

  if (!filled.length) {
    showErr('Preencha ao menos um slot do feed antes de organizar manualmente.')
    return
  }

  currentPlan    = filled
  currentHarmony = { name: 'Manual' }

  // Manual mode: just re-render the feed (already filled from feedSlots)
  renderUploadGrid()

  const results = document.getElementById('results')
  results.innerHTML = `
    <div class="plan-post-summary">
      <div style="padding:12px 16px;font-size:13px;color:var(--text2)">
        ☰ Modo manual ativo · arraste as fotos no feed para reordenar
      </div>
    </div>
    <div class="detail-panel">
      <div class="detail-hdr">Detalhe por post</div>
      <div id="detail-cards"></div>
    </div>`
  renderDetails()
  results.classList.add('show')
}

function renderGrid() {
  // Legacy: result grid removed — feed IS the grid. No-op.
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
    const p  = repository[s.photo - 1]
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
    const p  = repository[s.photo-1]; if (!p) return ''
    const iW = s.temp === 'warm'
    const palDots = (p.colors||[]).slice(0,5).map(c => `<div class="pr-pc" style="background:${c.hex}"></div>`).join('')
    const cBadge  = s.contrast_role
      ? `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:100px;background:#f3f4f6;color:#374151;">${axis?.icon||''} ${s.contrast_role}</span>`
      : ''
    const gridPos = getGridPosition(s.slot, currentPlan.length)
    const imgSrc = p.cropUrl || p.dataUrl
    return `<div class="post-row">
      <div class="pr-thumb"><img src="${imgSrc}"></div>
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

// ══ CROP MODAL ═══════════════════════════════════════
let cropRepoIdx  = null
let cropOffX     = 0
let cropOffY     = 0
let cropZoomVal  = 100
let cropDragging = false
let cropSX       = 0
let cropSY       = 0
let cropNatW     = 0
let cropNatH     = 0

function openCrop(repoIdx) {
  const photo = repository[repoIdx]
  if (!photo) return
  cropRepoIdx = repoIdx
  cropOffX = 0; cropOffY = 0; cropZoomVal = 100

  const frame = document.getElementById('crop-frame')
  const img   = document.getElementById('crop-img')
  if (!frame || !img) return

  // Open modal FIRST so frame has real dimensions, then load image
  document.getElementById('crop-modal').classList.add('open')

  img.src = ''
  requestAnimationFrame(() => {
    img.onload = () => {
      cropNatW = img.naturalWidth
      cropNatH = img.naturalHeight
      // Scale to fill the 4:5 frame
      const fW  = frame.clientWidth  || 280
      const fH  = frame.clientHeight || 350
      cropZoomVal = Math.min(300, Math.max(100, Math.round(Math.max(fW/cropNatW, fH/cropNatH) * 100)))
      document.getElementById('crop-zoom').value = cropZoomVal
      cropApply()
    }
    img.src = photo.dataUrl
  })

  // Drag to reposition
  frame.onmousedown  = e => { cropDragging=true; cropSX=e.clientX-cropOffX; cropSY=e.clientY-cropOffY; e.preventDefault() }
  frame.ontouchstart = e => { cropDragging=true; cropSX=e.touches[0].clientX-cropOffX; cropSY=e.touches[0].clientY-cropOffY }
  document.onmousemove  = e => { if(!cropDragging)return; cropOffX=e.clientX-cropSX; cropOffY=e.clientY-cropSY; cropApply() }
  document.ontouchmove  = e => { if(!cropDragging)return; cropOffX=e.touches[0].clientX-cropSX; cropOffY=e.touches[0].clientY-cropSY; cropApply() }
  document.onmouseup = document.ontouchend = () => { cropDragging=false }
  // Scroll to zoom
  frame.onwheel = e => { e.preventDefault(); const s=document.getElementById('crop-zoom'); s.value=Math.min(300,Math.max(100,parseFloat(s.value)-e.deltaY*0.3)); cropZoom(s.value) }

}

function cropZoom(val) { cropZoomVal=parseFloat(val); cropApply() }

function cropApply() {
  const img   = document.getElementById('crop-img')
  const frame = document.getElementById('crop-frame')
  if (!img || !frame || !cropNatW) return
  const s  = cropZoomVal/100
  const iW = cropNatW*s
  const iH = cropNatH*s
  img.style.width  = iW+'px'
  img.style.height = iH+'px'
  img.style.left   = (frame.clientWidth/2  - iW/2 + cropOffX)+'px'
  img.style.top    = (frame.clientHeight/2 - iH/2 + cropOffY)+'px'
}

function saveCrop() {
  if (cropRepoIdx === null) return
  const frame = document.getElementById('crop-frame')
  const img   = document.getElementById('crop-img')
  if (!frame || !img) return
  const fW = frame.clientWidth
  const fH = frame.clientHeight
  const cv = document.createElement('canvas')
  cv.width = fW*2; cv.height = fH*2
  const ctx = cv.getContext('2d')
  ctx.scale(2,2)
  const s  = cropZoomVal/100
  const src = new Image()
  src.onload = () => {
    ctx.drawImage(src, fW/2-cropNatW*s/2+cropOffX, fH/2-cropNatH*s/2+cropOffY, cropNatW*s, cropNatH*s)
    const cropUrl = cv.toDataURL('image/jpeg', 0.92)
    repository[cropRepoIdx].cropUrl = cropUrl
    compressImage(cropUrl, 800, 0.75).then(c => { repository[cropRepoIdx].compressed = c })
    renderRepo(); renderUploadGrid(); closeCrop()
  }
  src.src = img.src
}

function closeCrop() {
  document.getElementById('crop-modal')?.classList.remove('open')
  document.onmousemove = document.onmouseup = document.ontouchmove = document.ontouchend = null
  cropRepoIdx = null
}

// ══ PALETTE MODAL ════════════════════════════════════
function openPaletteModal(repoIdx) {
  const photo = repository[repoIdx]
  if (!photo || !photo.colors) return
  document.getElementById('palette-title').textContent = `Foto ${repoIdx+1} — paleta de cores`
  document.getElementById('palette-swatches').innerHTML = photo.colors.map((c,i) => `
    <div class="palette-swatch" id="sw-${repoIdx}-${i}" onclick="copySwatch('${c.hex}',${repoIdx},${i})">
      <div class="swatch-color" style="background:${c.hex}"></div>
      <div class="swatch-info">
        <div class="swatch-hex">${c.hex.toUpperCase()}</div>
        <div class="swatch-pct">${c.pct}% da imagem</div>
        <div class="swatch-copy">clique para copiar</div>
      </div>
    </div>`).join('')
  document.getElementById('palette-modal').classList.add('open')
}

function copySwatch(hex, ri, ci) {
  navigator.clipboard?.writeText(hex).then(() => {
    const el = document.getElementById(`sw-${ri}-${ci}`)
    if (el) {
      el.classList.add('copied')
      el.querySelector('.swatch-copy').textContent = '✓ copiado!'
      setTimeout(() => { el.classList.remove('copied'); el.querySelector('.swatch-copy').textContent = 'clique para copiar' }, 1500)
    }
  }).catch(()=>{})
}

function closePaletteModal() {
  document.getElementById('palette-modal')?.classList.remove('open')
}

// ── Photo detail modal ────────────────────────────────
function openPhotoModal(slotNum) {
  if (gridDragSlot !== null) return
  const s = currentPlan.find(x => x.slot === slotNum)
  if (!s) return
  const p = repository[s.photo - 1]
  if (!p) return
  openPhotoModalDirect(s, p, slotNum - 1)
}

// Renders palette swatches safely — no template literal onclick issues
function renderPaletteInModal(p, id) {
  const container = document.getElementById('pm-palette')
  if (!container) return
  container.innerHTML = ''
  ;(p.colors || []).slice(0, 5).forEach((c, ci) => {
    const sw = document.createElement('div')
    sw.className = 'pm-swatch'
    sw.id = `pm-sw-${id}-${ci}`
    sw.innerHTML = `
      <div class="pm-sw-color" style="background:${c.hex}"></div>
      <div class="pm-sw-lbl">${c.hex.toUpperCase()}</div>
      <div class="pm-sw-pct">${c.pct}%</div>`
    sw.onclick = () => {
      navigator.clipboard?.writeText(c.hex).then(() => {
        sw.classList.add('pm-sw-copied')
        sw.querySelector('.pm-sw-lbl').textContent = '✓ copiado'
        setTimeout(() => {
          sw.classList.remove('pm-sw-copied')
          sw.querySelector('.pm-sw-lbl').textContent = c.hex.toUpperCase()
        }, 1400)
      }).catch(() => {})
    }
    container.appendChild(sw)
  })
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
  // Find which feedSlot points to this photo and clear it
  const repoIdx = s.photo - 1
  for (let i = 0; i < feedSlots.length; i++) {
    if (feedSlots[i] === repoIdx) feedSlots[i] = null
  }
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
