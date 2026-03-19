// feed.js — Feed grid, repository, drag/drop, crop

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

async function handleFiles(files) {
  const toAdd = Array.from(files).filter(f => f.type.startsWith('image/'))
  if (!toAdd.length) return
  const max = maxRepoSize()
  const remaining = max - repository.length
  const batch = toAdd.slice(0, remaining)
  setStatus(`Processando ${batch.length} foto(s)...`, '')
  for (const file of batch) {
    const raw = await readFile(file)
    const img = await loadImg(raw)
    const colors = extractColors(img, 5)
    const kelvin = estimateKelvin(colors)
    const compressed = await compressImage(raw, 800, 0.75)
    repository.push({ file, dataUrl: raw, compressed, colors, kelvin })
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

// ── Feed grid ─────────────────────────────────────────
function renderUploadGrid() {
  const grid = document.getElementById('upload-grid')
  if (!grid) return
  const cells = []
  for (let i = 0; i < planSize; i++) {
    const repoIdx = feedSlots[i]
    const photo = repoIdx !== null && repoIdx !== undefined ? repository[repoIdx] : null
    if (photo) {
      const pal = (photo.colors||[]).slice(0,5).map(c=>`<div style="flex:1;background:${c.hex}"></div>`).join('')
      const hasInfo = currentPlan.length > 0
      cells.push(`
        <div class="ugslot filled" draggable="true"
          ondragstart="ugDragStart(event,${i})" ondragover="ugDragOver(event)"
          ondrop="ugDropOrReplace(event,${i})" ondragleave="slotDragLeave(event)"
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
        <div class="ugslot" ondragover="slotDragOver(event)" ondragleave="slotDragLeave(event)"
          ondrop="slotDropFromRepo(event,${i})" onclick="openSlotPicker(${i})">
          <div class="ugslot-empty">
            <div class="ugslot-plus">+</div>
            <div class="ugslot-num">slot ${i+1}${i===0?' · 1ª a postar':''}</div>
          </div>
        </div>`)
    }
  }
  grid.innerHTML = cells.join('')
}

// ── Drag/drop ─────────────────────────────────────────
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
  const compressed=await compressImage(raw,800,0.75)
  const max = maxRepoSize()
  if (repository.length < max) {
    repository.push({ file, dataUrl:raw, compressed, colors, kelvin })
    feedSlots[slotTargetIdx]=repository.length-1
    renderRepo()
  }
  slotTargetIdx=null; renderUploadGrid(); updateActionButtons()
  setStatus(`✓ ${repository.length} foto(s) no repositório`,'ok')
}
function clearSlot(i) { feedSlots[i]=null; renderUploadGrid(); updateActionButtons() }

async function handleIG(files) {
  igPhotos=[]
  const g=document.getElementById('ig-grid'); if (!g) return
  g.innerHTML=''
  for (const f of Array.from(files).slice(0,3)) {
    const url=await readFile(f), img=await loadImg(url)
    igPhotos.push({ dataUrl:url, colors:extractColors(img,5), kelvin:estimateKelvin(extractColors(img,5)) })
    const c=document.createElement('div'); c.className='igmc'; c.innerHTML=`<img src="${url}">`; g.appendChild(c)
  }
  while (g.children.length<3) { const c=document.createElement('div'); c.className='igmc'; c.innerHTML='<div class="igmc-e">+</div>'; g.appendChild(c) }
}

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
