// feed.js — Feed grid, repository, drag/drop, crop
// Grid: new posts (top) + existing photos (bottom, context)
// Existing photos: blocked for Free, up to 6 for Pro/Studio

// ── Repository ────────────────────────────────────────
function setupDrop() {
  const repoGrid = document.getElementById('repo-grid')
  if (repoGrid) {
    repoGrid.addEventListener('dragover', e => e.preventDefault())
    repoGrid.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files) })
  }
}

function repoDragStart(e, i) { repoDragIdx = i; dragSource = 'repo'; e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'copy'; renderRepo() }
function repoDragEnd(e)      { repoDragIdx = null; dragSource = null; renderRepo() }

function setUploadProgress(current, total) {
  const el = document.getElementById('exts')
  if (!el) return
  const pct = Math.round((current / total) * 100)
  el.className = 'up-status'
  el.innerHTML = `
    <div style="width:100%">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:12px;color:var(--text2)">Processando foto ${current} de ${total}...</span>
        <span style="font-size:11px;font-weight:600;color:var(--text2)">${pct}%</span>
      </div>
      <div style="width:100%;height:4px;border-radius:2px;background:var(--border-light);overflow:hidden">
        <div style="width:${pct}%;height:100%;border-radius:2px;background:var(--blue);transition:width .2s ease"></div>
      </div>
    </div>`
}

async function handleFiles(files) {
  const toAdd = Array.from(files).filter(f => f.type.startsWith('image/'))
  if (!toAdd.length) return
  const max = maxRepoSize()
  const remaining = max - repository.length
  if (remaining <= 0) {
    setStatus(`Repositório cheio (${max} fotos). ${currentUserPlan === 'free' ? 'Upgrade para Pro → 12 fotos.' : ''}`, '')
    return
  }
  const batch = toAdd.slice(0, remaining)
  for (let i = 0; i < batch.length; i++) {
    setUploadProgress(i + 1, batch.length)
    const file = batch[i]
    const raw = await readFile(file)
    const img = await loadImg(raw)
    const colors = extractColors(img, 5)
    const kelvin = estimateKelvin(colors)
    const hasAccent = detectAccent(colors)
    const compressed = await compressImage(raw, 800, 0.75)
    repository.push({ file, dataUrl: raw, compressed, colors, kelvin, hasAccent })
    renderRepo()
  }
  setStatus(`✓ ${repository.length} foto(s) no repositório`, 'ok')
  updateActionButtons()
}

function renderRepo() {
  const grid = document.getElementById('repo-grid')
  if (!grid) return
  const max = maxRepoSize()
  const thumbsHtml = repository.map((p, i) => `
    <div class="repo-thumb ${repoDragIdx===i?'repo-dragging':''}"
      draggable="true"
      ondragstart="repoDragStart(event,${i})"
      ondragend="repoDragEnd(event)">
      <img src="${p.cropUrl || p.dataUrl}" alt="">
      <button class="repo-del" onclick="event.stopPropagation();removeFromRepo(${i})">✕</button>
    </div>`).join('')
  const addBtn = repository.length < max
    ? `<div class="repo-add" id="repo-add" onclick="document.getElementById('fin').click()">
        <span style="font-size:22px;color:var(--text3)">+</span>
        <span style="font-size:11px;color:var(--text3);margin-top:2px">Adicionar</span>
       </div>` : ''
  grid.innerHTML = thumbsHtml + addBtn
  document.getElementById('pcnt').textContent = `${repository.length} / ${max}`
}

function removeFromRepo(i) {
  repository.splice(i, 1)
  feedSlots = feedSlots.map(s => { if (s === i) return null; if (s > i) return s - 1; return s })
  renderRepo(); renderUploadGrid(); updateActionButtons()
}

// ── Existing photos (feed context) ────────────────────
async function handleExistingFiles(files) {
  const limits = planLimits()
  if (limits.maxExisting === 0) return // blocked for Free (UI shouldn't allow, but safety check)
  const toAdd = Array.from(files).filter(f => f.type.startsWith('image/'))
  if (!toAdd.length) return
  const remaining = limits.maxExisting - existingPhotos.length
  const batch = toAdd.slice(0, remaining)
  for (const file of batch) {
    const raw = await readFile(file)
    const img = await loadImg(raw)
    const colors = extractColors(img, 5)
    const kelvin = estimateKelvin(colors)
    const hasAccent = detectAccent(colors)
    const compressed = await compressImage(raw, 800, 0.75)
    existingPhotos.push({ dataUrl: raw, compressed, colors, kelvin, hasAccent })
  }
  renderUploadGrid(); updateActionButtons()
}

