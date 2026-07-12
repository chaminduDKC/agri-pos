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
    const res = editingId ? await updateClient(editingId, form) : await createClient(form)
    if (typeof res === 'string') {
      setFormError(res)
      return
    }

    if (res.sucess) {
      setShowForm(false)
      setSaving(false)
      setEditingId(null)
      setForm(emptyForm)
      setFormError(null)
    } else {
    }

  }

  const startDelete = (id: string) => {
    setDeletingId(id)
    setDeleteError(null)
  }

  const handleDelete = async (id: string) => {
    const err = await deleteClient(id)
    if (err) {
      setDeletingId(null)
      setDeleteError(null)
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
      <div style={s.listWrapper}>

      
      <div style={s.list}>
        {clients.map(client => (
          <div key={client.id} style={s.card}>
            <div style={s.cardLeft}>
              <div style={s.avatar}>{client.name.charAt(0).toUpperCase()}</div>
              <div>
                
                {client.name ? <p style={s.name}> {client.name.length > 20 ? `${client.name.substring(0,20)}...` : client.name }</p> : <p style={s.meta}>Unknown Client</p>}
                {client.phone ? <p style={s.meta}> {client.phone.length > 30 ? `${client.phone.substring(0,30)}...` : client.phone }</p> : <p style={s.meta}>Phone No Unavailable</p>}
                {client.email ? <p style={s.meta}> {client.email.length > 30 ? `${client.email.substring(0,30)}...` : client.email }</p> : <p style={s.meta}>Email Unavailable</p>}
                {client.address ? <p style={s.meta}>{client.address.length > 30 ? `${client.email?.substring(0,30)}...` : client.address}</p> : <p style={s.meta}>Address Unavailable</p>}
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
</div>
      {showForm && (
        <div style={s.overlay}>
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
  page: { margin: '0 auto', height:"100%" },
  listWrapper:{
     overflowY: 'auto',
  height: 'calc(100vh - 180px)',
  },
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
    color: 'var(--text)'
  },

  sub: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginTop: 3
  },

  search: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    border: '1px solid var(--border)',
    borderRadius: 8,
    marginBottom: 16,
    boxSizing: 'border-box',
    background: 'var(--surface)',
    color: 'var(--text)',
    outline: 'none'
  },

  muted: {
    color: 'var(--text-dim)',
    fontSize: 14
  },

  err: {
    color: 'var(--danger)',
    fontSize: 13,
    marginBottom: 10
  },

  empty: {
    textAlign: 'center',
    padding: '60px 0',
    color: 'var(--text-dim)'
  },

  list: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
    gap: 8
  },

  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--surface)',
    flexWrap: 'wrap',
    gap: 8
  },

  cardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },

  cardRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'var(--primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: 15,
    flexShrink: 0
  },

  name: {
    fontSize: 20,
    fontWeight: 500,
    margin: 0,
    color: 'var(--text)'
  },

  meta: {
    fontSize: 14,
    color: 'var(--text-muted)',
    margin: '2px 0 0'
  },

  badge: {
    fontSize: 12,
    padding: '2px 10px',
    borderRadius: 20,
    background: 'var(--surface-2)',
    color: 'var(--text-muted)'
  },

  deleteBox: {
    display: 'flex',
    alignItems: 'center'
  },

  inlineErr: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--danger-bg)',
    border: '1px solid var(--danger)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 13,
    color: 'var(--danger)',
    maxWidth: 360
  },

  btnPrimary: {
    padding: '9px 16px',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500
  },

  btnSm: {
    padding: '6px 12px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    cursor: 'pointer',
    color: 'var(--text)'
  },

  btnDanger: {
    padding: '6px 12px',
    background: 'var(--danger)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
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
    background: 'var(--surface)',
    borderRadius: 12,
    padding: 28,
    width: '100%',
    maxWidth: 460,
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    border: '1px solid var(--border)'
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: '0 0 16px',
    color: 'var(--text)'
  },

  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16
  },

  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-muted)',
    marginTop: 12,
    marginBottom: 4
  },

  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    boxSizing: 'border-box',
    background: 'var(--bg)',
    color: 'var(--text)',
    outline: 'none'
  },
};