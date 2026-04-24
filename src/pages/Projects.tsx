// src/pages/Projects.tsx
import { useState, useEffect } from 'react'
import { useProjects, type Project, type ProjectInput } from '../hooks/useProjects'

const STATUSES = ['pending', 'active', 'completed', 'cancelled'] as const
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:   { bg: '#fef9c3', color: '#854d0e' },
  active:    { bg: '#dcfce7', color: '#166534' },
  completed: { bg: '#e0e7ff', color: '#3730a3' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280' },
}

const emptyForm: ProjectInput = { client_id: '', title: '', location: '', status: 'pending', start_date: '', end_date: '', notes: '' }

export default function Projects() {
  const { projects, loading, error, search, createProject, updateProject, updateStatus, deleteProject } = useProjects()

  const [clients, setClients]     = useState<{ id: string; name: string }[]>([])
  const [filter, setFilter]       = useState('all')
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm]           = useState<ProjectInput>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)

  // Delete state — tracks which project, what error, and cascade confirm
  const [deleteState, setDeleteState] = useState<{
    id: string
    error: string | null
    askCascade: boolean
  } | null>(null)

  useEffect(() => {
    window.api.clients.getAll().then(res => { if (res.success) setClients(res.data ?? []) })
  }, [])

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: projects.filter(p => p.status === s).length }), {} as Record<string, number>)

  const openAdd = () => {
    setEditingId(null); setForm({ ...emptyForm, client_id: clients[0]?.id ?? '' })
    setFormError(null); setShowForm(true)
  }
  const openEdit = (p: Project) => {
    setEditingId(p.id)
    setForm({ client_id: p.client_id, title: p.title, location: p.location ?? '', status: p.status, start_date: p.start_date ?? '', end_date: p.end_date ?? '', notes: p.notes ?? '' })
    setFormError(null); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); setFormError(null) }

  const handleSave = async () => {
    if (!form.title.trim())  { setFormError('Project title is required'); return }
    if (!form.client_id)     { setFormError('Please select a client'); return }
    setSaving(true)
    const err = editingId ? await updateProject(editingId, form) : await createProject(form)
    setSaving(false)
    if (err) { setFormError(err) } else { closeForm() }
  }

  const startDelete = (id: string) => setDeleteState({ id, error: null, askCascade: false })

  const handleDelete = async (id: string) => {
    const err = await deleteProject(id)
    if (!err) { setDeleteState(null); return }

    // If FK error, offer cascade option
    if (err.includes('materials or attendance')) {
      setDeleteState({ id, error: err, askCascade: true })
    } else {
      setDeleteState({ id, error: err, askCascade: false })
    }
  }

  const handleCascadeDelete = async (id: string) => {
    // Call cascade delete directly via IPC
    const res = await window.api.projects.cascadeDelete(id)
    if (res.success) {
      // Remove from local state
      setDeleteState(null)
      // Refresh projects list
      window.api.projects.getAll().then(r => {
        if (r.success) useProjects
      })
      // Simplest approach: reload the page data via hook refresh
      window.location.reload()
    } else {
      setDeleteState(s => s ? { ...s, error: res.error ?? 'Failed' } : null)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Projects</h2>
          <p style={s.sub}>{projects.length} total</p>
        </div>
        <button style={s.btnPrimary} onClick={openAdd} disabled={clients.length === 0}>
          {clients.length === 0 ? 'Add a client first' : '+ New Project'}
        </button>
      </div>

      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(filter === 'all' ? s.tabActive : {}) }} onClick={() => setFilter('all')}>
          All <span style={s.tabCount}>{projects.length}</span>
        </button>
        {STATUSES.map(st => (
          <button key={st} style={{ ...s.tab, ...(filter === st ? s.tabActive : {}) }} onClick={() => setFilter(st)}>
            {st.charAt(0).toUpperCase() + st.slice(1)} <span style={s.tabCount}>{counts[st] ?? 0}</span>
          </button>
        ))}
      </div>

      <input style={s.search} placeholder="Search by title, client or location..." onChange={e => search(e.target.value)} />

      {loading && <p style={s.muted}>Loading...</p>}
      {error   && <p style={s.err}>{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <div style={s.empty}>
          <p style={{ marginBottom: 12 }}>{filter === 'all' ? 'No projects yet.' : `No ${filter} projects.`}</p>
          {filter === 'all' && <button style={s.btnPrimary} onClick={openAdd}>Create your first project</button>}
        </div>
      )}

      <div style={s.grid}>
        {filtered.map(project => {
          const sc = STATUS_COLORS[project.status]
          const ds = deleteState?.id === project.id ? deleteState : null

          return (
            <div key={project.id} style={s.card}>
              <div style={s.cardTop}>
                <div style={{ flex: 1 }}>
                  <p style={s.projectTitle}>{project.title}</p>
                  <p style={s.projectClient}>{project.client_name}</p>
                  {project.location && <p style={s.projectMeta}>{project.location}</p>}
                </div>
                <select value={project.status} onChange={e => updateStatus(project.id, e.target.value)}
                  style={{ ...s.statusBadge, background: sc.bg, color: sc.color, border: `1px solid ${sc.color}30` }}>
                  {STATUSES.map(st => <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>)}
                </select>
              </div>

              {(project.start_date || project.end_date) && (
                <p style={s.projectMeta}>{project.start_date ?? '?'} → {project.end_date ?? 'ongoing'}</p>
              )}
              {project.notes && (
                <p style={{ ...s.projectMeta, fontStyle: 'italic' }}>
                  {project.notes.length > 80 ? project.notes.slice(0, 80) + '…' : project.notes}
                </p>
              )}

              {/* Delete state inline */}
              {ds ? (
                <div style={s.deleteArea}>
                  {ds.askCascade ? (
                    // Cascade confirm
                    <div style={s.cascadeBox}>
                      <p style={s.cascadeMsg}>
                        This project has attendance or materials linked to it.
                        Deleting will also remove all those records.
                      </p>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button style={s.btnDanger} onClick={() => handleCascadeDelete(project.id)}>
                          Delete everything
                        </button>
                        <button style={s.btnSm} onClick={() => setDeleteState(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : ds.error ? (
                    // Generic error
                    <div style={s.inlineErr}>
                      <span style={{ flex: 1 }}>{ds.error}</span>
                      <button style={s.btnSm} onClick={() => setDeleteState(null)}>OK</button>
                    </div>
                  ) : (
                    // Simple confirm
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, color: '#374151' }}>Delete this project?</span>
                      <button style={s.btnDanger} onClick={() => handleDelete(project.id)}>Yes</button>
                      <button style={s.btnSm} onClick={() => setDeleteState(null)}>No</button>
                    </span>
                  )}
                </div>
              ) : (
                <div style={s.cardActions}>
                  <span style={s.dateLabel}>{new Date(project.created_at).toLocaleDateString()}</span>
                  <button style={s.btnSm} onClick={() => openEdit(project)}>Edit</button>
                  <button style={s.btnSm} onClick={() => startDelete(project.id)}>Delete</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <div style={s.overlay} onClick={closeForm}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

            <h3 style={s.modalTitle}>{editingId ? 'Edit Project' : 'New Project'}</h3>
<button style={s.btnSm} onClick={closeForm} disabled={saving}>Cancel</button>
            </div>
            {formError && <p style={s.err}>{formError}</p>}

            <label style={s.label}>Client *</label>
            <select style={s.input} value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
              <option value="">Select a client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <label style={s.label}>Project title *</label>
            <input style={s.input} value={form.title} autoFocus onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

            <label style={s.label}>Location</label>
            <input style={s.input} value={form.location ?? ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />

            <div style={s.grid2}>
              <div>
                <label style={s.label}>Start date</label>
                <input style={s.input} type="date" value={form.start_date ?? ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>End date</label>
                <input style={s.input} type="date" value={form.end_date ?? ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>

            <label style={s.label}>Status</label>
            <select style={s.input} value={form.status ?? 'pending'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUSES.map(st => <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>)}
            </select>

            <label style={s.label}>Notes</label>
            <textarea style={{ ...s.input, height: 80, resize: 'vertical' }} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

            <div style={s.modalActions}>
              
              <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:        { maxWidth: 1100 },
  header:      { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 },
  title:       { fontSize:22, fontWeight:600, margin:0 },
  sub:         { fontSize:13, color:'#888', marginTop:3 },
  tabs:        { display:'flex', gap:4, marginBottom:14, borderBottom:'1px solid #e5e7eb', paddingBottom:0 },
  tab:         { padding:'8px 14px', fontSize:13, border:'none', background:'transparent', cursor:'pointer', color:'#6b7280', borderBottom:'2px solid transparent', marginBottom:-1 },
  tabActive:   { color:'#4f46e5', borderBottomColor:'#4f46e5', fontWeight:500 },
  tabCount:    { marginLeft:5, fontSize:11, background:'#f3f4f6', color:'#6b7280', padding:'1px 6px', borderRadius:10 },
  search:      { width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #e5e7eb', borderRadius:8, marginBottom:16, boxSizing:'border-box', background:'#fff' },
  muted:       { color:'#888', fontSize:14 },
  err:         { color:'#dc2626', fontSize:13, marginBottom:10 },
  empty:       { textAlign:'center', padding:'60px 0', color:'#9ca3af' },
  grid:        { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:12 },
  card:        { background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:'16px', display:'flex', flexDirection:'column', gap:4 },
  cardTop:     { display:'flex', alignItems:'flex-start', gap:10, marginBottom:4 },
  projectTitle:{ fontSize:14, fontWeight:600, margin:0 },
  projectClient:{ fontSize:12, color:'#4f46e5', margin:'2px 0 0', fontWeight:500 },
  projectMeta: { fontSize:12, color:'#9ca3af', margin:0 },
  statusBadge: { fontSize:11, padding:'3px 8px', borderRadius:20, fontWeight:500, cursor:'pointer', appearance:'none', flexShrink:0 },
  cardActions: { display:'flex', alignItems:'center', gap:6, marginTop:8, paddingTop:8, borderTop:'1px solid #f3f4f6' },
  dateLabel:   { fontSize:11, color:'#9ca3af', flex:1 },
  deleteArea:  { marginTop:8, paddingTop:8, borderTop:'1px solid #f3f4f6' },
  cascadeBox:  { background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 12px' },
  cascadeMsg:  { fontSize:13, color:'#991b1b', margin:0, lineHeight:1.5 },
  inlineErr:   { display:'flex', alignItems:'center', gap:8, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'6px 10px', fontSize:13, color:'#dc2626' },
  btnPrimary:  { padding:'9px 16px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:8, fontSize:13, cursor:'pointer', fontWeight:500 },
  btnSm:       { padding:'5px 10px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:6, fontSize:12, cursor:'pointer' },
  btnDanger:   { padding:'5px 10px', background:'#dc2626', color:'#fff', border:'none', borderRadius:6, fontSize:12, cursor:'pointer' },
  overlay:     { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  modal:       { background:'#fff', borderRadius:12, padding:28, width:'100%', maxWidth:500, boxShadow:'0 20px 60px rgba(0,0,0,0.12)', maxHeight:'90vh', overflowY:'auto' },
  modalTitle:  { fontSize:16, fontWeight:600, margin:'0 0 16px' },
  modalActions:{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 },
  grid2:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  label:       { display:'block', fontSize:12, fontWeight:500, color:'#374151', marginTop:12, marginBottom:4 },
  input:       { width:'100%', padding:'8px 12px', fontSize:14, border:'1px solid #e5e7eb', borderRadius:6, boxSizing:'border-box' },
}
