// ui.js — Modals, popovers, history, export

// ── Info popovers ─────────────────────────────────────
function showHarmonyInfo(id) {
  const h = HARMONIES.find(x => x.id === id); if (!h) return
  document.getElementById('harmony-popover')?.remove()
  const colors = h.colors.map(c => `<div style="width:24px;height:24px;border-radius:5px;background:${c};flex-shrink:0"></div>`).join('')
  const pop = document.createElement('div')
  pop.id='harmony-popover'
  pop.style.cssText='position:fixed;z-index:600;background:#1a1a1a;color:white;border-radius:12px;padding:16px;width:240px;box-shadow:0 8px 32px rgba(0,0,0,.4);font-family:var(--font);font-size:13px;line-height:1.5;animation:fadeUp .15s ease;'
  pop.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><strong style="font-size:14px">${h.name}</strong><button onclick="document.getElementById('harmony-popover')?.remove()" style="background:rgba(255,255,255,.15);border:none;color:white;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1;font-family:var(--font)">✕</button></div><div style="display:flex;gap:5px;margin-bottom:10px;align-items:center">${colors}<span style="font-size:11px;color:rgba(255,255,255,.5);margin-left:4px">${h.angle}</span></div><div style="font-size:12px;color:rgba(255,255,255,.8);margin-bottom:8px">${h.when}</div><div style="font-size:11px;background:rgba(255,255,255,.08);padding:5px 8px;border-radius:6px;margin-bottom:6px">${h.example}</div><div style="font-size:11px;color:rgba(255,255,255,.45);font-style:italic;margin-bottom:10px">${h.feel}</div><button onclick="selHarmony('${h.id}');document.getElementById('harmony-popover')?.remove()" style="width:100%;padding:8px;background:white;color:#1a1a1a;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font)">Usar ${h.name}</button>`
  _positionPop(pop); document.body.appendChild(pop)
  setTimeout(()=>{ document.addEventListener('click', function closePop(e) { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('click',closePop) } }) },0)
}

function showPatternInfo(id) {
  const p = PATTERNS.find(x=>x.id===id); if (!p) return
  _showGenericPop({ title:p.name, body:p.when, example:p.example, feel:p.feel, ctaLabel:`Usar ${p.name}`, ctaFn:`selPattern('${p.id}')` })
}
function showContrastInfo(id) {
  const a = CONTRAST_AXES.find(x=>x.id===id); if (!a) return
  _showGenericPop({ title:`${a.icon} ${a.name}`, body:a.info, example:a.example, feel:null, ctaLabel:`Usar ${a.name}`, ctaFn:`selContrast('${a.id}')` })
}
function _showGenericPop({ title, body, example, feel, ctaLabel, ctaFn }) {
  document.getElementById('harmony-popover')?.remove()
  const pop=document.createElement('div')
  pop.id='harmony-popover'
  pop.style.cssText='position:fixed;z-index:600;background:#1a1a1a;color:white;border-radius:12px;padding:16px;width:240px;box-shadow:0 8px 32px rgba(0,0,0,.4);font-family:var(--font);font-size:13px;line-height:1.5;animation:fadeUp .15s ease;'
  pop.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><strong style="font-size:14px">${title}</strong><button onclick="document.getElementById('harmony-popover')?.remove()" style="background:rgba(255,255,255,.15);border:none;color:white;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1;font-family:var(--font)">✕</button></div><div style="font-size:12px;color:rgba(255,255,255,.8);margin-bottom:8px;white-space:pre-line">${body}</div>${example?`<div style="font-size:11px;margin-bottom:6px;background:rgba(255,255,255,.08);padding:6px 8px;border-radius:6px">${example}</div>`:''} ${feel?`<div style="font-size:11px;color:rgba(255,255,255,.45);font-style:italic;margin-bottom:10px">${feel}</div>`:''}<button onclick="${ctaFn};document.getElementById('harmony-popover')?.remove()" style="width:100%;padding:8px;background:white;color:#1a1a1a;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font)">${ctaLabel}</button>`
  _positionPop(pop); document.body.appendChild(pop)
  setTimeout(()=>{ document.addEventListener('click', function closePop(e) { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('click',closePop) } }) },0)
}
function _positionPop(pop) {
  const rect=event?.target?.getBoundingClientRect()
  if (rect) { pop.style.top=Math.min(rect.bottom+8,window.innerHeight-300)+'px'; pop.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-256))+'px' }
}

