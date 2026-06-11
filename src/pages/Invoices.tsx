// src/pages/Invoices.tsx
import { useState, useEffect, useCallback } from 'react'

interface Invoice {
  id: string
  project_id: string
  project_title: string
  client_id: string
  client_name: string
  quotation_id: string | null
  amount_due: number
  amount_paid: number
  amount_remaining: number
  payment_status: 'pending' | 'partial' | 'paid'
  due_date: string | null
  notes: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fef9c3', color: '#854d0e' },
  partial: { bg: '#dbeafe', color: '#1e40af' },
  paid:    { bg: '#dcfce7', color: '#166534' },
}

export default function Invoices() {
  const [invoices, setInvoices]   = useState<Invoice[]>([])
  const [clients, setClients]     = useState<{ id: string; name: string }[]>([])
  const [projects, setProjects]   = useState<{ id: string; title: string; client_id: string }[]>([])
  const [quotations, setQuotations] = useState<{ id: string; client_id: string; total_amount: number; transport_installation:number }[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')

  // Create form
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ project_id: '', client_id: '', quotation_id: '', amount_due: 0, transport_installation:0, due_date: '', notes: '' })
  const [formErr, setFormErr]     = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)

  // Payment recording
  const [payingId, setPayingId]   = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')

  // Outstanding summary
  const [summary, setSummary]     = useState({ total_due: 0, total_paid: 0, total_remaining: 0 })

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [inv, cli, proj, quot, sum] = await Promise.all([
      window.api.invoices.getAll(),
      window.api.clients.getAll(),
      window.api.projects.getAll(),
      window.api.quotations.getAll(),
      window.api.invoices.getOutstandingSummary(),
    ])
    if (inv.success)  setInvoices(inv.data ?? [])
    if (cli.success)  setClients(cli.data ?? [])
    if (proj.success) setProjects(proj.data ?? [])
    if (quot.success) {setQuotations(quot.data ?? []); console.log("Quotations ", quot.data)}
    if (sum.success)  setSummary(sum.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.payment_status === filter)
  const counts   = ['pending','partial','paid'].reduce((a, s) => ({ ...a, [s]: invoices.filter(i => i.payment_status === s).length }), {} as Record<string, number>)

  // When client changes, filter projects and quotations
  const clientProjects   = projects.filter(p => p.client_id === form.client_id)
  const clientQuotations = quotations.filter(q => q.client_id === form.client_id)

  const openForm = () => {
    setForm({ project_id: '', client_id: clients[0]?.id ?? '', quotation_id: '', amount_due: 0, transport_installation:0, due_date: '', notes: '' })
    setFormErr(null); setShowForm(true)
  }

  const handleQuotationPick = (quotationId: string) => {
    const q = quotations.find(q => q.id === quotationId)
    if(!q) setForm(prev => ({...prev, quotation_id:"", amount_due:0}))
    setForm(f => ({ ...f, quotation_id: quotationId, amount_due: q
      ? (q.total_amount ?? 0) + (q.transport_installation ?? 0)
      :( f.amount_due + f.transport_installation) }))
  }

  const handleSave = async () => {
    if (!form.client_id)   { setFormErr('Client is required'); return }
    if (!form.project_id)  { setFormErr('Project is required'); return }
    if (!form.amount_due)  { setFormErr('Amount due is required'); return }
    console.log(form)
    
    setSaving(true)
    const res = await window.api.invoices.create({
      ...form,
      quotation_id: form.quotation_id || undefined,
    })
    setSaving(false)
    if (res.success) {
      setInvoices(prev => [res.data, ...prev])
      // Refresh summary
      window.api.invoices.getOutstandingSummary().then(r => { if (r.success) setSummary(r.data) })
      setShowForm(false)
    } else setFormErr(res.error ?? 'Failed')
  }

  const handlePayment = async (id: string) => {
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) return
    const res = await window.api.invoices.recordPayment(id, amount)
    if (res.success) {
      setInvoices(prev => prev.map(i => i.id === id ? res.data : i))
      window.api.invoices.getOutstandingSummary().then(r => { if (r.success) setSummary(r.data) })
      setPayingId(null); setPayAmount('')
    } else alert(res.error)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice?')) return
    const res = await window.api.invoices.delete(id)
    if (res.success) {
      setInvoices(prev => prev.filter(i => i.id !== id))
      window.api.invoices.getOutstandingSummary().then(r => { if (r.success) setSummary(r.data) })
    } else alert(res.error)
  }

  if (loading) return <p style={{ padding: 32, color: '#888' }}>Loading...</p>

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Invoices</h2>
          <p style={s.sub}>{invoices.length} total</p>
        </div>
        <button style={s.btnPrimary} onClick={openForm} disabled={clients.length === 0}>
          {clients.length === 0 ? 'Add a client first' : '+ New Invoice'}
        </button>
      </div>

      {/* Outstanding summary cards */}
      <div style={s.summaryRow}>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Total invoiced</p>
          <p style={s.summaryValue}>Rs {(summary.total_due).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
        </div>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Collected</p>
          <p style={{ ...s.summaryValue, color: '#16a34a' }}>Rs {summary.total_paid.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
        </div>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Outstanding</p>
          <p style={{ ...s.summaryValue, color: summary.total_remaining > 0 ? '#dc2626' : '#16a34a' }}>
            Rs {summary.total_remaining.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={s.tabs}>
        {['all', 'pending', 'partial', 'paid'].map(f => (
          <button key={f} style={{ ...s.tab, ...(filter === f ? s.tabActive : {}) }} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={s.tabCount}>{f === 'all' ? invoices.length : counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0
        ? <p style={s.muted}>{filter === 'all' ? 'No invoices yet.' : `No ${filter} invoices.`}</p>
        : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>{['Client','Project','Amount due','Paid','Remaining','Status','Due date',''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const sc = STATUS_COLORS[inv.payment_status]
                  return (
                    <tr key={inv.id}>
                      <td style={s.td}><strong>{inv.client_name}</strong></td>
                      <td style={s.td}>{inv.project_title}</td>
                      <td style={s.td}>Rs {inv.amount_due.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                      <td style={{ ...s.td, color: '#16a34a' }}>Rs {inv.amount_paid.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                      <td style={{ ...s.td, color: inv.amount_remaining > 0 ? '#dc2626' : '#16a34a', fontWeight: 500 }}>
                        Rs {inv.amount_remaining.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: sc.bg, color: sc.color }}>
                          {inv.payment_status.charAt(0).toUpperCase() + inv.payment_status.slice(1)}
                        </span>
                      </td>
                      <td style={{ ...s.td, fontSize: 12, color: inv.due_date && new Date(inv.due_date) < new Date() && inv.payment_status !== 'paid' ? '#dc2626' : "white" }}>
                        {inv.due_date ?? <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={s.td}>
                        <div style={{ display:'flex', gap:6 }}>
                          {inv.payment_status !== 'paid' && (
                            payingId === inv.id ? (
                              <span style={{ display:'flex', gap:4, alignItems:'center' }}>
                                <input style={{ ...s.input, width:100, padding:'4px 8px', fontSize:12 }}
                                  type="number" placeholder="Amount" value={payAmount} autoFocus
                                  onChange={e => setPayAmount(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handlePayment(inv.id); if (e.key === 'Escape') setPayingId(null) }} />
                                <button style={{ ...s.btnSm, background:'#16a34a', color:'#fff', border:'none' }} onClick={() => handlePayment(inv.id)}>Record</button>
                                <button style={s.btnSm} onClick={() => setPayingId(null)}>✕</button>
                              </span>
                            ) : (
                              <button style={{ ...s.btnSm, color:'#16a34a', borderColor:'#16a34a' }} onClick={() => { setPayingId(inv.id); setPayAmount('') }}>
                                + Payment
                              </button>
                            )
                          )}
                          <button style={s.btnSm} onClick={() => handleDelete(inv.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Create modal */}
      {showForm && (
        <div style={s.overlay}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>New Invoice</h3>
            {formErr && <p style={s.err}>{formErr}</p>}

            <div style={s.grid2}>
              <div>
                <label style={s.label}>Client *</label>
                <select style={s.input} value={form.client_id}
                  onChange={e => setForm(f => ({ ...f, client_id: e.target.value, project_id: '', quotation_id: '' }))}>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Project *</label>
                <select style={s.input} value={form.project_id}
                  onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                  disabled={!form.client_id}>
                  <option value="">Select project...</option>
                  {clientProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            </div>

            <div style={s.grid2}>
              <div>
                <label style={s.label}>Link to quotation (optional)</label>
                <select style={s.input} value={form.quotation_id}
                  onChange={e => handleQuotationPick(e.target.value)}
                  disabled={!form.client_id}>
                  <option value="">No quotation</option>
                  {clientQuotations.map(q => <option key={q.id} value={q.id}>Rs {(q.total_amount +q.transport_installation ).toLocaleString('en-LK', {maximumFractionDigits:2, minimumFractionDigits:2})}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Amount due (Rs) *</label>
                <input style={s.input} type="number" value={(form.amount_due)}
                  onChange={e => setForm(f => ({ ...f, amount_due: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>

            <div style={s.grid2}>
              <div>
                <label style={s.label}>Due date</label>
                <input style={s.input} type="date" value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>

            <label style={s.label}>Notes</label>
            <textarea style={{ ...s.input, height: 60, resize: 'vertical' }}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

            <div style={s.modalActions}>
              <button style={s.btnSm} onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
              <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
const s: Record<string, React.CSSProperties> = {
  page: { margin: '0 auto', maxWidth: 1200 },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20
  },

  title: {
    fontSize: 22,
    fontWeight: 600,
    margin: 0,
    color: '#e5e7eb'
  },

  sub: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 3
  },

  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
    marginBottom: 20
  },

  summaryCard: {
    background: '#232a36',
    border: '1px solid #2c3443',
    borderRadius: 10,
    padding: '14px 18px'
  },

  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    margin: '0 0 4px'
  },

  summaryValue: {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
    color: '#f3f4f6'
  },

  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 16,
    borderBottom: '1px solid #2c3443'
  },

  tab: {
    padding: '8px 14px',
    fontSize: 13,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#9ca3af',
    borderBottom: '2px solid transparent',
    marginBottom: -1,
    display: 'flex',
    gap: 6,
    alignItems: 'center'
  },

  tabActive: {
    color: '#818cf8',
    borderBottomColor: '#818cf8',
    fontWeight: 500
  },

  tabCount: {
    fontSize: 11,
    background: '#2c3443',
    color: '#9ca3af',
    padding: '1px 6px',
    borderRadius: 10
  },

  muted: {
    color: '#6b7280',
    fontSize: 14,
    padding: '20px 0'
  },

  tableWrap: {
    background: '#232a36',
    border: '1px solid #2c3443',
    borderRadius: 10,
    overflow: 'hidden'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13
  },

  th: {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: '1px solid #2c3443',
    background: '#1e2430'
  },

  td: {
    padding: '11px 14px',
    borderBottom: '1px solid #2c3443',
    verticalAlign: 'middle',
    color: '#e5e7eb'
  },

  badge: {
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 20,
    fontWeight: 500,
    background: '#2c3443',
    color: '#9ca3af'
  },

  btnPrimary: {
    padding: '9px 16px',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500
  },

  btnSm: {
    padding: '5px 10px',
    background: '#232a36',
    border: '1px solid #2c3443',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    color: '#e5e7eb'
  },

  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100
  },

  modal: {
    background: '#232a36',
    borderRadius: 12,
    padding: 28,
    width: '100%',
    maxWidth: 520,
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid #2c3443'
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: '0 0 16px',
    color: '#e5e7eb'
  },

  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20
  },

  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12
  },

  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: '#9ca3af',
    marginTop: 12,
    marginBottom: 4
  },

  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #2c3443',
    borderRadius: 6,
    boxSizing: 'border-box',
    background: '#1e2430',
    color: '#e5e7eb',
    outline: 'none'
  },

  err: {
    color: '#f87171',
    fontSize: 13,
    marginBottom: 10
  }
};
