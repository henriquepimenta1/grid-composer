// i18n.js — GridAI translations
// PT = Português · EN = English

const TRANSLATIONS = {
  pt: {
    // App name
    app_name: 'GridAI',
    app_tagline: 'Planejamento inteligente de grid',

    // Topbar
    credits_label: 'créditos',
    credit_singular: 'crédito',
    logout_confirm: 'Sair da conta?',

    // Plan tabs
    next_3: 'Próximos 3',
    next_6: 'Próximos 6',
    next_9: 'Próximos 9',
    posts: 'posts',

    // Sidebar sections
    harmony: 'Harmonia',
    grid_pattern: 'Padrão de grid',
    contrast_axis: 'Eixo de contraste',
    kelvin_temp: 'Temperatura (Kelvin)',
    kelvin_contrast: 'Contraste',
    current_grid: 'Grid atual (contexto)',

    // Harmony names
    h_complementary: 'Complementar',
    h_analogous: 'Análogo',
    h_split: 'Split Complementar',
    h_triad: 'Tríade',
    h_monochrome: 'Monocromático',
    h_square: 'Quadrado',
    h_shades: 'Sombras',
    h_custom: 'IA decide',

    // Harmony subs
    hs_complementary: '180° · máximo',
    hs_analogous: '0–60° · suave',
    hs_split: '±30° split',
    hs_triad: '120° · vibrante',
    hs_monochrome: '1 matiz',
    hs_square: '4×90° · complexo',
    hs_shades: 'dark · moody',
    hs_custom: 'melhor harmonia',

    // Pattern names
    p_checkerboard: 'Xadrez',
    p_columns: 'Colunas',
    p_rows: 'Linhas',
    p_diagonal: 'Diagonal',
    p_free: 'Livre (IA)',

    // Contrast axes
    c_temperature: 'Temperatura',
    c_temperature_sub: 'Quente vs Frio · Kelvin',
    c_luminance: 'Luminância',
    c_luminance_sub: 'Claro vs Escuro · independe de cor',
    c_subject: 'Plano / Sujeito',
    c_subject_sub: 'Close · Paisagem · Detalhe',
    c_saturation: 'Saturação',
    c_saturation_sub: 'Vívido vs Dessaturado',
    c_combined: 'Combinado (IA)',
    c_combined_sub: 'IA escolhe o melhor eixo',

    // Upload
    your_photos: 'Suas fotos',
    clear: 'Limpar',
    drop_title: 'Arraste fotos aqui ou clique para selecionar',
    drop_sub: 'JPG · PNG · WEBP · até 12 fotos · comprimidas automaticamente',
    select_btn: 'Selecionar fotos',
    compose_btn: '✦\u00a0 Compor grid',
    processing: 'Processando',
    photos_ready: 'foto(s) prontas · k-means LAB',
    extracting: 'Extraindo cores de',

    // IG context
    ignore: 'Ignorar',
    last_3: 'Últimas 3',
    ig_note: 'Upload das últimas 3 fotos do seu grid para melhorar a continuidade.',
    select_photos: '📎 Selecionar fotos',

    // Loading steps
    extracting_colors: 'Extraindo cores reais...',
    analyzing: 'Analisando composição...',
    combining: 'Testando combinações...',
    building: 'Montando plano...',

    // Results
    next_posts: 'Próximos',
    detail_per_post: 'Detalhe por post',
    warm: 'Quente',
    cool: 'Frio',
    light: 'Claro',
    dark: 'Escuro',
    vivid: 'Vívido',
    muted: 'Neutro',
    portrait: 'Retrato',
    landscape: 'Paisagem',
    detail: 'Detalhe',

    // Errors
    error_title: 'Erro',
    no_credits: 'Sem créditos disponíveis. Clique no saldo para comprar mais.',
    invalid_json: 'Resposta inválida — tente novamente.',

    // Login page
    login_tab: 'Entrar',
    signup_tab: 'Criar conta',
    email_label: 'E-mail',
    email_placeholder: 'seu@email.com',
    password_label: 'Senha',
    password_placeholder: '••••••••',
    name_label: 'Nome',
    name_placeholder: 'Seu nome',
    new_password_placeholder: 'mínimo 8 caracteres',
    forgot_password: 'Esqueci minha senha',
    login_btn: 'Entrar',
    signup_btn: 'Criar conta grátis',
    google_btn: 'Continuar com Google',
    or_continue: 'ou continue com',
    footer_new: 'Novo por aqui?',
    footer_create: 'Crie sua conta grátis →',
    footer_have: 'Já tem conta?',
    footer_login: 'Entrar →',
    terms_note: 'Ao criar conta você concorda com os',
    terms_link: 'Termos de Uso',
    privacy_link: 'Política de Privacidade',
    forgot_hint: 'Digite seu e-mail acima para recuperar a senha.',
    reset_sent: 'E-mail de recuperação enviado para',
    login_success: '✓ Login feito! Redirecionando...',
    signup_success: '✓ Conta criada! Verifique seu e-mail para confirmar.',
    fill_name: 'Informe seu nome.',
    fill_email: 'Informe seu e-mail.',
    fill_password_min: 'Senha mínimo 8 caracteres.',
    err_invalid_credentials: 'E-mail ou senha incorretos.',
    err_email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
    err_too_many_requests: 'Muitas tentativas. Aguarde alguns minutos.',
    err_already_registered: 'Este e-mail já está cadastrado.',

    // Password strength
    pw_very_weak: 'Muito fraca',
    pw_weak: 'Fraca',
    pw_medium: 'Média',
    pw_strong: 'Forte',
    pw_very_strong: 'Muito forte',

    // Settings
    settings: 'Configurações',
    profile: 'Perfil',
    security: 'Segurança',
    plan_tab: 'Plano',
    upgrade: 'Fazer upgrade',
    logout: 'Sair',
    new_password: 'Nova senha',
    confirm_password: 'Confirmar senha',
    current_plan: 'Plano atual',
    credits_available: 'Créditos',
    email_change_note: 'Mudança de e-mail requer confirmação no novo endereço',

    // Pricing page
    pricing_title: 'Planos simples e transparentes',
    pricing_sub: 'Comece grátis. Faça upgrade quando precisar.',
    free_name: 'Free',
    pro_name: 'Pro',
    studio_name: 'Studio',
    free_price: 'R$ 0',
    pro_price: 'R$ 24,90',
    studio_price: 'R$ 59,90',
    per_month: '/mês',
    free_cta: 'Começar grátis',
    pro_cta: 'Assinar Pro',
    studio_cta: 'Assinar Studio',
    most_popular: 'Mais popular',
    free_features: ['5 análises de teste', 'Sem cartão necessário', 'Todas as harmonias', 'Acesso básico'],
    pro_features: ['Análises ilimitadas', 'Histórico salvo', 'Export do plano', 'Comparação com referências', 'Suporte prioritário'],
    studio_features: ['Tudo do Pro', 'Múltiplos perfis', 'Relatório semanal', 'Sugestão de preset', 'API access', 'Suporte dedicado'],
  },

  en: {
    app_name: 'GridAI',
    app_tagline: 'Smart Instagram grid planner',

    credits_label: 'credits',
    credit_singular: 'credit',
    logout_confirm: 'Sign out?',

    next_3: 'Next 3',
    next_6: 'Next 6',
    next_9: 'Next 9',
    posts: 'posts',

    harmony: 'Harmony',
    grid_pattern: 'Grid pattern',
    contrast_axis: 'Contrast axis',
    kelvin_temp: 'Temperature (Kelvin)',
    kelvin_contrast: 'Contrast',
    current_grid: 'Current grid (context)',

    h_complementary: 'Complementary',
    h_analogous: 'Analogous',
    h_split: 'Split Complementary',
    h_triad: 'Triadic',
    h_monochrome: 'Monochromatic',
    h_square: 'Square',
    h_shades: 'Shades',
    h_custom: 'AI picks best',

    hs_complementary: '180° · maximum',
    hs_analogous: '0–60° · soft',
    hs_split: '±30° split',
    hs_triad: '120° · vibrant',
    hs_monochrome: '1 hue',
    hs_square: '4×90° · complex',
    hs_shades: 'dark · moody',
    hs_custom: 'best harmony',

    p_checkerboard: 'Checkerboard',
    p_columns: 'Columns',
    p_rows: 'Rows',
    p_diagonal: 'Diagonal',
    p_free: 'Free (AI)',

    c_temperature: 'Temperature',
    c_temperature_sub: 'Warm vs Cool · Kelvin',
    c_luminance: 'Luminance',
    c_luminance_sub: 'Light vs Dark · color-independent',
    c_subject: 'Subject / Scale',
    c_subject_sub: 'Close-up · Landscape · Detail',
    c_saturation: 'Saturation',
    c_saturation_sub: 'Vivid vs Muted',
    c_combined: 'Combined (AI)',
    c_combined_sub: 'AI picks the best axis',

    your_photos: 'Your photos',
    clear: 'Clear',
    drop_title: 'Drag photos here or click to select',
    drop_sub: 'JPG · PNG · WEBP · up to 12 photos · auto-compressed',
    select_btn: 'Select photos',
    compose_btn: '✦\u00a0 Compose grid',
    processing: 'Processing',
    photos_ready: 'photo(s) ready · k-means LAB',
    extracting: 'Extracting colors from',

    ignore: 'Ignore',
    last_3: 'Last 3',
    ig_note: 'Upload your last 3 grid photos to improve continuity suggestions.',
    select_photos: '📎 Select photos',

    extracting_colors: 'Extracting real colors...',
    analyzing: 'Analyzing composition...',
    combining: 'Testing combinations...',
    building: 'Building plan...',

    next_posts: 'Next',
    detail_per_post: 'Post details',
    warm: 'Warm',
    cool: 'Cool',
    light: 'Light',
    dark: 'Dark',
    vivid: 'Vivid',
    muted: 'Muted',
    portrait: 'Portrait',
    landscape: 'Landscape',
    detail: 'Detail',

    error_title: 'Error',
    no_credits: 'No credits left. Click your balance to buy more.',
    invalid_json: 'Invalid response — please try again.',

    login_tab: 'Sign in',
    signup_tab: 'Create account',
    email_label: 'Email',
    email_placeholder: 'you@email.com',
    password_label: 'Password',
    password_placeholder: '••••••••',
    name_label: 'Name',
    name_placeholder: 'Your name',
    new_password_placeholder: 'at least 8 characters',
    forgot_password: 'Forgot password?',
    login_btn: 'Sign in',
    signup_btn: 'Create free account',
    google_btn: 'Continue with Google',
    or_continue: 'or continue with',
    footer_new: 'New here?',
    footer_create: 'Create your free account →',
    footer_have: 'Already have an account?',
    footer_login: 'Sign in →',
    terms_note: 'By creating an account you agree to the',
    terms_link: 'Terms of Service',
    privacy_link: 'Privacy Policy',
    forgot_hint: 'Enter your email above to reset your password.',
    reset_sent: 'Password reset email sent to',
    login_success: '✓ Signed in! Redirecting...',
    signup_success: '✓ Account created! Check your email to confirm.',
    fill_name: 'Please enter your name.',
    fill_email: 'Please enter your email.',
    fill_password_min: 'Password must be at least 8 characters.',
    err_invalid_credentials: 'Incorrect email or password.',
    err_email_not_confirmed: 'Please confirm your email before signing in.',
    err_too_many_requests: 'Too many attempts. Please wait a few minutes.',
    err_already_registered: 'This email is already registered.',

    pw_very_weak: 'Very weak',
    pw_weak: 'Weak',
    pw_medium: 'Medium',
    pw_strong: 'Strong',
    pw_very_strong: 'Very strong',

    // Settings
    settings: 'Settings',
    profile: 'Profile',
    security: 'Security',
    plan_tab: 'Plan',
    upgrade: 'Upgrade',
    logout: 'Sign out',
    new_password: 'New password',
    confirm_password: 'Confirm password',
    current_plan: 'Current plan',
    credits_available: 'Credits',
    email_change_note: 'Email change requires confirmation at new address',

    pricing_title: 'Simple, transparent pricing',
    pricing_sub: 'Start free. Upgrade when you need to.',
    free_name: 'Free',
    pro_name: 'Pro',
    studio_name: 'Studio',
    free_price: '$0',
    pro_price: '$4.99',
    studio_price: '$11.99',
    per_month: '/mo',
    free_cta: 'Get started',
    pro_cta: 'Subscribe Pro',
    studio_cta: 'Subscribe Studio',
    most_popular: 'Most popular',
    free_features: ['5 trial analyses', 'No card required', 'All harmonies', 'Basic access'],
    pro_features: ['Unlimited analyses', 'Saved history', 'Export plan', 'Reference comparison', 'Priority support'],
    studio_features: ['Everything in Pro', 'Multiple profiles', 'Weekly report', 'Preset suggestions', 'API access', 'Dedicated support'],
  }
}