function removeExisting(i) {
  existingPhotos.splice(i, 1)
  renderUploadGrid(); updateActionButtons()
}

// ── Dynamic row management ────────────────────────────
function addNewRow() {
  const limits = planLimits()
  const newSize = planSize + 3
  if (newSize > limits.maxGrid) {
    const planName = currentUserPlan === 'free' ? 'Pro' : 'Studio'
    showErr(`Grid máximo para seu plano: ${limits.maxGrid} posts. Faça upgrade para ${planName}.`)
    return
  }
  planSize = newSize
  while (feedSlots.length < planSize) feedSlots.push(null)
  renderUploadGrid(); updateActionButtons()
  document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'))
}

function removeLastRow() {
  if (planSize <= 3) return
  const newSize = Math.max(3, planSize - 3)
  for (let i = newSize; i < planSize; i++) feedSlots[i] = null
  planSize = newSize
  feedSlots.length = planSize
  renderUploadGrid(); updateActionButtons()
  document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'))
}

// ── Feed grid — two zones ─────────────────────────────
function renderUploadGrid() {
  const grid = document.getElementById('upload-grid')
  if (!grid) return
  const limits = planLimits()
  const cells = []

  // ── Zone 1: New post slots (top) ────────────────────
  for (let i = 0; i < planSize; i++) {
    const repoIdx = feedSlots[i]
    const photo = repoIdx !== null && repoIdx !== undefined ? repository[repoIdx] : null
    if (photo) {
      const pal = (photo.colors||[]).slice(0,5).map(c=>`<div style="flex:1;background:${c.hex}"></div>`).join('')
      const hasInfo = currentPlan.length > 0
      const scoreHtml = (photo.photoScore != null && limits.hasScore)
        ? `<div class="photo-score photo-score-${photo.photoScore >= 70 ? 'good' : photo.photoScore >= 40 ? 'mid' : 'low'}" title="${(photo.scoreIssues||[]).join(', ') || 'Score'}">${photo.photoScore}</div>`
        : ''
      cells.push(`
        <div class="ugslot filled" draggable="true"
          ondragstart="ugDragStart(event,${i})" ondragover="ugDragOver(event)"
          ondrop="ugDropOrReplace(event,${i})" ondragleave="slotDragLeave(event)"
          ondragend="ugDragEnd(event)">
          <img src="${photo.cropUrl || photo.dataUrl}">
          <button class="ugslot-del" onclick="event.stopPropagation();clearSlot(${i})" title="Remover">✕</button>
          ${scoreHtml}
          <div class="slot-actions">
            <button class="slot-act" onclick="event.stopPropagation();openCrop(${repoIdx})" title="Recortar">✂</button>
            <button class="slot-act ${hasInfo?'':'slot-act-dim'}" onclick="event.stopPropagation();openSlotInfo(${i})" title="${hasInfo?'Ver informações':'Sem análise ainda'}">ℹ</button>
          </div>
          <div class="ugslot-n">${i+1}${i===0?' · 1ª':''}</div>
          <div class="ugslot-pal">${pal}</div>
        </div>`)
    } else {
      cells.push(`
        <div class="ugslot" ondragover="slotDragOver(event)" ondragleave="slotDragLeave(event)"
          ondrop="slotDropFromRepo(event,${i})" onclick="openSlotPicker(${i})">
          <div class="ugslot-empty">
            <div class="ugslot-plus">+</div>
            <div class="ugslot-num">slot ${i+1}${i===0?' · 1ª a postar':''}</div>
          </div>
        </div>`)
    }
  }

  // ── Add/Remove row buttons ──────────────────────────
  const canAdd    = planSize + 3 <= limits.maxGrid
  const canRemove = planSize > 3
  cells.push(`
    <div style="grid-column:1/-1;display:flex;gap:6px;margin:4px 0">
      ${canAdd
        ? `<button class="existing-add-btn" onclick="addNewRow()" style="flex:1">+ Adicionar linha</button>`
        : `<button class="existing-add-btn" style="flex:1;opacity:.4;cursor:not-allowed" title="Máximo ${limits.maxGrid} posts no plano ${currentUserPlan}">+ Máx ${limits.maxGrid} posts</button>`
      }
      ${canRemove ? `<button class="existing-add-btn" onclick="removeLastRow()" style="flex:0 0 auto;color:var(--red);border-color:#fca5a5">− Remover</button>` : ''}
    </div>`)

  // ── Separator ───────────────────────────────────────
  cells.push(`
    <div style="grid-column:1/-1;display:flex;align-items:center;gap:8px;margin:6px 0 2px">
      <div style="flex:1;height:1px;background:var(--border-light)"></div>
      <span style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap">📌 Feed existente · contexto</span>
      <div style="flex:1;height:1px;background:var(--border-light)"></div>
    </div>`)

  // ── Zone 2: Existing photos (bottom, context) ───────
  if (limits.maxExisting === 0) {
    // Free: blocked with upgrade gate
    cells.push(`
      <div style="grid-column:1/-1;padding:16px;text-align:center;background:var(--bg);border-radius:var(--r-sm);border:1.5px dashed var(--border)">
        <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:4px">🔒 Fotos existentes do feed</div>
        <div style="font-size:12px;color:var(--text3);line-height:1.5;margin-bottom:8px">Adicione fotos já postadas para a IA criar continuidade com seu feed atual.</div>
        <button onclick="window.location.href='/comprar'" style="padding:6px 16px;border-radius:100px;background:var(--ig);border:none;color:white;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font)">Disponível no Pro ✦</button>
      </div>`)
  } else {
    // Pro/Studio: show existing photos
    if (existingPhotos.length > 0) {
      existingPhotos.forEach((p, i) => {
        const pal = (p.colors||[]).slice(0,3).map(c=>`<div style="flex:1;background:${c.hex}"></div>`).join('')
        cells.push(`
          <div class="ugslot existing-slot">
            <img src="${p.dataUrl}" style="opacity:.7">
            <button class="ugslot-del" style="display:flex" onclick="event.stopPropagation();removeExisting(${i})" title="Remover">✕</button>
            <div class="existing-pin">📌</div>
            <div class="ugslot-pal">${pal}</div>
          </div>`)
      })
      const remainder = existingPhotos.length % 3
      if (remainder > 0) {
        for (let i = 0; i < 3 - remainder; i++) {
          cells.push(`<div style="aspect-ratio:4/5"></div>`)
        }
      }
    }
    // Upload existing button
    if (existingPhotos.length < limits.maxExisting) {
      cells.push(`
        <div style="grid-column:1/-1;margin-top:2px">
          <button class="existing-add-btn" onclick="document.getElementById('existing-fin').click()">
            📎 Adicionar fotos já postadas ${existingPhotos.length > 0 ? `(${existingPhotos.length}/${limits.maxExisting})` : ''}
          </button>
        </div>`)
    }
  }

  grid.innerHTML = cells.join('')
}