// ── Slot info modal ───────────────────────────────────
function openSlotInfo(slotIdx) {
  const repoIdx=feedSlots[slotIdx]
  if (repoIdx===null||repoIdx===undefined) return
  const p=repository[repoIdx]; if (!p) return
  if (currentPlan.length>0) {
    const s=currentPlan.find(x=>(x.photo-1)===repoIdx)
    if (s) { openPhotoModalDirect(s,p,slotIdx); return }
  }
  openPhotoModalFromRepo(repoIdx,slotIdx)
}
function openPhotoModalDirect(s, p, slotIdx) {
  const iW=s.temp==='warm', gridPos=getGridPosition(slotIdx+1,planSize)
  document.getElementById('pm-img').src=p.cropUrl||p.dataUrl
  document.getElementById('pm-slot').textContent=`+${slotIdx+1}`
  document.getElementById('pm-type').textContent=s.type?`· ${s.type}`:''
  document.getElementById('pm-pos').textContent=`📍 ${gridPos}`
  document.getElementById('pm-reason').textContent=s.reason||'—'
  document.getElementById('pm-harmony').textContent=s.harmony_role||'—'
  const tempEl=document.getElementById('pm-temp')
  tempEl.textContent=iW?`🟠 Quente · ${s.kelvin}`:`🔵 Frio · ${s.kelvin}`
  tempEl.className=`pm-temp ${iW?'pr-tw':'pr-tc'}`
  renderPaletteInModal(p,slotIdx)
  resetCaptionArea()
  document.getElementById('photo-modal').classList.add('open')
}
function openPhotoModalFromRepo(repoIdx, slotIdx) {
  const p=repository[repoIdx]; if (!p) return
  document.getElementById('pm-img').src=p.cropUrl||p.dataUrl
  document.getElementById('pm-slot').textContent=`+${slotIdx+1}`
  document.getElementById('pm-type').textContent=''
  document.getElementById('pm-pos').textContent=getGridPosition(slotIdx+1,planSize)
  document.getElementById('pm-reason').textContent='Sem análise de IA ainda.'
  document.getElementById('pm-harmony').textContent='Clique em "Compor" para obter análise completa.'
  const tempEl=document.getElementById('pm-temp')
  const iW=p.kelvin<5000
  tempEl.textContent=iW?`🟠 Quente · ${p.kelvin}K`:`🔵 Frio · ${p.kelvin}K`
  tempEl.className=`pm-temp ${iW?'pr-tw':'pr-tc'}`
  renderPaletteInModal(p,0)
  resetCaptionArea()
  document.getElementById('photo-modal').classList.add('open')
}
function openPhotoModal(slotNum) {
  if (gridDragSlot!==null) return
  const s=currentPlan.find(x=>x.slot===slotNum); if (!s) return
  const p=repository[s.photo-1]; if (!p) return
  openPhotoModalDirect(s,p,slotNum-1)
}
function closePhotoModal() { document.getElementById('photo-modal')?.classList.remove('open') }
function removeSlotPhoto() {
  const slotEl=document.getElementById('pm-slot'); if (!slotEl) return
  const slotNum=parseInt(slotEl.textContent.replace('+',''))
  const s=currentPlan.find(x=>x.slot===slotNum); if (!s) return
  const repoIdx=s.photo-1
  for (let i=0;i<feedSlots.length;i++) { if (feedSlots[i]===repoIdx) feedSlots[i]=null }
  closePhotoModal(); renderUploadGrid()
  document.getElementById('results').classList.remove('show')
  document.getElementById('results').innerHTML=''; currentPlan=[]
}