// ── Detect language ──────────────────────────────────
function detectLang() {
  // 1. URL param: ?lang=en
  const urlLang = new URLSearchParams(window.location.search).get('lang')
  if (urlLang && TRANSLATIONS[urlLang]) return urlLang

  // 2. localStorage preference
  const saved = localStorage.getItem('gridai_lang')
  if (saved && TRANSLATIONS[saved]) return saved

  // 3. Browser language
  const browser = (navigator.language || 'pt').slice(0, 2).toLowerCase()
  return TRANSLATIONS[browser] ? browser : 'pt'
}

// ── Active language ───────────────────────────────────
let LANG = detectLang()

// ── Get translation ───────────────────────────────────
function t(key) {
  return TRANSLATIONS[LANG][key] || TRANSLATIONS['pt'][key] || key
}

// ── Switch language ───────────────────────────────────
function setLang(lang) {
  LANG = lang
  localStorage.setItem('gridai_lang', lang)
  applyTranslations()
  // Update toggle button
  const btn = document.getElementById('lang-toggle')
  if (btn) btn.textContent = lang === 'pt' ? '🇧🇷 PT' : '🇺🇸 EN'
}

function toggleLang() {
  setLang(LANG === 'pt' ? 'en' : 'pt')
}

// ── Apply to DOM — elements with data-i18n ────────────
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n')
    const attr = el.getAttribute('data-i18n-attr') // optional: 'placeholder', 'title', etc
    const val = t(key)
    if (attr) el.setAttribute(attr, val)
    else el.textContent = val
  })
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'))
  })
}