// ── Drag/drop (only for new post slots) ───────────────
function slotDragOver(e)  { e.preventDefault(); e.currentTarget.classList.add('drop-hover') }
function slotDragLeave(e) { e.currentTarget.classList.remove('drop-hover') }
function slotDropFromRepo(e, slotIdx) {
  e.preventDefault(); e.currentTarget.classList.remove('drop-hover')
  const repoIdx = parseInt(e.dataTransfer.getData('text/plain'))
  if (isNaN(repoIdx)) return
  feedSlots[slotIdx] = repoIdx; renderUploadGrid(); updateActionButtons()
}
function ugDragStart(e, i) { ugDragIdx=i; ugDragging=true; dragSource='feed'; e.dataTransfer.setData('text/plain','feed'); e.dataTransfer.effectAllowed='move' }
function ugDragOver(e)     { e.preventDefault(); e.dataTransfer.dropEffect='move' }
function ugDragEnd(e)      { setTimeout(()=>{ ugDragging=false; dragSource=null },50) }
function ugDrop(e, i) {
  e.preventDefault()
  if (ugDragIdx===null||ugDragIdx===i) return
  const tmp=feedSlots[ugDragIdx]; feedSlots[ugDragIdx]=feedSlots[i]; feedSlots[i]=tmp
  ugDragIdx=null; renderUploadGrid(); updateActionButtons()
}
function ugDropOrReplace(e, i) {
  e.preventDefault(); e.currentTarget.classList.remove('drop-hover')
  const raw = e.dataTransfer.getData('text/plain')
  const repoIdx = parseInt(raw)
  if (dragSource==='repo' && !isNaN(repoIdx)) {
    feedSlots[i]=repoIdx; renderUploadGrid(); updateActionButtons(); return
  }
  if (ugDragIdx===null||ugDragIdx===i) return
  const tmp=feedSlots[ugDragIdx]; feedSlots[ugDragIdx]=feedSlots[i]; feedSlots[i]=tmp
  ugDragIdx=null; renderUploadGrid(); updateActionButtons()
}

