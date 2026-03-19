// howto.js — Grid Composer · Guia de uso

const HOWTO_STEPS = {
  pt: [
    {
      icon: '📐',
      title: 'Escolha quantos posts planejar',
      desc: 'No topo, selecione <strong>3, 6 ou 9 posts</strong>. Isso define quantos slots aparecem no grid. Comece com 3 se for a primeira vez.',
      tip: 'Dica: 3 posts = 1 linha do grid. 6 = 2 linhas. 9 = 3 linhas completas.',
    },
    {
      icon: '🖼️',
      title: 'Adicione suas fotos',
      desc: 'Clique em cada slot vazio para selecionar uma foto, ou arraste várias fotos de uma vez na zona de upload abaixo do grid.',
      tip: 'As fotos já entram editadas — não precisa de ajuste aqui. <br>💡 Clique simples = ver paleta de cores · Duplo clique = recortar',
    },
    {
      icon: '🎨',
      title: 'Configure a harmonia e o eixo',
      desc: 'Na barra lateral, escolha a <strong>Harmonia cromática</strong> (relação de cores entre as fotos) e o <strong>Eixo de contraste</strong> (como as fotos alternam no grid).',
      tip: 'Não sabe qual escolher? Use <em>IA decide</em> na harmonia e <em>Combinado (IA)</em> no eixo — a IA analisa e escolhe o melhor.',
    },
    {
      icon: '🔵🟠',
      title: 'Harmonia ≠ Contraste — entenda a diferença',
      desc: '<strong>Harmonia</strong> define quais cores combinam no feed inteiro — como a paleta geral do seu perfil visto de longe.<br><br><strong>Eixo de contraste</strong> define o ritmo entre posts adjacentes — o que alterna de foto em foto.<br><br><strong>Padrão de grid</strong> define em quais posições da grade cada tipo de foto fica.',
      tip: 'Exemplo: Harmonia=Complementar (laranja+teal) · Eixo=Temperatura (quente↔frio) · Padrão=Xadrez → resultado: laranja e teal alternando em xadrez pelo feed.',
    },
    {
      icon: '✦',
      title: 'Compor com IA ou organizar manualmente',
      desc: '<strong>Compor com IA</strong> analisa as cores reais das fotos e sugere a sequência ideal para o seu grid, incluindo quais fotos ficam em quais slots e os ajustes de edição.\n\n<strong>Organizar manualmente</strong> exibe o grid para você arrastar e reposicionar as fotos como preferir — sem consumir créditos.',
      tip: '✦ A IA usa k-means LAB — o mesmo algoritmo do Adobe Color — para extrair as cores reais.',
    },
    {
      icon: '📊',
      title: 'Leia o resultado',
      desc: 'O resultado mostra o grid como ficará no Instagram — da <strong>direita para esquerda</strong>, de cima para baixo. Clique em qualquer foto do grid para ver por que ela foi escolhida para aquele slot.',
      tip: '🔄 Arraste as fotos no resultado para trocar de posição sem gastar crédito.',
    },
    {
      icon: '📸',
      title: 'Poste na ordem certa',
      desc: 'O <strong>slot +1</strong> é a primeira foto a ser postada. Poste na ordem crescente dos slots — o Instagram sempre empurra o novo post para o canto superior esquerdo.',
      tip: 'Slot 1 → poste primeiro → vai para o topo direito depois que os próximos forem postados.',
    },
  ],
  en: [
    {
      icon: '📐',
      title: 'Choose how many posts to plan',
      desc: 'At the top, select <strong>3, 6 or 9 posts</strong>. This defines how many slots appear in the grid. Start with 3 if it\'s your first time.',
      tip: 'Tip: 3 posts = 1 grid row. 6 = 2 rows. 9 = 3 complete rows.',
    },
    {
      icon: '🖼️',
      title: 'Add your photos',
      desc: 'Click each empty slot to select a photo, or drag multiple photos at once onto the upload area below the grid.',
      tip: 'Photos go in already edited — no adjustments needed here.<br>💡 Single click = view color palette · Double click = crop',
    },
    {
      icon: '🎨',
      title: 'Set harmony and contrast axis',
      desc: 'In the sidebar, choose a <strong>Color harmony</strong> (color relationship between photos) and a <strong>Contrast axis</strong> (how photos alternate in the grid).',
      tip: 'Not sure? Use <em>AI picks best</em> for harmony and <em>Combined (AI)</em> for axis — AI analyzes and picks the best.',
    },
    {
      icon: '🔵🟠',
      title: 'Harmony ≠ Contrast — know the difference',
      desc: '<strong>Harmony</strong> defines which colors work together in your feed — the overall palette your profile shows from a distance.<br><br><strong>Contrast axis</strong> defines the rhythm between adjacent posts — what alternates photo by photo.<br><br><strong>Grid pattern</strong> defines which positions in the grid each type of photo occupies.',
      tip: 'Example: Harmony=Complementary (orange+teal) · Axis=Temperature (warm↔cool) · Pattern=Checkerboard → result: orange and teal alternating in a checkerboard across your feed.',
    },
    {
      icon: '✦',
      title: 'Compose with AI or arrange manually',
      desc: '<strong>Compose with AI</strong> analyzes the real colors in your photos and suggests the ideal sequence for your grid, including which photos go in which slots.\n\n<strong>Arrange manually</strong> shows the grid so you can drag and reposition photos freely — no credits used.',
      tip: '✦ AI uses k-means LAB — the same algorithm as Adobe Color — to extract real colors.',
    },
    {
      icon: '📊',
      title: 'Read the result',
      desc: 'The result shows your grid as it will appear on Instagram — from <strong>right to left</strong>, top to bottom. Click any photo in the grid to see why it was chosen for that slot.',
      tip: '🔄 Drag photos in the result to swap positions without spending credits.',
    },
    {
      icon: '📸',
      title: 'Post in the right order',
      desc: '<strong>Slot +1</strong> is the first photo to post. Post in ascending slot order — Instagram always pushes the newest post to the top-left corner.',
      tip: 'Slot 1 → post first → ends up top-right after the next ones are posted.',
    },
  ]
}

