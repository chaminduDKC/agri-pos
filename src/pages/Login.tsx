// src/pages/Login.tsx

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { OfflineBanner } from '../components/OfflineBanner'

export default function Login() {
  const { login }         = useAuth()
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [err, setErr]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email.trim()) { setErr('Email is required'); return }
    if (!pass.trim())  { setErr('Password is required'); return }
    setLoading(true); setErr(null)
    const error = await login(email, pass)
    setLoading(false)
    console.log(error)
    if (error) setErr(error)
    // if no error, AuthContext sets the user and App.tsx renders the app
  }

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Logo */}
        <div style={s.logo}>💧</div>
        <h1 style={s.title}>IrrigaPro</h1>
        <p style={s.sub}>Sign in to continue</p>

        {err && <div style={s.err}>Login failed</div>}

        <label style={s.label}>Email</label>
        <input
          style={s.input}
          type="email"
          value={email}
          autoFocus
          placeholder="admin@irrigation.local"
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />

        <label style={s.label}>Password</label>
        <input
          style={s.input}
          type="password"
          value={pass}
          placeholder="••••••••"
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />

        <button
          style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
          onClick={handleLogin}
          disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p style={s.note}>
          You must be online to sign in.
        </p>
      </div>
              <OfflineBanner />
    
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:  { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' },
  card:  { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
  logo:  { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 700, textAlign: 'center', margin: '0 0 4px' },
  sub:   { fontSize: 14, color: '#9ca3af', textAlign: 'center', margin: '0 0 28px' },
  err:   { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 },
  input: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, boxSizing: 'border-box', marginBottom: 14, outline: 'none' },
  btn:   { width: '100%', padding: '11px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  note:  { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 20 },
}
