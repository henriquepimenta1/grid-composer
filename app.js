// app.js — Init, sidebar rendering, utils, renderResults

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

function selHarmony(id) { selH=id; renderHarmonies(); if (currentPlan.length>0) reorderByHarmony(id) }
function selPattern(id)  { selP=id; renderPatterns();  if (currentPlan.length>0) reorderByAxis(selC) }
function selContrast(id) { selC=id; renderContrast();  if (currentPlan.length>0) reorderByAxis(id) }

// ── UI helpers ────────────────────────────────────────
function kUpdate() {
  const w=document.getElementById('kw').value, c=document.getElementById('kc').value
  document.getElementById('kwv').textContent=w+'K'
  document.getElementById('kcv').textContent=c+'K'
  document.getElementById('kdiff').textContent=(c-w)+'K'
}

function setPlan(n, btn) {
  planSize=n
  document.querySelectorAll('.feed-tab').forEach(t=>t.classList.remove('active'))
  btn.classList.add('active')
  while (feedSlots.length<n) feedSlots.push(null)
  feedSlots.length=n
  renderUploadGrid(); updateActionButtons()
}
function setPlanM(n, btn) { setPlan(n,btn) }

function setIG(mode) {
  igMode=mode
  document.getElementById('ig-skip').className='ig-opt'+(mode==='skip'?' on':'')
  document.getElementById('ig-up-opt').className='ig-opt'+(mode==='upload'?' on':'')
  document.getElementById('ig-up-area').style.display=mode==='upload'?'block':'none'
  document.getElementById('ig-note').style.display=mode==='skip'?'block':'none'
}

function setStatus(msg, cls) {
  const el=document.getElementById('exts'); if (!el) return
  el.className='up-status'+(cls?' '+cls:'')
  el.innerHTML=cls?`<div class="status-dot"></div>${msg}`:msg
}

function showErr(msg) {
  document.getElementById('err-msg').textContent=msg
  document.getElementById('err').classList.add('show')
  document.getElementById('err').scrollIntoView({behavior:'smooth',block:'nearest'})
}
function hideErr() { document.getElementById('err').classList.remove('show') }

function updateActionButtons() {
  const hasRepo = repository.length > 0
  const hasFeed = feedSlots.some(s => s!==null && s!==undefined)
  const go=document.getElementById('go'), goAdv=document.getElementById('go-advanced')
  const costEl=document.getElementById('credit-cost'), expBtn=document.getElementById('export-btn')
  if (go)    go.disabled    = !hasRepo
  if (goAdv) goAdv.disabled = !hasRepo
  if (expBtn) expBtn.style.display = hasFeed ? 'block' : 'none'
  if (costEl && typeof updateCreditsUI === 'undefined') {
    costEl.textContent = 'temperatura · paleta · harmonia · 1 crédito'
  }
}

function clearAll() {
  repository=[]; feedSlots=Array(planSize).fill(null); igPhotos=[]; isManualMode=false
  renderRepo(); renderUploadGrid()
  document.getElementById('fin').value=''
  document.getElementById('results').classList.remove('show')
  document.getElementById('results').innerHTML=''
  currentPlan=[]; originalPlan=[]
  const expBtn=document.getElementById('export-btn')
  if (expBtn) expBtn.style.display='none'
  hideErr(); setStatus('','')
}

function getGridPosition(slotNum, total) {
  const rows=Math.ceil(total/3), row=Math.floor((slotNum-1)/3), colFromRight=(slotNum-1)%3
  const colLabels=['direita','centro','esquerda']
  const rowLabel=row===0?'topo':row===rows-1?'base':`linha ${row+1}`
  return `${rowLabel} ${colLabels[colFromRight]}`
}

// ── Render Results ────────────────────────────────────
function renderResults(data, H) {
  originalPlan = JSON.parse(JSON.stringify(data.plan || []))
  currentPlan  = JSON.parse(JSON.stringify(originalPlan))
  currentHarmony = H
  currentPlan.forEach(s => {
    const slotIdx=s.slot-1
    if (slotIdx>=0 && slotIdx<planSize) feedSlots[slotIdx]=s.photo-1
  })
  renderUploadGrid()
  const allColors=[]
  currentPlan.forEach(s => {
    const p=repository[s.photo-1]
    if (p) (p.colors||[]).slice(0,2).forEach(c=>{ if (!allColors.includes(c.hex)) allColors.push(c.hex) })
  })
  const palHtml=allColors.slice(0,10).map(hex=>`<div class="ppal-c" style="background:${hex}"></div>`).join('')
  const results=document.getElementById('results')
  results.innerHTML=`
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
  document.querySelector('.main').scrollTo({top:0,behavior:'smooth'})
  saveAnalysisToHistory(data, H)
}

function renderDetails() {
  const axis=CONTRAST_AXES.find(a=>a.id===selC)
  const container=document.getElementById('detail-cards'); if (!container) return
  const sorted=[...currentPlan].sort((a,b)=>a.slot-b.slot)
  container.innerHTML=sorted.map(s => {
    const p=repository[s.photo-1]; if (!p) return ''
    const iW=s.temp==='warm'
    const palDots=(p.colors||[]).slice(0,5).map(c=>`<div class="pr-pc" style="background:${c.hex}"></div>`).join('')
    const cBadge=s.contrast_role?`<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:100px;background:#f3f4f6;color:#374151;">${axis?.icon||''} ${s.contrast_role}</span>`:''
    const gridPos=getGridPosition(s.slot,currentPlan.length)
    return `<div class="post-row">
      <div class="pr-thumb"><img src="${p.cropUrl||p.dataUrl}"></div>
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

// Legacy no-op
function renderGrid() {}
function activateManual() {}
async function handleSlotReplace(files) { await handleSlotFile(files) }