// ── Open / Close ──────────────────────────────────────
let howtoStep = 0

function openHowTo() {
  howtoStep = 0
  renderHowTo()
  document.getElementById('howto-modal').classList.add('open')
}

function closeHowTo() {
  document.getElementById('howto-modal')?.classList.remove('open')
}

function howtoNav(dir) {
  const steps = HOWTO_STEPS[typeof LANG !== 'undefined' ? LANG : 'pt']
  howtoStep = Math.max(0, Math.min(steps.length - 1, howtoStep + dir))
  renderHowTo()
}

function renderHowTo() {
  const lang  = typeof LANG !== 'undefined' ? LANG : 'pt'
  const steps = HOWTO_STEPS[lang]
  const step  = steps[howtoStep]
  const total = steps.length
  const dots  = steps.map((_, i) =>
    `<div class="ht-dot ${i===howtoStep?'active':i<howtoStep?'done':''}"
      onclick="howtoStep=${i};renderHowTo()"></div>`
  ).join('')
  const isLast  = howtoStep === total - 1
  const isFirst = howtoStep === 0
  document.getElementById('howto-content').innerHTML = `
    <div class="ht-step-icon">${step.icon}</div>
    <div class="ht-step-num">Passo ${howtoStep+1} de ${total}</div>
    <div class="ht-step-title">${step.title}</div>
    <div class="ht-step-desc">${step.desc.replace(/\n\n/g,'<br><br>')}</div>
    ${step.tip ? `<div class="ht-step-tip">💡 ${step.tip}</div>` : ''}
  `
  document.getElementById('howto-dots').innerHTML = dots
  document.getElementById('howto-prev').style.visibility = isFirst ? 'hidden' : 'visible'
  document.getElementById('howto-next').textContent = isLast ? '✓ Entendi!' : 'Próximo →'
  document.getElementById('howto-next').onclick = isLast ? closeHowTo : () => howtoNav(1)
}

document.addEventListener('keydown', e => {
  const modal = document.getElementById('howto-modal')
  if (!modal?.classList.contains('open')) return
  if (e.key==='ArrowRight'||e.key==='ArrowDown') howtoNav(1)
  if (e.key==='ArrowLeft' ||e.key==='ArrowUp')   howtoNav(-1)
  if (e.key==='Escape') closeHowTo()
})
