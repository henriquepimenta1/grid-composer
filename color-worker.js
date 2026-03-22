// color-worker.js — K-means LAB engine (Web Worker)
// Float32Array packed arrays + early-exit convergence + ICtCp Kelvin
// Roda fora da main thread: UI nunca trava durante extração de cores

// ── Conversões de cor ─────────────────────────────────

function rgbToLab(r, g, b) {
  let R=r/255, G=g/255, B=b/255
  R = R>.04045 ? Math.pow((R+.055)/1.055,2.4) : R/12.92
  G = G>.04045 ? Math.pow((G+.055)/1.055,2.4) : G/12.92
  B = B>.04045 ? Math.pow((B+.055)/1.055,2.4) : B/12.92
  let X=R*.4124564+G*.3575761+B*.1804375, Y=R*.2126729+G*.7151522+B*.072175, Z=R*.0193339+G*.119192+B*.9503041
  X/=.95047; Z/=1.08883
  const f = v => v>.008856 ? Math.cbrt(v) : 7.787*v+16/116
  return [116*f(Y)-16, 500*(f(X)-f(Y)), 200*(f(Y)-f(Z))]
}

function labToRgb(L, a, b) {
  let Y=(L+16)/116, X=a/500+Y, Z=Y-b/200
  X = (Math.pow(X,3)>.008856 ? Math.pow(X,3) : (X-16/116)/7.787) * .95047
  Y =  Math.pow(Y,3)>.008856 ? Math.pow(Y,3) : (Y-16/116)/7.787
  Z = (Math.pow(Z,3)>.008856 ? Math.pow(Z,3) : (Z-16/116)/7.787) * 1.08883
  let R=X*3.2404542+Y*-1.5371385+Z*-.4985314
  let G=X*-.969266 +Y*1.8760108 +Z*.041556
  let Bv=X*.0556434 +Y*-.2040259 +Z*1.0572252
  R  = R >.0031308 ? 1.055*Math.pow(R, 1/2.4)-.055 : 12.92*R
  G  = G >.0031308 ? 1.055*Math.pow(G, 1/2.4)-.055 : 12.92*G
  Bv = Bv>.0031308 ? 1.055*Math.pow(Bv,1/2.4)-.055 : 12.92*Bv
  return [
    Math.round(Math.max(0,Math.min(255,R*255))),
    Math.round(Math.max(0,Math.min(255,G*255))),
    Math.round(Math.max(0,Math.min(255,Bv*255)))
  ]
}

function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('')
}

// ICtCp Ct axis: negativo=quente, positivo=frio
function rgbToCt(r, g, b) {
  const lin = v => { v/=255; return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4) }
  const rl=lin(r), gl=lin(g), bl=lin(b)
  const r2= .627404*rl+.329283*gl+.043313*bl
  const g2= .069097*rl+.919540*gl+.011362*bl
  const b2= .016391*rl+.088013*gl+.895595*bl
  const L=.412109*r2+.523926*g2+.063965*b2
  const M=.166748*r2+.720459*g2+.112793*b2
  const S=.024193*r2+.075241*g2+.900566*b2
  const pq = v => { const vp=Math.pow(Math.max(v,0),.1593017578125); return Math.pow((.8359375+18.8515625*vp)/(1+18.6875*vp),134.034375) }
  return 1.613769531*pq(L) - 3.323486328*pq(M) + 1.709716797*pq(S)
}

function estimateKelvin(colors) {
  if (!colors.length) return 6500
  let totalPct=0, weightedCt=0
  for (const c of colors) {
    const r=parseInt(c.hex.slice(1,3),16), g=parseInt(c.hex.slice(3,5),16), b=parseInt(c.hex.slice(5,7),16)
    weightedCt += rgbToCt(r,g,b) * c.pct
    totalPct   += c.pct
  }
  if (!totalPct) return 6500
  const ct = weightedCt / totalPct
  if (ct<-.20) return 2200
  if (ct<-.10) return 3500
  if (ct<-.03) return 4500
  if (ct< .01) return 5500
  if (ct< .04) return 7000
  if (ct< .07) return 8500
  return 10000
}

function detectAccent(colors) {
  for (const c of colors) {
    const r=parseInt(c.hex.slice(1,3),16), g=parseInt(c.hex.slice(3,5),16), b=parseInt(c.hex.slice(5,7),16)
    const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min
    if (!max||!d) continue
    const sat=d/max
    let hue=0
    if      (max===r) hue=((g-b)/d+(g<b?6:0))*60
    else if (max===g) hue=((b-r)/d+2)*60
    else              hue=((r-g)/d+4)*60
    if (sat>.45 && (hue<=45||hue>=330)) return true
  }
  return false
}

// ── K-means LAB com Float32Array ─────────────────────
// Float32Array packed [L0,a0,b0, L1,a1,b1, ...] = cache-friendly, sem GC

