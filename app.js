// app.js — Init, sidebar rendering, utils, renderResults

// ══ INIT ═════════════════════════════════════════════
function init() {
  renderHarmonies()
  renderPatterns()
  renderContrast()
  setupDrop()
  kUpdate()
  applyTranslations()
  renderFeedTabs()
  renderUploadGrid()
  updateActionButtons()
  // Mobile: abre sidebar por padrão
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar')
    const btn = document.getElementById('sb-toggle-btn')
    if (sidebar) sidebar.classList.add('sb-open')
    if (btn) btn.setAttribute('aria-expanded', 'true')
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar')
  const btn = document.getElementById('sb-toggle-btn')
  if (!sidebar) return
  const isOpen = sidebar.classList.toggle('sb-open')
  if (btn) {
    btn.setAttribute('aria-expanded', isOpen)
    const chevron = btn.querySelector('.sb-chevron')
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)'
  }
}

function renderHarmonies() {
  document.getElementById('hm-list').innerHTML = HARMONIES.map(h => {
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

// ── Feed tabs — plan-gated ────────────────────────────
function renderFeedTabs() {
  const limits = planLimits()
  const tabsContainer = document.getElementById('feed-tabs-main')
  if (!tabsContainer) return

  const sizes = [3, 6, 9, 12, 15, 18]
  tabsContainer.innerHTML = sizes.map(n => {
    const locked = n > limits.maxGrid
    const active = n === planSize && !locked
    if (locked) {
      return `<button class="feed-tab feed-tab-locked" title="Disponível no ${n <= 9 ? 'Pro' : 'Studio'}" onclick="showPlanGate(${n})">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </button>`
    }
    return `<button class="feed-tab ${active?'active':''}" onclick="setPlan(${n},this)">${n}</button>`
  }).join('')
}

function showPlanGate(size) {
  const planName = size <= 9 ? 'Pro' : 'Studio'
  showErr(`Grid de ${size} posts disponível no ${planName}. Faça upgrade para desbloquear.`)
}

// ── UI helpers ────────────────────────────────────────
function kUpdate() {
  const w=document.getElementById('kw').value, c=document.getElementById('kc').value
  document.getElementById('kwv').textContent=w+'K'
  document.getElementById('kcv').textContent=c+'K'
  document.getElementById('kdiff').textContent=(c-w)+'K'
}

function setPlan(n, btn) {
  const limits = planLimits()
  if (n > limits.maxGrid) {
    showPlanGate(n)
    return
  }
  planSize = n
  feedSlots = Array(planSize).fill(null)
  renderFeedTabs()
  renderUploadGrid(); updateActionButtons()
}
function setPlanM(n, btn) {
  const limits = planLimits()
  if (n > limits.maxGrid) {
    showPlanGate(n)
    return
  }
  planSize = n
  feedSlots = Array(planSize).fill(null)
  document.querySelectorAll('.plan-tabs-mobile .plan-tab').forEach(t => t.classList.remove('active'))
  if (btn) btn.classList.add('active')
  renderFeedTabs()
  renderUploadGrid(); updateActionButtons()
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
  const limits   = planLimits()
  const repoCount = repository.length
  const hasEnough = repoCount >= planSize
  const hasFeed   = feedSlots.some(s => s!==null && s!==undefined)

  const go    = document.getElementById('go')
  const goAdv = document.getElementById('go-advanced')
  const costEl = document.getElementById('credit-cost')
  const expBtn = document.getElementById('export-btn')

  // Basic: needs enough photos
  if (go) go.disabled = !hasEnough

  // Advanced: blocked for Free entirely, otherwise needs enough photos
  if (goAdv) {
    if (limits.advancedCost === null) {
      goAdv.disabled = true
      goAdv.title = 'Disponível no Pro e Studio'
      const advSub = goAdv.querySelector('.mode-btn-sub')
      if (advSub) advSub.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline;vertical-align:middle;margin-right:3px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Disponível no Pro e Studio'
    } else {
      goAdv.disabled = !hasEnough
      goAdv.title = ''
      const advSub = goAdv.querySelector('.mode-btn-sub')
      if (advSub) advSub.textContent = `leitura visual completa · ${limits.advancedCost} créditos`
    }
  }

  if (expBtn) expBtn.style.display = (hasFeed || currentPlan.length > 0) ? 'block' : 'none'

  // Credit cost label with plan-aware messaging
  if (costEl) {
    if (!hasEnough && repoCount > 0) {
      const missing = planSize - repoCount
      costEl.textContent = `faltam ${missing} foto${missing > 1 ? 's' : ''} para grid de ${planSize}`
      costEl.style.color = 'var(--red)'
    } else if (!hasEnough) {
      costEl.textContent = `adicione ${planSize} foto${planSize > 1 ? 's' : ''} para compor`
      costEl.style.color = 'var(--text3)'
    } else if (limits.basicCost === 0) {
      // Paid plan: unlimited basic
      costEl.textContent = 'temperatura · paleta · harmonia · ilimitado ✦'
      costEl.style.color = ''
    } else {
      costEl.textContent = `temperatura · paleta · harmonia · ${limits.basicCost} crédito`
      costEl.style.color = ''
    }
  }

  // Cooldown indicator for Free
  renderCooldownIndicator()
}

// ── Cooldown display for Free ─────────────────────────
let cooldownInterval = null

function renderCooldownIndicator() {
  const limits = planLimits()
  const el = document.getElementById('cooldown-indicator')
  if (!el) return

  if (limits.cooldownMs === 0 || !lastComposeTime) {
    el.style.display = 'none'
    if (cooldownInterval) { clearInterval(cooldownInterval); cooldownInterval = null }
    return
  }

  const elapsed = Date.now() - lastComposeTime
  const remaining = limits.cooldownMs - elapsed

  if (remaining <= 0) {
    el.style.display = 'none'
    if (cooldownInterval) { clearInterval(cooldownInterval); cooldownInterval = null }
    return
  }

  el.style.display = 'flex'
  updateCooldownText(el, remaining)

  if (!cooldownInterval) {
    cooldownInterval = setInterval(() => {
      const rem = limits.cooldownMs - (Date.now() - lastComposeTime)
      if (rem <= 0) {
        el.style.display = 'none'
        clearInterval(cooldownInterval)
        cooldownInterval = null
        // Re-enable compose button
        const go = document.getElementById('go')
        if (go && repository.length >= planSize) go.disabled = false
      } else {
        updateCooldownText(el, rem)
      }
    }, 1000)
  }
}

function updateCooldownText(el, remainMs) {
  const mins = Math.floor(remainMs / 60000)
  const secs = Math.floor((remainMs % 60000) / 1000)
  el.innerHTML = `<span style="font-size:12px">⏱</span> Próxima composição em <strong>${mins}m${secs.toString().padStart(2,'0')}s</strong> · <a href="/comprar" style="color:var(--blue);text-decoration:none;font-weight:600">Pro sem cooldown →</a>`
}

function clearAll() {
  repository=[]; feedSlots=Array(planSize).fill(null); existingPhotos=[]; isManualMode=false
  renderRepo(); renderUploadGrid()
  document.getElementById('fin').value=''
  document.getElementById('results').classList.remove('show')
  document.getElementById('results').innerHTML=''
  currentPlan=[]; originalPlan=[]
  const expBtn=document.getElementById('export-btn')
  if (expBtn) expBtn.style.display='none'
  hideErr(); setStatus('','')
  const mentorPanel = document.getElementById('mentor-panel')
  if (mentorPanel) mentorPanel.style.display = 'none'
  const diagPanel = document.getElementById('diagnosis-panel')
  if (diagPanel) diagPanel.style.display = 'none'
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

  const allColors=[]
  currentPlan.forEach(s => {
    const p=repository[s.photo-1]
    if (p) (p.colors||[]).slice(0,2).forEach(c=>{ if (!allColors.includes(c.hex)) allColors.push(c.hex) })
  })
  const palHtml=allColors.slice(0,12).map(hex=>`<div class="ppal-c" style="background:${hex}"></div>`).join('')

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
  // Desktop: scroll results panel to top; Mobile: scroll window to results
  if (window.innerWidth >= 1024) {
    const rightPanel = document.getElementById('main-right')
    if (rightPanel) rightPanel.scrollTo({top:0,behavior:'smooth'})
  } else {
    const rightPanel = document.getElementById('main-right')
    if (rightPanel) rightPanel.scrollIntoView({behavior:'smooth',block:'start'})
  }

  const expBtn = document.getElementById('export-btn')
  if (expBtn) expBtn.style.display = 'block'

  // Track compose time for cooldown
  lastComposeTime = Date.now()
  renderCooldownIndicator()

  saveAnalysisToHistory(data, H)
  renderMentor()
  renderDiagnosis(data.diagnosis || null)
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
    const scoreBadge = (p.photoScore != null && planLimits().hasScore)
      ? `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px;background:${p.photoScore>=70?'#d5f5e3':p.photoScore>=40?'#fef3c7':'#fce4ec'};color:${p.photoScore>=70?'#166534':p.photoScore>=40?'#92400e':'#991b1b'}" title="${(p.scoreIssues||[]).join(', ')}">${p.photoScore} pts</span>`
      : ''
    return `<div class="post-row">
      <div class="pr-thumb"><img src="${p.cropUrl||p.dataUrl}"></div>
      <div class="pr-body">
        <div class="pr-top">
          <span class="pr-slot">+${s.slot}</span>
          <span class="pr-type">${s.type}</span>
          ${cBadge}
          <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:100px;background:#f3f4f6;color:#6b7280;">📍 ${gridPos}</span>
          ${scoreBadge}
          <span class="pr-temp ${iW?'pr-tw':'pr-tc'}">${iW?'Quente':'Frio'}</span>
        </div>
        <div class="pr-reason">${s.reason}</div>
        ${(p.scoreIssues?.length && p.scoreIssues[0] !== 'nenhum problema' && planLimits().hasScore) ? `<div style="font-size:10px;color:#92400e;background:#fef3c7;padding:3px 8px;border-radius:4px;margin-bottom:4px">⚠ ${p.scoreIssues.join(' · ')}</div>` : ''}
        <div class="pr-preset">⚙ ${s.preset}</div>
        <div class="pr-pal">${palDots}</div>
      </div>
    </div>`
  }).join('')
}

// ── Mentor Visual (Studio only, 100% local) ───────────
function renderMentor() {
  const panel = document.getElementById('mentor-panel')
  if (!panel) return
  const limits = planLimits()

  // Gate: only Studio
  if (!limits.hasMentor) {
    if (currentPlan.length > 0) {
      panel.style.display = 'block'
      panel.innerHTML = `
        <div class="mentor-header">
          <span class="mentor-icon">🧠</span>
          <span class="mentor-title">Mentor visual</span>
          <span class="mentor-badge-lock">Studio</span>
        </div>
        <div class="mentor-locked">
          Sugestões inteligentes baseadas no seu grid. Disponível no plano Studio.
          <a href="/comprar" style="color:var(--blue);font-weight:600;text-decoration:none;margin-left:4px">Ver planos →</a>
        </div>`
    } else {
      panel.style.display = 'none'
    }
    return
  }

  if (!currentPlan.length) { panel.style.display = 'none'; return }

  const tips = analyzeFeed()
  if (!tips.length) { panel.style.display = 'none'; return }

  panel.style.display = 'block'
  panel.innerHTML = `
    <div class="mentor-header">
      <span class="mentor-icon">🧠</span>
      <span class="mentor-title">Mentor visual</span>
      <span class="mentor-badge">${tips.length} sugestão${tips.length > 1 ? 'ões' : ''}</span>
    </div>
    <div class="mentor-tips">
      ${tips.map(t => `
        <div class="mentor-tip">
          <span class="mentor-tip-icon">${t.icon}</span>
          <div class="mentor-tip-body">
            <div class="mentor-tip-text">${t.text}</div>
            ${t.action ? `<div class="mentor-tip-action">${t.action}</div>` : ''}
          </div>
        </div>`).join('')}
    </div>`
}

function analyzeFeed() {
  const tips = []
  const sorted = [...currentPlan].sort((a, b) => a.slot - b.slot)
  const photos = sorted.map(s => ({
    ...s,
    repo: repository[s.photo - 1] || null,
  })).filter(s => s.repo)

  if (photos.length < 3) return tips

  // 1. Temperature streak — too many cold or warm in a row
  let warmStreak = 0, coldStreak = 0, maxWarm = 0, maxCold = 0
  photos.forEach(p => {
    if (p.temp === 'warm') { warmStreak++; coldStreak = 0 }
    else { coldStreak++; warmStreak = 0 }
    maxWarm = Math.max(maxWarm, warmStreak)
    maxCold = Math.max(maxCold, coldStreak)
  })
  if (maxCold >= 4) {
    tips.push({ icon: '🧊', text: `${maxCold} fotos frias seguidas. Seu feed pode parecer monótono.`, action: 'Tente inserir um retrato ou detalhe com tons quentes para quebrar a sequência.' })
  }
  if (maxWarm >= 4) {
    tips.push({ icon: '🔥', text: `${maxWarm} fotos quentes seguidas. O contraste visual diminui.`, action: 'Adicione uma paisagem fria ou foto com tons azulados para criar ritmo.' })
  }

  // 2. Subject repetition — consecutive same type
  for (let i = 0; i < photos.length - 2; i++) {
    const t1 = (photos[i].type || '').toLowerCase()
    const t2 = (photos[i + 1].type || '').toLowerCase()
    const t3 = (photos[i + 2].type || '').toLowerCase()
    if (t1 && t1 === t2 && t2 === t3) {
      const typeLabel = t1.includes('paisagem') ? 'paisagens' : t1.includes('pessoa') || t1.includes('retrato') ? 'retratos' : t1.includes('detalhe') ? 'detalhes' : `"${t1}"`
      tips.push({ icon: '🔄', text: `3 ${typeLabel} consecutivos (slots ${photos[i].slot}-${photos[i + 2].slot}).`, action: 'Diversifique com outro tipo de enquadramento para manter o feed dinâmico.' })
      break // only report first occurrence
    }
  }

  // 3. Accent clustering — accents too close together
  const accentSlots = photos.filter(p => p.repo?.hasAccent).map(p => p.slot)
  for (let i = 0; i < accentSlots.length - 1; i++) {
    if (Math.abs(accentSlots[i] - accentSlots[i + 1]) === 1) {
      tips.push({ icon: '🎯', text: `Acentos quentes adjacentes nos slots ${accentSlots[i]} e ${accentSlots[i + 1]}.`, action: 'Separe acentos com pelo menos uma foto neutra ou fria entre eles.' })
      break
    }
  }

  // 4. Temperature balance
  const warmCount = photos.filter(p => p.temp === 'warm').length
  const coolCount = photos.filter(p => p.temp !== 'warm').length
  const ratio = warmCount / photos.length
  if (ratio > 0.8) {
    tips.push({ icon: '🌡️', text: `${Math.round(ratio * 100)}% do grid é quente. Falta contraste térmico.`, action: 'Considere uma foto com tons azuis, cinzas ou teal para equilibrar.' })
  } else if (ratio < 0.2) {
    tips.push({ icon: '🌡️', text: `${Math.round((1 - ratio) * 100)}% do grid é frio. Falta calor visual.`, action: 'Uma foto com dourado, laranja ou pôr do sol daria vida ao feed.' })
  }

  // 5. Low score photos (if score exists)
  const lowScores = photos.filter(p => p.repo?.photoScore != null && p.repo.photoScore < 50)
  if (lowScores.length > 0) {
    const slots = lowScores.map(p => `+${p.slot}`).join(', ')
    tips.push({ icon: '📸', text: `Foto${lowScores.length > 1 ? 's' : ''} com score baixo: ${slots}.`, action: 'Considere substituir por versões com melhor nitidez ou exposição.' })
  }

  // 6. Existing feed continuity
  if (existingPhotos.length > 0 && photos.length > 0) {
    const lastNew = photos[photos.length - 1]
    const firstExisting = existingPhotos[0]
    if (lastNew.temp === 'warm' && firstExisting.kelvin < 5000) {
      tips.push({ icon: '📌', text: 'A última foto nova e a primeira do feed existente são ambas quentes.', action: 'A transição entre novo e existente fica melhor com contraste de temperatura.' })
    }
  }

  // 7. Missing variety hint
  const types = new Set(photos.map(p => (p.type || '').toLowerCase()).filter(Boolean))
  if (types.size === 1 && photos.length >= 6) {
    tips.push({ icon: '🎭', text: `Todas as ${photos.length} fotos são do mesmo tipo.`, action: 'Feeds variados (paisagem + retrato + detalhe) geram mais engagement.' })
  }

  return tips.slice(0, 5) // max 5 tips
}

// ── Profile Diagnosis (Studio only, embutido na avançada) ──
function renderDiagnosis(diag) {
  const panel = document.getElementById('diagnosis-panel')
  if (!panel) return

  if (!diag || !planLimits().hasProfile) {
    panel.style.display = 'none'
    return
  }

  const score = diag.consistency_score ?? 0
  const scoreColor = score >= 70 ? '#166534' : score >= 40 ? '#92400e' : '#991b1b'
  const scoreBg    = score >= 70 ? '#d5f5e3' : score >= 40 ? '#fef3c7' : '#fce4ec'
  const scoreBar   = score >= 70 ? '#27ae60' : score >= 40 ? '#f39c12' : '#e74c3c'
  const scoreLabel = score >= 70 ? 'Feed consistente' : score >= 40 ? 'Consistência média' : 'Feed inconsistente'

  const paletteHtml = (diag.dominant_palette || []).map(hex =>
    `<div style="width:32px;height:32px;border-radius:6px;background:${hex};border:1px solid var(--border-light)"></div>`
  ).join('')

  const tempMapHtml = (diag.temperature_map || []).map(t =>
    `<div style="flex:1;height:24px;border-radius:3px;background:${t === 'warm' ? 'linear-gradient(135deg,#f59e0b,#e8920a)' : 'linear-gradient(135deg,#60a5fa,#3b82f6)'}"></div>`
  ).join('')

  const balance  = diag.balance || {}
  const warmPct  = balance.warm_pct ?? 50
  const coolPct  = balance.cool_pct ?? 50

  const issuesHtml = (diag.issues || []).map(issue =>
    `<div style="display:flex;gap:6px;align-items:flex-start;font-size:11px;color:#92400e;line-height:1.5"><span style="flex-shrink:0">⚠</span><span>${issue}</span></div>`
  ).join('')

  panel.style.display = 'block'
  panel.innerHTML = `
    <div class="diag-header">
      <span style="font-size:16px">📊</span>
      <span class="diag-title">Diagnóstico do perfil</span>
      <span class="diag-badge">Studio</span>
    </div>
    <div class="diag-body">
      <div class="diag-row">
        <div class="diag-card">
          <div class="diag-card-label">Harmonia detectada</div>
          <div class="diag-card-value">${diag.detected_harmony || '—'}</div>
        </div>
        <div class="diag-card">
          <div class="diag-card-label">Consistência</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:22px;font-weight:800;color:${scoreColor}">${score}</span>
            <div style="flex:1">
              <div style="font-size:10px;color:${scoreColor};font-weight:600;margin-bottom:3px">${scoreLabel}</div>
              <div style="height:4px;border-radius:2px;background:var(--border-light);overflow:hidden">
                <div style="width:${score}%;height:100%;border-radius:2px;background:${scoreBar}"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="diag-section">
        <div class="diag-section-label">Mapa de temperatura do feed</div>
        <div style="display:flex;gap:2px;margin-bottom:4px">${tempMapHtml}</div>
        <div style="display:flex;justify-content:space-between;font-size:10px">
          <span style="color:var(--warm);font-weight:600">🟠 ${warmPct}% quente</span>
          <span style="color:var(--cool);font-weight:600">🔵 ${coolPct}% frio</span>
        </div>
      </div>
      <div class="diag-section">
        <div class="diag-section-label">Paleta dominante do feed</div>
        <div style="display:flex;gap:6px">${paletteHtml}</div>
      </div>
      ${issuesHtml ? `<div class="diag-section"><div class="diag-section-label">Problemas detectados</div><div style="display:flex;flex-direction:column;gap:4px;background:#fef3c7;border-radius:var(--r-sm);padding:8px 10px">${issuesHtml}</div></div>` : ''}
      <div class="diag-section">
        <div class="diag-section-label">Próxima foto recomendada</div>
        <div style="font-size:12px;color:var(--text);line-height:1.6;background:#f0f9ff;border:1px solid #bae6fd;border-radius:var(--r-sm);padding:10px 12px">
          📸 ${diag.next_photo || 'Faça uma composição avançada com fotos existentes para obter recomendação.'}
        </div>
      </div>
    </div>`
}

// Legacy no-op
function renderGrid() {}
function activateManual() {}
async function handleSlotReplace(files) { await handleSlotFile(files) }