// ── Slot picker ───────────────────────────────────────
function openSlotPicker(idx) {
  slotTargetIdx = idx
  const fin = document.getElementById('slot-fin')
  if (fin) { fin.value=''; fin.click() }
}
async function handleSlotFile(files) {
  if (!files||!files.length||slotTargetIdx===null) return
  const file = files[0]
  if (!file.type.startsWith('image/')) return
  const raw=await readFile(file), img=await loadImg(raw)
  const colors=extractColors(img,5), kelvin=estimateKelvin(colors)
  const hasAccent=detectAccent(colors)
  const compressed=await compressImage(raw,800,0.75)
  const max = maxRepoSize()
  if (repository.length < max) {
    repository.push({ file, dataUrl:raw, compressed, colors, kelvin, hasAccent })
    feedSlots[slotTargetIdx]=repository.length-1
    renderRepo()
  }
  slotTargetIdx=null; renderUploadGrid(); updateActionButtons()
  setStatus(`✓ ${repository.length} foto(s) no repositório`,'ok')
}
function clearSlot(i) { feedSlots[i]=null; renderUploadGrid(); updateActionButtons() }

// ── Crop modal ────────────────────────────────────────
let cropRepoIdx=null,cropOffX=0,cropOffY=0,cropZoomVal=100
let cropDragging=false,cropSX=0,cropSY=0,cropNatW=0,cropNatH=0

function openCrop(repoIdx) {
  const photo=repository[repoIdx]; if (!photo) return
  cropRepoIdx=repoIdx; cropOffX=0; cropOffY=0; cropZoomVal=100
  const frame=document.getElementById('crop-frame'), img=document.getElementById('crop-img')
  if (!frame||!img) return
  document.getElementById('crop-modal').classList.add('open')
  img.src=''
  requestAnimationFrame(()=>{
    img.onload=()=>{
      cropNatW=img.naturalWidth; cropNatH=img.naturalHeight
      const fW=frame.clientWidth||280, fH=frame.clientHeight||350
      cropZoomVal=Math.min(300,Math.max(100,Math.round(Math.max(fW/cropNatW,fH/cropNatH)*100)))
      document.getElementById('crop-zoom').value=cropZoomVal; cropApply()
    }
    img.src=photo.dataUrl
  })
  frame.onmousedown =e=>{ cropDragging=true; cropSX=e.clientX-cropOffX; cropSY=e.clientY-cropOffY; e.preventDefault() }
  frame.ontouchstart=e=>{ cropDragging=true; cropSX=e.touches[0].clientX-cropOffX; cropSY=e.touches[0].clientY-cropOffY }
  document.onmousemove =e=>{ if(!cropDragging)return; cropOffX=e.clientX-cropSX; cropOffY=e.clientY-cropSY; cropApply() }
  document.ontouchmove =e=>{ if(!cropDragging)return; cropOffX=e.touches[0].clientX-cropSX; cropOffY=e.touches[0].clientY-cropSY; cropApply() }
  document.onmouseup=document.ontouchend=()=>{ cropDragging=false }
  frame.onwheel=e=>{ e.preventDefault(); const s=document.getElementById('crop-zoom'); s.value=Math.min(300,Math.max(100,parseFloat(s.value)-e.deltaY*0.3)); cropZoom(s.value) }
}
function cropZoom(val) { cropZoomVal=parseFloat(val); cropApply() }
function cropApply() {
  const img=document.getElementById('crop-img'), frame=document.getElementById('crop-frame')
  if (!img||!frame||!cropNatW) return
  const s=cropZoomVal/100, iW=cropNatW*s, iH=cropNatH*s
  img.style.width=iW+'px'; img.style.height=iH+'px'
  img.style.left=(frame.clientWidth/2-iW/2+cropOffX)+'px'
  img.style.top=(frame.clientHeight/2-iH/2+cropOffY)+'px'
}
function saveCrop() {
  if (cropRepoIdx===null) return
  const frame=document.getElementById('crop-frame'), img=document.getElementById('crop-img')
  if (!frame||!img) return
  const fW=frame.clientWidth, fH=frame.clientHeight
  const cv=document.createElement('canvas'); cv.width=fW*2; cv.height=fH*2
  const ctx=cv.getContext('2d'); ctx.scale(2,2)
  const s=cropZoomVal/100, src=new Image()
  src.onload=()=>{
    ctx.drawImage(src,fW/2-cropNatW*s/2+cropOffX,fH/2-cropNatH*s/2+cropOffY,cropNatW*s,cropNatH*s)
    const cropUrl=cv.toDataURL('image/jpeg',0.92)
    repository[cropRepoIdx].cropUrl=cropUrl
    compressImage(cropUrl,800,0.75).then(c=>{repository[cropRepoIdx].compressed=c})
    renderRepo(); renderUploadGrid(); closeCrop()
  }
  src.src=img.src
}
function closeCrop() {
  document.getElementById('crop-modal')?.classList.remove('open')
  document.onmousemove=document.onmouseup=document.ontouchmove=document.ontouchend=null
  cropRepoIdx=null
}
