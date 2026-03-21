// playground.js — Playground modal logic (extracted from index.html)

const PG = {
  selH: 'complementary', selP: 'checkerboard', selA: 'temperature',
  size: 9, editIdx: null,
  palette: ['#C4853A','#3A5870','#8A9A4A','#2A4A60','#D05020','#6A8A9A','#1A3850','#B07030']
}
const PG_HARMONIES = HARMONIES.filter(h => h.id !== 'custom')
const PG_PATTERNS  = PATTERNS.filter(p => p.id !== 'free')
const PG_AXES      = CONTRAST_AXES.filter(a => a.id !== 'combined')

function pgRgb(h) { h = h.replace('#',''); const n = parseInt(h,16); return [n>>16&255, n>>8&255, n&255] }
function pgHue(hex) {
  const [r,g,b] = pgRgb(hex).map(v => v/255)
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx - mn
  if (!d) return 0
  let h
  if (mx === r) h = ((g-b)/d + (g<b?6:0)) * 60
  else if (mx === g) h = ((b-r)/d + 2) * 60
  else h = ((r-g)/d + 4) * 60
  return h
}
function pgLum(hex) {
  const [r,g,b] = pgRgb(hex).map(v => v/255)
  const t = v => v > .04045 ? Math.pow((v+.055)/1.055, 2.4) : v/12.92
  return .2126*t(r) + .7152*t(g) + .0722*t(b)
}
function pgSat(hex) {
  const [r,g,b] = pgRgb(hex).map(v => v/255)
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b)
  return mx === 0 ? 0 : (mx - mn) / mx
}
function pgWarm(hex) { const h = pgHue(hex); return h < 60 || h > 300 }
function pgAccent(hex) { const h = pgHue(hex), s = pgSat(hex); return s > 0.45 && (h <= 45 || h >= 330) }
function pgKelvin(hex) {
  const [r,,b] = pgRgb(hex)
  const bs = r*.5 - b*.5
  if (bs > 40) return 2200; if (bs > 20) return 3500; if (bs > 5) return 4500
  if (bs > -5) return 5500; if (bs > -20) return 7000; if (bs > -40) return 8500
  return 10000
}
function pgTempWord(hex) {
  if (pgAccent(hex)) return 'acento'
  const k = pgKelvin(hex)
  return k <= 4500 ? 'quente' : k <= 6000 ? 'neutro' : 'frio'
}
function pgHarmScore(hex, hId) {
  const h = pgHue(hex), L = pgLum(hex)*100, a = pgAccent(hex), w = pgWarm(hex), k = pgKelvin(hex)
  switch (hId) {
    case 'complementary': return { score: a ? 100-k/100 : k/100, group: (a||w) ? 'A' : 'B' }
    case 'analogous':     return { score: h, group: h < 180 ? 'A' : 'B' }
    case 'split': case 'triad': return { score: h, group: Math.floor(h/120)%2===0 ? 'A' : 'B' }
    case 'monochrome':    return { score: L, group: L > 55 ? 'A' : 'B' }
    case 'shades':        return { score: L, group: L < 35 ? 'A' : 'B' }
    default: { const a2 = pgAccent(hex), k2 = pgKelvin(hex); return { score: a2 ? 1000+(10000-k2) : k2, group: (a2||k2<5000) ? 'A' : 'B' } }
  }
}
function pgBuildMap(rows, nA, total, pat) {
  const map = [], ratio = nA / total
  if (pat === 'checkerboard') {
    let rem = nA, rp = []
    for (let r = 0; r < rows; r++) { if (rem >= 2 && r%2 === 0) { rp.push(2); rem -= 2 } else if (rem === 1) { rp.push(1); rem-- } else rp.push(0) }
    for (let r = 0; r < rows && rem > 0; r++) if (rp[r] === 0) { if (rem >= 2) { rp[r] = 2; rem -= 2 } else { rp[r] = 1; rem-- } }
    for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) { if (rp[r] === 2) map.push(c===1?'B':'A'); else if (rp[r]===1) map.push(c===1?'A':'B'); else map.push('B') }
  } else if (pat === 'columns') {
    const ac = ratio < 0.4 ? [1] : ratio < 0.7 ? [0,2] : [0,1,2]
    for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) map.push(ac.includes(c) ? 'A' : 'B')
  } else if (pat === 'rows') {
    const ar = ratio < 0.4 ? 1 : ratio < 0.7 ? Math.ceil(rows*.5) : rows
    for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) map.push(r < ar ? 'A' : 'B')
  } else if (pat === 'diagonal') {
    for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) map.push((r+c)%2===0 ? 'A' : 'B')
  }
  return map
}
function pgComputeGrid() {
  const cols = []; for (let i = 0; i < PG.size; i++) cols.push(PG.palette[i % PG.palette.length])
  const scored = cols.map(c => ({ c, ...pgHarmScore(c, PG.selH) }))
  const gA = scored.filter(x => x.group==='A').sort((a,b) => b.score-a.score)
  const gB = scored.filter(x => x.group==='B').sort((a,b) => b.score-a.score)
  const rows = Math.ceil(PG.size/3), result = new Array(PG.size).fill('#ccc')
  const map = pgBuildMap(rows, gA.length, PG.size, PG.selP); let aiA = 0, aiB = 0
  for (let vi = 0; vi < PG.size; vi++) {
    const row = Math.floor(vi/3), col = vi%3, slot = row*3+(2-col), want = map[vi]||'B'; let ph
    if (want==='A' && gA[aiA]) ph = gA[aiA++]; else if (want==='B' && gB[aiB]) ph = gB[aiB++]
    else if (gA[aiA]) ph = gA[aiA++]; else if (gB[aiB]) ph = gB[aiB++]
    if (ph && slot < PG.size) result[slot] = ph.c
  }
  return result
}