// ── Caption suggestion (Pro/Studio, 1 credit) ────────
function resetCaptionArea() {
  const result = document.getElementById('caption-result')
  if (result) { result.style.display = 'none'; result.innerHTML = '' }
  const btn = document.getElementById('caption-btn')
  const limits = planLimits()
  if (btn) {
    if (limits.captionCost === null) {
      btn.textContent = '🔒 Pro'
      btn.disabled = true
      btn.title = 'Disponível no Pro e Studio'
    } else {
      btn.textContent = `💬 Sugerir legenda · ${limits.captionCost} cr`
      btn.disabled = false
      btn.title = ''
    }
  }
}

async function suggestCaption() {
  const limits = planLimits()
  if (limits.captionCost === null) {
    showCaptionResult('🔒 Disponível no Pro e Studio.', true)
    return
  }

  const slotEl = document.getElementById('pm-slot')
  if (!slotEl) return
  const slotNum = parseInt(slotEl.textContent.replace('+', ''))
  const s = currentPlan.find(x => x.slot === slotNum)
  const repoIdx = s ? s.photo - 1 : null
  const photo = repoIdx !== null ? repository[repoIdx] : null
  if (!photo) {
    showCaptionResult('Sem foto para analisar.', true)
    return
  }

  const btn = document.getElementById('caption-btn')
  if (btn) { btn.disabled = true; btn.textContent = '...' }
  showCaptionResult('Gerando legenda...', false)

  try {
    // Build visual context from existing analysis
    let visualDesc = ''
    if (s) {
      visualDesc = `Tipo: ${s.type || 'desconhecido'}\nTemperatura: ${s.temp === 'warm' ? 'quente' : 'fria'} (${s.kelvin || ''})\nPapel: ${s.harmony_role || ''}`
    }

    const content = [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photo.compressed.split(',')[1] } },
      { type: 'text', text: buildCaptionPrompt(visualDesc) }
    ]

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 500, messages: [{ role: 'user', content }], _mode: 'caption' })
    })
    const data = await res.json()
    if (!res.ok) {
      if (data.code === 'NO_CREDITS') throw new Error('Créditos insuficientes.')
      if (data.code === 'PLAN_REQUIRED') throw new Error(data.error)
      throw new Error(data.error?.message || data.error || 'Erro')
    }

    const raw = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || ''
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    let parsed
    try {
      parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned)
    } catch {
      throw new Error('Resposta inválida — tente novamente.')
    }

    if (parsed.caption) {
      const captionArea = document.getElementById('caption-result')
      if (captionArea) {
        const tags = (parsed.hashtags || []).join(' ')
        captionArea.innerHTML = `
          <div style="font-size:13px;color:var(--text);line-height:1.6;margin-bottom:8px">${parsed.caption}</div>
          <div style="font-size:12px;color:var(--blue);margin-bottom:10px">${tags}</div>
          <div style="display:flex;gap:6px">
            <button onclick="copyCaption('${encodeURIComponent(parsed.caption + '\\n\\n' + tags)}')" style="flex:1;padding:6px;border-radius:var(--r-sm);border:1.5px solid var(--border);background:transparent;cursor:pointer;font-family:var(--font);font-size:12px;font-weight:600;color:var(--text2)">📋 Copiar tudo</button>
            <button onclick="copyCaption('${encodeURIComponent(tags)}')" style="padding:6px 12px;border-radius:var(--r-sm);border:1.5px solid var(--border);background:transparent;cursor:pointer;font-family:var(--font);font-size:12px;font-weight:600;color:var(--text2)"># Tags</button>
          </div>`
        captionArea.style.display = 'block'
      }
      loadCredits()
    }
  } catch (e) {
    showCaptionResult(e.message, true)
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💬 Sugerir legenda' }
  }
}

