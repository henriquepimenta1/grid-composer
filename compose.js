// compose.js — AI composition and local reordering

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
    const colorCtx = repoPhotos.map((p,i) => {
      // Build semantic context — AI gets perceptual features, not just raw hex
      const accentColor = p.hasAccent ? (p.colors||[]).find(c => {
        const r=parseInt(c.hex.slice(1,3),16), g=parseInt(c.hex.slice(3,5),16), b=parseInt(c.hex.slice(5,7),16)
        const max=Math.max(r,g,b), d=max-Math.min(r,g,b); if(!max||!d) return false
        const sat=d/max; let hue=0
        if(max===r) hue=((g-b)/d+(g<b?6:0))*60; else if(max===g) hue=((b-r)/d+2)*60; else hue=((r-g)/d+4)*60
        return sat>0.45 && (hue<=45||hue>=330)
      }) : null
      const accentDesc = accentColor ? `ACENTO_${accentColor.hex.toUpperCase()}(${accentColor.pct}%)` : 'SEM_ACENTO'
      const tempWord = p.kelvin <= 3500 ? 'MUITO_QUENTE' : p.kelvin <= 4500 ? 'QUENTE' : p.kelvin <= 6000 ? 'NEUTRO' : p.kelvin <= 8000 ? 'FRIO' : 'MUITO_FRIO'
      const lumAvg = (p.colors||[]).reduce((s,c)=>s+hexToL(c.hex)*c.pct/100,0)
      const lumWord = lumAvg > 60 ? 'CLARO' : lumAvg > 35 ? 'MEDIO' : 'ESCURO'
      return `FOTO ${i+1}: kelvin~${p.kelvin}K temp=${tempWord} lum=${lumWord} acento=${accentDesc} cores=[${(p.colors||[]).map(c=>c.hex+'('+c.pct+'%)').join(' ')}]`
    }).join('\n')
    const igCtx = igPhotos.length > 0
      ? '\nULTIMAS 3 FOTOS DO GRID:\n' + igPhotos.map((p,i) => `IG${i+1}: kelvin~${p.kelvin}K cores=[${(p.colors||[]).map(c=>c.hex+'('+c.pct+'%)').join(' ')}]`).join('\n')
      : ''
    let visualCtx = ''
    if (isAdvanced) {
      step(2); document.getElementById('ldtxt').textContent = 'Lendo as fotos...'
      const descContent = []
      repoPhotos.forEach((p,i) => {
        descContent.push({ type:'image', source:{ type:'base64', media_type:'image/jpeg', data:p.compressed.split(',')[1] } })
        descContent.push({ type:'text', text:`[FOTO ${i+1}]` })
      })
      descContent.push({ type:'text', text:`Analise cada foto e retorne APENAS JSON sem markdown:\n{"photos":[{"id":1,"subject":"pessoa|paisagem|detalhe|grupo|animal","framing":"close|medio|aberto","energy":"estatico|dinamico","luminosity":"claro|medio|escuro","dominant_element":"descrição curta em português"}]}` })
      const descRes = await fetch('/api/analyze', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+authToken},
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:800, messages:[{role:'user',content:descContent}], _creditOverride:0 })
      })
      if (descRes.ok) {
        const descData = await descRes.json()
        const rawDesc = descData.content?.filter(b=>b.type==='text').map(b=>b.text).join('') || ''
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
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+authToken},
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:4000, messages:[{role:'user',content}], _creditCost:creditCost })
    })
    const data = await res.json()
    if (!res.ok) {
      if (data.code==='NO_CREDITS') throw new Error(t('no_credits'))
      throw new Error(data.error?.message || data.error || `HTTP ${res.status}`)
    }
    const raw = data.content.filter(b=>b.type==='text').map(b=>b.text).join('')
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
    document.getElementById(id).className = 'ld-s'+(i+1<n?' done':i+1===n?' now':'')
  })
  const m=['','Extraindo cores reais...','Analisando composição...','Testando combinações...','Montando plano...']
  document.getElementById('ldtxt').textContent = m[n]
}

