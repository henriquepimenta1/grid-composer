// auth.js — GridAI Authentication & User Management

// ── Supabase client (keys injected by server) ────────
const SUPABASE_URL     = '__SUPABASE_URL__'
const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__'
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let currentUser = null
let authToken   = null

// ══ INIT AUTH ════════════════════════════════════════
// Blocks the app from rendering until auth is confirmed
async function initAuth() {
  // Hide app body until confirmed logged in
  document.getElementById('app-body').style.visibility = 'hidden'

  const { data: { session } } = await sb.auth.getSession()

  if (!session) {
    window.location.replace('/login')
    return
  }

  currentUser = session.user
  authToken   = session.access_token

  // Listen for session changes (token refresh, logout from other tab)
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      window.location.replace('/login')
    }
    if (session) {
      authToken = session.access_token
    }
  })

  updateUserUI()
  await loadCredits()

  // Show app
  document.getElementById('app-body').style.visibility = 'visible'
}

// ── Update topbar with user info ──────────────────────
function updateUserUI() {
  const meta = currentUser.user_metadata || {}
  const name  = meta.name || meta.full_name || currentUser.email?.split('@')[0] || 'user'
  const email = currentUser.email || ''
  const initials = name.slice(0,2).toUpperCase()

  const handle = document.getElementById('user-handle')
  const avatar = document.getElementById('user-avatar')
  const ddName  = document.getElementById('dd-name')
  const ddEmail = document.getElementById('dd-email')

  if (handle)  handle.textContent = name
  if (avatar)  avatar.textContent = initials
  if (ddName)  ddName.textContent  = name
  if (ddEmail) ddEmail.textContent = email
}

// ── Load credits ──────────────────────────────────────
async function loadCredits() {
  try {
    const res = await fetch('/api/credits', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    })
    const data = await res.json()
    updateCreditsUI(data.credits, data.plan)
  } catch {}
}

function updateCreditsUI(credits, plan) {
  const badge   = document.getElementById('credits-badge')
  const ddPlan  = document.getElementById('dd-plan')
  const ddCreds = document.getElementById('dd-credits')

  const isUnlimited = plan !== 'free'
  const label = isUnlimited
    ? (LANG === 'en' ? 'Unlimited' : 'Ilimitado')
    : `${credits} ${credits === 1 ? t('credit_singular') : t('credits_label')}`

  if (badge) {
    badge.textContent = label
    badge.style.color = (!isUnlimited && credits < 3) ? '#dc2626' : '#374151'
  }
  if (ddPlan)  ddPlan.textContent  = plan === 'free' ? 'Free' : plan === 'pro' ? 'Pro' : 'Studio'
  if (ddCreds) ddCreds.textContent = label
}

// ══ DROPDOWN MENU ════════════════════════════════════
function toggleDropdown() {
  const dd = document.getElementById('user-dropdown')
  const isOpen = dd.classList.contains('open')
  if (isOpen) closeDropdown()
  else {
    dd.classList.add('open')
    setTimeout(() => document.addEventListener('click', closeOnClickOutside), 0)
  }
}

function closeDropdown() {
  document.getElementById('user-dropdown')?.classList.remove('open')
  document.removeEventListener('click', closeOnClickOutside)
}

function closeOnClickOutside(e) {
  const dd = document.getElementById('user-dropdown')
  const trigger = document.getElementById('user-avatar-wrap')
  if (!dd?.contains(e.target) && !trigger?.contains(e.target)) closeDropdown()
}

// ── Open settings modal ───────────────────────────────
function openSettings(tab) {
  closeDropdown()
  const modal = document.getElementById('settings-modal')
  modal.classList.add('open')
  switchSettingsTab(tab || 'profile')

  // Pre-fill current values
  const meta = currentUser?.user_metadata || {}
  const nameEl  = document.getElementById('settings-name')
  const emailEl = document.getElementById('settings-email')
  if (nameEl)  nameEl.value  = meta.name || meta.full_name || ''
  if (emailEl) emailEl.value = currentUser?.email || ''
}

