// state.js — App constants and global state

const HARMONIES = [
  { id:'custom', name:'✦ IA decide', dot:'linear-gradient(135deg,var(--ig))', colors:['#888888','#444444'], angle:'auto', when:'A IA analisa suas fotos e escolhe a harmonia que melhor se aplica ao conjunto. Ideal quando você não tem certeza.', example:'🤖 análise automática do conjunto', feel:'Adaptativo · otimizado para suas fotos', highlight:true },
  { id:'complementary', name:'Complementar', dot:'linear-gradient(135deg,#C4853A,#3A5870)', colors:['#C4853A','#3A5870'], angle:'180°', when:'Máximo contraste. Fotos de pôr do sol (laranja) intercaladas com mar ou floresta (teal). O par mais impactante do círculo cromático.', example:'🌅 laranja + 🌊 teal', feel:'Dramático · energético · forte' },
  { id:'analogous', name:'Análogo', dot:'linear-gradient(135deg,#4A8A9A,#5A8A6A,#8A9A4A)', colors:['#4A8A9A','#5A8A6A','#8A9A4A'], angle:'0–60°', when:'Cores vizinhas no círculo. Feed suave e coeso. Ideal para natureza verde-azul ou tons terrosos.', example:'🟢 verde + 🔵 azul-verde', feel:'Suave · harmonioso · natural' },
  { id:'split', name:'Split Complementar', dot:'linear-gradient(135deg,#C4853A,#3A7870,#3A4A88)', colors:['#C4853A','#3A7870','#3A4A88'], angle:'±30°', when:'Contraste forte mas menos agressivo que o complementar. Cor dominante vs dois vizinhos do oposto.', example:'🟠 laranja + 🔵 teal + 🟦 azul', feel:'Vibrante · sofisticado · equilibrado' },
  { id:'triad', name:'Tríade', dot:'linear-gradient(135deg,#C4853A,#3A7A9A,#8A3A9A)', colors:['#C4853A','#3A7A9A','#8A3A9A'], angle:'120°', when:'Três cores igualmente espaçadas. Feed colorido. Funciona bem quando cada foto tem uma cor dominante diferente.', example:'🟠 laranja + 🔵 azul + 🟣 roxo', feel:'Colorido · vibrante · criativo' },
  { id:'monochrome', name:'Monocromático', dot:'linear-gradient(135deg,#0A2A3A,#1A5A7A,#4A9AB8)', colors:['#0A2A3A','#1A5A7A','#4A9AB8'], angle:'1 matiz', when:'Um único matiz em diferentes saturações e luminâncias. Feed minimalista e elegante.', example:'🔵 azul escuro → azul médio → azul claro', feel:'Elegante · minimalista · coeso' },
  { id:'square', name:'Quadrado', dot:'linear-gradient(135deg,#C4853A,#3A8A4A,#3A5870,#8A3A7A)', colors:['#C4853A','#3A8A4A','#3A5870','#8A3A7A'], angle:'4×90°', when:'Quatro cores em quadrado no círculo. Feed rico e complexo.', example:'🟠 + 🟢 + 🔵 + 🟣', feel:'Complexo · rico · arrojado' },
  { id:'shades', name:'Sombras', dot:'linear-gradient(135deg,#0A0E12,#142028,#1C3040)', colors:['#0A0E12','#142028','#1C3040'], angle:'dark', when:'Tons escuros e sombrios, baixa saturação. Feed cinematográfico.', example:'⬛ preto + 🌑 cinza escuro + azul noite', feel:'Misterioso · cinematográfico · dramático' },
]