function buildPrompt(H,P,kw,kc,colorCtx,igCtx,size,totalPhotos,isAdvanced=false) {
  const axis = CONTRAST_AXES.find(a => a.id === selC)
  const kelvinLine = axis?.useKelvin ? `Kelvin-Q=ate${kw}K Kelvin-F=acima${kc}K` : '(Kelvin é referência mas não é o eixo principal)'
  const rows = Math.ceil(size / 3)
  let gridMap = ''
  for (let r = 0; r < rows; r++) {
    const rowSlots = []
    for (let c = 2; c >= 0; c--) {
      const slotNum = r*3+(2-c)+1
      if (slotNum <= size) rowSlots.push(`col${c+1}=slot${slotNum}`)
    }
    gridMap += `Linha ${r+1}: ${rowSlots.join(' | ')}\n`
  }
  return `Especialista em color grading e grid Instagram outdoor/adventure.

REGRA CRÍTICA: slot 1 = PRIMEIRO a ser postado = posição SUPERIOR DIREITA do grid.

MAPA DO GRID (${size} posts, ${rows} linha${rows>1?'s':''}):
${gridMap}
CORES K-MEANS LAB:
${colorCtx}${igCtx}

CONFIG: Harmonia=${H.name} Padrao=${P.name} ${kelvinLine} Posts=${size}
${axis?.prompt || ''}

REGRA DE ACENTO CROMÁTICO (CRÍTICA):
Fotos com acento=ACENTO_* têm um elemento focal quente/saturado (gorro, trailer, pôr do sol) mesmo que o fundo seja frio.
NUNCA coloque dois slots com ACENTO_* adjacentes (horizontal ou vertical).
Alterne sempre: SEM_ACENTO · ACENTO · SEM_ACENTO · ACENTO.
O acento é o critério primário — antes de temperatura geral, antes de tipo de sujeito.
Fotos NEUTRO ou FRIO sem acento são os separadores naturais entre acentos quentes.

REGRA DE DIVERSIDADE VISUAL:
1. Nunca coloque dois slots com pessoa como sujeito dominante lado a lado.
2. Prefira intercalar: PAISAGEM · PESSOA · PAISAGEM.
3. Grupos/multidão = "pessoa" para esta regra.
4. Detalhes funcionam como separador.
5. Para feeds paisagem-dominante: alterne escala (panorama vs plano fechado).

RETORNE APENAS JSON SEM MARKDOWN:
{"plan":[{"slot":1,"photo":N,"grid_position":"top-right","temp":"cool","kelvin":"7500K","contrast_role":"frio","type":"TIPO","harmony_role":"papel na harmonia","reason":"max 70 chars","preset":"ajustes PS/LR max 60 chars"}],"overview":"1 frase","harmony_note":"1 frase com eixo usado"}

Slots: ${Array.from({length:size},(_,i)=>i+1).join(', ')}
Fotos: 1 a ${totalPhotos}`
}

// ── Local reordering ──────────────────────────────────
// Graph 2-coloring: guarantees no two same-group photos are adjacent (horiz or vert)
// For a 3xM grid, the optimal non-adjacent assignment has a closed-form solution:
// cell (row, col) gets group A if (row + col) is even, B if odd — exactly like a chessboard
// This is mathematically proven to be the only valid 2-coloring for a grid graph
function buildGridColorMap(rows) {
  // Returns array[visualIndex] = 'A' | 'B'
  // Visual index: left→right, top→bottom (0=top-left, 1=top-center, 2=top-right, ...)
  const map = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < 3; c++)
      map.push((r + c) % 2 === 0 ? 'A' : 'B')
  return map
}

// Verify no two adjacent cells have same group (debug helper)
function verifyNoAdjacentConflict(assignment, rows) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 3; c++) {
      const vi = r*3 + c
      const group = assignment[vi]
      // Check right neighbor
      if (c < 2 && assignment[vi+1] === group) return false
      // Check bottom neighbor
      if (r < rows-1 && assignment[vi+3] === group) return false
    }
  }
  return true
}

