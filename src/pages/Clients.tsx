// src/pages/Clients.tsx
import { useState } from 'react'
import { useClients, type Client, type ClientInput } from '../hooks/useClients'

const emptyForm: ClientInput = { name: '', phone: '', email: '', address: '', notes: '' }

export default function Clients() {
  const { clients, loading, error, search, createClient, updateClient, deleteClient } = useClients()

  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [form, setForm]               = useState<ClientInput>(emptyForm)
  const [formError, setFormError]     = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setFormError(null); setShowForm(true) }
  const openEdit = (client: Client) => {
    setEditingId(client.id)
    setForm({ name: client.name, phone: client.phone ?? '', email: client.email ?? '', address: client.address ?? '', notes: client.notes ?? '' })
    setFormError(null); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); setFormError(null) }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Client name is required'); return }
    setSaving(true)
    const err = editingId ? await updateClient(editingId, form) : await createClient(form)
    setSaving(false)
    if (err) { setFormError(err) } else { closeForm() }
  }

  const startDelete = (id: string) => {
    setDeletingId(id)
    setDeleteError(null)
  }

  const handleDelete = async (id: string) => {
    const err = await deleteClient(id)
    if (err) {
      // Show error inline instead of alert()
      setDeleteError(err)
    } else {
      setDeletingId(null)
      setDeleteError(null)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Clients</h2>
          <p style={s.sub}>{clients.length} total</p>
        </div>
        <button style={s.btnPrimary} onClick={openAdd}>+ Add Client</button>
      </div>

      <input style={s.search} placeholder="Search by name, phone or email..." onChange={e => search(e.target.value)} />

      {loading && <p style={s.muted}>Loading...</p>}
      {error   && <p style={s.err}>{error}</p>}

      {!loading && !error && clients.length === 0 && (
        <div style={s.empty}>
          <p style={{ marginBottom: 12 }}>No clients yet.</p>
          <button style={s.btnPrimary} onClick={openAdd}>Add your first client</button>
        </div>
      )}

      <div style={s.list}>
        {clients.map(client => (
          <div key={client.id} style={s.card}>
            <div style={s.cardLeft}>
              <div style={s.avatar}>{client.name.charAt(0).toUpperCase()}</div>
              <div>
                <p style={s.name}>{client.name}</p>
                <p style={s.meta}>{[client.phone, client.email].filter(Boolean).join(' · ') || 'No contact info'}</p>
                {client.address && <p style={s.meta}>{client.address}</p>}
              </div>
            </div>
            <div style={s.cardRight}>
              <span style={s.badge}>{client.project_count} project{client.project_count !== 1 ? 's' : ''}</span>
              <button style={s.btnSm} onClick={() => openEdit(client)}>Edit</button>

              {deletingId === client.id ? (
                <div style={s.deleteBox}>
                  {deleteError ? (
                    // Inline error — no system alert()
                    <div style={s.inlineErr}>
                      <span style={{ flex: 1 }}>{deleteError}</span>
                      <button style={s.btnSm} onClick={() => { setDeletingId(null); setDeleteError(null) }}>OK</button>
                    </div>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, color: '#374151' }}>Delete this client?</span>
                      <button style={s.btnDanger} onClick={() => handleDelete(client.id)}>Yes, delete</button>
                      <button style={s.btnSm} onClick={() => { setDeletingId(null); setDeleteError(null) }}>Cancel</button>
                    </span>
                  )}
                </div>
              ) : (
                <button style={s.btnSm} onClick={() => startDelete(client.id)}>Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={s.overlay} onClick={closeForm}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{editingId ? 'Edit Client' : 'New Client'}</h3>
            {formError && <p style={s.err}>{formError}</p>}
            {(['name','phone','email','address'] as const).map(field => (
              <div key={field}>
                <label style={s.label}>{field.charAt(0).toUpperCase() + field.slice(1)}{field === 'name' ? ' *' : ''}</label>
                <input style={s.input} value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} autoFocus={field === 'name'} />
              </div>
            ))}
            <label style={s.label}>Notes</label>
            <textarea style={{ ...s.input, height: 72, resize: 'vertical' }} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <div style={s.modalActions}>
              <button style={s.btnSm} onClick={closeForm} disabled={saving}>Cancel</button>
              <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Client'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:        { maxWidth: 860 },
  header:      { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 },
  title:       { fontSize:22, fontWeight:600, margin:0 },
  sub:         { fontSize:13, color:'#888', marginTop:3 },
  search:      { width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #e5e7eb', borderRadius:8, marginBottom:16, boxSizing:'border-box', background:'#fff' },
  muted:       { color:'#888', fontSize:14 },
  err:         { color:'#dc2626', fontSize:13, marginBottom:10 },
  empty:       { textAlign:'center', padding:'60px 0', color:'#9ca3af' },
  list:        { display:'flex', flexDirection:'column', gap:8 },
  card:        { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', border:'1px solid #e5e7eb', borderRadius:10, background:'#fff', flexWrap:'wrap', gap:8 },
  cardLeft:    { display:'flex', alignItems:'center', gap:12 },
  cardRight:   { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' },
  avatar:      { width:40, height:40, borderRadius:'50%', background:'#ede9fe', color:'#6d28d9', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, fontSize:15, flexShrink:0 },
  name:        { fontSize:14, fontWeight:500, margin:0 },
  meta:        { fontSize:12, color:'#6b7280', margin:'2px 0 0' },
  badge:       { fontSize:12, padding:'2px 10px', borderRadius:20, background:'#f3f4f6', color:'#374151' },
  deleteBox:   { display:'flex', alignItems:'center' },
  inlineErr:   { display:'flex', alignItems:'center', gap:8, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'6px 10px', fontSize:13, color:'#dc2626', maxWidth:360 },
  btnPrimary:  { padding:'9px 16px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:8, fontSize:13, cursor:'pointer', fontWeight:500 },
  btnSm:       { padding:'6px 12px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:6, fontSize:13, cursor:'pointer' },
  btnDanger:   { padding:'6px 12px', background:'#dc2626', color:'#fff', border:'none', borderRadius:6, fontSize:13, cursor:'pointer' },
  overlay:     { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  modal:       { background:'#fff', borderRadius:12, padding:28, width:'100%', maxWidth:460, boxShadow:'0 20px 60px rgba(0,0,0,0.12)' },
  modalTitle:  { fontSize:16, fontWeight:600, margin:'0 0 16px' },
  modalActions:{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 },
  label:       { display:'block', fontSize:12, fontWeight:500, color:'#374151', marginTop:12, marginBottom:4 },
  input:       { width:'100%', padding:'8px 12px', fontSize:14, border:'1px solid #e5e7eb', borderRadius:6, boxSizing:'border-box' },
}