function extractColorsWorker(pixels, width, height, k) {
  const BLOCK = 4
  const maxN = Math.ceil(width/BLOCK) * Math.ceil(height/BLOCK)
  const samples = new Float32Array(maxN * 3)   // packed LAB
  const posX    = new Float32Array(maxN)
  const posY    = new Float32Array(maxN)
  let n = 0

  // Mosaic 4×4: cada bloco vira 1 sample (preserva acentos pequenos)
  for (let by=0; by<height; by+=BLOCK) {
    for (let bx=0; bx<width; bx+=BLOCK) {
      let rS=0,gS=0,bS=0,cnt=0
      for (let dy=0; dy<BLOCK&&by+dy<height; dy++) {
        for (let dx=0; dx<BLOCK&&bx+dx<width; dx++) {
          const idx=((by+dy)*width+(bx+dx))*4
          if (pixels[idx+3]<128) continue
          rS+=pixels[idx]; gS+=pixels[idx+1]; bS+=pixels[idx+2]; cnt++
        }
      }
      if (!cnt) continue
      const [L,a,b]=rgbToLab(rS/cnt, gS/cnt, bS/cnt)
      const si=n*3
      samples[si]=L; samples[si+1]=a; samples[si+2]=b
      posX[n]=(bx+BLOCK/2)/width; posY[n]=(by+BLOCK/2)/height
      n++
    }
  }
  if (!n) return []

  // k-means++ init determinístico: escolhe pontos mais distantes uns dos outros
  const centroids = new Float32Array(k*3)
  const startIdx  = Math.floor(n/2)*3
  centroids[0]=samples[startIdx]; centroids[1]=samples[startIdx+1]; centroids[2]=samples[startIdx+2]

  for (let ci=1; ci<Math.min(k,n); ci++) {
    let maxD=0, maxPi=0
    for (let pi=0; pi<n; pi++) {
      const si=pi*3; let minD=Infinity
      for (let cc=0; cc<ci; cc++) {
        const co=cc*3
        const dL=samples[si]-centroids[co], da=samples[si+1]-centroids[co+1], db=samples[si+2]-centroids[co+2]
        const d=dL*dL+da*da+db*db
        if (d<minD) minD=d
      }
      if (minD>maxD) { maxD=minD; maxPi=pi }
    }
    const si=maxPi*3
    centroids[ci*3]=samples[si]; centroids[ci*3+1]=samples[si+1]; centroids[ci*3+2]=samples[si+2]
  }

  const assignments = new Uint8Array(n)
  // Threshold de convergência: 0.5² LAB ≈ imperceptível ao olho
  const CONVERGE_SQ = 0.25

  for (let it=0; it<20; it++) {
    let changed = false

    // Assign
    for (let pi=0; pi<n; pi++) {
      const si=pi*3; let bestC=0, bestD=Infinity
      for (let ci=0; ci<k; ci++) {
        const co=ci*3
        const dL=samples[si]-centroids[co], da=samples[si+1]-centroids[co+1], db=samples[si+2]-centroids[co+2]
        const d=dL*dL+da*da+db*db
        if (d<bestD) { bestD=d; bestC=ci }
      }
      if (assignments[pi]!==bestC) { assignments[pi]=bestC; changed=true }
    }
    if (!changed) break  // saída antecipada: nenhuma reatribuição

    // Recompute centroids
    const newC = new Float32Array(k*3)
    const cnt  = new Uint32Array(k)
    for (let pi=0; pi<n; pi++) {
      const ci=assignments[pi], si=pi*3, co=ci*3
      newC[co]+=samples[si]; newC[co+1]+=samples[si+1]; newC[co+2]+=samples[si+2]
      cnt[ci]++
    }
    let maxMove=0
    for (let ci=0; ci<k; ci++) {
      if (!cnt[ci]) continue
      const co=ci*3
      newC[co]/=cnt[ci]; newC[co+1]/=cnt[ci]; newC[co+2]/=cnt[ci]
      const dL=newC[co]-centroids[co], da=newC[co+1]-centroids[co+1], db=newC[co+2]-centroids[co+2]
      maxMove=Math.max(maxMove, dL*dL+da*da+db*db)
    }
    centroids.set(newC)
    if (maxMove<CONVERGE_SQ) break  // centroides convergidos
  }

  // Agregar resultados
  const cntF=new Uint32Array(k), sPX=new Float32Array(k), sPY=new Float32Array(k)
  for (let pi=0; pi<n; pi++) {
    const ci=assignments[pi]; cntF[ci]++; sPX[ci]+=posX[pi]; sPY[ci]+=posY[pi]
  }
  const out=[]
  for (let ci=0; ci<k; ci++) {
    if (!cntF[ci]) continue
    const co=ci*3
    const [r,g,b]=labToRgb(centroids[co], centroids[co+1], centroids[co+2])
    out.push({ hex:rgbToHex(r,g,b), pct:Math.round(cntF[ci]/n*100), cx:sPX[ci]/cntF[ci], cy:sPY[ci]/cntF[ci] })
  }
  return out.sort((a,b)=>b.pct-a.pct).slice(0,5)
}

// ── Message handler ───────────────────────────────────
self.onmessage = function({ data }) {
  const { id, pixels, width, height, k=5 } = data
  try {
    const colors    = extractColorsWorker(new Uint8ClampedArray(pixels), width, height, k)
    const kelvin    = estimateKelvin(colors)
    const hasAccent = detectAccent(colors)
    self.postMessage({ id, colors, kelvin, hasAccent })
  } catch(err) {
    self.postMessage({ id, error: err.message })
  }
}
