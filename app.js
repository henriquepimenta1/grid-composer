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
  document.getElementById('hm-list').innerHTML = HARMONIES.map(h => {
    const isHL = h.highlight && h.id !== selH
    return `<div class="hchip ${h.id===selH?'on':''} ${h.highlight?'hchip-hl':''}" onclick="selHarmony('${h.id}')">
      <div class="hchip-dot" style="background:${h.dot}"></div>
      <span class="hchip-name">${h.name}</span>
      <button class="hchip-help" onclick="event.stopPropagation();showHarmonyInfo('${h.id}')" title="Saiba mais">?</button>
    </div>`
  }).join('')
}

function renderPatterns() {
  document.getElementById('pat-list').innerHTML = PATTERNS.map(p => {
    const cells = p.cells.map(v => `<div class="pm ${v===true?'w':''}"></div>`).join('')
    return `<div class="pchip ${p.id===selP?'on':''} ${p.highlight?'hchip-hl':''}" onclick="selPattern('${p.id}')">
      <div class="pg-mini">${cells}</div>
      <span style="flex:1">${p.name}</span>
      <button class="hchip-help" onclick="event.stopPropagation();showPatternInfo('${p.id}')" title="Saiba mais">?</button>
    </div>`
  }).join('')
}

function renderContrast() {
  document.getElementById('contrast-list').innerHTML = CONTRAST_AXES.map(a =>
    `<div class="cchip ${a.id===selC?'on':''} ${a.highlight?'hchip-hl':''}" onclick="selContrast('${a.id}')">
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

// FIX 2.3: Validação repo vs planSize + feedback visual
function updateActionButtons() {
  const repoCount = repository.length
  const hasEnough = repoCount >= planSize
  const hasFeed   = feedSlots.some(s => s!==null && s!==undefined)

  const go    = document.getElementById('go')
  const goAdv = document.getElementById('go-advanced')
  const costEl = document.getElementById('credit-cost')
  const expBtn = document.getElementById('export-btn')

  // Botões de compor: só habilitam se há fotos suficientes para o grid
  if (go)    go.disabled    = !hasEnough
  if (goAdv) goAdv.disabled = !hasEnough

  if (expBtn) expBtn.style.display = (hasFeed || currentPlan.length > 0) ? 'block' : 'none'

  // Feedback: mostrar quantas fotos faltam
  if (costEl) {
    if (!hasEnough && repoCount > 0) {
      const missing = planSize - repoCount
      costEl.textContent = `faltam ${missing} foto${missing > 1 ? 's' : ''} para grid de ${planSize}`
      costEl.style.color = 'var(--red)'
    } else if (!hasEnough) {
      costEl.textContent = `adicione ${planSize} foto${planSize > 1 ? 's' : ''} para compor`
      costEl.style.color = 'var(--text3)'
    } else if (typeof updateCreditsUI === 'undefined') {
      costEl.textContent = 'temperatura · paleta · harmonia · 1 crédito'
      costEl.style.color = ''
    } else {
      // Se updateCreditsUI existe, ela cuida do texto — só resetar a cor
      costEl.style.color = ''
    }
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
  updateActionButtons()
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

  // Build palette from all colors in plan
  const allColors=[]
  currentPlan.forEach(s => {
    const p=repository[s.photo-1]
    if (p) (p.colors||[]).slice(0,2).forEach(c=>{ if (!allColors.includes(c.hex)) allColors.push(c.hex) })
  })
  const palHtml=allColors.slice(0,12).map(hex=>`<div class="ppal-c" style="background:${hex}"></div>`).join('')

  // Temperature distribution badge
  const warm = currentPlan.filter(s=>s.temp==='warm').length
  const cool = currentPlan.filter(s=>s.temp==='cool').length
  const total = currentPlan.length
  const tempBar = total > 0 ? `
    <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
      <div style="flex:1;height:6px;border-radius:3px;background:var(--border-light);overflow:hidden">
        <div style="height:100%;width:${Math.round(warm/total*100)}%;background:linear-gradient(90deg,#e8920a,#f59e0b);border-radius:3px"></div>
      </div>
      <span style="font-size:10px;color:var(--warm);font-weight:600;white-space:nowrap">🟠 ${warm} quente${warm!==1?'s':''}</span>
      <span style="font-size:10px;color:var(--cool);font-weight:600;white-space:nowrap">🔵 ${cool} fri${cool!==1?'as':'a'}</span>
    </div>` : ''

  const H_name = H?.name || ''
  const axis = CONTRAST_AXES.find(a=>a.id===selC)

  const results=document.getElementById('results')
  results.innerHTML=`
    <div class="plan-post-summary">
      <div style="padding:14px 16px 10px;border-bottom:1px solid var(--border-light)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="font-size:13px;font-weight:700">Análise da composição</div>
          <div style="display:flex;gap:6px">
            <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px;background:var(--bg);border:1px solid var(--border);color:var(--text2)">${H_name}</span>
            ${axis ? `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px;background:var(--bg);border:1px solid var(--border);color:var(--text2)">${axis.icon} ${axis.name}</span>` : ''}
          </div>
        </div>
        <div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:8px">${data.overview||''}</div>
        <div style="font-size:12px;color:var(--text3);line-height:1.5;font-style:italic">${data.harmony_note||''}</div>
        ${tempBar}
      </div>
      <div style="padding:10px 16px 10px">
        <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Paleta do feed</div>
        <div class="pp-pal" style="margin:0">${palHtml}</div>
      </div>
    </div>
    <div class="detail-panel">
      <div class="detail-hdr">Detalhe por post · clique em ℹ no grid para ver</div>
      <div id="detail-cards"></div>
    </div>`
  renderDetails()
  results.classList.add('show')
  document.querySelector('.main').scrollTo({top:0,behavior:'smooth'})

  // Show export button
  const expBtn = document.getElementById('export-btn')
  if (expBtn) expBtn.style.display = 'block'

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
