// src/App.tsx

import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login       from './pages/Login'
import AppShell    from './layout/AppShell'
import Dashboard   from './pages/Dashboard'
import Clients     from './pages/Clients'
import Projects    from './pages/Projects'
import Inventory   from './pages/Inventory'
import Quotations  from './pages/Quotations'
import Paysheets   from './pages/Paysheets'
import Invoices    from './pages/Invoices'
import ProjectDetail from './pages/ProjectDetail'

const Placeholder = ({ name }: { name: string }) => (
  <div style={{ padding: 40, color: '#888', fontSize: 15 }}>
    <strong>{name}</strong> — coming soon
  </div>
)

// ── Inner app — only renders after auth check ──────────────────
function AppRoutes() {
  const { user, loading } = useAuth()

  // Still checking stored session
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>
        Loading...
      </div>
    )
  }

  // Not logged in → show login
  if (!user) return <Login />

  // Logged in → show app
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index           element={<Dashboard />} />
          <Route path="/clients"    element={<Clients />} />
          <Route path="/projects"   element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/inventory"  element={<Inventory />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/paysheets"  element={<Paysheets />} />
          <Route path="/invoices"   element={<Invoices />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

// ── Root ───────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        input:focus, textarea:focus, select:focus { outline: 2px solid #4f46e5; outline-offset: 1px; }
        button { transition: opacity .15s; }
        button:hover { opacity: 0.88; }
        button:active { transform: scale(0.98); }
      `}</style>

      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </>
  )
}
