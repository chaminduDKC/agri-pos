// src/pages/Quotations.tsx
import { useState, useEffect } from 'react'
import { useQuotations, type Quotation, type QuotationInput, type QuotationItemInput } from '../hooks/useQuotations'

const STATUSES = ['draft', 'sent', 'approved', 'rejected'] as const
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:    { bg: '#f3f4f6', color: '#374151' },
  sent:     { bg: '#dbeafe', color: '#1e40af' },
  approved: { bg: '#dcfce7', color: '#166534' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
}

const emptyItem: QuotationItemInput = { item_name: '', quantity: 1, unit_price: 0, labor_cost: 0 }
const emptyForm: QuotationInput = { client_id: '', project_id: '', status: 'draft', valid_until: '', notes: '', items: [{ ...emptyItem }] }

export default function Quotations() {
  const { quotations, loading, error, search, createQuotation, updateQuotation, updateStatus, deleteQuotation } = useQuotations()

  const [clients, setClients]   = useState<{ id: string; name: string }[]>([])
  const [projects, setProjects] = useState<{ id: string; title: string; client_id: string }[]>([])
  const [inventoryItems, setInventoryItems] = useState<{ id: string; name: string; unit_price: number }[]>([])
  const [filter, setFilter]     = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm]         = useState<QuotationInput>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewingId, setViewingId]   = useState<string | null>(null)
  const [viewData, setViewData]     = useState<any>(null)

  useEffect(() => {
    Promise.all([
      window.api.clients.getAll(),
      window.api.projects.getAll(),
      window.api.items.getAll(),
    ]).then(([c, p, i]) => {
      if (c.success) setClients(c.data ?? [])
      if (p.success) setProjects(p.data ?? [])
      if (i.success) setInventoryItems(i.data ?? [])
    })
  }, [])

  const filtered = filter === 'all' ? quotations : quotations.filter(q => q.status === filter)
  const counts   = STATUSES.reduce((a, s) => ({ ...a, [s]: quotations.filter(q => q.status === s).length }), {} as Record<string, number>)

  // ── Line item helpers ──────────────────────────────────────
  const addLine = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }))

  const removeLine = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))

  const updateLine = (i: number, field: keyof QuotationItemInput, value: any) =>
    setForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }))

  const pickInventoryItem = (lineIdx: number, itemId: string) => {
    const found = inventoryItems.find(i => i.id === itemId)
    if (!found) return
    setForm(f => ({
      ...f,
      items: f.items.map((item, idx) => idx === lineIdx
        ? { ...item, item_id: found.id, item_name: found.name, unit_price: found.unit_price }
        : item
      )
    }))
  }

  // ── Totals ─────────────────────────────────────────────────
  const lineTotal = (item: QuotationItemInput) =>
    (item.quantity * item.unit_price) + (item.labor_cost ?? 0)

  const grandTotal = form.items.reduce((sum, item) => sum + lineTotal(item), 0)

  // ── Form open/close ────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null)
    setForm({ ...emptyForm, client_id: clients[0]?.id ?? '', items: [{ ...emptyItem }] })
    setFormError(null); setShowForm(true)
  }

  const openEdit = async (q: Quotation) => {
    const res = await window.api.quotations.getByIdWithItems(q.id)
    if (!res.success) return
    const data = res.data
    setEditingId(q.id)
    setForm({
      client_id:   data.client_id,
      project_id:  data.project_id ?? '',
      status:      data.status,
      valid_until: data.valid_until ?? '',
      notes:       data.notes ?? '',
      items: data.items.map((i: any) => ({
        item_id: i.item_id ?? undefined,
        item_name: i.item_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        labor_cost: i.labor_cost,
      }))
    })
    setFormError(null); setShowForm(true)
  }

  const openView = async (id: string) => {
    const res = await window.api.quotations.getByIdWithItems(id)
    if (res.success) { setViewData(res.data); setViewingId(id) }
  }

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); setFormError(null) }

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.client_id)       { setFormError('Client is required'); return }
    if (!form.items.length)    { setFormError('Add at least one line item'); return }
    if (form.items.some(i => !i.item_name.trim())) { setFormError('All line items need a name'); return }
    setSaving(true)
    const err = editingId
      ? await updateQuotation(editingId, form)
      : await createQuotation(form)
    setSaving(false)
    if (err) { setFormError(err) } else { closeForm() }
  }

  const handleDelete = async (id: string) => {
    const err = await deleteQuotation(id)
    if (err) alert(err)
    setDeletingId(null)
  }

  // Filtered projects for the selected client
  const clientProjects = projects.filter(p => p.client_id === form.client_id)
  

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Quotations</h2>
          <p style={s.sub}>{quotations.length} total</p>
        </div>
        <button style={s.btnPrimary} onClick={openAdd} disabled={clients.length === 0}>
          {clients.length === 0 ? 'Add a client first' : '+ New Quotation'}
        </button>
      </div>

      {/* Status tabs */}
      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(filter === 'all' ? s.tabActive : {}) }} onClick={() => setFilter('all')}>
          All <span style={s.tabCount}>{quotations.length}</span>
        </button>
        {STATUSES.map(st => (
          <button key={st} style={{ ...s.tab, ...(filter === st ? s.tabActive : {}) }} onClick={() => setFilter(st)}>
            {st.charAt(0).toUpperCase() + st.slice(1)} <span style={s.tabCount}>{counts[st] ?? 0}</span>
          </button>
        ))}
      </div>

      <input style={s.search} placeholder="Search by client or project..." onChange={e => search(e.target.value)} />

      {loading && <p style={s.muted}>Loading...</p>}
      {error   && <p style={s.err}>{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div style={s.empty}>
          <p style={{ marginBottom: 12 }}>No quotations yet.</p>
          {filter === 'all' && <button style={s.btnPrimary} onClick={openAdd}>Create your first quotation</button>}
        </div>
      )}

      {/* Quotation list */}
      <div style={s.list}>
        {filtered.map(q => {
          const sc = STATUS_COLORS[q.status]
          return (
            <div key={q.id} style={s.card}>
              <div style={s.cardLeft}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={s.cardTitle}>{q.client_name}</span>
                    {q.project_title && <span style={s.projectTag}>{q.project_title}</span>}
                  </div>
                  <p style={s.cardMeta}>
                    Rs {q.total_amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    {q.valid_until && <span style={{ marginLeft:10 }}>· Valid until {q.valid_until}</span>}
                  </p>
                  <p style={s.cardDate}>{new Date(q.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div style={s.cardRight}>
                <select
                  value={q.status}
                  onChange={e => updateStatus(q.id, e.target.value)}
                  style={{ ...s.statusBadge, background: sc.bg, color: sc.color }}
                >
                  {STATUSES.map(st => <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>)}
                </select>
                <button style={s.btnSm} onClick={() => openView(q.id)}>View</button>
                <button style={s.btnSm} onClick={() => openEdit(q)}>Edit</button>
                {deletingId === q.id ? (
                  <>
                    <button style={s.btnDanger} onClick={() => handleDelete(q.id)}>Delete</button>
                    <button style={s.btnSm} onClick={() => setDeletingId(null)}>Cancel</button>
                  </>
                ) : (
                  <button style={s.btnSm} onClick={() => setDeletingId(q.id)}>Delete</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* View modal */}
      {viewingId && viewData && (
        <div style={s.overlay} onClick={() => setViewingId(null)}>
          <div style={{ ...s.modal, maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={s.modalTitle}>Quotation</h3>
              <button style={s.btnSm} onClick={() => setViewingId(null)}>Close</button>
            </div>
            <p style={{ fontSize:14, marginBottom:4 }}><strong>Client:</strong> {viewData.client_name}</p>
            {viewData.project_title && <p style={{ fontSize:14, marginBottom:4 }}><strong>Project:</strong> {viewData.project_title}</p>}
            {viewData.valid_until   && <p style={{ fontSize:14, marginBottom:12 }}><strong>Valid until:</strong> {viewData.valid_until}</p>}
            <table style={{ ...s.table, marginBottom:16 }}>
              <thead>
                <tr>
                  {['Item', 'Qty', 'Unit price', 'Labour', 'Line total'].map(h =>
                    <th key={h} style={s.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {viewData.items.map((item: any) => (
                  <tr key={item.id}>
                    <td style={s.td}>{item.item_name}</td>
                    <td style={s.td}>{item.quantity}</td>
                    <td style={s.td}>Rs {item.unit_price.toFixed(2)}</td>
                    <td style={s.td}>Rs {item.labor_cost.toFixed(2)}</td>
                    <td style={{ ...s.td, fontWeight:500 }}>Rs {item.line_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign:'right', fontSize:16, fontWeight:600 }}>
              Total: Rs {viewData.total_amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </div>
            {viewData.notes && <p style={{ marginTop:12, fontSize:13, color:'#6b7280', fontStyle:'italic' }}>{viewData.notes}</p>}
          </div>
        </div>
      )}

      {/* Edit/Create modal */}
      {showForm && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={s.modalTitle}>{editingId ? 'Edit Quotation' : 'New Quotation'}</h3>
            <button style={s.btnSm} onClick={closeForm} disabled={saving}>Cancel</button>
            </div>
            {formError && <p style={s.err}>{formError}</p>}

            <div style={s.grid2}>
              <div>
                <label style={s.label}>Client *</label>
                <select style={s.input} value={form.client_id}
                  onChange={e => setForm(f => ({ ...f, client_id: e.target.value, project_id: '' }))}>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Project (optional)</label>
                <select style={s.input} value={form.project_id ?? ''}
                  onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                  disabled={!form.client_id}>
                  <option value="">No project</option>
                  {clientProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            </div>

            <div style={s.grid2}>
              <div>
                <label style={s.label}>Status</label>
                <select style={s.input} value={form.status ?? 'draft'}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map(st => <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Valid until</label>
                <input style={s.input} type="date" value={form.valid_until ?? ''}
                  onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
              </div>
            </div>

            {/* Line items */}
            <div style={{ marginTop:20, marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <label style={{ ...s.label, marginTop:0 }}>Line items *</label>
              <button style={s.btnSm} onClick={addLine}>+ Add line</button>
            </div>

            <table style={s.table}>
              <thead>
                <tr>
                  {['Item', 'Qty', 'Unit price', 'Labour', 'Total', ''].map(h =>
                    <th key={h} style={s.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, i) => (
                  <tr key={i}>
                    <td style={s.td}>
                      {/* Pick from inventory OR type custom name */}
                      <select style={{ ...s.input, marginBottom:4, fontSize:12 }}
                        value={item.item_id ?? ''}
                        onChange={e => e.target.value ? pickInventoryItem(i, e.target.value) : updateLine(i, 'item_id', undefined)}>
                        <option value="">Custom item...</option>
                        {inventoryItems.map(inv => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                      </select>
                      <input style={{ ...s.input, fontSize:12 }} placeholder="Item name" value={item.item_name}
                        onChange={e => updateLine(i, 'item_name', e.target.value)} />
                    </td>
                    <td style={s.td}>
                      <input style={{ ...s.input, width:60 }} type="number" value={item.quantity}
                        onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td style={s.td}>
                      <input style={{ ...s.input, width:90 }} type="number" value={item.unit_price}
                        onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td style={s.td}>
                      <input style={{ ...s.input, width:90 }} type="number" value={item.labor_cost ?? 0}
                        onChange={e => updateLine(i, 'labor_cost', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td style={{ ...s.td, fontWeight:500, whiteSpace:'nowrap' }}>
                      Rs {lineTotal(item).toFixed(2)}
                    </td>
                    <td style={s.td}>
                      {form.items.length > 1 &&
                        <button style={{ ...s.btnSm, color:'#dc2626', borderColor:'#dc2626' }} onClick={() => removeLine(i)}>✕</button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign:'right', fontSize:15, fontWeight:600, marginTop:12 }}>
              Total: Rs {grandTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </div>

            <label style={s.label}>Notes</label>
            <textarea style={{ ...s.input, height:60, resize:'vertical' }}
              value={form.notes ?? ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

            <div style={s.modalActions}>
              
              <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Quotation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
const s: Record<string, React.CSSProperties> = {
  page: { margin: '0 auto' },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
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

  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 14,
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
    marginBottom: -1
  },

  tabActive: {
    color: '#818cf8',
    borderBottomColor: '#818cf8',
    fontWeight: 500
  },

  tabCount: {
    marginLeft: 5,
    fontSize: 11,
    background: '#2c3443',
    color: '#9ca3af',
    padding: '1px 6px',
    borderRadius: 10
  },

  search: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    border: '1px solid #2c3443',
    borderRadius: 8,
    marginBottom: 16,
    boxSizing: 'border-box',
    background: '#232a36',
    color: '#e5e7eb',
    outline: 'none'
  },

  muted: { color: '#6b7280', fontSize: 14 },

  err: { color: '#f87171', fontSize: 13, marginBottom: 10 },

  empty: {
    textAlign: 'center',
    padding: '60px 0',
    color: '#6b7280'
  },

  list: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 8
  },

  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    border: '1px solid #2c3443',
    borderRadius: 10,
    background: '#232a36'
  },

  cardLeft: { flex: 1 },

  cardRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f3f4f6'
  },

  projectTag: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 10,
    background: '#312e81',
    color: '#c7d2fe'
  },

  cardMeta: {
    fontSize: 13,
    color: '#9ca3af',
    margin: '2px 0 0'
  },

  cardDate: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2
  },

  statusBadge: {
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 20,
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    appearance: 'none',
    background: '#2c3443',
    color: '#9ca3af'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13
  },

  th: {
    padding: '8px 10px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    borderBottom: '1px solid #2c3443',
    background: '#1e2430'
  },

  td: {
    padding: '8px 10px',
    borderBottom: '1px solid #2c3443',
    verticalAlign: 'middle',
    color: '#e5e7eb'
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

  btnDanger: {
    padding: '5px 10px',
    background: '#b91c1c',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer'
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
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid #2c3443'
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: '0 0 4px',
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
};
