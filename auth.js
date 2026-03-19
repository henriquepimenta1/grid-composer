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
  loadIgHandle()

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
    // Update cached plan in state.js so maxRepoSize() returns correct value
    if (typeof currentUserPlan !== 'undefined') currentUserPlan = data.plan || 'free'
    updateCreditsUI(data.credits, data.plan)
    // Update feed tabs and repo counter for Studio (30 photos, more grid sizes)
    updatePlanUI(data.plan)
  } catch {}
}

function updatePlanUI(plan) {
  const isStudio = plan === 'studio'
  // Update repo counter max display
  const pcnt = document.getElementById('pcnt')
  if (pcnt) {
    const max = isStudio ? 30 : 12
    const cur = typeof repository !== 'undefined' ? repository.length : 0
    pcnt.textContent = `${cur} / ${max}`
  }
  // Show extra feed tabs for Studio (12, 15, 18)
  const extraTabs   = document.getElementById('feed-tabs-extra')
  const topbarExtra = document.getElementById('topbar-tabs-extra')
  if (extraTabs)   extraTabs.style.display   = isStudio ? 'flex' : 'none'
  if (topbarExtra) topbarExtra.style.display = isStudio ? 'flex' : 'none'
}

function updateCreditsUI(credits, plan) {
  const isUnlimited = plan !== 'free'
  const planLabel   = plan === 'studio' ? 'Studio' : plan === 'pro' ? 'Pro' : 'Free'

  const badge = document.getElementById('credits-badge')
  if (badge) {
    if (plan === 'free') {
      // Free: show credits count with warning if low
      badge.innerHTML = `<span style="color:var(--text3);margin-right:3px">Free</span> · ${credits} cr`
      badge.style.color = credits < 3 ? '#dc2626' : '#374151'
      badge.style.background = credits < 3 ? '#fff5f5' : '#f3f4f6'
      badge.style.borderColor = credits < 3 ? '#fca5a5' : '#e5e7eb'
      badge.onclick = () => openBuyCredits()
      badge.title   = credits < 3 ? '✦ Comprar créditos' : 'Comprar mais créditos'
      badge.style.cursor = 'pointer'
    } else {
      // Pro/Studio: show plan name + credit balance
      const planColor = plan === 'studio' ? '#7c3aed' : '#0095f6'
      const planBg    = plan === 'studio' ? '#faf5ff' : '#eff6ff'
      const planBorder = plan === 'studio' ? '#ddd6fe' : '#bfdbfe'
      badge.innerHTML = `<span style="color:${planColor};font-weight:700">${planLabel}</span> · ${credits} cr`
      badge.style.color      = '#374151'
      badge.style.background = planBg
      badge.style.borderColor = planBorder
    }
  }

  // Update compose button labels
  const costEl = document.getElementById('credit-cost')
  const goBtn  = document.getElementById('go')
  const goAdv  = document.getElementById('go-advanced')

  if (costEl) {
    costEl.textContent = isUnlimited
      ? 'temperatura · paleta · harmonia · ilimitado ✦'
      : `temperatura · paleta · harmonia · 1 crédito (${credits} disponíveis)`
  }

  const advCost = plan === 'studio' ? 3 : 5
  const advSub  = goAdv?.querySelector('.mode-btn-sub')
  if (advSub) {
    advSub.textContent = `leitura visual completa · ${advCost} créditos (${credits} disponíveis)`
  }

  if (goBtn) {
    goBtn.classList.toggle('warn-credits', !isUnlimited && credits < 1)
  }

  const ddPlan  = document.getElementById('dd-plan')
  const ddCreds = document.getElementById('dd-credits')
  if (ddPlan)  ddPlan.textContent  = planLabel
  if (ddCreds) ddCreds.textContent = `${credits} créditos`
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

// ── Instagram handle sync ─────────────────────────────
function syncIgHandle(val) {
  // Remove @ if typed, strip spaces
  const clean = val.replace(/^@/, '').replace(/\s/g, '')
  // Sync both inputs
  const topbar   = document.getElementById('ig-handle-topbar')
  const settings = document.getElementById('settings-ig')
  if (topbar   && topbar   !== document.activeElement) topbar.value   = clean
  if (settings && settings !== document.activeElement) settings.value = clean
  // Update feed preview username
  updateFeedHandle(clean)
}

function saveIgHandle(val) {
  const clean = val.replace(/^@/, '').replace(/\s/g, '')
  localStorage.setItem('gc_ig_handle', clean)
  // Sync the other field
  const topbar   = document.getElementById('ig-handle-topbar')
  const settings = document.getElementById('settings-ig')
  if (topbar)   topbar.value   = clean
  if (settings) settings.value = clean
  updateFeedHandle(clean)
}

function updateFeedHandle(handle) {
  // Update any visible feed preview username
  const nameEls = document.querySelectorAll('.pp-name, #manual-name')
  nameEls.forEach(el => { if (handle) el.textContent = handle })
}

function loadIgHandle() {
  const saved = localStorage.getItem('gc_ig_handle') || ''
  const topbar   = document.getElementById('ig-handle-topbar')
  const settings = document.getElementById('settings-ig')
  if (topbar)   topbar.value   = saved
  if (settings) settings.value = saved
  if (saved) updateFeedHandle(saved)
}
function openSettings(tab) {
  closeDropdown()
  document.getElementById('settings-modal')?.classList.add('open')
  switchSettingsTab(tab || 'profile')

  const meta    = currentUser?.user_metadata || {}
  const nameEl  = document.getElementById('settings-name')
  const emailEl = document.getElementById('settings-email')
  if (nameEl)  nameEl.value  = meta.name || meta.full_name || ''
  if (emailEl) emailEl.value = currentUser?.email || ''
  const igEl = document.getElementById('settings-ig')
  if (igEl) igEl.value = localStorage.getItem('gc_ig_handle') || ''
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