// Build pattern-aware accent placement map
// Returns array[visualIndex (left→right, top→bottom)] = 'A' | 'B'
// Rules per pattern:
//   checkerboard: 2 acentos/linha → laterais (col0,col2) | 1 acento/linha → centro (col1) | 0 → respiro
//   columns:      distribui acentos em colunas — 1 col → centro | 2 cols → laterais | 3 cols → todas
//   rows:         distribui acentos em linhas inteiras — proporcional ao ratio
//   diagonal:     diagonal clássica (row+col)%2
//   free:         sem mapa — ordena por score
function buildPatternMap(rows, totalAccents, totalPhotos, pattern) {
  const map = []  // 'A' = acento, 'B' = neutro
  const ratio = totalAccents / totalPhotos

  if (pattern === 'checkerboard') {
    // Distribute accents across rows:
    // - Rows with 2 accents → laterais (col0, col2)
    // - Rows with 1 accent  → centro (col1)
    // - Rows with 0 accents → respiro total
    // Priority: fill pairs first (2/row), then singles (1/row), then respiro
    let remaining = totalAccents
    const rowPlan = []  // how many accents per row
    for (let r = 0; r < rows; r++) {
      if (remaining >= 2 && r % 2 === 0) { rowPlan.push(2); remaining -= 2 }
      else if (remaining === 1)           { rowPlan.push(1); remaining -= 1 }
      else                                { rowPlan.push(0) }
    }
    // If still remaining after first pass, fill remaining rows
    for (let r = 0; r < rows && remaining > 0; r++) {
      if (rowPlan[r] === 0) {
        if (remaining >= 2) { rowPlan[r] = 2; remaining -= 2 }
        else                { rowPlan[r] = 1; remaining -= 1 }
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 3; c++) {
        if (rowPlan[r] === 2) map.push(c === 1 ? 'B' : 'A')  // [A][n][A] laterais
        else if (rowPlan[r] === 1) map.push(c === 1 ? 'A' : 'B')  // [n][A][n] centro
        else map.push('B')  // [n][n][n] respiro
      }
    }
  } else if (pattern === 'columns') {
    // Quantas colunas de acento: 1=centro, 2=laterais, 3=todas
    const accentCols = ratio < 0.4 ? [1] : ratio < 0.7 ? [0, 2] : [0, 1, 2]
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < 3; c++)
        map.push(accentCols.includes(c) ? 'A' : 'B')
  } else if (pattern === 'rows') {
    // Quantas linhas de acento
    const accentRows = ratio < 0.4 ? 1 : ratio < 0.7 ? Math.ceil(rows * 0.5) : rows
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < 3; c++)
        map.push(r < accentRows ? 'A' : 'B')
  } else if (pattern === 'diagonal') {
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < 3; c++)
        map.push((r + c) % 2 === 0 ? 'A' : 'B')
  } else {
    // default: graph 2-coloring
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < 3; c++)
        map.push((r + c) % 2 === 0 ? 'A' : 'B')
  }
  return map
}

function applyReorder(scoredPhotos) {
  if (!scoredPhotos.length || !originalPlan.length) return
  currentPlan = JSON.parse(JSON.stringify(originalPlan))

  const size = currentPlan.length
  const rows = Math.ceil(size / 3)

  // Instagram slot order: slot 1 = top-right, fills right→left per row
  // visualIndex: left→right, top→bottom — col0=esquerda, col1=centro, col2=direita
  const visualToSlot = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < 3; c++) {
      const slotNum = r*3 + (2-c) + 1  // Instagram: right→left (col2=slot1, col1=slot2, col0=slot3)
      if (slotNum <= size) visualToSlot.push(slotNum)
    }

  const groupA = scoredPhotos.filter(p => p.group === 'A').sort((a,b) => b.score - a.score)
  const groupB = scoredPhotos.filter(p => p.group === 'B').sort((a,b) => b.score - a.score)

  if (selP === 'free') {
    const sorted = [...scoredPhotos].sort((a,b) => b.score - a.score)
    visualToSlot.forEach((slotNum, vi) => {
      const photo = sorted[vi]; if (!photo) return
      const item = currentPlan.find(x => x.slot === slotNum)
      if (item) item.photo = photo.repoIdx + 1
    })
  } else {
    const colorMap = buildPatternMap(rows, groupA.length, size, selP)

    let aiA = 0, aiB = 0
    visualToSlot.forEach((slotNum, vi) => {
      const wantsGroup = colorMap[vi] || 'B'
      let photo
      if (wantsGroup === 'A' && groupA[aiA])      photo = groupA[aiA++]
      else if (wantsGroup === 'B' && groupB[aiB]) photo = groupB[aiB++]
      else if (groupA[aiA])                        photo = groupA[aiA++]  // overflow
      else if (groupB[aiB])                        photo = groupB[aiB++]  // overflow
      if (!photo) return
      const item = currentPlan.find(x => x.slot === slotNum)
      if (item) item.photo = photo.repoIdx + 1
    })
  }

  currentPlan.forEach(s => { feedSlots[s.slot-1] = s.photo-1 })
  renderUploadGrid(); renderDetails()
}

