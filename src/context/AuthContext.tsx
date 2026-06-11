

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)  // true while checking stored session

  // ── Check stored session on mount ─────────────────────────
  useEffect(() => {
    window.api.auth.getUser().then(res => {
      if (res.success) setUser(res.user)
      setLoading(false)
    })
  }, [])

  // ── Listen for session expired event from main process ────
  // This fires when a refresh token also fails mid-session
  useEffect(() => {
    const unsub = window.api.auth.onSessionExpired(() => {
      setUser(null)
    })
    return unsub
  }, [])

  // ── Login ──────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<string | null> => {
    const res = await window.api.auth.login(email, password)
    console.log('Login result:', res)
    if (res.success) {
      setUser(res.user)
      return null         // null = no error
    }
    return res.error ?? 'Login failed'
  }

  // ── Logout ─────────────────────────────────────────────────
  const logout = async () => {
    await window.api.auth.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook — use this anywhere in the app
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