function pgRender() {
  document.getElementById('pg-post-tabs').innerHTML = [3,6,9].map(n =>
    `<button class="pg-ptab ${n===PG.size?'on':''}" onclick="pgSize(${n})">${n}</button>`).join('')
  const cols = pgComputeGrid(), rows = Math.ceil(PG.size/3)
  const grid = document.getElementById('pg-grid')
  grid.style.gridTemplateRows = `repeat(${rows},1fr)`
  grid.innerHTML = cols.map(c => `<div class="pg-igrid-cell" style="background:${c}"></div>`).join('')
  document.getElementById('pg-grid-label').textContent =
    `${PG_HARMONIES.find(h=>h.id===PG.selH)?.name} · ${PG_PATTERNS.find(p=>p.id===PG.selP)?.name} · ${PG_AXES.find(a=>a.id===PG.selA)?.name}`
  document.getElementById('pg-harm-list').innerHTML = PG_HARMONIES.map(h =>
    `<div class="pg-chip ${h.id===PG.selH?'on':''}" onclick="pgSel('H','${h.id}')">
      <div style="width:9px;height:9px;border-radius:50%;background:${h.dot};flex-shrink:0"></div>${h.name}
    </div>`).join('')
  document.getElementById('pg-pat-list').innerHTML = PG_PATTERNS.map(p =>
    `<div class="pg-chip ${p.id===PG.selP?'on':''}" onclick="pgSel('P','${p.id}')">${p.name}</div>`).join('')
  document.getElementById('pg-axis-list').innerHTML = PG_AXES.map(a =>
    `<div class="pg-chip ${a.id===PG.selA?'on':''}" onclick="pgSel('A','${a.id}')">
      <span style="font-size:11px">${a.icon}</span>${a.name}
    </div>`).join('')
  document.getElementById('pg-swatches').innerHTML =
    PG.palette.map((c,i) => `
      <div class="pg-sw" style="background:${c}">
        <input type="color" value="${c}" onchange="pgEditDirect(${i},this.value)">
        <div class="pg-del" onclick="event.stopPropagation();pgRemove(${i})">✕</div>
      </div>`).join('') +
    `<div class="pg-sw-add" onclick="pgShowAdd()">+</div>`
  const acc  = PG.palette.filter(pgAccent).length
  const warm = PG.palette.filter(c => !pgAccent(c) && pgWarm(c)).length
  const cool = PG.palette.filter(c => !pgWarm(c)).length
  const neut = PG.palette.length - acc - warm - cool
  document.getElementById('pg-analysis').innerHTML =
    PG.palette.map((c,i) => {
      const tw = pgTempWord(c)
      const bg = tw==='acento'?'#fff3e0':tw==='quente'?'#fff8ec':tw==='neutro'?'#f3f4f6':'#e3f2fd'
      const fg = tw==='acento'?'#e65100':tw==='quente'?'#b06000':tw==='neutro'?'#4b5563':'#1565c0'
      return `<div class="pg-anal-row">
        <div class="pg-anal-dot" style="background:${c}" onclick="pgEditSwatch(${i})"></div>
        <span class="pg-anal-hex">${c.toUpperCase()}</span>
        <span class="pg-anal-badge" style="background:${bg};color:${fg}">${tw}</span>
        <span class="pg-anal-x" onclick="pgRemove(${i})">✕</span>
      </div>`
    }).join('') +
    `<div class="pg-anal-sum">Acentos <b>${acc}</b> · Quentes <b>${warm}</b> · Neutros <b>${neut}</b> · Frios <b>${cool}</b></div>`
}