function closeSettings() {
  document.getElementById('settings-modal')?.classList.remove('open')
}

function switchSettingsTab(tab) {
  document.querySelectorAll('.stab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.spanel').forEach(p => p.classList.remove('active'))
  document.getElementById('stab-' + tab)?.classList.add('active')
  document.getElementById('spanel-' + tab)?.classList.add('active')
}

// ── Save profile ──────────────────────────────────────
async function saveProfile() {
  const name  = document.getElementById('settings-name')?.value.trim()
  const btn   = document.getElementById('save-profile-btn')
  const msg   = document.getElementById('profile-msg')

  if (!name) { showSettingsMsg(msg, LANG === 'en' ? 'Enter your name.' : 'Informe seu nome.', 'error'); return }

  setSettingsLoading(btn, true)
  const { error } = await sb.auth.updateUser({ data: { name } })
  setSettingsLoading(btn, false)

  if (error) {
    showSettingsMsg(msg, error.message, 'error')
  } else {
    currentUser.user_metadata = { ...currentUser.user_metadata, name }
    updateUserUI()
    showSettingsMsg(msg, LANG === 'en' ? '✓ Name updated.' : '✓ Nome atualizado.', 'success')
  }
}

// ── Change email ──────────────────────────────────────
async function saveEmail() {
  const email = document.getElementById('settings-email')?.value.trim()
  const btn   = document.getElementById('save-email-btn')
  const msg   = document.getElementById('email-msg')

  if (!email) return

  setSettingsLoading(btn, true)
  const { error } = await sb.auth.updateUser({ email })
  setSettingsLoading(btn, false)

  if (error) {
    showSettingsMsg(msg, error.message, 'error')
  } else {
    showSettingsMsg(msg,
      LANG === 'en'
        ? '✓ Confirmation sent to new email.'
        : '✓ Confirmação enviada para o novo e-mail.',
      'success'
    )
  }
}

// ── Change password ───────────────────────────────────
async function savePassword() {
  const pw1 = document.getElementById('settings-pw1')?.value
  const pw2 = document.getElementById('settings-pw2')?.value
  const btn = document.getElementById('save-pw-btn')
  const msg = document.getElementById('pw-msg')

  if (pw1.length < 8) {
    showSettingsMsg(msg, LANG === 'en' ? 'Min 8 characters.' : 'Mínimo 8 caracteres.', 'error')
    return
  }
  if (pw1 !== pw2) {
    showSettingsMsg(msg, LANG === 'en' ? 'Passwords don\'t match.' : 'Senhas não coincidem.', 'error')
    return
  }

  setSettingsLoading(btn, true)
  const { error } = await sb.auth.updateUser({ password: pw1 })
  setSettingsLoading(btn, false)

  if (error) {
    showSettingsMsg(msg, error.message, 'error')
  } else {
    document.getElementById('settings-pw1').value = ''
    document.getElementById('settings-pw2').value = ''
    showSettingsMsg(msg, LANG === 'en' ? '✓ Password updated.' : '✓ Senha atualizada.', 'success')
  }
}

// ── Manage subscription ───────────────────────────────
async function manageSubscription() {
  const btn = document.getElementById('manage-sub-btn')
  setSettingsLoading(btn, true)
  try {
    const res = await fetch('/api/portal', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + authToken }
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else alert(LANG === 'en' ? 'No active subscription.' : 'Sem assinatura ativa.')
  } catch { alert('Error') }
  setSettingsLoading(btn, false)
}

// ── Logout ────────────────────────────────────────────
async function doLogout() {
  closeDropdown()
  closeSettings()
  await sb.auth.signOut()
  window.location.replace('/login')
}

// ── Helpers ───────────────────────────────────────────
function showSettingsMsg(el, text, type) {
  if (!el) return
  el.textContent = text
  el.className = 'smsg ' + type
}

function setSettingsLoading(btn, loading) {
  if (!btn) return
  btn.disabled = loading
  btn.style.opacity = loading ? '.5' : '1'
}