function showCaptionResult(msg, isError) {
  const el = document.getElementById('caption-result')
  if (!el) return
  el.style.display = 'block'
  el.innerHTML = `<div style="font-size:12px;color:${isError ? 'var(--red)' : 'var(--text3)'}">${msg}</div>`
}

function copyCaption(encoded) {
  const text = decodeURIComponent(encoded)
  navigator.clipboard?.writeText(text).then(() => {
    const el = event?.target
    if (el) { const orig = el.textContent; el.textContent = '✓ Copiado'; setTimeout(() => el.textContent = orig, 1500) }
  }).catch(() => {})
}
document.addEventListener('keydown', e => { if (e.key==='Escape') { closePhotoModal(); closeCrop(); closePaletteModal(); closeHistory() } })

// ── Palette rendering (Adobe Color style) ─────────────
function renderPaletteInModal(p, id) {
  const container=document.getElementById('pm-palette'); if (!container) return
  container.innerHTML=''
  const colors=(p.colors||[]).slice(0,5); if (!colors.length) return
  const imgSrc=p.cropUrl||p.dataUrl
  const photoWrap=document.createElement('div')
  photoWrap.style.cssText='position:relative;width:100%;aspect-ratio:4/5;border-radius:10px;overflow:hidden;margin-bottom:12px'
  const img=document.createElement('img')
  img.src=imgSrc; img.style.cssText='width:100%;height:100%;object-fit:cover;display:block'
  photoWrap.appendChild(img)
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg')
  svg.setAttribute('width','100%'); svg.setAttribute('height','100%')
  svg.style.cssText='position:absolute;inset:0;pointer-events:none'
  svg.setAttribute('viewBox','0 0 100 125')
  colors.forEach((c,ci) => {
    const x=((c.cx??0.5)*100).toFixed(1), y=((c.cy??0.5)*125).toFixed(1), r=ci===0?6:4
    const outerRing=document.createElementNS('http://www.w3.org/2000/svg','circle')
    outerRing.setAttribute('cx',x); outerRing.setAttribute('cy',y); outerRing.setAttribute('r',r+2); outerRing.setAttribute('fill','rgba(255,255,255,0.85)')
    svg.appendChild(outerRing)
    const dot=document.createElementNS('http://www.w3.org/2000/svg','circle')
    dot.setAttribute('cx',x); dot.setAttribute('cy',y); dot.setAttribute('r',r); dot.setAttribute('fill',c.hex); dot.setAttribute('stroke','white'); dot.setAttribute('stroke-width','1.5')
    svg.appendChild(dot)
    const lbl=document.createElementNS('http://www.w3.org/2000/svg','text')
    lbl.setAttribute('x',parseFloat(x)+r+3); lbl.setAttribute('y',parseFloat(y)+3); lbl.setAttribute('font-size','5'); lbl.setAttribute('font-weight','700'); lbl.setAttribute('fill','white'); lbl.setAttribute('stroke','rgba(0,0,0,0.5)'); lbl.setAttribute('stroke-width','0.3'); lbl.setAttribute('paint-order','stroke'); lbl.textContent=c.pct+'%'
    svg.appendChild(lbl)
  })
  photoWrap.appendChild(svg); container.appendChild(photoWrap)
  const swatchWrap=document.createElement('div'); swatchWrap.style.cssText='display:flex;gap:4px;flex-wrap:wrap'
  colors.forEach((c,ci) => {
    const sw=document.createElement('div'); sw.className='pm-swatch'; sw.id=`pm-sw-${id}-${ci}`
    sw.innerHTML=`<div class="pm-sw-color" style="background:${c.hex}"></div><div class="pm-sw-lbl">${c.hex.toUpperCase()}</div><div class="pm-sw-pct">${c.pct}%</div>`
    sw.onclick=()=>{
      navigator.clipboard?.writeText(c.hex).then(()=>{
        sw.classList.add('pm-sw-copied'); sw.querySelector('.pm-sw-lbl').textContent='✓ copiado'
        setTimeout(()=>{ sw.classList.remove('pm-sw-copied'); sw.querySelector('.pm-sw-lbl').textContent=c.hex.toUpperCase() },1400)
      }).catch(()=>{})
    }
    swatchWrap.appendChild(sw)
  })
  container.appendChild(swatchWrap)
}

