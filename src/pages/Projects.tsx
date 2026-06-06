// src/pages/Projects.tsx

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface Project {
  id: string
  title: string
  client_name: string
  status: string
  location: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
}

interface Client {
  id: string
  name: string
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:   { bg: '#fef9c3', color: '#854d0e' },
  active:    { bg: '#dcfce7', color: '#166534' },
  completed: { bg: '#e0e7ff', color: '#3730a3' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280' },
}

// ══════════════════════════════════════════════════════════════
export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients]   = useState<Client[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>();

  const load = async () => {
    const [projRes, clientRes] = await Promise.all([
      window.api.projects.getAll(),
      window.api.clients.getAll(),
    ])
    if (projRes.success)   setProjects(projRes.data ?? [])
    if (clientRes.success) setClients(clientRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all'
    ? projects
    : projects.filter(p => p.status === filter)

  const counts = Object.keys(STATUS_COLORS).reduce((acc, st) => ({
    ...acc, [st]: projects.filter(p => p.status === st).length
  }), {} as Record<string, number>)

  const handleDelete = async (id: string) => {
    if(!id) return;
    const res = await window.api.projects.delete(id)
    if (res.success) setProjects(prev => prev.filter(p => p.id !== id))
    else {
      console.log("Delete failed: ", res.error);
  }
  }

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Projects</h1>
          <p style={s.sub}>{projects.length} total</p>
        </div>
        <button style={s.btnPrimary} onClick={() => setShowCreate(true)}>
          + New project
        </button>
      </div>

      {/* Filter tabs */}
      <div style={s.tabs}>
        {['all', ...Object.keys(STATUS_COLORS)].map(f => (
          <button key={f}
            style={{ ...s.tab, ...(filter === f ? s.tabActive : {}) }}
            onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={s.pill}>
              {f === 'all' ? projects.length : counts[f] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* States */}
      {loading && <p style={s.muted}>Loading...</p>}

      {!loading && filtered.length === 0 && (
        <div style={s.empty}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🏗</p>
          <p style={{ fontWeight: 500, marginBottom: 4 }}>
            {filter === 'all' ? 'No projects yet' : `No ${filter} projects`}
          </p>
          {filter === 'all' && (
            <button style={{ ...s.btnPrimary, marginTop: 12 }}
              onClick={() => setShowCreate(true)}>
              Create your first project
            </button>
          )}
        </div>
      )}

      {/* Project cards */}
      <div style={s.grid}>
        {filtered.map(p => {
          const sc = STATUS_COLORS[p.status] ?? STATUS_COLORS.pending
          return (
            <div key={p.id} style={s.card}
              onClick={() => navigate(`/projects/${p.id}`)}>

              {/* Coloured top strip */}
              <div style={{
                height: 4,
                background: sc.color,
                margin: '-16px -16px 14px',
                borderRadius: '10px 10px 0 0',
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <p style={s.cardTitle}>{p.title}</p>
                <span style={{ ...s.statusPill, background: sc.bg, color: sc.color }}>
                  {p.status}
                </span>
              </div>

              <p style={s.cardClient}>{p.client_name}</p>
              {p.location   && <p style={s.cardMeta}>📍 {p.location}</p>}
              {p.start_date && (
                <p style={s.cardMeta}>
                  📅 {p.start_date}{p.end_date ? ` → ${p.end_date}` : ''}
                </p>
              )}

              {/* Card footer */}
              <div style={s.cardFooter} onClick={e => e.stopPropagation()}>
                <span style={s.cardDate}>
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
                <button style={s.btnSm}
                  onClick={e => { e.stopPropagation(); navigate(`/projects/${p.id}`) }}>
                  Open →
                </button>
                <button style={{ ...s.btnSm, color: '#dc2626', borderColor: '#fca5a5' }}
                  onClick={() => {setDeleteId(p.id);}}>
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateModal
          clients={clients}
          onCreate={project => {
            setShowCreate(false)
            navigate(`/projects/${project.id}`)
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* delete modal */}
      {deleteId && (
        <div style={s.overlay} onClick={() => setDeleteId(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <p style={s.modalTitle}>Are you sure you want to delete this project?</p>
            <div style={s.modalFooter}>
              <button style={s.btnPrimary} onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button style={{ ...s.btnPrimary, backgroundColor: '#dc2626', borderColor: '#fca5a5' }}
                onClick={() => {
                  handleDelete(deleteId);
                 
                }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  CREATE MODAL
// ══════════════════════════════════════════════════════════════
function CreateModal({ clients, onCreate, onClose }: {
  clients: Client[]
  onCreate: (project: any) => void
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState<string | null>(null)

  const [form, setForm] = useState({
    client_id:  '',
    title:      '',
    location:   '',
    status:     'pending',
    start_date: '',
    end_date:   '',
    notes:      '',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    if (!form.title.trim()) { setErr('Title is required');  return }
    if (!form.client_id)    { setErr('Client is required'); return }
    setSaving(true)
    const res = await window.api.projects.create(form)
    setSaving(false)
    if (res.success) onCreate(res.data)
    else setErr(res.error ?? 'Failed to create project')
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>New project</h2>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {err && <div style={s.errBox}>{err}</div>}

        {/* Form */}
        <label style={s.label}>Client *</label>
        <select style={s.input} value={form.client_id} onChange={set('client_id')} autoFocus>
          <option value="">Select client...</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label style={s.label}>Title *</label>
        <input style={s.input} value={form.title} onChange={set('title')}
          placeholder="e.g. Farm irrigation — Phase 1" />

        <label style={s.label}>Location</label>
        <input style={s.input} value={form.location} onChange={set('location')}
          placeholder="e.g. Kurunegala farm" />

        <div style={s.row}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Start date</label>
            <input style={s.input} type="date" value={form.start_date} onChange={set('start_date')} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.label}>End date</label>
            <input style={s.input} type="date" value={form.end_date} onChange={set('end_date')} />
          </div>
        </div>

        <label style={s.label}>Status</label>
        <select style={s.input} value={form.status} onChange={set('status')}>
          {Object.keys(STATUS_COLORS).map(st => (
            <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>
          ))}
        </select>

        <label style={s.label}>Notes</label>
        <textarea style={{ ...s.input, height: 72, resize: 'vertical' }}
          value={form.notes} onChange={set('notes')} />

        {/* Footer */}
        <div style={s.modalFooter}>
          <button style={s.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Creating...' : 'Create project'}
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100 },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    color: 'var(--text)',
  },

  sub: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginTop: 4,
  },

  muted: {
    color: 'var(--text-dim)',
    fontSize: 13,
  },

  empty: {
    textAlign: 'center',
    padding: '80px 0',
    color: 'var(--text-dim)',
  },

  // ── Tabs
  tabs: {
    display: 'flex',
    gap: 2,
    marginBottom: 20,
    borderBottom: '1px solid var(--border)',
  },

  tab: {
    padding: '8px 14px',
    fontSize: 13,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    borderBottom: '2px solid transparent',
    marginBottom: -1,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },

  tabActive: {
    color: 'var(--primary)',
    borderBottomColor: 'var(--primary)',
    fontWeight: 500,
  },

  pill: {
    fontSize: 11,
    background: 'var(--surface-2)',
    color: 'var(--text-muted)',
    padding: '1px 7px',
    borderRadius: 'var(--radius)',
  },

  // ── Grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 14,
  },

  // ── Card
  card: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius)',
    padding: 16,
    cursor: 'pointer',
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    margin: '0 0 4px',
    lineHeight: 1.3,
    flex: 1,
    color: 'var(--text)',
  },

  cardClient: {
    fontSize: 13,
    color: 'var(--primary-hover)',
    fontWeight: 500,
    margin: '0 0 4px',
  },

  cardMeta: {
    fontSize: 12,
    color: 'var(--text-dim)',
    margin: '2px 0',
  },

  statusPill: {
    fontSize: 11,
    padding: '3px 9px',
    borderRadius: 20,
    fontWeight: 500,
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
  },

  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    marginTop: 10,
    borderTop: '1px solid var(--border)',
  },

  cardDate: {
    fontSize: 11,
    color: 'var(--text-dim)',
    flex: 1,
  },

  // ── Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },

  modal: {
    background: 'var(--surface-2)',
    borderRadius: 14,
    padding: 28,
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid var(--border-soft)',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
    color: 'var(--text)',
  },

  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: 'var(--text-dim)',
  },

  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 24,
    paddingTop: 16,
    borderTop: '1px solid var(--border)',
  },

  // ── Error
  errBox: {
    background: 'var(--danger-bg)',
    border: '1px solid var(--danger)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--danger)',
    marginBottom: 14,
  },

  row: { display: 'flex', gap: 12 },

  // ── Form
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-muted)',
    marginTop: 14,
    marginBottom: 5,
  },

  input: {
    width: '100%',
    padding: '9px 12px',
    fontSize: 14,
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-sm)',
    boxSizing: 'border-box',
    background: 'var(--bg)',
    color: 'var(--text)',
  },

  // ── Buttons
  btnPrimary: {
    padding: '9px 18px',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  },

  btnGhost: {
    padding: '9px 18px',
    background: 'var(--surface-2)',
    color: 'var(--text)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    cursor: 'pointer',
  },

  btnSm: {
    padding: '5px 12px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
    cursor: 'pointer',
    color: 'var(--text)',
  },

  btnDangerXs: {
    padding: '4px 8px',
    background: 'transparent',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
    cursor: 'pointer',
  },
};