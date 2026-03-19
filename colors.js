// colors.js — Color Engine (k-means LAB, Kelvin, compression)

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
  const px = [], pos = []
  for (let i = 0; i < data.length; i += 16) {
    if (data[i+3] < 128) continue
    const pi = i / 4
    px.push(rgbToLab(data[i], data[i+1], data[i+2]))
    pos.push({ x: (pi % w) / w, y: Math.floor(pi / w) / h })
  }
  if (!px.length) return []
  const c = [px[Math.floor(Math.random() * px.length)]]
  for (let ci = 1; ci < k; ci++) {
    const d = px.map(p => Math.min(...c.map(cc => labDist(p, cc))))
    const total = d.reduce((a,b) => a+b, 0)
    let r = Math.random() * total
    for (let pi = 0; pi < px.length; pi++) { r -= d[pi]; if (r <= 0) { c.push([...px[pi]]); break } }
    if (c.length <= ci) c.push([...px[Math.floor(Math.random() * px.length)]])
  }
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
  const sumX = new Array(k).fill(0)
  const sumY = new Array(k).fill(0)
  asgn.forEach((ci, pi) => { cnt[ci]++; sumX[ci] += pos[pi].x; sumY[ci] += pos[pi].y })
  return c.map((cc, ci) => {
    const [r,g,b] = labToRgb(cc[0], cc[1], cc[2])
    return {
      hex: rgbToHex(r,g,b),
      pct: Math.round(cnt[ci] / px.length * 100),
      cx: cnt[ci] > 0 ? sumX[ci] / cnt[ci] : 0.5,
      cy: cnt[ci] > 0 ? sumY[ci] / cnt[ci] : 0.5,
    }
  }).sort((a,b) => b.pct - a.pct).slice(0, 5)
}

function detectAccent(colors) {
  // Detect if photo has a vivid warm accent even if overall temp is cold
  // An "accent" is a color with high saturation AND warm hue (red/orange/yellow)
  // that appears even in small percentage
  for (const c of colors) {
    const r = parseInt(c.hex.slice(1,3), 16)
    const g = parseInt(c.hex.slice(3,5), 16)
    const b = parseInt(c.hex.slice(5,7), 16)
    const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min
    if (max === 0) continue
    const sat = d / max  // 0–1
    let hue = 0
    if (d > 0) {
      if (max===r)      hue = ((g-b)/d + (g<b?6:0)) * 60
      else if (max===g) hue = ((b-r)/d + 2) * 60
      else              hue = ((r-g)/d + 4) * 60
    }
    // Warm hue range: 0–45° (red/orange) or 330–360° (red)
    const isWarmHue = hue <= 45 || hue >= 330
    // High saturation threshold: >45%
    if (sat > 0.45 && isWarmHue) return true
  }
  return false
}

function estimateKelvin(colors) {
  if (!colors.length) return 6500
  let totalPct = 0, weightedB = 0
  for (const c of colors) {
    const r = parseInt(c.hex.slice(1,3), 16)
    const g = parseInt(c.hex.slice(3,5), 16)
    const b = parseInt(c.hex.slice(5,7), 16)
    const bStar = rgbToLab(r, g, b)[2]
    weightedB += bStar * c.pct
    totalPct  += c.pct
  }
  if (totalPct === 0) return 6500
  const avgB = weightedB / totalPct
  if (avgB > 18)  return 2200
  if (avgB > 10)  return 3500
  if (avgB > 3)   return 4500
  if (avgB > -3)  return 5500
  if (avgB > -10) return 7000
  if (avgB > -20) return 8500
  return 10000
}

function hexToL(hex) {
  const r = parseInt(hex.slice(1,3),16)/255
  const g = parseInt(hex.slice(3,5),16)/255
  const b = parseInt(hex.slice(5,7),16)/255
  const toLinear = c => c > 0.04045 ? Math.pow((c+0.055)/1.055, 2.4) : c/12.92
  const Y = 0.2126729*toLinear(r) + 0.7151522*toLinear(g) + 0.0721750*toLinear(b)
  const fy = Y > 0.008856 ? Math.cbrt(Y) : 7.787*Y + 16/116
  return 116*fy - 16
}

function estimateSaturation(colors) {
  if (!colors?.length) return 0
  const hex = colors[0].hex
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  return max === 0 ? 0 : (max - min) / max
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

async function makeThumb(dataUrl) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const cv = document.createElement('canvas')
      cv.width = 32; cv.height = 40
      cv.getContext('2d').drawImage(img, 0, 0, 32, 40)
      resolve(cv.toDataURL('image/jpeg', 0.6))
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}
