import { useEffect, useState } from 'react'
import AOS from 'aos'
import { FiEye, FiEyeOff, FiLogOut, FiUser } from 'react-icons/fi'

const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? '' : 'https://sat-math-server.onrender.com')
).replace(/\/$/, '')

async function api(path, options = {}) {
  const token = localStorage.getItem('session_token')
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const text = await response.text()
  let data = {}

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`API JSON javob qaytarmadi (HTTP ${response.status}). VITE_API_URL va backend deployini tekshiring.`)
    }
  }

  if (!response.ok) {
    throw new Error(data.detail || 'So‘rov bajarilmadi')
  }
  return data
}

function App() {
  const [auth, setAuth] = useState(null)
  const [needsCompletion, setNeedsCompletion] = useState(false)
  const [loading, setLoading] = useState(() => {
    const telegram = window.Telegram?.WebApp
    return Boolean(telegram?.initData || localStorage.getItem('session_token'))
  })
  const [error, setError] = useState('')

  useEffect(() => {
    const telegram = window.Telegram?.WebApp

    if (telegram?.initData) {
      telegram.ready()
      telegram.expand()

      api('/api/auth/telegram', {
        method: 'POST',
        body: JSON.stringify({ init_data: telegram.initData }),
      })
        .then((data) => {
          localStorage.setItem('session_token', data.access_token)
          setAuth(data.user)
          setNeedsCompletion(data.requires_account_completion)
        })
        .catch((reason) => setError(reason.message))
        .finally(() => setLoading(false))
      return
    }

    const token = localStorage.getItem('session_token')
    if (!token) {
      return
    }

    api('/api/auth/me')
      .then((data) => {
        setAuth(data.user)
        setNeedsCompletion(data.requires_account_completion)
      })
      .catch(() => localStorage.removeItem('session_token'))
      .finally(() => setLoading(false))
  }, [])

  const logout = () => {
    api('/api/auth/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('session_token')
    setAuth(null)
    setNeedsCompletion(false)
    if (!window.Telegram?.WebApp?.initData) {
      window.history.replaceState({}, '', '/login')
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Tekshirilmoqda...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-white p-6 text-center">
          <p className="font-semibold text-red-600">Autentifikatsiya xatosi</p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      </main>
    )
  }

  if (!auth) {
    return <BrowserAuth onAuth={setAuth} />
  }

  if (needsCompletion) {
    return <AccountCompletion onComplete={(user) => { setAuth(user); setNeedsCompletion(false) }} onLogout={logout} />
  }

  return <Dashboard auth={auth} onLogout={logout} onAuthUpdate={setAuth} />
}

function AccountCompletion({ onComplete, onLogout }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (password !== confirmation) return setError('Parollar mos kelmadi')
    setLoading(true)
    try {
      const result = await api('/api/auth/complete-account', {
        method: 'POST',
        body: JSON.stringify({ email, password, password_confirmation: confirmation }),
      })
      onComplete(result.user)
    } catch (reason) { setError(reason.message) } finally { setLoading(false) }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-7 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-900">Hisobni yakunlang</h1>
        <p className="text-sm text-slate-600">Telegram hisobingizga email va parol biriktiring. Bu ma’lumotlar brauzer orqali kirish uchun ham ishlaydi.</p>
        <label className="block text-sm font-medium">Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="auth-input mt-1 w-full rounded-xl border p-3" /></label>
        <label className="block text-sm font-medium">Parol<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input mt-1 w-full rounded-xl border p-3" /></label>
        <label className="block text-sm font-medium">Parolni tasdiqlang<input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="auth-input mt-1 w-full rounded-xl border p-3" /></label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="prism-button w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60">{loading ? 'Saqlanmoqda…' : 'Hisobni yakunlash'}</button>
        <button type="button" onClick={onLogout} className="w-full py-2 text-sm text-slate-500">Chiqish</button>
      </form>
    </main>
  )
}