// ── Palette modal ─────────────────────────────────────
function openPaletteModal(repoIdx) {
  const photo=repository[repoIdx]; if (!photo||!photo.colors) return
  document.getElementById('palette-title').textContent=`Foto ${repoIdx+1} — paleta de cores`
  document.getElementById('palette-swatches').innerHTML=photo.colors.map((c,i)=>`
    <div class="palette-swatch" id="sw-${repoIdx}-${i}" onclick="copySwatch('${c.hex}',${repoIdx},${i})">
      <div class="swatch-color" style="background:${c.hex}"></div>
      <div class="swatch-info"><div class="swatch-hex">${c.hex.toUpperCase()}</div><div class="swatch-pct">${c.pct}% da imagem</div><div class="swatch-copy">clique para copiar</div></div>
    </div>`).join('')
  document.getElementById('palette-modal').classList.add('open')
}
function copySwatch(hex,ri,ci) {
  navigator.clipboard?.writeText(hex).then(()=>{
    const el=document.getElementById(`sw-${ri}-${ci}`)
    if (el) { el.classList.add('copied'); el.querySelector('.swatch-copy').textContent='✓ copiado!'; setTimeout(()=>{ el.classList.remove('copied'); el.querySelector('.swatch-copy').textContent='clique para copiar' },1500) }
  }).catch(()=>{})
}
function closePaletteModal() { document.getElementById('palette-modal')?.classList.remove('open') }

// ── History ───────────────────────────────────────────
let historyCache = null

async function saveAnalysisToHistory(data, H) {
  if (!authToken) return
  try {
    const slots = await Promise.all((data.plan||[]).map(async s => {
      const p=repository[s.photo-1]; if (!p) return null
      const thumb=await makeThumb(p.cropUrl||p.dataUrl)
      return { slot:s.slot, thumb, kelvin:p.kelvin, type:s.type||'', reason:s.reason||'' }
    }))
    const palette=[]
    ;(data.plan||[]).forEach(s => {
      const p=repository[s.photo-1]
      if (p) (p.colors||[]).slice(0,2).forEach(c=>{ if (!palette.includes(c.hex)) palette.push(c.hex) })
    })
    await fetch('/api/history', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+authToken},
      body: JSON.stringify({ plan_size:currentPlan.length, harmony:H?.id||selH, axis:selC, pattern:selP, overview:data.overview||'', harmony_note:data.harmony_note||'', palette:palette.slice(0,8), slots:slots.filter(Boolean) })
    })
    historyCache = null
  } catch(e) { console.warn('History save failed:',e.message) }
}

async function openHistory() {
  document.getElementById('history-modal').classList.add('open')
  if (!historyCache) await loadHistory()
}
function closeHistory() { document.getElementById('history-modal')?.classList.remove('open') }

async function loadHistory() {
  const list=document.getElementById('history-list')
  list.innerHTML='<div style="padding:24px;text-align:center;color:var(--text3)">Carregando...</div>'
  try {
    const res=await fetch('/api/history',{headers:{'Authorization':'Bearer '+authToken}})
    const data=await res.json()
    historyCache=data.analyses||[]; renderHistoryList()
  } catch { list.innerHTML='<div style="padding:24px;text-align:center;color:var(--red)">Erro ao carregar histórico.</div>' }
}

