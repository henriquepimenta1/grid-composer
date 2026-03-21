// prompts.js — Prompt templates for AI composition
// Extraído do compose.js para facilitar iteração e versionamento.
// Alterar o prompt aqui não exige tocar na lógica de composição.

function buildPrompt(H, P, kw, kc, colorCtx, igCtx, size, totalPhotos, isAdvanced = false) {
  const axis = CONTRAST_AXES.find(a => a.id === selC)
  const kelvinLine = axis?.useKelvin
    ? `Kelvin-Q=ate${kw}K Kelvin-F=acima${kc}K`
    : '(Kelvin é referência mas não é o eixo principal)'

  const rows = Math.ceil(size / 3)
  let gridMap = ''
  for (let r = 0; r < rows; r++) {
    const rowSlots = []
    for (let c = 2; c >= 0; c--) {
      const slotNum = r * 3 + (2 - c) + 1
      if (slotNum <= size) rowSlots.push(`col${c + 1}=slot${slotNum}`)
    }
    gridMap += `Linha ${r + 1}: ${rowSlots.join(' | ')}\n`
  }

  return `Especialista em color grading e grid Instagram outdoor/adventure.

REGRA CRÍTICA: slot 1 = PRIMEIRO a ser postado = posição SUPERIOR DIREITA do grid.

MAPA DO GRID (${size} posts, ${rows} linha${rows > 1 ? 's' : ''}):
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

Slots: ${Array.from({ length: size }, (_, i) => i + 1).join(', ')}
Fotos: 1 a ${totalPhotos}`
}

// Prompt para pré-análise visual (modo advanced)
function buildPreAnalysisPrompt() {
  return `Analise cada foto e retorne APENAS JSON sem markdown:
{"photos":[{"id":1,"subject":"pessoa|paisagem|detalhe|grupo|animal","framing":"close|medio|aberto","energy":"estatico|dinamico","luminosity":"claro|medio|escuro","dominant_element":"descrição curta em português"}]}`
}