function pgSel(t, id) { if (t==='H') PG.selH=id; else if (t==='P') PG.selP=id; else PG.selA=id; pgRender() }
function pgSize(n) { PG.size = n; pgRender() }
function pgRemove(i) { if (PG.palette.length > 2) { PG.palette.splice(i,1); pgRender() } }
function pgEditDirect(i, v) { PG.palette[i] = v; pgRender() }
function pgShowAdd() {
  PG.editIdx = null; pgSetPanel('#C4853A', 'Nova cor')
  document.getElementById('pg-add-panel').style.display = 'flex'
}
function pgEditSwatch(i) {
  PG.editIdx = i; pgSetPanel(PG.palette[i], 'Editar cor')
  document.getElementById('pg-add-panel').style.display = 'flex'
}
function pgSetPanel(c, title) {
  document.getElementById('pg-preview-dot').style.background = c
  document.getElementById('pg-cpick').value = c
  document.getElementById('pg-hex').value = c
  document.getElementById('pg-add-title').textContent = title
}
function pgCancelAdd() { document.getElementById('pg-add-panel').style.display = 'none'; PG.editIdx = null }
function pgOnPick(v) { document.getElementById('pg-preview-dot').style.background = v; document.getElementById('pg-hex').value = v }
function pgOnHex(v) { if (/^#[0-9a-fA-F]{6}$/.test(v)) { document.getElementById('pg-preview-dot').style.background = v; document.getElementById('pg-cpick').value = v } }
function pgConfirm() {
  const v = document.getElementById('pg-hex').value
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return
  if (PG.editIdx != null) PG.palette[PG.editIdx] = v
  else if (PG.palette.length < 12) PG.palette.push(v)
  pgCancelAdd(); pgRender()
}

function openPlayground() {
  PG.selH = selH; PG.selP = selP; PG.selA = selC; PG.size = planSize; PG.editIdx = null
  document.getElementById('pg-add-panel').style.display = 'none'
  pgRender()
  document.getElementById('playground-modal').classList.add('open')
}
function closePlayground() {
  document.getElementById('playground-modal')?.classList.remove('open')
}
function applyPlayground() {
  selH = PG.selH; selP = PG.selP; selC = PG.selA
  renderHarmonies(); renderPatterns(); renderContrast()
  if (currentPlan.length > 0) reorderByHarmony(selH)
  closePlayground()
  setStatus('✓ Configurações do playground aplicadas', 'ok')
}