function renderHistoryList() {
  const list=document.getElementById('history-list')
  const limits = planLimits()
  const maxVisible = limits.maxHistory
  const HM={ complementary:'Complementar',analogous:'Análogo',split:'Dividido',triad:'Tríade',monochrome:'Monocromático',square:'Quadrado',shades:'Sombras',custom:'IA decide' }
  const AM={ temperature:'Temperatura',luminance:'Luminância',subject:'Sujeito',saturation:'Saturação',combined:'Combinado' }
  if (!historyCache?.length) {
    list.innerHTML=`<div style="padding:40px 24px;text-align:center"><div style="font-size:32px;margin-bottom:12px">📭</div><div style="font-size:14px;font-weight:600;color:var(--text2)">Nenhuma análise ainda</div><div style="font-size:12px;color:var(--text3);margin-top:4px">As análises aparecerão aqui automaticamente.</div></div>`
    return
  }
  list.innerHTML=''
  historyCache.forEach((a, idx) => {
    const date=new Date(a.created_at)
    const dateStr=date.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})
    const timeStr=date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
    const slots=(a.slots||[]).slice(0,9)
    const gridSize=slots.length<=3?3:slots.length<=6?6:9
    const thumbsHtml=Array.from({length:gridSize},(_,i)=>{
      const s=slots[i]
      return s?.thumb?`<img src="${s.thumb}" style="aspect-ratio:4/5;width:100%;object-fit:cover;border-radius:2px;display:block">`:`<div style="aspect-ratio:4/5;background:var(--border-light);border-radius:2px"></div>`
    }).join('')

    // Blur gate: Free users only see first entry clearly
    const isBlurred = maxVisible !== null && idx >= maxVisible

    const card=document.createElement('div'); card.className='history-card'
    if (isBlurred) card.style.cssText = 'position:relative;overflow:hidden'

    card.innerHTML=`
      ${isBlurred ? `<div style="position:absolute;inset:0;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);background:rgba(255,255,255,.7);z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border-radius:var(--r-sm)">
        <div style="font-size:13px;font-weight:700;color:var(--text)">🔒 Análise anterior</div>
        <div style="font-size:11px;color:var(--text2);text-align:center;max-width:200px">Upgrade para Pro para acessar até 50 análises no histórico.</div>
        <button onclick="window.location.href='/comprar'" style="padding:6px 16px;border-radius:100px;background:var(--ig);border:none;color:white;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font)">Ver planos ✦</button>
      </div>` : ''}
      <div class="hc-header"><div><div class="hc-date">${dateStr} · ${timeStr}</div><div class="hc-tags"><span class="hc-tag">${HM[a.harmony]||a.harmony}</span><span class="hc-tag">${AM[a.axis]||a.axis}</span><span class="hc-tag">${a.plan_size} fotos</span></div></div>${!isBlurred?`<button class="hc-del" onclick="deleteAnalysis('${a.id}')" title="Excluir">🗑</button>`:''}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-bottom:10px">${thumbsHtml}</div>
      ${a.overview?`<div class="hc-overview">${a.overview}</div>`:''}
      ${!isBlurred?`<button class="hc-restore" onclick="restoreAnalysisSettings('${a.id}')">↩ Restaurar configurações</button>`:''}
    `
    list.appendChild(card)
  })
}

async function deleteAnalysis(id) {
  if (!confirm('Excluir esta análise do histórico?')) return
  await fetch(`/api/history/${id}`,{method:'DELETE',headers:{'Authorization':'Bearer '+authToken}})
  historyCache=historyCache.filter(a=>a.id!==id); renderHistoryList()
}
function restoreAnalysisSettings(id) {
  const a=historyCache?.find(x=>x.id===id); if (!a) return
  selH=a.harmony||selH; selP=a.pattern||selP; selC=a.axis||selC
  renderHarmonies(); renderPatterns(); renderContrast()
  closeHistory(); setStatus('✓ Configurações restauradas — adicione fotos e componha novamente','ok')
}

