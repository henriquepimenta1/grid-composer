// auth.js — Grid Composer Auth & User Management
// Keys injected by server at runtime
const SUPABASE_URL      = '__SUPABASE_URL__'
const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__'
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let currentUser = null
let authToken   = null

// ── Init: block render until session confirmed ────────
async function initAuth() {
  document.getElementById('app-body').style.visibility = 'hidden'

  const { data: { session } } = await sb.auth.getSession()
  if (!session) {
    window.location.replace('/login')
    return
  }

  currentUser = session.user
  authToken   = session.access_token

  // Keep token fresh + detect logout from other tabs
  sb.auth.onAuthStateChange((event, newSession) => {
    if (event === 'SIGNED_OUT' || !newSession) {
      window.location.replace('/login')
      return
    }
    authToken = newSession.access_token
  })

  updateUserUI()
  await loadCredits()

  document.getElementById('app-body').style.visibility = 'visible'
}

function updateUserUI() {
  const meta     = currentUser.user_metadata || {}
  const name     = meta.name || meta.full_name || currentUser.email?.split('@')[0] || 'user'
  const email    = currentUser.email || ''
  const initials = name.slice(0, 2).toUpperCase()

  const els = {
    'user-handle': name,
    'user-avatar': initials,
    'dd-av':       initials,
    'dd-name':     name,
    'dd-email':    email,
  }
  Object.entries(els).forEach(([id, val]) => {
    const el = document.getElementById(id)
    if (el) el.textContent = val
  })
}

async function loadCredits() {
  try {
    const res  = await fetch('/api/credits', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    })
    const data = await res.json()
    updateCreditsUI(data.credits, data.plan)
  } catch {}
}

function updateCreditsUI(credits, plan) {
  const isUnlimited = plan !== 'free'
  const label = isUnlimited
    ? (LANG === 'en' ? 'Unlimited' : 'Ilimitado')
    : `${credits} ${credits === 1 ? t('credit_singular') : t('credits_label')}`

  const badge = document.getElementById('credits-badge')
  if (badge) {
    badge.textContent = label
    badge.style.color = (!isUnlimited && credits < 3) ? '#dc2626' : '#374151'
  }

  // Update compose button credit indicator
  const costEl = document.getElementById('credit-cost')
  const goBtn  = document.getElementById('go')
  if (costEl) {
    if (isUnlimited) {
      costEl.textContent = ''
    } else {
      costEl.textContent = `· ${credits} crédito${credits !== 1 ? 's' : ''} restante${credits !== 1 ? 's' : ''}`
    }
  }
  if (goBtn && !isUnlimited && credits < 3) {
    goBtn.classList.add('warn-credits')
  } else if (goBtn) {
    goBtn.classList.remove('warn-credits')
  }

  const ddPlan  = document.getElementById('dd-plan')
  const ddCreds = document.getElementById('dd-credits')
  if (ddPlan)  ddPlan.textContent  = plan === 'free' ? 'Free' : plan === 'pro' ? 'Pro' : 'Studio'
  if (ddCreds) ddCreds.textContent = label
}

// ── Dropdown ──────────────────────────────────────────
function toggleDropdown() {
  const dd = document.getElementById('user-dropdown')
  if (!dd) return
  if (dd.classList.contains('open')) closeDropdown()
  else {
    dd.classList.add('open')
    setTimeout(() => document.addEventListener('click', closeOnOutside), 0)
  }
}

function closeDropdown() {
  document.getElementById('user-dropdown')?.classList.remove('open')
  document.removeEventListener('click', closeOnOutside)
}

function closeOnOutside(e) {
  const dd  = document.getElementById('user-dropdown')
  const btn = document.getElementById('user-avatar-wrap')
  if (!dd?.contains(e.target) && !btn?.contains(e.target)) closeDropdown()
}

// ── Settings modal ────────────────────────────────────
function openSettings(tab) {
  closeDropdown()
  document.getElementById('settings-modal')?.classList.add('open')
  switchSettingsTab(tab || 'profile')

  const meta    = currentUser?.user_metadata || {}
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

async function saveProfile() {
  const name = document.getElementById('settings-name')?.value.trim()
  const btn  = document.getElementById('save-profile-btn')
  const msg  = document.getElementById('profile-msg')
  if (!name) { showSMsg(msg, LANG === 'en' ? 'Enter your name.' : 'Informe seu nome.', 'error'); return }
  setSLoading(btn, true)
  const { error } = await sb.auth.updateUser({ data: { name } })
  setSLoading(btn, false)
  if (error) showSMsg(msg, error.message, 'error')
  else {
    currentUser.user_metadata = { ...currentUser.user_metadata, name }
    updateUserUI()
    showSMsg(msg, LANG === 'en' ? '✓ Name updated.' : '✓ Nome atualizado.', 'success')
  }
}

async function saveEmail() {
  const email = document.getElementById('settings-email')?.value.trim()
  const btn   = document.getElementById('save-email-btn')
  const msg   = document.getElementById('email-msg')
  if (!email) return
  setSLoading(btn, true)
  const { error } = await sb.auth.updateUser({ email })
  setSLoading(btn, false)
  if (error) showSMsg(msg, error.message, 'error')
  else showSMsg(msg, LANG === 'en' ? '✓ Confirmation sent.' : '✓ Confirmação enviada.', 'success')
}

async function savePassword() {
  const pw1 = document.getElementById('settings-pw1')?.value
  const pw2 = document.getElementById('settings-pw2')?.value
  const btn = document.getElementById('save-pw-btn')
  const msg = document.getElementById('pw-msg')
  if (pw1.length < 8) { showSMsg(msg, LANG === 'en' ? 'Min 8 chars.' : 'Mínimo 8 caracteres.', 'error'); return }
  if (pw1 !== pw2)    { showSMsg(msg, LANG === 'en' ? "Passwords don't match." : 'Senhas não coincidem.', 'error'); return }
  setSLoading(btn, true)
  const { error } = await sb.auth.updateUser({ password: pw1 })
  setSLoading(btn, false)
  if (error) showSMsg(msg, error.message, 'error')
  else {
    document.getElementById('settings-pw1').value = ''
    document.getElementById('settings-pw2').value = ''
    showSMsg(msg, LANG === 'en' ? '✓ Password updated.' : '✓ Senha atualizada.', 'success')
  }
}

async function manageSubscription() {
  const btn = document.getElementById('manage-sub-btn')
  setSLoading(btn, true)
  try {
    const res  = await fetch('/api/portal', { method: 'POST', headers: { 'Authorization': 'Bearer ' + authToken } })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else alert(LANG === 'en' ? 'No active subscription.' : 'Sem assinatura ativa.')
  } catch { alert('Error') }
  setSLoading(btn, false)
}

async function doLogout() {
  closeDropdown()
  closeSettings()
  await sb.auth.signOut()
  window.location.replace('/login')
}

function showSMsg(el, text, type) {
  if (!el) return
  el.textContent = text
  el.className = 'smsg ' + type
}
function setSLoading(btn, loading) {
  if (!btn) return
  btn.disabled = loading
  btn.style.opacity = loading ? '.5' : '1'
}