function BrowserAuth({ onAuth }) {
  const initialMode = window.location.pathname === '/register' ? 'register' : 'login'
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    AOS.init({
      duration: 850,
      easing: 'ease-out-cubic',
      once: true,
      offset: 20,
    })
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await api(
        mode === 'login' ? '/api/auth/login' : '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            name: mode === 'register' ? name : undefined,
            email,
            password,
          }),
        },
      )
      localStorage.setItem('session_token', data.access_token)
      onAuth(data.user)
    } catch (reason) {
      setError(reason.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-prism relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div
        className="absolute left-[-8rem] top-[-7rem] h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-9rem] right-[-7rem] h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute right-[12%] top-[12%] h-32 w-32 rotate-45 rounded-[2.5rem] border border-white/50 bg-gradient-to-br from-white/35 to-cyan-300/10 blur-[1px]"
        aria-hidden="true"
      />

      <section
        className="glass-panel relative w-full max-w-[420px] overflow-hidden rounded-[30px] p-7 sm:p-9"
        data-aos="zoom-in"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-indigo-500 via-fuchsia-400 to-cyan-400" />

        <div data-aos="fade-down" data-aos-delay="120">
          <div className="mb-7 flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/70 shadow-sm">
              <div className="h-5 w-5 rotate-45 rounded-[6px] bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-400 shadow-[0_5px_16px_rgba(124,58,237,0.35)]" />
            </div>
            <span className="rounded-full border border-white/80 bg-white/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {mode === 'login' ? 'Xush kelibsiz' : 'Yangi hisob'}
            </span>
          </div>

          <h1 className="text-[28px] font-bold tracking-[-0.03em] text-slate-900">
            {mode === 'login' ? 'Hisobga kirish' : 'Hisob yaratish'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {mode === 'login'
              ? 'Platformaga davom etish uchun ma’lumotlaringizni kiriting.'
              : 'Yangi hisob yarating va platformadan foydalanishni boshlang.'}
          </p>
        </div>

        <form className="mt-7 space-y-4" onSubmit={submit}>
          {mode === 'register' && (
            <label className="block" data-aos="fade-up" data-aos-delay="180">
              <span className="mb-2 block text-xs font-semibold text-slate-600">Ism</span>
              <input
                className="auth-input w-full rounded-2xl border border-white/90 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ismingiz"
                autoComplete="name"
                required
              />
            </label>
          )}

          <label className="block" data-aos="fade-up" data-aos-delay={mode === 'register' ? '240' : '180'}>
            <span className="mb-2 block text-xs font-semibold text-slate-600">Email</span>
            <input
              className="auth-input w-full rounded-2xl border border-white/90 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label className="block" data-aos="fade-up" data-aos-delay={mode === 'register' ? '300' : '240'}>
            <span className="mb-2 block text-xs font-semibold text-slate-600">Parol</span>
            <div className="relative">
              <input
                className="auth-input w-full rounded-2xl border border-white/90 px-4 py-3.5 pr-12 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Kamida 8 belgi"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
                required
              />
              <button
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-indigo-600"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
                aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </label>

          {error && (
            <p
              className="rounded-xl border border-red-200/70 bg-red-50/70 px-3 py-2.5 text-sm text-red-600"
              data-aos="shake"
            >
              {error}
            </p>
          )}

          <div data-aos="fade-up" data-aos-delay={mode === 'register' ? '360' : '300'}>
            <button
              className="prism-button w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? 'Kutib turing...' : mode === 'login' ? 'Kirish' : 'Ro‘yxatdan o‘tish'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center" data-aos="fade-up" data-aos-delay="380">
          <button
            className="text-sm font-semibold text-indigo-600 transition hover:text-fuchsia-600"
            onClick={() => {
              setError('')
              setShowPassword(false)
              const nextMode = mode === 'login' ? 'register' : 'login'
              window.history.replaceState({}, '', nextMode === 'login' ? '/login' : '/register')
              setMode(nextMode)
              window.requestAnimationFrame(() => AOS.refreshHard())
            }}
            type="button"
          >
            {mode === 'login'
              ? 'Hisobingiz yo‘qmi? Ro‘yxatdan o‘ting'
              : 'Hisobingiz bormi? Kiring'}
          </button>
        </div>
      </section>
    </main>
  )
}

function Dashboard({ auth, onLogout, onAuthUpdate }) {
  const [notice, setNotice] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const connectTelegram = async () => {
    setNotice('')
    setBusy(true)
    try {
      const result = await api('/api/account/telegram/link', { method: 'POST' })
      setLinkUrl(result.url)
      setNotice('Telegram’da botdagi havolani oching. Ulangandan so‘ng holatni yangilang.')
    } catch (reason) { setNotice(reason.message) } finally { setBusy(false) }
  }
  const disconnectTelegram = async () => {
    setBusy(true)
    try {
      await api('/api/account/telegram/link', { method: 'DELETE' })
      const result = await api('/api/auth/me')
      onAuthUpdate(result.user)
      setNotice('Telegram hisobi uzildi.')
    } catch (reason) { setNotice(reason.message) } finally { setBusy(false) }
  }
  const refreshProfile = async () => {
    setBusy(true)
    try { const result = await api('/api/auth/me'); onAuthUpdate(result.user); setNotice('Hisob holati yangilandi.') }
    catch (reason) { setNotice(reason.message) } finally { setBusy(false) }
  }
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8">
      <section className="mx-auto max-w-lg rounded-3xl bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
              {auth.telegram_id ? 'Telegram' : 'Brauzer'}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <FiUser className="text-slate-400" size={18} aria-hidden="true" />
              <h1 className="text-xl font-bold text-slate-900">
                {auth.first_name || 'Foydalanuvchi'}
              </h1>
            </div>
          </div>
          <button
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={onLogout}
            type="button"
          >
            <FiLogOut size={16} aria-hidden="true" />
            <span>Chiqish</span>
          </button>
        </div>
      </section>
      <section className="mx-auto mt-4 max-w-lg rounded-3xl bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <h2 className="font-semibold text-slate-900">Profil va ulanishlar</h2>
        <p className="mt-2 text-sm text-slate-600">Email: {auth.email || 'Sozlanmagan'}</p>
        <p className="mt-1 text-sm text-slate-600">Telegram: {auth.telegram_id ? 'Ulangan' : 'Ulanmagan'}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {auth.telegram_id ? <button disabled={busy} onClick={disconnectTelegram} className="rounded-xl border px-4 py-2 text-sm">Telegramni uzish</button> : <button disabled={busy} onClick={connectTelegram} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white">Telegramni ulash</button>}
          <button disabled={busy} onClick={refreshProfile} className="rounded-xl border px-4 py-2 text-sm">Holatni yangilash</button>
        </div>
        {linkUrl && <a href={linkUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-indigo-600">Botda ulanishni yakunlash</a>}
        {notice && <p role="status" className="mt-3 text-sm text-slate-600">{notice}</p>}
      </section>
    </main>
  )
}

export default App
