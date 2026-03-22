// prompts.js — Prompt templates for AI composition

function buildPrompt(H, P, kw, kc, colorCtx, existingCtx, size, totalPhotos, isAdvanced = false, hasDiagnosis = false) {
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

  const existingSection = existingCtx ? `
FEED EXISTENTE (contexto visual — NÃO atribuir):
${existingCtx}
Considere adjacência vertical entre último slot novo e primeiro existente.
Atribua SOMENTE fotos candidatas (1 a ${totalPhotos}) aos slots.
` : ''

  const diagnosisSection = hasDiagnosis ? `
DIAGNÓSTICO DO PERFIL (OBRIGATÓRIO — inclua no JSON):
Analise as FOTOS EXISTENTES do feed e retorne dentro do JSON:
"diagnosis": {
  "detected_harmony": "nome da harmonia mais próxima (Complementar|Análogo|Split|Tríade|Monocromático|Quadrado|Sombras)",
  "consistency_score": 0-100 (regularidade de temperatura, distribuição de acentos, coerência de paleta),
  "temperature_map": ["warm","cool","warm",...] (uma string por foto existente, na ordem),
  "dominant_palette": ["#hex1","#hex2","#hex3"] (3 cores dominantes do feed existente),
  "balance": {"warm_pct": 40, "cool_pct": 60},
  "issues": ["problema 1 em português","problema 2"],
  "next_photo": "descrição da foto ideal para postar em seguida — tipo, temperatura, tom, enquadramento"
}
` : ''

  const diagnosisJsonHint = hasDiagnosis
    ? ',"diagnosis":{"detected_harmony":"...","consistency_score":N,"temperature_map":["warm","cool",...],"dominant_palette":["#hex1","#hex2","#hex3"],"balance":{"warm_pct":N,"cool_pct":N},"issues":["..."],"next_photo":"descrição"}'
    : ''

  return `Especialista em color grading e grid Instagram outdoor/adventure.

REGRA CRÍTICA: slot 1 = PRIMEIRO a ser postado = posição SUPERIOR DIREITA do grid.

MAPA DO GRID (${size} posts, ${rows} linha${rows > 1 ? 's' : ''}):
${gridMap}
CORES K-MEANS LAB:
${colorCtx}
${existingSection}
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
${diagnosisSection}
RETORNE APENAS JSON SEM MARKDOWN:
{"plan":[{"slot":1,"photo":N,"grid_position":"top-right","temp":"cool","kelvin":"7500K","contrast_role":"frio","type":"TIPO","harmony_role":"papel na harmonia","reason":"max 70 chars","preset":"ajustes PS/LR max 60 chars"}],"overview":"1 frase","harmony_note":"1 frase com eixo usado"${diagnosisJsonHint}}

Slots: ${Array.from({ length: size }, (_, i) => i + 1).join(', ')}
Fotos: 1 a ${totalPhotos}`
}

// Prompt para pré-análise visual (modo advanced)
// Inclui score de qualidade técnica 0-100
function buildPreAnalysisPrompt() {
  return `Analise cada foto e retorne APENAS JSON sem markdown:
{"photos":[{"id":1,"subject":"pessoa|paisagem|detalhe|grupo|animal","framing":"close|medio|aberto","energy":"estatico|dinamico","luminosity":"claro|medio|escuro","dominant_element":"descrição curta em português","score":85,"score_issues":["nenhum problema"]}]}

SCORE (0-100): avalie a qualidade técnica de cada foto para Instagram.
Critérios que REDUZEM o score:
- Falta de nitidez / foco suave (-10 a -30)
- Excesso de informação visual / composição poluída (-5 a -15)
- Excesso de cores sem harmonia (-5 a -10)
- Saturação excessiva / cores artificiais (-5 a -15)
- Sombras chapadas / pretas sem detalhe (-10 a -20)
- Superexposição / altas-luzes estouradas (-10 a -20)
- Ruído visível / granulação (-5 a -15)

Base: foto tecnicamente boa = 80-90. Foto excepcional = 90-100. Foto com problemas = 40-70.
score_issues: lista curta dos problemas encontrados em português (ou ["nenhum problema"] se score >= 80).`
}

// Prompt para sugestão de legenda (1 crédito, Pro/Studio)
function buildCaptionPrompt(visualDesc) {
  return `Você é um copywriter de Instagram especializado em feeds de fotografia, natureza e aventura.

${visualDesc ? `CONTEXTO VISUAL DA FOTO:\n${visualDesc}\n` : ''}
Crie uma legenda curta e envolvente para Instagram. A legenda deve:
- Ter no máximo 2 frases (total máximo 150 caracteres)
- Soar natural e autêntica, não genérica
- Capturar a emoção ou atmosfera da imagem
- Funcionar em português brasileiro

Também sugira exatamente 3 hashtags relevantes e populares.

RETORNE APENAS JSON SEM MARKDOWN:
{"caption":"sua legenda aqui","hashtags":["#hashtag1","#hashtag2","#hashtag3"]}`
}
