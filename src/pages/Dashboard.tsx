import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface DashboardData {
  projectCounts:  Record<string, number>
  lowStockItems:  { id: string; name: string; quantity: number; low_stock_threshold: number; unit: string }[]
  outstanding:    { total_due: number; total_paid: number; total_remaining: number }
  recentProjects: { id: string; title: string; client_name: string; status: string; created_at: string }[]
  recentInvoices: { id: string; client_name: string; amount_due: number; amount_remaining: number; payment_status: string }[]
  workerCount:    number
  clientCount:    number
  itemCount:      number
}

const STATUS_COLORS: Record<string, string> = {
  pending:   '#f59e0b',
  active:    '#10b981',
  completed: '#6366f1',
  cancelled: '#9ca3af',
}

const PAY_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fef9c3', color: '#854d0e' },
  partial: { bg: '#dbeafe', color: '#1e40af' },
  paid:    { bg: '#dcfce7', color: '#166534' },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [
          projectsRes,
          lowStockRes,
          outstandingRes,
          invoicesRes,
          workersRes,
          clientsRes,
          itemsRes,
        ] = await Promise.all([
          window.api.projects.getStatusCounts(),
          window.api.items.getLowStock(),
          window.api.invoices.getOutstandingSummary(),
          window.api.invoices.getAll(),
          window.api.workers.getAll(),
          window.api.clients.getAll(),
          window.api.items.getAll(),
        ])

        setData({
          projectCounts:  projectsRes.success ? projectsRes.data : {},
          lowStockItems:  lowStockRes.success  ? (lowStockRes.data ?? []).slice(0, 5) : [],
          outstanding:    outstandingRes.success ? outstandingRes.data : { total_due: 0, total_paid: 0, total_remaining: 0 },
          recentProjects: projectsRes.success
            ? [] 
            : [],
          recentInvoices: invoicesRes.success
            ? (invoicesRes.data ?? []).filter((i: any) => i.payment_status !== 'paid').slice(0, 5)
            : [],
          workerCount: workersRes.success ? (workersRes.data ?? []).length : 0,
          clientCount: clientsRes.success ? (clientsRes.data ?? []).length : 0,
          itemCount:   itemsRes.success   ? (itemsRes.data ?? []).length   : 0,
        })

        const recentRes = await window.api.projects.getAll()
        if (recentRes.success) {
          setData(prev => prev ? ({
            ...prev,
            recentProjects: (recentRes.data ?? []).slice(0, 5),
          }) : prev)
        }

      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div style={s.loading}>Loading dashboard...</div>
  if (error)   return <div style={s.err}>Error: {error}</div>
  if (!data)   return null

  const totalProjects = Object.values(data.projectCounts).reduce((a, b) => a + b, 0)
  const activeProjects = data.projectCounts['active'] ?? 0

  return (
    <div style={s.page}>

      {/* ── Stat cards ──────────────────────────────────── */}
      <div style={s.statsGrid}>
        <StatCard
          label="Active projects"
          value={activeProjects}
          total={`${totalProjects} total`}
          color="#6366f1"
          onClick={() => navigate('/projects')}
        />
        <StatCard
          label="Clients"
          value={data.clientCount}
          color="#0ea5e9"
          onClick={() => navigate('/clients')}
        />
        <StatCard
          label="Inventory items"
          value={data.itemCount}
          sub={data.lowStockItems.length > 0 ? `${data.lowStockItems.length} low stock` : undefined}
          subColor={data.lowStockItems.length > 0 ? '#dc2626' : undefined}
          color="#10b981"
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          label="Workers"
          value={data.workerCount}
          color="#f59e0b"
          onClick={() => navigate('/paysheets')}
        />
      </div>

      {/* ── Financial summary ────────────────────────────── */}
      <div style={s.finRow}>
        <div style={s.finCard}>
          <p style={s.finLabel}>Outstanding</p>
          <p style={{ ...s.finValue, color: data.outstanding.total_remaining > 0 ? '#dc2626' : '#16a34a' }}>
            Rs {data.outstanding.total_remaining.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </p>
          <p style={s.finSub}>
            <strong>Rs {data.outstanding.total_paid.toLocaleString('en-LK', { minimumFractionDigits: 2 })} </strong> collected of  <strong>Rs {data.outstanding.total_due.toLocaleString('en-LK', { minimumFractionDigits: 2 })} </strong> invoiced
          </p>
          {data.outstanding.total_due > 0 && (
            <div style={s.progressTrack}>
              <div style={{ ...s.progressBar, width: `${Math.min(100, (data.outstanding.total_paid / data.outstanding.total_due) * 100)}%` }} />
            </div>
          )}
        </div>

        {/* Project status breakdown */}
        <div style={s.finCard}>
          <p style={s.finLabel}>Projects by Status</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {(['active', 'pending', 'completed', 'cancelled'] as const).map(status => {
              const count = data.projectCounts[status] ?? 0
              const pct   = totalProjects > 0 ? (count / totalProjects) * 100 : 0
              return (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 3 }}>
                    <span style={{ textTransform: 'capitalize', color: '#afc2e4' }}>{status}</span>
                    <span style={{ fontWeight: 500, color: '#afc2e4' }}>{count}</span>
                  </div>
                  <div style={s.progressTrack}>
                    <div style={{ ...s.progressBar, width: `${pct}%`, background: STATUS_COLORS[status] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={s.bottomRow}>

        {/* Recent projects */}
        <div style={s.panel}>
          <div style={s.panelHeader}>
            <p style={s.panelTitle}>Recent Projects</p>
            <button style={s.linkBtn} onClick={() => navigate('/projects')}>View all →</button>
          </div>
          {data.recentProjects.length === 0
            ? <p style={s.empty}>No Projects Yet</p>
            : data.recentProjects.map(p => (
              <div key={p.id} style={s.listRow}>
                <div style={{ flex: 1 }}>
                  <p style={s.rowTitle}>{p.title}</p>
                  <p style={s.rowSub}>{p.client_name}</p>
                </div>
                <span style={{ ...s.dot, background: STATUS_COLORS[p.status] }} />
                <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{p.status}</span>
              </div>
            ))
          }
        </div>

        {/* Low stock alerts */}
        <div style={s.panel}>
          <div style={s.panelHeader}>
            <p style={s.panelTitle}>
              Low stock alerts
              {data.lowStockItems.length > 0 &&
                <span style={s.alertBadge}>{data.lowStockItems.length}</span>
              }
            </p>
            <button style={s.linkBtn} onClick={() => navigate('/inventory')}>View all →</button>
          </div>
          {data.lowStockItems.length === 0
            ? <p style={s.empty}>All stock levels OK</p>
            : data.lowStockItems.map(item => (
              <div key={item.id} style={s.listRow}>
                <div style={{ flex: 1 }}>
                  <p style={s.rowTitle}>{item.name}</p>
                  <p style={s.rowSub}>Threshold: {item.low_stock_threshold} {item.unit}</p>
                </div>
                <span style={s.lowBadge}>
                  {item.quantity} {item.unit}
                </span>
              </div>
            ))
          }
        </div>

        {/* Unpaid invoices */}
        <div style={s.panel}>
          <div style={s.panelHeader}>
            <p style={s.panelTitle}>Unpaid invoices</p>
            <button style={s.linkBtn} onClick={() => navigate('/invoices')}>View all →</button>
          </div>
          {data.recentInvoices.length === 0
            ? <p style={s.empty}>No outstanding invoices</p>
            : data.recentInvoices.map(inv => {
              const pc = PAY_COLORS[inv.payment_status]
              return (
                <div key={inv.id} style={s.listRow}>
                  <div style={{ flex: 1 }}>
                    <p style={s.rowTitle}>{inv.client_name}</p>
                    <p style={s.rowSub}>
                      Rs {inv.amount_remaining.toLocaleString('en-LK', { minimumFractionDigits: 2 })} remaining
                    </p>
                  </div>
                  <span style={{ ...s.badge, background: pc.bg, color: pc.color }}>
                    {inv.payment_status.charAt(0).toUpperCase() + inv.payment_status.slice(1)}
                  </span>
                </div>
              )
            })
          }
        </div>

      </div>
    </div>
  )
}

function StatCard({ label, value, total, sub, subColor, color, onClick }: {
  label: string; value: number; total?: string; sub?: string
  subColor?: string; color: string; onClick?: () => void
}) {
  return (
    <div style={{ ...s.statCard, cursor: onClick ? 'pointer' : undefined }} onClick={onClick}>
      <div style={{ ...s.statAccent, background: color }} />
      <div style={s.statBody}>
        <p style={s.statLabel}>{label}</p>
        <p style={s.statValue}>{value}</p>
        {total && <p style={s.statSub}>{total}</p>}
        {sub   && <p style={{ ...s.statSub, color: subColor ?? '#6b7280' }}>{sub}</p>}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { margin: '0 auto' },

  loading: {
    padding: 40,
    color: 'var(--text-muted)',
    fontSize: 14
  },

  err: {
    padding: 40,
    color: 'var(--danger)',
    fontSize: 14
  },

  // ── Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 20,
    marginBottom: 16
  },

  statCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    display: 'flex',
    transition: 'box-shadow .15s',
  },

  statAccent: { width: 4, flexShrink: 0 },

  statBody: { padding: '14px 16px', flex: 1 },

  statLabel: {
    fontSize: 18,
    color: 'var(--text-muted)',
    margin: '0 0 6px'
  },

  statValue: {
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
    lineHeight: 1,
    color: 'var(--text)'
  },

  statSub: {
    fontSize: 16,
    color: 'var(--text-dim)',
    marginTop: 4
  },

  // ── Financial
  finRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
    marginBottom: 16
  },

  finCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '18px 20px'
  },

  finLabel: {
    fontSize: 18,
    color: 'var(--text-muted)',
    margin: '0 0 6px',
    fontWeight: 500
  },

  finValue: {
    fontSize: 24,
    fontWeight: 700,
    margin: '0 0 4px',
    color: 'var(--text)'
  },

  finSub: {
    fontSize: 18,
    color: 'var(--text-dim)',
    margin: 0
  },

  // ── Progress
  progressTrack: {
    height: 6,
    background: 'var(--surface-2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 10
  },

  progressBar: {
    height: '100%',
    background: 'var(--primary)',
    borderRadius: 3,
    transition: 'width .3s'
  },

  // ── Bottom panels
  bottomRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 20
  },

  panel: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '16px 18px'
  },

  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },

  panelTitle: {
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--text)'
  },

  linkBtn: {
    fontSize: 16,
    color: 'var(--primary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0
  },

  empty: {
    fontSize: 15,
    color: 'var(--text-dim)',
    padding: '12px 0'
  },

  // ── List
  listRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 0',
    borderBottom: '1px solid var(--border)'
  },

  rowTitle: {
    fontSize: 15,
    fontWeight: 500,
    margin: 0,
    color: 'var(--text)'
  },

  rowSub: {
    fontSize: 14,
    color: 'var(--text-dim)',
    margin: '2px 0 0'
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0
  },

  // ── Badges
  alertBadge: {
    fontSize: 14,
    padding: '1px 6px',
    borderRadius: 10,
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    fontWeight: 600
  },

  lowBadge: {
    fontSize: 14,
    padding: '2px 8px',
    borderRadius: 10,
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    fontWeight: 600,
    flexShrink: 0
  },

  badge: {
    fontSize: 14,
    padding: '2px 8px',
    borderRadius: 10,
    fontWeight: 500,
    flexShrink: 0,
    background: 'var(--surface-2)',
    color: 'var(--text-muted)'
  },
};