// ── Export grid ──────────────────────────────────────
function sanitizeFilename(str) {
  return str.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 50) || 'grid'
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}

// Diagonal watermark on a single cell
function drawWatermark(ctx, x, y, w, h) {
  ctx.save()
  ctx.translate(x + w/2, y + h/2)
  ctx.rotate(-Math.PI / 6) // ~30 degrees
  ctx.font = 'bold 14px system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('GRID COMPOSER', 0, -10)
  ctx.font = '10px system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.fillText('grid-composer.com', 0, 10)
  ctx.restore()
}

async function exportGrid() {
  const slots=feedSlots.map((repoIdx,i)=>({repoIdx,photo:repoIdx!==null?repository[repoIdx]:null,plan:currentPlan.find(x=>x.slot===i+1)||null})).filter(s=>s.photo)
  if (!slots.length) { showErr('Nenhuma foto no feed para exportar.'); return }
  const limits = planLimits()
  const COLS=3,ROWS=Math.ceil(slots.length/COLS),CELL_W=360,CELL_H=Math.round(CELL_W*5/4),INFO_H=96,PAD=12,MARGIN=24,HEADER_H=56
  const TOTAL_W=COLS*CELL_W+(COLS-1)*PAD+MARGIN*2, TOTAL_H=HEADER_H+ROWS*(CELL_H+INFO_H+PAD)+MARGIN
  const cv=document.createElement('canvas'); cv.width=TOTAL_W; cv.height=TOTAL_H
  const ctx=cv.getContext('2d')
  ctx.fillStyle='#fafafa'; ctx.fillRect(0,0,TOTAL_W,TOTAL_H)
  ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,TOTAL_W,HEADER_H)
  ctx.fillStyle='#262626'; ctx.font='bold 18px system-ui,sans-serif'; ctx.textBaseline='middle'
  const igHandle=localStorage.getItem('gc_ig_handle')
  ctx.fillText(igHandle?`@${igHandle}`:'Grid Composer',MARGIN,HEADER_H/2)
  if (currentHarmony?.name) {
    ctx.fillStyle='#a8a8a8'; ctx.font='13px system-ui,sans-serif'
    const harmLabel=`${currentHarmony.name} · ${slots.length} fotos`
    const tw=ctx.measureText(harmLabel).width
    ctx.fillText(harmLabel,TOTAL_W-MARGIN-tw,HEADER_H/2)
  }
  ctx.fillStyle='#efefef'; ctx.fillRect(0,HEADER_H-1,TOTAL_W,1)
  const loadImage=src=>new Promise((res,rej)=>{ const img=new Image(); img.onload=()=>res(img); img.onerror=rej; img.src=src })
  for (let i=0;i<slots.length;i++) {
    const col=i%COLS, row=Math.floor(i/COLS)
    const x=MARGIN+col*(CELL_W+PAD), y=HEADER_H+MARGIN/2+row*(CELL_H+INFO_H+PAD)
    const {photo,plan}=slots[i]
    try {
      const img=await loadImage(photo.cropUrl||photo.dataUrl)
      ctx.save(); ctx.beginPath(); roundRect(ctx,x,y,CELL_W,CELL_H,6); ctx.clip()
      const scale=Math.max(CELL_W/img.width,CELL_H/img.height)
      const dw=img.width*scale, dh=img.height*scale
      ctx.drawImage(img,x+(CELL_W-dw)/2,y+(CELL_H-dh)/2,dw,dh); ctx.restore()
    } catch {}

    // Watermark for Free users — diagonal on each photo cell
    if (limits.hasWatermark) {
      drawWatermark(ctx, x, y, CELL_W, CELL_H)
    }

    const iy=y+CELL_H
    ctx.fillStyle='#ffffff'; ctx.fillRect(x,iy,CELL_W,INFO_H)
    const slotNum=i+1
    ctx.fillStyle='#262626'; ctx.beginPath(); ctx.roundRect(x+8,iy+8,30,20,10); ctx.fill()
    ctx.fillStyle='#ffffff'; ctx.font='bold 11px system-ui,sans-serif'; ctx.textBaseline='middle'; ctx.textAlign='center'
    ctx.fillText(`+${slotNum}`,x+23,iy+18); ctx.textAlign='left'
    if (plan?.type) { ctx.fillStyle='#262626'; ctx.font='bold 11px system-ui,sans-serif'; ctx.fillText(plan.type,x+44,iy+18) }
    if (photo.kelvin) {
      const iW=photo.kelvin<5500, kLabel=`${photo.kelvin}K`
      ctx.font='bold 10px system-ui,sans-serif'
      const kw=ctx.measureText(kLabel).width+12, kx=x+CELL_W-kw-8
      ctx.fillStyle=iW?'#fff3e0':'#e3f2fd'; ctx.beginPath(); ctx.roundRect(kx,iy+8,kw,18,9); ctx.fill()
      ctx.fillStyle=iW?'#e65100':'#1565c0'; ctx.textAlign='center'; ctx.fillText(kLabel,kx+kw/2,iy+17); ctx.textAlign='left'
    }
    if (plan?.reason) {
      ctx.fillStyle='#737373'; ctx.font='10px system-ui,sans-serif'
      let reason=plan.reason
      const maxW=CELL_W-16
      while (ctx.measureText(reason).width>maxW&&reason.length>0) reason=reason.slice(0,-1)
      if (reason!==plan.reason) reason+='…'
      ctx.fillText(reason,x+8,iy+36)
    }
    const colors=(photo.colors||[]).slice(0,5)
    const swW=Math.floor((CELL_W-16-(colors.length-1)*4)/colors.length), swY=iy+INFO_H-26
    colors.forEach((c,ci)=>{
      const sx=x+8+ci*(swW+4)
      ctx.fillStyle=c.hex; ctx.beginPath(); ctx.roundRect(sx,swY,swW,14,3); ctx.fill()
      ctx.fillStyle='#a8a8a8'; ctx.font='8px monospace'; ctx.textAlign='center'
      ctx.fillText(c.hex.toUpperCase(),sx+swW/2,swY+24)
    })
    ctx.textAlign='left'; ctx.fillStyle='#efefef'; ctx.fillRect(x,iy+INFO_H-1,CELL_W,1)
  }
  ctx.fillStyle='#d0d0d0'; ctx.font='11px system-ui,sans-serif'; ctx.textAlign='center'
  ctx.fillText('grid-composer.onrender.com',TOTAL_W/2,TOTAL_H-8)

  const rawHandle = localStorage.getItem('gc_ig_handle') || 'grid'
  const handle    = sanitizeFilename(rawHandle)
  const date      = new Date().toISOString().slice(0,10)
  const link      = document.createElement('a')
  link.download   = `${handle}-grid-${date}.jpg`
  link.href       = cv.toDataURL('image/jpeg',0.92)
  link.click()
}

// ── Buy credits modal ─────────────────────────────────
function openBuyCredits() {
  document.getElementById('buy-credits-modal').classList.add('open')
}
function closeBuyCredits() {
  document.getElementById('buy-credits-modal')?.classList.remove('open')
}
async function buyCredits(pack) {
  try {
    const btn = document.getElementById(`buy-btn-${pack}`)
    if (btn) { btn.disabled=true; btn.textContent='Aguarde...' }
    const res = await fetch('/api/buy-credits', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+authToken},
      body: JSON.stringify({ pack })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error||'Erro ao iniciar pagamento')
    if (data.url) window.location.href = data.url
  } catch(e) {
    alert(e.message)
    const btn = document.getElementById(`buy-btn-${pack}`)
    if (btn) { btn.disabled=false; btn.textContent='Comprar' }
  }
}
