// src/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'

const NAV_ITEMS = [
  { path: '/',           label: 'Dashboard',  icon: '▦' },
  { path: '/clients',    label: 'Clients',    icon: '👥' },
  { path: '/projects',   label: 'Projects',   icon: '🏗' },
  { path: '/inventory',  label: 'Inventory',  icon: '📦' },
  { path: '/quotations', label: 'Quotations', icon: '📋' },
  { path: '/paysheets',  label: 'Pay Sheets', icon: '💰' },
  { path: '/invoices',   label: 'Invoices',   icon: '🧾' },
]

const SYNC_COLORS: Record<string, string> = {
  idle:    '#22c55e',
  syncing: '#f59e0b',
  error:   '#ef4444',
  offline: '#6b7280',
}

const SYNC_LABELS: Record<string, string> = {
  idle:    'Synced',
  syncing: 'Syncing...',
  error:   'Sync error',
  offline: 'Offline',
}

export default function Sidebar() {
  const [syncStatus, setSyncStatus]     = useState('idle')
  const [pendingCount, setPendingCount] = useState(0)
  const [isOnline, setIsOnline]         = useState(true)

  useEffect(() => {
    // Get initial status
    window.api.sync.getStatus().then(res => {
      setSyncStatus(res.status)
      setPendingCount(res.pendingCount)
      setIsOnline(res.isOnline)
    })

    // Subscribe to live updates from main process
    // Returns an unsubscribe function
    const unsub = window.api.sync.onStatus(({ status, pendingCount }) => {
      setSyncStatus(status)
      setPendingCount(pendingCount)
      if (status === 'offline') setIsOnline(false)
      if (status === 'idle' || status === 'syncing') setIsOnline(true)
    })

    return unsub  // cleanup on unmount
  }, [])

  const handleSyncNow = async () => {
    if (!isOnline) return
    await window.api.sync.now()
  }

  return (
    <aside style={s.sidebar}>
      {/* Brand */}
      <div style={s.brand}>
        <span style={{ fontSize: 22 }}></span>
        <span style={s.brandName}>AgroPro</span>
      </div>

      {/* Nav */}
      <nav style={s.nav}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({ ...s.navLink, ...(isActive ? s.navLinkActive : {}) })}
          >
            <span style={s.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sync indicator */}
      <div style={s.syncArea} onClick={handleSyncNow} title={isOnline ? 'Click to sync now' : 'No internet connection'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Status dot */}
          <div style={{
            ...s.syncDot,
            background: SYNC_COLORS[syncStatus] ?? '#6b7280',
            animation: syncStatus === 'syncing' ? 'pulse 1s infinite' : undefined,
          }} />
          <div>
            <p style={s.syncLabel}>{SYNC_LABELS[syncStatus] ?? 'Unknown'}</p>
            {pendingCount > 0 && (
              <p style={s.syncSub}>{pendingCount} change{pendingCount !== 1 ? 's' : ''} pending</p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <div style={s.version}>v0.0.1</div>
    </aside>
  )
}

const s: Record<string, React.CSSProperties> = {
  sidebar:      { width: 220, height: '100vh', background: '#111827', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  brand:        { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px 16px', borderBottom: '1px solid #1f2937' },
  brandName:    { fontSize: 16, fontWeight: 700, color: '#f9fafb', letterSpacing: 0.3 },
  nav:          { flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: 5 },
  navLink:      { display: 'flex', alignItems: 'center', gap: 10, padding: '12px', borderRadius: 8, textDecoration: 'none', fontSize: 14, color: '#9ca3af' },
  navLinkActive:{ background: '#1f2937', color: '#f9fafb' },
  navIcon:      { fontSize: 16, width: 20, textAlign: 'center' },
  syncArea:     { margin: '0 10px 8px', padding: '10px 12px', borderRadius: 8, background: '#1f2937', cursor: 'pointer' },
  syncDot:      { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  syncLabel:    { fontSize: 12, color: '#e5e7eb', margin: 0, fontWeight: 500 },
  syncSub:      { fontSize: 11, color: '#6b7280', margin: '2px 0 0' },
  version:      { padding: '10px 18px', fontSize: 11, color: '#4a5566' },
}
