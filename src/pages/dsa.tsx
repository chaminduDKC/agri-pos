import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

// ── Types ──────────────────────────────────────────────────────
interface Project {
  id: string; title: string; client_name: string
  status: string; location: string | null; notes: string | null
}

interface SubProject {
  id: string; project_id: string; parent_id: string | null
  title: string; status: string; notes: string | null; level: number
}

interface Allocation {
  id: string; project_id: string; item_id: string | null
  item_name: string; item_unit: string; item_unit_size: string | null
  source: 'local' | 'external'
  quantity_allocated: number; quantity_used: number
  quantity_returned: number; quantity_remaining: number
  created_at: string
}

interface SubAllocation {
  id: string; sub_project_id: string
  project_allocation_id: string | null
  parent_sub_allocation_id: string | null
  item_name: string; item_unit: string
  quantity_assigned: number; quantity_used: number
  quantity_returned: number; quantity_remaining: number
}

interface InventoryItem {
  id: string; name: string; unit: string
  unit_size: string | null; quantity: number
}

// ── Styles ─────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  // Layout
  page:       { height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' },
  header:     { padding: '14px 20px', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 },
  backBtn:    { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13, padding: 0 },
  headerInfo: { flex: 1 },
  headerTitle:{ margin: 0, fontSize: 17, fontWeight: 700, color: '#e5e7eb' },
  headerSub:  { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  columns:    { flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', overflow: 'hidden' },
  col:        { borderRight: '1px solid #1f2937', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  colLast:    { overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  colHeader:  { padding: '12px 16px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
  colTitle:   { fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 },
  colBody:    { padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 },

  // Cards
  card:       { background: '#111827', border: '1px solid #1f2937', borderRadius: 8, padding: 12 },
  cardActive: { background: '#111827', border: '1px solid #6366f1', borderRadius: 8, padding: 12 },
  cardTitle:  { fontSize: 13, fontWeight: 600, color: '#e5e7eb', margin: '0 0 3px' },
  cardMeta:   { fontSize: 11, color: '#9ca3af', margin: 0 },
  cardRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardActions:{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 },

  // Stat grid
  statGrid:   { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, margin: '8px 0' },
  statBox:    { background: '#0f172a', borderRadius: 5, padding: '5px 6px', textAlign: 'center' },
  statLabel:  { fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' },
  statValue:  { fontSize: 13, fontWeight: 700, color: '#e5e7eb' },

  // Buttons
  btn:        { padding: '4px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 500, border: '1px solid #374151', background: '#1f2937', color: '#e5e7eb' },
  btnPrimary: { padding: '4px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 500, border: '1px solid #6366f1', background: 'rgba(99,102,241,0.15)', color: '#818cf8' },
  btnSuccess: { padding: '4px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 500, border: '1px solid #22c55e', background: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  btnDanger:  { padding: '4px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 500, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  btnWarn:    { padding: '4px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 500, border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  btnLg:      { padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600, border: '1px solid #6366f1', background: '#6366f1', color: '#fff' },

  // Badge
  badge:      { fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' },

  // Overlay + form panel
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  formPanel:  { background: '#111827', border: '1px solid #374151', borderRadius: 10, padding: 24, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' },
  formTitle:  { fontSize: 15, fontWeight: 700, color: '#e5e7eb', margin: '0 0 18px' },
  label:      { display: 'block', fontSize: 11, color: '#9ca3af', marginBottom: 5, fontWeight: 500 },
  input:      { width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #374151', borderRadius: 6, color: '#e5e7eb', padding: '8px 10px', fontSize: 13, outline: 'none' },
  fieldGroup: { marginBottom: 14 },
  formRow:    { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 },
  errBox:     { background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444', borderRadius: 6, color: '#f87171', padding: '8px 12px', fontSize: 12, marginBottom: 14 },

  // Empty
  empty:      { color: '#6b7280', fontSize: 13, padding: '20px 0', textAlign: 'center' },
  emptyHint:  { color: '#374151', fontSize: 12, textAlign: 'center', padding: '40px 16px' },

  // Source toggle
  sourceRow:  { display: 'flex', gap: 8, marginBottom: 14 },
  sourceBtn:  { flex: 1, padding: '7px 0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'center', border: '1px solid #374151', background: '#0f172a', color: '#9ca3af' },
  sourceBtnOn:{ flex: 1, padding: '7px 0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'center', border: '1px solid #6366f1', background: 'rgba(99,102,241,0.15)', color: '#818cf8' },
}

const STATUS_BADGE: Record<string, React.CSSProperties> = {
  pending:     { ...s.badge, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  in_progress: { ...s.badge, background: 'rgba(99,102,241,0.15)', color: '#818cf8' },
  completed:   { ...s.badge, background: 'rgba(34,197,94,0.15)',  color: '#22c55e' },
  active:      { ...s.badge, background: 'rgba(99,102,241,0.15)', color: '#818cf8' },
  cancelled:   { ...s.badge, background: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
}

// ── Small helpers ──────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => (
  <span style={STATUS_BADGE[status] ?? s.badge}>{status.replace('_', ' ')}</span>
)

const StatGrid = ({ rows }: { rows: [string, number, string?][] }) => (
  <div style={s.statGrid}>
    {rows.map(([label, val, color]) => (
      <div key={label} style={s.statBox}>
        <span style={s.statLabel}>{label}</span>
        <span style={{ ...s.statValue, color: color ?? '#e5e7eb' }}>{val}</span>
      </div>
    ))}
  </div>
)

// ══════════════════════════════════════════════════════════════
export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject]         = useState<Project | null>(null)
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [subProjects, setSubProjects] = useState<SubProject[]>([])
  const [inventory, setInventory]     = useState<InventoryItem[]>([])
  const [loading, setLoading]         = useState(true)

  // Which sub is selected (drives the right column)
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null)

  // Sub allocations for the selected sub
  const [subAllocs, setSubAllocs] = useState<SubAllocation[]>([])

  // Derived: level-1 subs, level-2 children of selected sub
  const level1 = subProjects.filter(s => s.parent_id === null)
  const children = subProjects.filter(s => s.parent_id === selectedSubId)
  const selectedSub = subProjects.find(s => s.id === selectedSubId) ?? null

  // ── Overlay state — one per action ────────────────────────
  // Main allocation form
  const [showMainAlloc, setShowMainAlloc]   = useState(false)
  const [mainAllocForm, setMainAllocForm]   = useState({ source: 'local' as 'local'|'external', item_id: '', item_name: '', item_unit: '', item_unit_size: '', quantity: '' })
  const [mainAllocErr, setMainAllocErr]     = useState('')

  // Add sub-project
  const [showAddSub, setShowAddSub]         = useState(false)
  const [addSubForm, setAddSubForm]         = useState({ title: '', notes: '' })
  const [addSubErr, setAddSubErr]           = useState('')

  // Add child project
  const [showAddChild, setShowAddChild]     = useState(false)
  const [addChildForm, setAddChildForm]     = useState({ title: '', notes: '' })
  const [addChildErr, setAddChildErr]       = useState('')

  // Divide allocation to sub
  const [dividing, setDividing]             = useState<Allocation | null>(null)
  const [divideTarget, setDivideTarget]     = useState('')
  const [divideQty, setDivideQty]           = useState('')
  const [divideErr, setDivideErr]           = useState('')

  // Divide sub-alloc to child
  const [dividingChild, setDividingChild]   = useState<SubAllocation | null>(null)
  const [divideChildTarget, setDivideChildTarget] = useState('')
  const [divideChildQty, setDivideChildQty] = useState('')
  const [divideChildErr, setDivideChildErr] = useState('')

  // Return from project allocation
  const [returning, setReturning]           = useState<Allocation | null>(null)
  const [returnQty, setReturnQty]           = useState('')
  const [returnErr, setReturnErr]           = useState('')

  // Mark used (sub or child allocation)
  const [markingUsed, setMarkingUsed]       = useState<SubAllocation | null>(null)
  const [markUsedQty, setMarkUsedQty]       = useState('')

  // Return from sub allocation
  const [returningSubAlloc, setReturningSubAlloc] = useState<SubAllocation | null>(null)
  const [returnSubQty, setReturnSubQty]           = useState('')
  const [returnSubErr, setReturnSubErr]           = useState('')

  // ── Load ──────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!id) return
    const [projRes, allocRes, subRes, invRes] = await Promise.all([
      window.api.projects.getById(id),
      window.api.allocations.getByProject(id),
      window.api.subProjects.getByProject(id),
      window.api.items.getAll(),
    ])
    if (projRes.success)  setProject(projRes.data)
    if (allocRes.success) setAllocations(allocRes.data ?? [])
    if (subRes.success)   setSubProjects(subRes.data ?? [])
    if (invRes.success)   setInventory(invRes.data ?? [])
    setLoading(false)
  }, [id])

  const loadSubAllocs = useCallback(async (subId: string) => {
    const res = await window.api.allocations.getSubAllocationsBySubProject(subId)
    if (res.success) setSubAllocs(res.data ?? [])
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (selectedSubId) loadSubAllocs(selectedSubId)
    else setSubAllocs([])
  }, [selectedSubId, loadSubAllocs])

  const refresh = () => { loadAll(); if (selectedSubId) loadSubAllocs(selectedSubId) }

  // ── Handlers ──────────────────────────────────────────────
  const pickInventory = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId)
    if (!item) return
    setMainAllocForm(f => ({ ...f, item_id: item.id, item_name: item.name, item_unit: item.unit, item_unit_size: item.unit_size ?? '' }))
  }

  const handleMainAlloc = async () => {
    const { source, item_id, item_name, item_unit, item_unit_size, quantity } = mainAllocForm
    if (!item_name)    { setMainAllocErr('Item name is required'); return }
    if (!item_unit)    { setMainAllocErr('Unit is required'); return }
    if (!quantity || parseFloat(quantity) <= 0) { setMainAllocErr('Enter a valid quantity'); return }
    if (source === 'local' && !item_id) { setMainAllocErr('Select an inventory item'); return }

    const res = await window.api.allocations.allocateToProject({
      project_id: id!, item_id: item_id || undefined,
      item_name, item_unit, item_unit_size: item_unit_size || undefined,
      source, quantity_allocated: parseFloat(quantity),
    })
    if (res.success) {
      setShowMainAlloc(false)
      setMainAllocForm({ source: 'local', item_id: '', item_name: '', item_unit: '', item_unit_size: '', quantity: '' })
      setMainAllocErr('')
      refresh()
    } else setMainAllocErr(res.error ?? 'Failed')
  }

  const handleAddSub = async () => {
    if (!addSubForm.title.trim()) { setAddSubErr('Title is required'); return }
    const res = await window.api.subProjects.create({ project_id: id!, title: addSubForm.title, notes: addSubForm.notes, level: 1 })
    if (res.success) { setShowAddSub(false); setAddSubForm({ title: '', notes: '' }); setAddSubErr(''); refresh() }
    else setAddSubErr(res.error ?? 'Failed')
  }

  const handleAddChild = async () => {
    if (!selectedSubId) return
    if (!addChildForm.title.trim()) { setAddChildErr('Title is required'); return }
    const res = await window.api.subProjects.createChild({ project_id: id!, parent_id: selectedSubId, title: addChildForm.title, notes: addChildForm.notes, level: 2 })
    if (res.success) { setShowAddChild(false); setAddChildForm({ title: '', notes: '' }); setAddChildErr(''); refresh() }
    else setAddChildErr(res.error ?? 'Failed')
  }

  const handleDivideToSub = async () => {
    if (!dividing || !divideTarget) { setDivideErr('Select a sub-project'); return }
    const qty = parseFloat(divideQty)
    if (!qty || qty <= 0) { setDivideErr('Enter a valid quantity'); return }
    const res = await window.api.allocations.divideToSub({
      project_allocation_id: dividing.id,
      sub_project_id: divideTarget,
      quantity_assigned: qty,
    })
    if (res.success) { setDividing(null); setDivideTarget(''); setDivideQty(''); setDivideErr(''); refresh() }
    else setDivideErr(res.error ?? 'Failed')
  }

  const handleDivideToChild = async () => {
    if (!dividingChild || !divideChildTarget) { setDivideChildErr('Select a child project'); return }
    const qty = parseFloat(divideChildQty)
    if (!qty || qty <= 0) { setDivideChildErr('Enter a valid quantity'); return }
    const res = await window.api.allocations.divideToChild({
      parent_sub_allocation_id: dividingChild.id,
      sub_project_id: divideChildTarget,
      quantity_assigned: qty,
    })
    if (res.success) { setDividingChild(null); setDivideChildTarget(''); setDivideChildQty(''); setDivideChildErr(''); refresh() }
    else setDivideChildErr(res.error ?? 'Failed')
  }

  const handleReturn = async () => {
    if (!returning) return
    const qty = parseFloat(returnQty)
    if (!qty || qty <= 0) { setReturnErr('Enter a valid quantity'); return }
    const res = await window.api.allocations.returnFromProject(returning.id, qty)
    if (res.success) { setReturning(null); setReturnQty(''); setReturnErr(''); refresh() }
    else setReturnErr(res.error ?? 'Failed')
  }

  const handleMarkUsed = async () => {
    if (!markingUsed) return
    const qty = parseFloat(markUsedQty)
    if (isNaN(qty) || qty < 0) return
    const res = await window.api.allocations.markUsed(markingUsed.id, qty)
    if (res.success) { setMarkingUsed(null); setMarkUsedQty(''); refresh() }
    else alert(res.error)
  }

  const handleReturnSubAlloc = async () => {
    if (!returningSubAlloc) return
    const qty = parseFloat(returnSubQty)
    if (!qty || qty <= 0) { setReturnSubErr('Enter a valid quantity'); return }
    const res = await window.api.allocations.returnFromSub(returningSubAlloc.id, qty)
    if (res.success) { setReturningSubAlloc(null); setReturnSubQty(''); setReturnSubErr(''); refresh() }
    else setReturnSubErr(res.error ?? 'Failed')
  }

  const handleDeleteSub = async (subId: string) => {
    if (!confirm('Delete this sub-project and all its data?')) return
    const res = await window.api.subProjects.delete(subId)
    if (res.success) { if (selectedSubId === subId) setSelectedSubId(null); refresh() }
    else alert(res.error)
  }

  const handleSubStatus = async (subId: string, status: string) => {
    await window.api.subProjects.updateStatus(subId, status)
    refresh()
  }

  // ── Helpers ───────────────────────────────────────────────
  // Which allocations can still be divided (have quantity > assigned)
  const divisibleAllocs = allocations.filter(a => {
    const assigned = subAllocs
      .filter(sa => sa.project_allocation_id === a.id)
      .reduce((sum, sa) => sum + sa.quantity_assigned, 0)
    return a.quantity_allocated - assigned > 0
  })

  // Get sub-allocs for a specific child
  const childSubAllocs = (childId: string) =>
    subAllocs.filter(sa => sa.sub_project_id === childId)

  // Can this sub mark used? Only if it has no children
  const subCanMarkUsed = (subId: string) =>
    !subProjects.some(s => s.parent_id === subId)

  if (loading) return <div style={{ padding: 40, color: '#9ca3af' }}>Loading…</div>
  if (!project) return <div style={{ padding: 40, color: '#ef4444' }}>Project not found</div>

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/projects')}>← Projects</button>
        <div style={s.headerInfo}>
          <h2 style={s.headerTitle}>{project.title}</h2>
          <p style={s.headerSub}>{project.client_name}{project.location ? ` · ${project.location}` : ''}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {/* Three columns */}
      <div style={s.columns}>

        {/* ══════════════════════════════════════════
            COL 1 — Main allocations
        ══════════════════════════════════════════ */}
        <div style={s.col}>
          <div style={s.colHeader}>
            <p style={s.colTitle}>Allocations</p>
            <button style={s.btnPrimary} onClick={() => setShowMainAlloc(true)}>+ Allocate</button>
          </div>
          <div style={s.colBody}>
            {allocations.length === 0 && <p style={s.empty}>No allocations yet</p>}

            {allocations.map(a => {
              const remaining = a.quantity_allocated - a.quantity_used - a.quantity_returned
              return (
                <div key={a.id} style={s.card}>
                  <div style={s.cardRow}>
                    <div>
                      <p style={s.cardTitle}>{a.item_name}</p>
                      {a.item_unit_size && <p style={s.cardMeta}>{a.item_unit_size}</p>}
                    </div>
                    <span style={{
                      ...s.badge,
                      background: a.source === 'local' ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
                      color: a.source === 'local' ? '#22c55e' : '#818cf8',
                    }}>
                      {a.source}
                    </span>
                  </div>

                  <StatGrid rows={[
                    ['Allocated', a.quantity_allocated],
                    ['Used',      a.quantity_used,      '#818cf8'],
                    ['Returned',  a.quantity_returned,  '#22c55e'],
                    ['Remaining', remaining,             remaining > 0 ? '#f59e0b' : '#6b7280'],
                  ]} />

                  <div style={s.cardActions}>
                    {level1.length > 0 && remaining > 0 && (
                      <button style={s.btnPrimary} onClick={() => { setDividing(a); setDivideTarget(''); setDivideQty(''); setDivideErr('') }}>
                        Divide to sub
                      </button>
                    )}
                    {a.source === 'local' && remaining > 0 && (
                      <button style={s.btnSuccess} onClick={() => { setReturning(a); setReturnQty(''); setReturnErr('') }}>
                        Return
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            COL 2 — Sub-projects
        ══════════════════════════════════════════ */}
        <div style={s.col}>
          <div style={s.colHeader}>
            <p style={s.colTitle}>Sub-projects</p>
            <button style={s.btnPrimary} onClick={() => { setShowAddSub(true); setAddSubForm({ title: '', notes: '' }); setAddSubErr('') }}>+ Add</button>
          </div>
          <div style={s.colBody}>
            {level1.length === 0 && <p style={s.empty}>No sub-projects yet</p>}

            {level1.map(sub => {
              const isSelected = sub.id === selectedSubId
              const myAllocs = subAllocs.filter(sa => sa.sub_project_id === sub.id)
              const hasChildren = subProjects.some(s => s.parent_id === sub.id)

              return (
                <div key={sub.id}
                  style={isSelected ? s.cardActive : s.card}
                  onClick={() => setSelectedSubId(isSelected ? null : sub.id)}>

                  <div style={s.cardRow}>
                    <p style={{ ...s.cardTitle, color: isSelected ? '#818cf8' : '#e5e7eb' }}>{sub.title}</p>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <StatusBadge status={sub.status} />
                      <button style={s.btnDanger}
                        onClick={e => { e.stopPropagation(); handleDeleteSub(sub.id) }}>✕</button>
                    </div>
                  </div>

                  {sub.notes && <p style={s.cardMeta}>{sub.notes}</p>}

                  {/* Sub allocations summary */}
                  {myAllocs.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      {myAllocs.map(sa => (
                        <div key={sa.id} style={{ background: '#0f172a', borderRadius: 5, padding: '6px 8px', marginBottom: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: '#e5e7eb', fontWeight: 500 }}>{sa.item_name}</span>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{sa.item_unit}</span>
                          </div>
                          <StatGrid rows={[
                            ['Assigned',  sa.quantity_assigned],
                            ['Used',      sa.quantity_used,     '#818cf8'],
                            ['Returned',  sa.quantity_returned, '#22c55e'],
                            ['Remaining', sa.quantity_remaining, sa.quantity_remaining > 0 ? '#f59e0b' : '#6b7280'],
                          ]} />
                          <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                            {/* Divide to child only if children exist */}
                            {hasChildren && sa.quantity_remaining > 0 && (
                              <button style={s.btnPrimary}
                                onClick={e => { e.stopPropagation(); setDividingChild(sa); setDivideChildTarget(''); setDivideChildQty(''); setDivideChildErr('') }}>
                                Divide to child
                              </button>
                            )}
                            {/* Mark used only if no children */}
                            {!hasChildren && (
                              <button style={s.btnSuccess}
                                onClick={e => { e.stopPropagation(); setMarkingUsed(sa); setMarkUsedQty(String(sa.quantity_used || '')) }}>
                                Mark used
                              </button>
                            )}
                            {sa.quantity_remaining > 0 && (
                              <button style={s.btnWarn}
                                onClick={e => { e.stopPropagation(); setReturningSubAlloc(sa); setReturnSubQty(''); setReturnSubErr('') }}>
                                Return
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ ...s.cardActions, marginTop: myAllocs.length ? 6 : 8 }}
                    onClick={e => e.stopPropagation()}>
                    <select
                      value={sub.status}
                      onChange={e => handleSubStatus(sub.id, e.target.value)}
                      style={{ ...s.btn, cursor: 'pointer', fontSize: 11 }}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            COL 3 — Child projects of selected sub
        ══════════════════════════════════════════ */}
        <div style={s.colLast}>
          <div style={s.colHeader}>
            <p style={s.colTitle}>
              {selectedSub ? `${selectedSub.title} — Children` : 'Children'}
            </p>
            {selectedSubId && (
              <button style={s.btnPrimary} onClick={() => { setShowAddChild(true); setAddChildForm({ title: '', notes: '' }); setAddChildErr('') }}>
                + Add child
              </button>
            )}
          </div>
          <div style={s.colBody}>
            {!selectedSubId && (
              <p style={s.emptyHint}>Select a sub-project to see its children</p>
            )}

            {selectedSubId && children.length === 0 && (
              <p style={s.empty}>No child projects yet</p>
            )}

            {children.map(child => {
              const myAllocs = childSubAllocs(child.id)
              return (
                <div key={child.id} style={s.card}>
                  <div style={s.cardRow}>
                    <p style={s.cardTitle}>{child.title}</p>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <StatusBadge status={child.status} />
                      <button style={s.btnDanger} onClick={() => handleDeleteSub(child.id)}>✕</button>
                    </div>
                  </div>

                  {child.notes && <p style={s.cardMeta}>{child.notes}</p>}

                  {myAllocs.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      {myAllocs.map(sa => (
                        <div key={sa.id} style={{ background: '#0f172a', borderRadius: 5, padding: '6px 8px', marginBottom: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: '#e5e7eb', fontWeight: 500 }}>{sa.item_name}</span>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{sa.item_unit}</span>
                          </div>
                          <StatGrid rows={[
                            ['Assigned',  sa.quantity_assigned],
                            ['Used',      sa.quantity_used,     '#818cf8'],
                            ['Returned',  sa.quantity_returned, '#22c55e'],
                            ['Remaining', sa.quantity_remaining, sa.quantity_remaining > 0 ? '#f59e0b' : '#6b7280'],
                          ]} />
                          <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                            <button style={s.btnSuccess}
                              onClick={() => { setMarkingUsed(sa); setMarkUsedQty(String(sa.quantity_used || '')) }}>
                              Mark used
                            </button>
                            {sa.quantity_remaining > 0 && (
                              <button style={s.btnWarn}
                                onClick={() => { setReturningSubAlloc(sa); setReturnSubQty(''); setReturnSubErr('') }}>
                                Return
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ ...s.cardActions }}>
                    <select
                      value={child.status}
                      onChange={e => handleSubStatus(child.id, e.target.value)}
                      style={{ ...s.btn, cursor: 'pointer', fontSize: 11 }}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          OVERLAYS
      ════════════════════════════════════════════════════ */}

      {/* Main allocation form */}
      {showMainAlloc && (
        <div style={s.overlay} onClick={() => setShowMainAlloc(false)}>
          <div style={s.formPanel} onClick={e => e.stopPropagation()}>
            <p style={s.formTitle}>Allocate material to project</p>
            {mainAllocErr && <div style={s.errBox}>{mainAllocErr}</div>}

            <div style={s.sourceRow}>
              {(['local','external'] as const).map(src => (
                <button key={src}
                  style={mainAllocForm.source === src ? s.sourceBtnOn : s.sourceBtn}
                  onClick={() => setMainAllocForm(f => ({ ...f, source: src, item_id: '', item_name: '', item_unit: '' }))}>
                  {src === 'local' ? '📦 Inventory' : '🚚 External'}
                </button>
              ))}
            </div>

            {mainAllocForm.source === 'local' ? (
              <div style={s.fieldGroup}>
                <label style={s.label}>Inventory item *</label>
                <select style={s.input} value={mainAllocForm.item_id} onChange={e => pickInventory(e.target.value)}>
                  <option value="">Select item…</option>
                  {inventory.map(i => <option key={i.id} value={i.id}>{i.name} — {i.quantity} {i.unit}</option>)}
                </select>
              </div>
            ) : (
              <>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Item name *</label>
                  <input style={s.input} value={mainAllocForm.item_name} placeholder="e.g. 63mm PVC pipe"
                    onChange={e => setMainAllocForm(f => ({ ...f, item_name: e.target.value }))} />
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Unit *</label>
                  <input style={s.input} value={mainAllocForm.item_unit} placeholder="e.g. meters, rolls"
                    onChange={e => setMainAllocForm(f => ({ ...f, item_unit: e.target.value }))} />
                </div>
              </>
            )}

            {mainAllocForm.item_name && (
              <div style={s.fieldGroup}>
                <label style={s.label}>Unit size (optional)</label>
                <input style={s.input} value={mainAllocForm.item_unit_size} placeholder="e.g. 60m per roll"
                  onChange={e => setMainAllocForm(f => ({ ...f, item_unit_size: e.target.value }))} />
              </div>
            )}

            <div style={s.fieldGroup}>
              <label style={s.label}>Quantity *</label>
              <input style={s.input} type="number" value={mainAllocForm.quantity} min={0}
                onChange={e => setMainAllocForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>

            <div style={s.formRow}>
              <button style={s.btn} onClick={() => setShowMainAlloc(false)}>Cancel</button>
              <button style={s.btnLg} onClick={handleMainAlloc}>Allocate</button>
            </div>
          </div>
        </div>
      )}

      {/* Add sub-project */}
      {showAddSub && (
        <div style={s.overlay} onClick={() => setShowAddSub(false)}>
          <div style={s.formPanel} onClick={e => e.stopPropagation()}>
            <p style={s.formTitle}>New sub-project</p>
            {addSubErr && <div style={s.errBox}>{addSubErr}</div>}
            <div style={s.fieldGroup}>
              <label style={s.label}>Title *</label>
              <input style={s.input} value={addSubForm.title} autoFocus
                onChange={e => setAddSubForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAddSub()} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Notes</label>
              <textarea style={{ ...s.input, minHeight: 60, resize: 'vertical' }}
                value={addSubForm.notes} onChange={e => setAddSubForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={s.formRow}>
              <button style={s.btn} onClick={() => setShowAddSub(false)}>Cancel</button>
              <button style={s.btnLg} onClick={handleAddSub}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Add child project */}
      {showAddChild && (
        <div style={s.overlay} onClick={() => setShowAddChild(false)}>
          <div style={s.formPanel} onClick={e => e.stopPropagation()}>
            <p style={s.formTitle}>New child project under <em style={{ color: '#818cf8' }}>{selectedSub?.title}</em></p>
            {addChildErr && <div style={s.errBox}>{addChildErr}</div>}
            <div style={s.fieldGroup}>
              <label style={s.label}>Title *</label>
              <input style={s.input} value={addChildForm.title} autoFocus
                onChange={e => setAddChildForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAddChild()} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Notes</label>
              <textarea style={{ ...s.input, minHeight: 60, resize: 'vertical' }}
                value={addChildForm.notes} onChange={e => setAddChildForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={s.formRow}>
              <button style={s.btn} onClick={() => setShowAddChild(false)}>Cancel</button>
              <button style={s.btnLg} onClick={handleAddChild}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Divide allocation to sub */}
      {dividing && (
        <div style={s.overlay} onClick={() => setDividing(null)}>
          <div style={s.formPanel} onClick={e => e.stopPropagation()}>
            <p style={s.formTitle}>Divide — {dividing.item_name}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
              Remaining: <strong style={{ color: '#f59e0b' }}>{dividing.quantity_remaining} {dividing.item_unit}</strong>
            </p>
            {divideErr && <div style={s.errBox}>{divideErr}</div>}
            <div style={s.fieldGroup}>
              <label style={s.label}>Target sub-project *</label>
              <select style={s.input} value={divideTarget} onChange={e => setDivideTarget(e.target.value)}>
                <option value="">Select…</option>
                {level1.map(sub => <option key={sub.id} value={sub.id}>{sub.title}</option>)}
              </select>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Quantity *</label>
              <input style={s.input} type="number" value={divideQty} min={0}
                onChange={e => setDivideQty(e.target.value)} />
            </div>
            <div style={s.formRow}>
              <button style={s.btn} onClick={() => setDividing(null)}>Cancel</button>
              <button style={s.btnLg} onClick={handleDivideToSub}>Divide</button>
            </div>
          </div>
        </div>
      )}

      {/* Divide sub-alloc to child */}
      {dividingChild && (
        <div style={s.overlay} onClick={() => setDividingChild(null)}>
          <div style={s.formPanel} onClick={e => e.stopPropagation()}>
            <p style={s.formTitle}>Divide — {dividingChild.item_name}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
              Remaining: <strong style={{ color: '#f59e0b' }}>{dividingChild.quantity_remaining} {dividingChild.item_unit}</strong>
            </p>
            {divideChildErr && <div style={s.errBox}>{divideChildErr}</div>}
            <div style={s.fieldGroup}>
              <label style={s.label}>Target child project *</label>
              <select style={s.input} value={divideChildTarget} onChange={e => setDivideChildTarget(e.target.value)}>
                <option value="">Select…</option>
                {children.map(child => <option key={child.id} value={child.id}>{child.title}</option>)}
              </select>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Quantity *</label>
              <input style={s.input} type="number" value={divideChildQty} min={0}
                onChange={e => setDivideChildQty(e.target.value)} />
            </div>
            <div style={s.formRow}>
              <button style={s.btn} onClick={() => setDividingChild(null)}>Cancel</button>
              <button style={s.btnLg} onClick={handleDivideToChild}>Divide</button>
            </div>
          </div>
        </div>
      )}

      {/* Return from project allocation */}
      {returning && (
        <div style={s.overlay} onClick={() => setReturning(null)}>
          <div style={s.formPanel} onClick={e => e.stopPropagation()}>
            <p style={s.formTitle}>Return to inventory — {returning.item_name}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
              Max: <strong style={{ color: '#f59e0b' }}>{returning.quantity_remaining} {returning.item_unit}</strong>
            </p>
            {returnErr && <div style={s.errBox}>{returnErr}</div>}
            <div style={s.fieldGroup}>
              <label style={s.label}>Quantity to return *</label>
              <input style={s.input} type="number" value={returnQty} autoFocus min={0}
                onChange={e => setReturnQty(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReturn()} />
            </div>
            <div style={s.formRow}>
              <button style={s.btn} onClick={() => setReturning(null)}>Cancel</button>
              <button style={s.btnLg} onClick={handleReturn}>Return</button>
            </div>
          </div>
        </div>
      )}

      {/* Mark used */}
      {markingUsed && (
        <div style={s.overlay} onClick={() => setMarkingUsed(null)}>
          <div style={s.formPanel} onClick={e => e.stopPropagation()}>
            <p style={s.formTitle}>Mark used — {markingUsed.item_name}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
              Assigned: <strong style={{ color: '#e5e7eb' }}>{markingUsed.quantity_assigned} {markingUsed.item_unit}</strong>
            </p>
            <div style={s.fieldGroup}>
              <label style={s.label}>Quantity used</label>
              <input style={s.input} type="number" value={markUsedQty} autoFocus min={0}
                onChange={e => setMarkUsedQty(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleMarkUsed()} />
            </div>
            <div style={s.formRow}>
              <button style={s.btn} onClick={() => setMarkingUsed(null)}>Cancel</button>
              <button style={s.btnLg} onClick={handleMarkUsed}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Return from sub allocation */}
      {returningSubAlloc && (
        <div style={s.overlay} onClick={() => setReturningSubAlloc(null)}>
          <div style={s.formPanel} onClick={e => e.stopPropagation()}>
            <p style={s.formTitle}>Return — {returningSubAlloc.item_name}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
              Max: <strong style={{ color: '#f59e0b' }}>{returningSubAlloc.quantity_remaining} {returningSubAlloc.item_unit}</strong>
            </p>
            {returnSubErr && <div style={s.errBox}>{returnSubErr}</div>}
            <div style={s.fieldGroup}>
              <label style={s.label}>Quantity to return *</label>
              <input style={s.input} type="number" value={returnSubQty} autoFocus min={0}
                onChange={e => setReturnSubQty(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReturnSubAlloc()} />
            </div>
            <div style={s.formRow}>
              <button style={s.btn} onClick={() => setReturningSubAlloc(null)}>Cancel</button>
              <button style={s.btnLg} onClick={handleReturnSubAlloc}>Return</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}