function reorderByAxis(axisId) {
  if (!originalPlan.length) return
  const photos = originalPlan.map(s => {
    const p = repository[s.photo-1]; if (!p) return null
    const repoIdx = s.photo-1
    let score, group
    switch (axisId) {
      case 'temperature':
        // Group by accent presence first — photos with warm accent (orange hat, trailer)
        // should alternate with cold/neutral even if overall Kelvin is similar
        score = p.hasAccent ? 1000 + (10000 - p.kelvin) : p.kelvin
        group = (p.hasAccent || p.kelvin < 5000) ? 'A' : 'B'
        break
      case 'luminance': { const L=p.colors?.length?hexToL(p.colors[0].hex):50; score=L; group=L>55?'A':'B'; break }
      case 'subject': { const t=(s.type||'').toUpperCase(); score=t.includes('RETRATO')||t.includes('PESSOA')?2:t.includes('DETALHE')?1:0; group=(t.includes('RETRATO')||t.includes('PESSOA')||t.includes('GRUPO'))?'B':'A'; break }
      case 'saturation': { const sat=estimateSaturation(p.colors); score=sat; group=sat>0.35?'A':'B'; break }
      case 'combined': default: {
        const kelvins=currentPlan.map(x=>repository[x.photo-1]?.kelvin||5500)
        const kVar=Math.max(...kelvins)-Math.min(...kelvins)
        const lums=currentPlan.map(x=>{const ph=repository[x.photo-1];return ph?.colors?.length?hexToL(ph.colors[0].hex):50})
        const lVar=Math.max(...lums)-Math.min(...lums)
        return reorderByAxis(kVar>2000?'temperature':lVar>20?'luminance':'subject'),null
      }
    }
    return { repoIdx, score, group }
  }).filter(Boolean)
  applyReorder(photos)
}

function reorderByHarmony(harmonyId) {
  if (!originalPlan.length) return
  const photos = originalPlan.map(s => {
    const p=repository[s.photo-1]; if (!p) return null
    const repoIdx=s.photo-1
    const hex=p.colors?.[0]?.hex||'#888888'
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16)
    const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min
    let hue=0
    if (d>0) { if (max===r) hue=((g-b)/d+(g<b?6:0))*60; else if (max===g) hue=((b-r)/d+2)*60; else hue=((r-g)/d+4)*60 }
    const warm=p.kelvin<5000, L=hexToL(hex), sat=estimateSaturation(p.colors)
    return { repoIdx, hue, warm, L, sat, kelvin:p.kelvin }
  }).filter(Boolean)
  let scored
  switch (harmonyId) {
    case 'complementary':
      // Accent presence is the primary contrast — orange hat vs cold landscape
      scored = photos.map(p => {
        const ph = repository[p.repoIdx]
        const hasAccent = ph?.hasAccent || p.warm
        return { ...p, score: hasAccent ? 100 - p.kelvin/100 : p.kelvin/100, group: hasAccent ? 'A' : 'B' }
      })
      break
    case 'analogous':     scored=photos.map(p=>({...p,score:p.hue,group:p.hue<180?'A':'B'})); break
    case 'split': case 'triad': case 'square': scored=photos.map(p=>({...p,score:p.hue,group:Math.floor(p.hue/120)%2===0?'A':'B'})); break
    case 'monochrome': scored=photos.map(p=>({...p,score:p.L,group:p.L>55?'A':'B'})); break
    case 'shades':     scored=photos.map(p=>({...p,score:p.L,group:p.L<35?'A':'B'})); break
    case 'custom': default: reorderByAxis(selC); return
  }
  applyReorder(scored)
}