const PATTERNS = [
  { id:'free', name:'✦ Livre (IA)', cells:[null,null,null,null,null,null], when:'A IA decide o melhor arranjo para o seu conjunto específico de fotos.', example:'🤖 arranjo otimizado pela IA', feel:'Flexível · otimizado · adaptativo', highlight:true },
  { id:'checkerboard', name:'Xadrez', cells:[false,true,false,true,false,true], when:'Alterna duas fotos de perfil opostas em cada posição. O padrão mais clássico do Instagram.', example:'🟠 frio · quente 🔵\n🔵 quente · frio 🟠', feel:'Rítmico · dinâmico · fácil de manter' },
  { id:'columns', name:'Colunas', cells:[false,false,true,false,false,true], when:'Uma coluna inteira com um perfil, outra coluna com outro. Cria faixas verticais no feed.', example:'frio | frio | quente\nfrio | frio | quente', feel:'Estruturado · limpo · editorial' },
  { id:'rows', name:'Linhas', cells:[true,true,true,false,false,false], when:'Cada linha do grid tem um perfil diferente. Conta uma história por faixa horizontal.', example:'quente quente quente\nfrio   frio   frio', feel:'Narrativo · por capítulos · bold' },
  { id:'diagonal', name:'Diagonal', cells:[false,false,true,false,true,false], when:'Contraste em diagonal — mais sofisticado que o xadrez.', example:'frio  · frio  · quente\nfrio  · quente · frio', feel:'Sofisticado · fluido · moderno' },
]

const CONTRAST_AXES = [
  { id:'combined', icon:'✦', name:'Combinado (IA)', sub:'IA escolhe o melhor eixo', useKelvin:true, info:'A IA analisa todas as fotos e escolhe automaticamente qual eixo gera o grid mais harmônico.', example:'🤖 análise automática do conjunto', prompt:'Eixo COMBINADO. Analise as fotos e escolha o melhor eixo. Explique no harmony_note.', highlight:true },
  { id:'temperature', icon:'🌡️', name:'Temperatura', sub:'Quente vs Frio · Kelvin', useKelvin:true, info:'Usa a temperatura de cor (Kelvin) como eixo. Fotos quentes têm Kelvin baixo. Fotos frias têm Kelvin alto.', example:'🌅 quente (3200K) ↔ 🌊 frio (7500K)', prompt:'Eixo TEMPERATURA. Alterne slots quentes (Kelvin baixo) e frios (Kelvin alto).' },
  { id:'luminance', icon:'☀️', name:'Luminância', sub:'Claro vs Escuro', useKelvin:false, info:'Alterna pela luminosidade. Foto clara vs foto escura. Perfeito para feeds todos quentes.', example:'☀️ claro (duna) ↔ 🌑 escuro (gruta)', prompt:'Eixo LUMINANCIA. Alterne fotos claras com fotos escuras.' },
  { id:'subject', icon:'🔭', name:'Plano / Sujeito', sub:'Close · Paisagem · Detalhe', useKelvin:false, info:'Alterna pelo tipo de enquadramento. Retrato vs Paisagem vs Detalhe.', example:'🧍 retrato ↔ 🏔️ paisagem ↔ 🔍 detalhe', prompt:'Eixo TIPO DE PLANO. Alterne: RETRATO, PAISAGEM, DETALHE.' },
  { id:'saturation', icon:'🎨', name:'Saturação', sub:'Vívido vs Dessaturado', useKelvin:false, info:'Alterna entre fotos vívidas e fotos dessaturadas ou com névoa.', example:'🎨 saturado (pôr do sol) ↔ 🌫️ muted (névoa)', prompt:'Eixo SATURACAO. Alterne fotos vívidas com fotos dessaturadas.' },
]

// ── Global state ──────────────────────────────────────
let selH = 'custom', selP = 'free', selC = 'combined'
let repository      = []              // {file, dataUrl, cropUrl, compressed, colors, kelvin, hasAccent}
let existingPhotos  = []              // {dataUrl, compressed, colors, kelvin, hasAccent} — fotos já postadas (contexto)
let feedSlots       = [null,null,null] // indices into repository — SÓ para novos posts
let planSize        = 3               // quantos novos posts planejar (1, 2, 3, 6, 9...)
let currentPlan     = []
let originalPlan    = []
let currentHarmony  = null
let isManualMode    = false
let repoDragIdx     = null, dragSource = null
let slotTargetIdx   = null, ugDragging = false, ugDragIdx = null
let gridDragSlot    = null
let currentUserPlan = 'free'  // cached from last loadCredits

// Legacy alias
Object.defineProperty(window, 'photos', {
  get() { return feedSlots.map(i => i !== null ? repository[i] : null) },
  configurable: true
})

function readFile(f) { return new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsDataURL(f) }) }
function loadImg(s)  { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s }) }

// Max repo size by plan
function maxRepoSize() { return currentUserPlan === 'studio' ? 30 : 12 }
