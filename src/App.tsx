import './App.css'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Clients from './pages/Clients'
import AppShell from './layout/AppShell'
import Inventory from './pages/Inventory'
import Projects from './pages/Projects'
import Quotations from './pages/Quotations'
import Paysheets from './pages/Paysheets'
import Invoices from './pages/Invoices'
import Dashboard from './pages/Dashboard'

const Placeholder = ({ name }: { name: string }) => (
  <div style={{ padding: 40, color: '#888', fontSize: 15 }}>
    <strong>{name}</strong> — coming soon
  </div>
)

const App = ()=>{
  return (
   <>
      {/* Global style reset */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        input:focus, textarea:focus, select:focus { outline: 2px solid #3b82f6; outline-offset: 1px; }
        button:hover { opacity: 0.88; }
        button:active { transform: scale(0.98); }
      `}</style>

      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="/clients"    element={<Clients />} />
            <Route path="/projects"   element={<Projects />} />
            <Route path="/inventory"  element={<Inventory />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/paysheets"  element={<Paysheets />} />
            <Route path="/invoices"   element={<Invoices />} />
          </Route>
        </Routes>
      </HashRouter>
    </>
  )
}

export default App
