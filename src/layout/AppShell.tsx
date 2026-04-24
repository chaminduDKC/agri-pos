// src/layout/AppShell.tsx
// ─────────────────────────────────────────────────────────────
// This is the persistent shell around every page.
// The sidebar and topbar never unmount — only <Outlet /> changes
// when you navigate. Outlet is React Router's placeholder for
// whatever the current page component is.
// ─────────────────────────────────────────────────────────────

import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

// Map paths to readable page titles for the top bar
const PAGE_TITLES: Record<string, string> = {
  '/':           'Dashboard',
  '/clients':    'Clients',
  '/projects':   'Projects',
  '/inventory':  'Inventory',
  '/quotations': 'Quotations',
  '/paysheets':  'Pay Sheets',
  '/invoices':   'Invoices',
}

export default function AppShell() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] ?? 'Irrigation Works'

  return (
    <div style={styles.shell}>
      {/* Sidebar — always visible */}
      <Sidebar />

      {/* Right side: topbar + page content */}
      <div style={styles.main}>
        <header style={styles.topbar}>
          <h1 style={styles.pageTitle}>{title}</h1>
        </header>

        {/* Outlet renders the current page here */}
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    background: '#f7f8fa',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  topbar: {
    height: 56,
    padding: '0 28px',
    borderBottom: '1px solid #eaecf0',
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
    color: '#111',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '28px',
  },
}
