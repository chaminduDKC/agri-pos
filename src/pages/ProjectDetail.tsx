import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'



interface Project {
  id: string; title: string; client_name: string
  status: string; location: string | null; notes: string | null
}

interface SubProject {
  id: string; project_id: string; parent_id: string | null
  contract_value: number | 0; location: string | null; cost:number;
  title: string; status: string; notes: string | null; level: number
}

interface Allocation {
  id: string; project_id: string; item_id: string | null
  item_name: string; item_unit: string; item_unit_size: string | null
  source: 'local' | 'external'
  quantity_allocated: number; quantity_used: number
  quantity_returned: number; quantity_remaining: number
  quantity_assigned: number
  quantity_received_back: number
  allocated_at: string
  created_at: string
}

interface SubAllocation {
  id: string; sub_project_id: string
  project_allocation_id: string | null
  parent_sub_allocation_id: string | null
  item_name: string; item_unit: string
  allocation_id: string;
  quantity_assigned: number; quantity_used: number
  quantity_returned: number; quantity_remaining: number
  quantity_received_back: number
}

interface InventoryItem {
  item_id: string;
  allocation_id: string;
  id: string; name: string; unit: string; item_name: string; item_unit: string; quantity_allocated: number; quantity_used: number
  quantity_returned: number;
  sub_project_id: string;
  quantity_assigned: number;
  quantity_received_back: number;
  unit_size: string | null; quantity: number; item_unit_size: string
}

const s: Record<string, React.CSSProperties> = {
  // Layout
  page: { margin: '0 auto', display: 'flex', flexDirection: 'column', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' },
  header: { borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 },
  backBtn: { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13, padding: 0 },
  headerInfo: { flex: 1 },
  headerTitle: { margin: 0, fontSize: 17, fontWeight: 700, color: '#e5e7eb' },
  headerSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  columns: { flex: 1, display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', overflow: 'hidden' },
  col: { borderRight: '1px solid #1f2937', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  colLast: { overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  colHeader: { padding: '12px 16px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
  colTitle: { fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 },
  colBody: { padding: '12px 16px', overflow: "auto", height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column', gap: 8, },

  // Cards
  card: { background: '#111827', border: '1px solid #1f2937', borderRadius: 8, padding: 12 },
  cardActive: { background: '#111827', border: '1px solid #6366f1', borderRadius: 8, padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: 600, color: '#e5e7eb', margin: '0 0 3px' },
  cardMeta: { fontSize: 14, color: '#9ca3af', margin: 0 },
  cardRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardActions: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 },

  // Stat grid
  statGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 4, margin: '8px 0'
  },
  statBox: { background: '#0f172a', borderRadius: 5, padding: '5px 6px', textAlign: 'center' },
  statLabel: { fontSize: 12, color: '#939aa8', textTransform: 'uppercase', fontWeight: "bold", letterSpacing: '0.04em', display: 'block' },
  statValue: { fontSize: 14, fontWeight: 700, color: '#e5e7eb' },

  // Buttons
  btn: { padding: '4px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 500, border: '1px solid #374151', background: '#1f2937', color: '#e5e7eb' },
  btnPrimary: { padding: '4px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 500, border: '1px solid #6366f1', background: 'rgba(99,102,241,0.15)', color: '#818cf8' },
  btnSuccess: { padding: '4px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 500, border: '1px solid #22c55e', background: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  btnDanger: { padding: '4px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 500, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  btnWarn: { padding: '4px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 500, border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  btnLg: { padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600, border: '1px solid #6366f1', background: '#6366f1', color: '#fff' },

  // Badge
  badge: { fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' },

  // Overlay + form panel
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  formPanel: { background: '#111827', border: '1px solid #374151', borderRadius: 10, padding: 10, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' },
  modal: { background: '#111827', border: '1px solid #374151', borderRadius: 10, padding: 10, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' },
  formTitle: { fontSize: 15, fontWeight: 700, color: '#e5e7eb', margin: '0 0 18px' },
  modalTitle: { fontSize: 15, fontWeight: 700, color: '#e5e7eb', margin: '0 0 18px' },
  label: { display: 'block', fontSize: 11, color: '#9ca3af', marginBottom: 5, fontWeight: 500 },
  input: { width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #374151', borderRadius: 6, color: '#e5e7eb', padding: '8px 10px', fontSize: 13, outline: 'none' },
  fieldGroup: { marginBottom: 14 },
  formRow: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 },
  errBox: { background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444', borderRadius: 6, color: '#f87171', padding: '8px 12px', fontSize: 12, marginBottom: 14 },

  // Empty
  empty: { color: '#6b7280', fontSize: 13, padding: '20px 0', textAlign: 'center' },
  emptyHint: { color: '#374151', fontSize: 12, textAlign: 'center', padding: '40px 16px' },

  // Source toggle
  sourceRow: { display: 'flex', gap: 8, marginBottom: 14 },
  sourceBtn: { flex: 1, padding: '7px 0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'center', border: '1px solid #374151', background: '#0f172a', color: '#9ca3af' },
  sourceBtnOn: { flex: 1, padding: '7px 0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'center', border: '1px solid #6366f1', background: 'rgba(99,102,241,0.15)', color: '#818cf8' },
  allocatedPanel: {
    // inherit your existing formPanel
    maxWidth: 660,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },

  allocatedItemCard: {
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '0.875rem 1rem',
    marginBottom: '0.625rem',
  },

  statBadge: {
    fontSize: 12,
    padding: '2px 8px',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.08)',
    color: 'inherit',
  },

  allocatedScrollArea: {
    overflowY: 'auto' as const,
    flex: 1,
    padding: '0.75rem 1.25rem 1rem',
  },

  allocatedHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.875rem 1.25rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    flexShrink: 0,
  },

  allocatedFooter: {
    padding: '0.75rem 1.25rem',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  warningNote: {
    fontSize: 14,

    background: 'rgba(239,68,68,0.15)', color: '#ef4444',
    border: '1px solid #ef4444',
    borderRadius: 6,
    padding: '6px 10px',
    marginTop: 6,
    marginBottom: 16
  },
}

const STATUS_BADGE: Record<string, React.CSSProperties> = {
  pending: { ...s.badge, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  in_progress: { ...s.badge, background: 'rgba(99,102,241,0.15)', color: '#818cf8' },
  completed: { ...s.badge, background: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  active: { ...s.badge, background: 'rgba(99,102,241,0.15)', color: '#818cf8' },
  cancelled: { ...s.badge, background: 'rgba(239,68,68,0.15)', color: '#ef4444' },
}

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

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [subProjects, setSubProjects] = useState<SubProject[]>([])
  const [children, setChildren] = useState<SubProject[]>()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [subInventory, setSubInventory] = useState<InventoryItem[]>([])
  const [childInventory, setChildInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null)
  const [subAllocs, setSubAllocs] = useState<SubAllocation[]>([])
  const selectedSub = subProjects.find(s => s.id === selectedSubId) ?? null
  const [showMainAlloc, setShowMainAlloc] = useState(false)
  const [showSubAlloc, setShowSubAlloc] = useState(false)
  const [mainAllocForm, setMainAllocForm] = useState({ source: 'local' as 'local' | 'external', item_id: '', item_name: '', item_unit: '', item_unit_size: '', quantity: '' })
  const [subAllocForm, setSubAllocForm] = useState({ row_id: '', source: 'local' as 'local' | 'external', item_id: '', item_name: '', item_unit: '', item_unit_size: '', quantity_allocated: '', sub_project_id: "" })
  const [childAllocForm, setChildAllocForm] = useState({ row_id: '', source: 'local' as 'local' | 'external', item_id: '', item_name: '', item_unit: '', item_unit_size: '', quantity_allocated: '', sub_project_id: "" })
  const [mainAllocErr, setMainAllocErr] = useState('')
  const [showAddSub, setShowAddSub] = useState(false)
  const [addSubForm, setAddSubForm] = useState({ title: '', notes: '', location: '', contract_value: '',  })
  const [addSubErr, setAddSubErr] = useState('')
  const [showAddChild, setShowAddChild] = useState(false)
  const [addChildForm, setAddChildForm] = useState({ title: '', notes: '', location: "", contract_value: '' })
  const [addChildErr, setAddChildErr] = useState('')
  const [returning, setReturning] = useState<Allocation | null>(null)
  const [returnQty, setReturnQty] = useState('')
  const [returnErr, setReturnErr] = useState('')
  const [markUsedAllocation, setMarkUsedAllocation] = useState<Allocation>()
  const [showMarkUsedModal, setShowMarkUsedModal] = useState<boolean>(false)
  const [errorTitle, setErrorTitle] = useState<string>("")
  const [subProject, setSubProject] = useState<SubProject>();
  const [showAllocated, setShowAllocated] = useState(false);
  const [showChildAllocatedItems, setShowChildAllocatedItems] = useState(false);
  const [allocatedItemsForSub, setAllocatedItemsForSub] = useState<Allocation[]>()
  const [allocatedItemsForChild, setAllocatedItemsForChild] = useState<Allocation[]>()
  const [showChildAlloc, setShowChildAlloc] = useState<boolean>(false)
  const [childProjectId, setChildProjectId] = useState<string>()
  const [usedQty, setUsedQty] = useState<number>();
  const [qtyToReturn, setQtyToReturn] = useState<number>();
  const [adjustingId, setAdjustingId] = useState<string>("");
  const [adjustingIdForReturn, setAdjustingIdForReturn] = useState<string>("");
  const [childProject, setChildProject] = useState<SubProject>();
  const [selectedAllocationInSubProject, setSelectedAllocationInSubProject] = useState<InventoryItem>();
  const [showModal, setShowModal] = useState<boolean>(false)
  const [editContractValue, setEditContractValue] = useState<boolean>(true)
  const [projectValue, setProjectValue] = useState<number | 0>();
  const [editingId, setEditingId] = useState<string| null>()
  const [editingIdChild, setEditingIdChild] = useState<string| null>()


  const loadAll = useCallback(async () => {
    if (!id) return
    try {
      const [projRes, allocRes, subRes, invRes] = await Promise.all([
        window.api.projects.getById(id),
        window.api.allocations.getByProject(id),
        window.api.subProjects.getByProject(id),
        window.api.items.getAll(),
      ])
      if (projRes.success) { setProject(projRes.data); setProjectValue(projRes?.data?.contract_value || 0) }
      if (allocRes.success) {
        setAllocations(allocRes.data ?? [])
      }
      if (subRes.success) {
        setSubProjects(subRes.data ?? [])
      }
      if (invRes.success) setInventory(invRes.data ?? [])
    } catch (err) {
      toast.error("Failed to load project data: " + (err instanceof Error ? err.message : "Unknown error"))
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadSubAllocs = useCallback(async (subId: string) => {
    try {
      const res = await window.api.allocations.getSubAllocationsBySubProject(subId)
      if (res.success) {
        setSubAllocs(res.data ?? [])
      } else {
        toast.error(res.error ?? 'Failed to load sub-allocations')
      }
    } catch (error) {
      console.error(error)  // log unexpected errors
      toast.error('Failed to load sub-allocations')
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {

    if (selectedSubId) loadSubAllocs(selectedSubId);
    else setSubAllocs([])
  }, [selectedSubId, loadSubAllocs])

  const refresh = () => { loadAll(); if (selectedSubId) loadSubAllocs(selectedSubId) }


  const fetchProjectValue = async () => {
    const res = await window.api.projects.getById(id!)
    if (res.success) {
      setProjectValue(res?.data?.contract_value || 0)
    }
  }


  const pickInventory = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId)
    if (!item) return
    setMainAllocForm(f => ({ ...f, item_id: item.id, item_name: item.name, item_unit: item.unit, item_unit_size: item.unit_size ?? '' }))
  }

  const pickSubInventory = (rowId: string) => {
    const item = subInventory.find(i => i.id === rowId)
    setSelectedAllocationInSubProject(item)
    console.log(item)
    if (!item || !subProject) return
    setSubAllocForm(f => ({ ...f, row_id: rowId, sub_project_id: subProject?.id, item_id: item.item_id, allocation_id: item.id, item_name: item.item_name, item_unit: item.item_unit, item_unit_size: item.item_unit_size ?? '' }))
  }

  const pickChildInventory = (itemId: string) => {
    const item = childInventory.find(i => i.id === itemId)
    if (!item || !selectedSub) return
    setChildAllocForm(f => ({ ...f, row_id: itemId, sub_project_id: selectedSub?.id, child_project_id: childProjectId, parent_id: item.id, item_id: item.item_id, allocation_id: item.allocation_id, item_name: item.item_name, item_unit: item.item_unit, item_unit_size: item.item_unit_size ?? '' }))
  }

  const getChildProjectsBySubProject = async (subId: string) => {
    try {
      const res = await window.api.childProjects.getBySubProject(subId);
      console.log("New Data")
      console.log(res.data)
      if (res.success) setChildren(res.data)
      else toast.error(res.error ?? "Failed to load child projects")
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Failed to load child projects")
    }
  }

  const allocateForChildProject = async (childId: string, subProjectId: string) => {
    if (!childId || !subProjectId || !id) return;
    try {
      const res = await window.api.allocations.getSubAllocationsBySubProject(subProjectId);
      if (res.success) setChildInventory((res.data ?? []).filter((i: InventoryItem) => i.quantity_allocated - i.quantity_returned - i.quantity_used > 0))
      else toast.error(res.error || "Failed to load inventory for child allocation")
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Failed to load inventory for child allocation")
    }
  }

  const getAllocatedItemsByChildProject = async (childId: string) => {
    try {
      const res = await window.api.allocations.getChildAllocationsByChildProject(childId);
      if (res.success) {
        setAllocatedItemsForChild(res.data); setShowChildAllocatedItems(true);
      }
      else {
        toast.error(res.error || "Failed to load allocated items for child project")
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Failed to load allocated items for child project")
    }
  }

  const getSubAllocations = async () => {
    if (!project) return
    try {
      const res = await window.api.allocations.getByProject(project?.id)
      if (res.success) setSubInventory((res.data ?? []).filter((si: InventoryItem) => si.quantity_allocated - (si.quantity_returned + si.quantity_used) > 0))
      else toast.error(res.error || "Failed to load sub-project inventory")
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Failed to load sub-project inventory")
    }
  }

  const handleChildAlloc = async () => {
    console.log("Called")
    try {
      const res = await window.api.allocations.createChildAllocation(childAllocForm);
      if (res.success) {
        refresh(); setShowChildAlloc(false); setChildAllocForm({
          row_id: '', source: 'local', item_id: '', item_name: '', item_unit: '', item_unit_size: '', quantity_allocated: '', sub_project_id: ""
        })
        toast.success("Allocated Successfully")
      }
      else {
        console.error(res.error)
        toast.error(res.error || "Failed to allocate for child project")
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error && error.message || "Failed to allocate for child project")
    }
  }
  const handleMainAlloc = async () => {
    const { source, item_id, item_name, item_unit, item_unit_size, quantity } = mainAllocForm
    if (!item_name) { setMainAllocErr('Item name is required'); return }
    if (!item_unit) { setMainAllocErr('Unit is required'); return }
    if (!quantity || parseFloat(quantity) <= 0) { setMainAllocErr('Enter a valid quantity'); return }
    if (!item_id && source === "local") { setMainAllocErr('Select an inventory item'); return }
    try {
      const res = await window.api.allocations.create({
        project_id: id!, item_id: item_id || undefined,
        item_name, item_unit, item_unit_size: item_unit_size || undefined,
        source, quantity_allocated: parseFloat(quantity),
      })
      if (res.success) {
        toast.success("Allocated Successfully")
        setShowMainAlloc(false)
        setMainAllocForm({ source: 'local', item_id: '', item_name: '', item_unit: '', item_unit_size: '', quantity: '' })
        setMainAllocErr('')
        refresh()
      } else { setMainAllocErr(res.error ?? 'Failed'); toast.error(res.error || "Failed to Allocate") }
    } catch (error) {
      console.error(error)
      setMainAllocErr('Failed to create allocation')
      toast.error(error instanceof Error ? error.message : 'Failed to create allocation')
    }
  }

  const getSubAllocationsForSubProject = async (sub: SubProject) => {
    if (!sub) { toast.error("Invalid sub-project"); return }
    try {
      const res = await window.api.allocations.getSubAllocationsBySubProject(sub?.id);
      console.log(res.data)
      if (res.success) setAllocatedItemsForSub(res.data)
      else toast.error(res.error || "Failed to load allocations for sub-project")
    } catch (error) {
      console.error(error)
      toast.error("Failed to load allocations for sub-project")
    }
  }

  const handleSubAlloc = async () => {
    const { item_name, item_unit, quantity_allocated } = subAllocForm
    if (!item_name) { setMainAllocErr('Item name is required'); return }
    if (!item_unit) { setMainAllocErr('Unit is required'); return }
    if (!quantity_allocated || parseFloat(quantity_allocated) <= 0) { toast.error("Invalid quantity"); setMainAllocErr('Enter a valid quantity'); return }
    if (!selectedAllocationInSubProject) return
    const remaining = (selectedAllocationInSubProject?.quantity_allocated + selectedAllocationInSubProject?.quantity_received_back) - (selectedAllocationInSubProject.quantity_assigned + selectedAllocationInSubProject.quantity_returned + selectedAllocationInSubProject.quantity_used)
    if (remaining < parseFloat(quantity_allocated)) { toast.error(`Maximum amount is ${remaining}`); return }
    try {
      const res = await window.api.allocations.createSubAllocation(subAllocForm)
      console.log(res)
      if (res.success) {
        toast.success("Sub-allocation created successfully")
        setSubAllocForm({ row_id: '', source: 'local', item_id: '', item_name: '', item_unit: '', item_unit_size: '', quantity_allocated: '', sub_project_id: "" })
        refresh();
        setShowSubAlloc(false);
      } else {
        toast.error(res.error || "Failed to create sub-allocation")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to create sub-allocation")
    }

  }

  const handleAddSub = async () => {
    console.log(addSubForm);
    if (!addSubForm.title.trim() || !addSubForm.location.trim()) { setAddSubErr('Title and Location are required'); return }
    try {
      const res = await window.api.subProjects.create({ project_id: id!, title: addSubForm.title, notes: addSubForm.notes, location: addSubForm.location, contract_value: addSubForm.contract_value })
      if (res.success) { fetchProjectValue(); toast.success("Sub-project created successfully"); setShowAddSub(false); setAddSubForm({ title: '', notes: '', location: '', contract_value: '' }); setAddSubErr(''); refresh() }
      else { setAddSubErr(res.error ?? 'Failed'); toast.error(res.error || "Failed to create sub-project") }
    } catch (error) {
      console.error(error)
      toast.error("Failed to create sub-project")
    }
  }

  const handleAddChild = async () => {
    console.log(addChildForm);

    if (!subProject) { toast.error("Select a sub-project"); return }
    if (!addChildForm.title.trim() || !addChildForm.location.trim() || !addChildForm.contract_value) { toast.error("Title, Contract Value and Location are required"); setAddChildErr('Title Contract Value and Location are required'); return }
    try {
      const res = await window.api.childProjects.create({ project_id: id!, parent_id: subProject?.id, title: addChildForm.title, notes: addChildForm.notes, location: addChildForm.location, contract_value: addChildForm.contract_value })
      if (res.success) { fetchProjectValue(); toast.success("Child project created successfully"); getChildProjectsBySubProject(subProject.id); setShowAddChild(false); setAddChildForm({ title: '', notes: '', location: '', contract_value: '' }); setAddChildErr(''); refresh() }
      else { setAddChildErr(res.error ?? 'Failed'); toast.error(res.error || "Failed to create child project") }
    } catch (error) {
      console.error(error)
      toast.error("Failed to create child project")
    }
  }

  const handleReturn = async () => {
    if (!returning) return
    const qty = parseFloat(returnQty)
    if (!qty || qty <= 0) { toast.error("Enter a valid quantity"); setReturnErr('Enter a valid quantity'); return }
    try {
      const res = await window.api.allocations.returnToInventory(returning.id, qty)
      if (res.success) { toast.success("Item returned to inventory successfully"); setReturning(null); setReturnQty(''); setReturnErr(''); refresh() }
      else { setReturnErr(res.error ?? 'Failed'); toast.error(res.error || "Failed to return") }
    } catch (error) {
      toast.error("Failed to return item")
      console.error(error)
    }
  }

  const handleMarkUsed = async (item: any) => {

    if (!item || !usedQty) return
    if (isNaN(usedQty) || usedQty < 0) { toast.error("Enter a valid quantity"); return }
    let remaining = (item?.quantity_allocated + item?.quantity_received_back) - item?.quantity_returned - item?.quantity_used - item?.quantity_assigned;
    if (remaining < usedQty) { toast.error(`Maximum Quantity is ${remaining}`); return }
    try {
      const res = await window.api.allocations.markUsed(item.id, usedQty)
      if (res.success) { setShowChildAllocatedItems(false); toast.success("Marked as Used"); setUsedQty(0); refresh(); setAdjustingId(""); setAdjustingIdForReturn(""); setMainAllocErr(""); setShowMarkUsedModal(false) }

      if (childProject) { getAllocatedItemsByChildProject(childProject.id); }
      if (subProject) { getSubAllocationsForSubProject(subProject); }
      if (!res.success) {

        setAdjustingId(""); toast.error(res.error || "Something went wrong"); setShowAllocated(false); setAdjustingIdForReturn(""); setMainAllocErr(res.error || "Something wernt wrong.");
        console.log("Error marking used:", res?.error)
        setUsedQty(0)
      }

    } catch (error) {
      setShowAllocated(false)
      console.error("Error marking used:", error)
      toast.error(error instanceof Error ? error.message : "Failed to mark as used")
    }
  }

  const handleReturnInSub = async (subAlloc: Allocation) => {
    if (!subAlloc || !qtyToReturn) { toast.error("Enter a valid quantity"); return }
    try {
      const res = await window.api.allocations.returnSubToMain(subAlloc.id, qtyToReturn)
      console.log(res)
      if (subProject) getSubAllocationsForSubProject(subProject);
      if (res.success) {
        setQtyToReturn(0); refresh(); setAdjustingId(""); setAdjustingIdForReturn(""); toast.success("Item return to main project"); setMainAllocErr("");
      } else {
        setAdjustingId(""); setAdjustingIdForReturn(""); toast.error("Failed to return item"); setMainAllocErr(res.error || "Something wernt wrong.")
      }
    } catch (error) {
      toast.error("Failed to return item")
      console.error(error)
    }

  }

  const handleReturnInChild = async (childAlloc: Allocation) => {
    if (!childAlloc || !qtyToReturn) { toast.error("Enter a valid quantity"); return }
    try {
      const res = await window.api.allocations.returnChildToSub(childAlloc.id, qtyToReturn)
      if (!childProject) return;
      if (res.success) { getAllocatedItemsByChildProject(childProject.id); toast.success("Item returned successfully"); setQtyToReturn(0); refresh(); setShowAllocated(false); }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to return item")
      console.error(error)
    }
  }

  const handleDeleteSub = async (subId: string) => {
    if (!confirm('Delete this sub-project and all its data?')) return
    try {
      const res = await window.api.subProjects.delete(subId)
      if (res.success) { fetchProjectValue(); toast.success("Sub project deleted successfully"); if (selectedSubId === subId) setSelectedSubId(null); refresh() }
      else toast.error(res.error)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Something went wrong. Try again later")
    }
  }

  const handleChildStatus = async (childId: string, status: string) => {
    if (!childId || !status) { toast.error("Child project or status is missing"); return }
    try {
      const res = await window.api.childProjects.updateStatus(childId, status)
      if (res.success) {
        getChildProjectsBySubProject(selectedSubId!)
        refresh();
        toast.success("Status Updated");
      }
      else {
        toast.error(res.error)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
      console.error(error)
    }
  }

  const handleSubStatus = async (subId: string, status: string) => {
    if (!subId || !status) { toast.error("Sub project or status is missing"); return }
    try {
      const res = await window.api.subProjects.updateStatus(subId, status)
      if (res.success) {
        getChildProjectsBySubProject(selectedSubId!)
        toast.success('Status updated')
        refresh();
      }
      else {
        toast.error(res.error);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    }
  }

  const handleDeleteChild = async (childId: string) => {
    if (!childId) { toast.error("Child project is missing"); return }
    try {
      const res = await window.api.childProjects.delete(childId);
      if (res.success) {
        fetchProjectValue();
        toast.success("Child project deleted");
        getChildProjectsBySubProject(selectedSubId!)
      } else {
        toast.error("Failed to delete: ", res.error);
        console.error(res.error)
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }



  const hasChild = async (sub: SubProject) => {
    const res = await window.api.childProjects.getBySubProject(sub.id)
    console.log(sub)
    if(sub.contract_value === 0 || String(sub.contract_value) === "") {
      toast.warn("Add child project or set a contract value for this sub project to add expeses")
      return
    }
    if (res.data.length === 0) {
      navigate(`/projects/project-analytics/${sub.id}`)
    } else {
      toast.warn("This project has child projects. You can't directly add expenses here")
      return

    }
  }
  const childSubAllocs = (childId: string) =>
    subAllocs.filter(sa => sa.sub_project_id === childId)

  if (loading) return <div style={{ padding: 40, color: '#9ca3af' }}>Loading…</div>
  if (!project) return <div style={{ padding: 40, color: '#ef4444' }}>Project not found</div>


  const canCreateChildProjectWhenExistContractValue = async(sub:SubProject) => {
    const res = await window.api.childProjects.getBySubProject(sub.id!)
    if(res?.data?.length === 0 && sub.contract_value > 0){
      toast.warning("You can't create child project with existing contract value")
    }
    else {
       setSubProject(sub); setShowAddChild(true); setSelectedSubId(sub.id);  getChildProjectsBySubProject(sub.id);
     }
  }


  // /////////////////////////////////////////////////////////////
  const editSub = async (sub:SubProject)=>{
    console.log(sub)
    if(!sub) return
    setAddSubForm({title:sub.title, notes:sub.notes ?? "", location:sub.location ?? "", contract_value:String(sub.contract_value) ?? ""})
    setEditingId(sub.id!)
  }

  const editChild = async (child:SubProject)=>{
    if(!child) return
    setAddSubForm({title:child.title, notes:child.notes ?? "", location:child.location ?? "", contract_value:String(child.contract_value) ?? ""})
    setEditingIdChild(child.id)
  }

  const canEditContractValue = async (sub:SubProject)=>{
    const res = await window.api.childProjects.getBySubProject(sub.id!)
    if(res.data.length > 0){
      setEditContractValue(false)
    } else {
      setEditContractValue(true)
    }
  }
  // /////////////////////////////////////////////////////////////
const handleEditSub = async ()=>{
  if(!editingId) return
  try {
    const res = await window.api.subProjects.update(editingId,addSubForm)
    if(res.success){
      refresh();
      setEditingId("");
      toast.success("Changes saved successfully")
    }

  } catch (error) {
    console.error("Something went wrong")
    
  }
}


const handleEditChild = async ()=>{
  if(!editingIdChild) return
  try {
    const res = await window.api.childProjects.update(editingIdChild, addSubForm);
    if(res.success){
      toast.success("Changes saved successfully")
      refresh();
      if(!selectedSub) return
      getChildProjectsBySubProject(selectedSub.id)
      setEditingIdChild("")
      setEditingId("")
    }
  } catch (error) {
    setEditingIdChild("")
      setEditingId("")
  }

}


  return (
    <div style={s.page}>

      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/projects')}>← Projects</button>
        <div style={s.headerInfo}>
          <h2 style={s.headerTitle}>{project.title}</h2>
          <p style={s.headerSub}>{project.client_name}{project.location ? ` · ${project.location}` : ''}</p>
        </div>
        <p style={{color:"#22c55e"}}>Rs {projectValue?.toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
        <StatusBadge status={project.status} />
      </div>

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
              const remaining = (a.quantity_allocated + a.quantity_received_back) - a.quantity_used - a.quantity_returned - a.quantity_assigned
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
                    ['Used', a.quantity_used, '#818cf8'],
                    ['Returned', a.quantity_returned, '#22c55e'],
                    ['Remaining', remaining, remaining > 0 ? '#f59e0b' : '#6b7280'],
                    ['Assigned', a.quantity_assigned, '#82e90d'],
                    ['Received Back', a.quantity_received_back, '#10b981'],
                  ]} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={s.cardActions}>

                      {a.source === 'local' && remaining > 0 && (
                        <button style={s.btnSuccess} onClick={() => { setReturning(a); setReturnQty(''); setReturnErr('') }}>
                          Return to inventory
                        </button>
                      )}
                    </div>
                    <button onClick={() => {
                      setMarkUsedAllocation(a);
                      if (a.quantity_allocated - a.quantity_returned - a.quantity_used > 0) setShowMarkUsedModal(true)
                      else setErrorTitle("Not available remaining items to use")
                    }} style={{ ...s.btnSuccess, display: "flex", background: "#818cf8", border: "none", color: "whitesmoke", justifyContent: "center", alignItems: "center", padding: "10px 20px" }}>
                      Mark as used
                    </button>
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
            <button style={s.btnPrimary} onClick={() => { setShowAddSub(true); setAddSubForm({ title: '', notes: '', location: '', contract_value: '' }); setAddSubErr('') }}>+ Add</button>
          </div>
          <div style={s.colBody}>
            {subProjects.length === 0 && <p style={s.empty}>No sub-projects yet</p>}

            {subProjects.map(sub => {

              const isSelected = sub.id === selectedSubId
              const myAllocs = subAllocs.filter(sa => sa.sub_project_id === sub.id)

              return (
                <div key={sub.id}
                  style={isSelected ? s.cardActive : s.card}
                  onClick={() => { setSelectedSubId(sub.id); getChildProjectsBySubProject(sub.id) }}>
                  <p style={{color:"#22c55e"}}>{sub.contract_value !== undefined || sub.contract_value !== null || sub.contract_value > 0 ? `Contract Value: Rs ${sub.contract_value?.toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}` : 'Contract Value: N/A'}</p>
                  <p style={{color:"#22c55e"}}>Cost {sub.cost}</p>

                  <div style={s.cardRow} >
                    <p style={{ ...s.cardTitle, color: isSelected ? '#818cf8' : '#e5e7eb' }}>{sub.title}</p>
                    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                      <StatusBadge status={sub.status} />
                      <button style={{padding:"0px 5px"}} onClick={()=>{canEditContractValue(sub); editSub(sub)}}>Edit</button>
                      <button style={s.btnDanger}
                        onClick={e => { e.stopPropagation(); handleDeleteSub(sub.id) }}>✕</button>
                    </div>
                  </div>

                  {sub.notes && <p style={s.cardMeta}>{sub.notes}</p>}

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
                    gap: 5,
                    margin: '8px 0'
                  }} onClick={e => e.stopPropagation()}>
                    <button style={s.btnPrimary} onClick={(e) => { e.stopPropagation(); setSubProject(sub); getSubAllocationsForSubProject(sub); setShowChildAllocatedItems(false); setShowAllocated(true); }}>View Items</button>
                    <button style={s.btnWarn} onClick={(e) => { e.stopPropagation(); canCreateChildProjectWhenExistContractValue(sub) }}>+Child</button>
                    <button style={s.btnSuccess} onClick={(e) => { e.stopPropagation(); setSubProject(sub); getSubAllocations(); setShowSubAlloc(true) }}>Allocate</button>
                  </div>


                  <div style={{ ...s.cardActions, marginTop: myAllocs.length ? 6 : 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={e => e.stopPropagation()}>
                    <select
                      value={sub.status}
                      onChange={e => handleSubStatus(sub.id, e.target.value)}
                      style={{ ...s.btn, cursor: 'pointer', fontSize: 11 }}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>

                    <button onClick={() => { hasChild(sub); }}>
                      Add Expense
                    </button>
                  </div>


                </div>
              )
            })}
          </div>
        </div>

        {/* 3 — Child projects of selected sub */}
        <div style={s.colLast}>
          <div style={s.colHeader}>
            <p style={s.colTitle}>
              {selectedSub ? `${selectedSub.title} — Children` : 'Children'}
            </p>
           
          </div>
          <div style={s.colBody}>
            {!selectedSubId && (
              <p style={s.emptyHint}>Select a sub-project to see its children</p>
            )}

            {selectedSubId && children?.length === 0 && (
              <p style={s.empty}>No child projects yet</p>
            )}

            {children?.map(child => {
              const myAllocs = childSubAllocs(child.id)
              return (
                <div key={child.id} style={s.card}>
                    <p style={{color:"#22c55e"}}>{child.contract_value !== undefined ? `Contract Value: Rs ${child.contract_value?.toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}` : 'Contract Value: N/A'}</p>
                    <p>Cost {child.cost}</p>
                  <div style={s.cardRow}>
                    <p style={s.cardTitle}>{child.title}</p>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <StatusBadge status={child.status} />
                      <button style={{padding:"0px 6px"}} onClick={()=> {editChild(child)}}>Edit</button>
                      <button style={s.btnDanger} onClick={() => handleDeleteChild(child.id)}>✕</button>
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
                            ['Assigned', sa.quantity_assigned],
                            ['Used', sa.quantity_used, '#818cf8'],
                            ['Returned', sa.quantity_returned, '#22c55e'],
                            ['Remaining', sa.quantity_remaining, sa.quantity_remaining > 0 ? '#f59e0b' : '#6b7280'],
                          ]} />
                          <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                            <button style={s.btnSuccess}
                              onClick={() => { }}>
                              Mark used
                            </button>

                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
                    gap: 5,
                    margin: '8px 0'
                  }} onClick={e => e.stopPropagation()}>


                    <button style={s.btnPrimary} onClick={() => { setChildProject(child); getAllocatedItemsByChildProject(child.id) }}>
                      View Items
                    </button>
                    <button style={s.btnSuccess} onClick={() => {
                      if (!selectedSub || !child) return;
                      setChildProjectId(child.id);
                      setShowChildAlloc(true); allocateForChildProject(child.id, selectedSub?.id)
                    }}>
                      Allocate
                    </button>

                  </div>
                  <div style={{ ...s.cardActions }}>
                    <select
                      value={child.status}
                      onChange={e => { handleChildStatus(child.id, e.target.value); console.log(child.status) }}
                      style={{ ...s.btn, cursor: 'pointer', fontSize: 11 }}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    
                    <button onClick={() => navigate(`/projects/project-analytics/${child.id}`)}>
                      Add Expense
                    </button>
                  </div>

                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* oVERLAYS */}



{/* Editing chid project */}


{editingIdChild && (
        <div style={s.overlay} onClick={() => {}}>
          <div style={s.formPanel} onClick={e => e.stopPropagation()}>
            <p style={s.formTitle}>Edit child-project</p>
            {addSubErr && <div style={s.errBox}>{addSubErr}</div>}
            <div style={s.fieldGroup}>
              <label style={s.label}>Title *</label>
              <input style={s.input} value={addSubForm.title} autoFocus
                onChange={e => setAddSubForm(f => ({ ...f, title: e.target.value }))}
              />


              <label style={s.label}>Location *</label>
              <input style={s.input} value={addSubForm.location}
                onChange={e => setAddSubForm(f => ({ ...f, location: e.target.value }))}
                />
            </div>
            <div style={s.fieldGroup}>
             
              <label style={s.label}>Contract Value</label>
              <input disabled={!editContractValue} style={s.input} type='number' step='0.01'
                value={addSubForm.contract_value} onChange={e => setAddSubForm(f => ({ ...f, contract_value: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleEditChild()}  />

            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Notes</label>
              <textarea style={{ ...s.input, minHeight: 60, resize: 'vertical' }}
                value={addSubForm.notes} onChange={e => setAddSubForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={s.formRow}>
              <button style={s.btn} onClick={() => {
                setEditingIdChild("")
              setAddSubForm({title:"", notes: "", location:"", contract_value:""})

              }}>Cancel</button>
              <button style={s.btnLg} onClick={handleEditChild}>Save Changes</button>
            </div>
          </div>
        </div>
      )}


{/* Editing chid project */}

{/* editing sub project */}


 {editingId && (
        <div style={s.overlay} onClick={() => {}}>
          <div style={s.formPanel} onClick={e => e.stopPropagation()}>
            <p style={s.formTitle}>Edit sub-project</p>
            {addSubErr && <div style={s.errBox}>{addSubErr}</div>}
            <div style={s.fieldGroup}>
              <label style={s.label}>Title *</label>
              <input style={s.input} value={addSubForm.title} autoFocus
                onChange={e => setAddSubForm(f => ({ ...f, title: e.target.value }))}
              />


              <label style={s.label}>Location *</label>
              <input style={s.input} value={addSubForm.location}
                onChange={e => setAddSubForm(f => ({ ...f, location: e.target.value }))}
                />
            </div>
            <div style={s.fieldGroup}>
              {!editContractValue && (
                <p style={s.warningNote}>
                ⚠ Note: Contract value cannot be edited since this containd child projects.
              </p>
              )}
              <label style={s.label}>Contract Value (Ignore if this Sub Project has Child Projects)</label>
              <input disabled={!editContractValue} style={s.input} type='number' step='0.01'
                value={addSubForm.contract_value} onChange={e => setAddSubForm(f => ({ ...f, contract_value: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleEditSub()}  />

            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Notes</label>
              <textarea style={{ ...s.input, minHeight: 60, resize: 'vertical' }}
                value={addSubForm.notes} onChange={e => setAddSubForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={s.formRow}>
              <button style={s.btn} onClick={() => {
                setEditingId("")
              setAddSubForm({title:"", notes: "", location:"", contract_value:""})

              }}>Cancel</button>
              <button style={s.btnLg} onClick={handleEditSub}>Save Changes</button>
            </div>
          </div>
        </div>
      )}




{/* editing sub project */}






      {showChildAllocatedItems && (
        <div style={s.overlay} onClick={() => setShowChildAllocatedItems(false)}>
          <div style={{ ...s.formPanel, maxWidth: 660, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', flexShrink: 0 }}>
              <p style={s.formTitle}>Allocated items to xxxxxxxxxx {childProject?.title}</p>
              <button style={{ ...s.btn, padding: '4px 8px' }} onClick={() => { setShowChildAllocatedItems(false); setAdjustingId(""); setAdjustingIdForReturn(""); }}>✕</button>
            </div>

            {allocatedItemsForChild?.length === 0 && (
              <div style={{ color: '#9ca3af' }}>No items allocated to this child project yet</div>
            )}
            <div style={{ overflowY: 'auto', flex: 1, padding: '0.75rem 1.25rem 1rem' }}>
              {allocatedItemsForChild?.map(item => {
                const remaining = item.quantity_allocated - item.quantity_used - item.quantity_returned;
                return (
                  <div key={item.id} style={{ border: '1px solid #98b4ec', borderRadius: 2, width: "100%", padding: '0.875rem 1rem', marginBottom: '0.625rem' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 500 }}>{item.item_name}</span>
                      <span style={{ fontWeight: 400, color: "#bcd0f8", fontSize: "13px" }}>{item.allocated_at}</span>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', justifyContent: "space-between", width: "100%", marginBottom: 10 }}>
                      {[
                        { label: 'Allocated', value: item.quantity_allocated, bg: 'rgba(56,139,253,0.15)', color: '#58a6ff' },
                        { label: 'Used', value: item.quantity_used, bg: 'rgba(63,185,80,0.15)', color: '#3fb950' },
                        { label: 'Returned', value: item.quantity_returned, bg: 'rgba(210,153,34,0.15)', color: '#d29922' },
                        {
                          label: 'Remaining', value: remaining, bg: remaining <= 0 ? 'rgba(248,81,73,0.15)' : 'rgba(139,148,158,0.15)',
                          color: remaining <= 0 ? '#f85149' : '#8b949e'
                        },
                      ].map(({ label, value, bg, color }) => (
                        <span key={label} style={{ ...s.statBadge, background: bg, color, padding: "10px 20px", textAlign: "center" }}>
                          {label}: <strong>{value}</strong>
                        </span>
                      ))}


                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: "space-between", width: "100%", }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {adjustingId === item.id ? (
                          <div style={{ display: 'flex', gap: 5 }}>

                            <button style={{ backgroundColor: "transparent", padding: "4px 8px", color: "#3fb950", border: "1px solid #3fb950", borderRadius: 2 }} onClick={() => {
                              setMarkUsedAllocation(item);
                              if (usedQty === 0 || !usedQty) return
                              const remaining = item.quantity_allocated - (item.quantity_used + item.quantity_returned)
                              if (remaining < usedQty) { toast.error(`remaining ${remaining}`); return }
                              if (item.quantity_allocated - item.quantity_returned - item.quantity_used > 0) { handleMarkUsed(item) }
                              else setErrorTitle("Not available remaining items to use")
                            }}>Mark Used</button>
                            <input
                              style={{ ...s.input, flex: 1, height: 26 }}
                              type="number"
                              min={1}
                              autoFocus
                              max={remaining}
                              placeholder="Used"
                              value={usedQty}
                              onChange={e => setUsedQty(parseInt(e.target.value))}
                            />

                          </div>

                        ) : item.quantity_allocated - item.quantity_returned - item.quantity_used > 0 ? (
                          <button style={{ backgroundColor: "transparent", padding: "4px 8px", color: "#3fb950", border: "1px solid #3fb950", borderRadius: 2 }} onClick={() => { { setAdjustingId(item.id); setAdjustingIdForReturn(""); } }}>
                            Mark Used
                          </button>
                        ) : (<span style={{ color: '#6b7280', fontSize: 12 }}>No more available to mark as used or return</span>)}
                      </div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {item.quantity_remaining > 0 && adjustingIdForReturn === item.id && (
                          <div style={{ display: 'flex', gap: 5 }}>
                            <input
                              style={{ ...s.input, flex: 1, height: 26 }}
                              type="number"
                              min={1}
                              autoFocus
                              max={remaining}
                              placeholder="Qty to return"
                              value={qtyToReturn}
                              onChange={e => setQtyToReturn(parseInt(e.target.value))}
                            />
                            <button style={{ backgroundColor: "transparent", padding: "4px 8px", color: "#d29922", border: "1px solid #d29922", borderRadius: 2 }} onClick={() => {
                              if (qtyToReturn === 0 || !qtyToReturn) return
                              const remaining = item.quantity_allocated - (item.quantity_used + item.quantity_returned)
                              if (remaining < qtyToReturn) { toast.error(`remaining ${remaining}`); return }
                              handleReturnInChild(item)

                            }}>Return</button>
                          </div>)}
                        {item.quantity_allocated - item.quantity_returned - item.quantity_used > 0 && adjustingIdForReturn !== item.id && (
                          <button style={{ backgroundColor: "transparent", padding: "4px 8px", color: "#d29922", border: "1px solid #d29922", borderRadius: 2 }} onClick={() => {
                            setAdjustingId("");
                            adjustingIdForReturn === item.id ? setAdjustingIdForReturn("") : setAdjustingIdForReturn(item.id)
                          }}>
                            Return
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button style={s.btn} onClick={() => { setShowChildAllocatedItems(false); setAdjustingId(""); setAdjustingIdForReturn(""); }}>Close</button>
            </div>

          </div>
        </div>
      )}

      {/* Main allocation form */}
      {showMainAlloc && (
        <div style={s.overlay} onClick={() => setShowMainAlloc(false)}>
          <div style={s.formPanel} onClick={e => e.stopPropagation()}>
            <p style={s.formTitle}>Allocate material to project</p>
            {mainAllocErr && <div style={s.errBox}>{mainAllocErr}</div>}

            <div style={s.sourceRow}>
              {(['local', 'external'] as const).map(src => (
                <button key={src}
                  style={mainAllocForm.source === src ? s.sourceBtnOn : s.sourceBtn}
                  onClick={() => setMainAllocForm(f => ({ ...f, source: src, item_id: '', quantity: "", item_name: '', item_unit_size: "", item_unit: '' }))}>
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
              <button style={s.btn} onClick={() => { setShowMainAlloc(false); setMainAllocForm(f => ({ ...f, item_id: '', quantity: "", item_name: '', item_unit_size: "", item_unit: '' })) }}>Cancel</button>
              <button style={s.btnLg} onClick={handleMainAlloc}>Allocate</button>
            </div>
          </div>
        </div>
      )}

      {/* sub alloc */}
      {
        showSubAlloc && (
          <div style={s.overlay} onClick={() => setShowSubAlloc(false)}>
            <div style={s.formPanel} onClick={e => e.stopPropagation()}>
              <p style={s.formTitle}>Allocate material to sub project</p>
              {mainAllocErr && <div style={s.errBox}>{mainAllocErr}</div>}
              <div style={s.fieldGroup}>
                <label style={s.label}>Inventory item *</label>
                <select style={s.input} value={subAllocForm.row_id} onChange={e => pickSubInventory(e.target.value)}>
                  <option value="">Select item…</option>
                  {subInventory.map(i => <option key={i.id} value={i.id}>{i.item_name} — {(i.quantity_allocated + i.quantity_received_back) - (i.quantity_returned + i.quantity_used + i.quantity_assigned)} {i.item_unit} available</option>)}
                </select>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Quantity *</label>
                <input style={s.input} type="number" value={subAllocForm.quantity_allocated} min={0}
                  onChange={e => setSubAllocForm(f => ({ ...f, quantity_allocated: e.target.value }))} />
              </div>
              <div style={s.formRow}>
                <button style={s.btn} onClick={() => { setShowSubAlloc(false); setSubAllocForm({ row_id: '', source: 'local', item_id: '', item_name: '', item_unit: '', item_unit_size: '', quantity_allocated: '', sub_project_id: "" }) }}>Cancel</button>
                <button style={s.btnLg} onClick={handleSubAlloc}>Allocate</button>
              </div>
            </div>
          </div>
        )
      }

      {/* child alllox */}
      {showChildAlloc && (
        <div style={s.overlay} onClick={() => setShowChildAlloc(false)}>
          <div style={s.formPanel} onClick={e => e.stopPropagation()}>
            <p style={s.formTitle}>Allocate material to child project</p>
            {mainAllocErr && <div style={s.errBox}>{mainAllocErr}</div>}
            <div style={s.fieldGroup}>
              <label style={s.label}>Inventory item *</label>
              <select style={s.input} value={childAllocForm.item_id} onChange={e => pickChildInventory(e.target.value)}>
                <option value="">Select item…</option>
                {childInventory.map(i => <option key={i.id} value={i.id}>{i.item_name} — {(i.quantity_allocated + i.quantity_received_back) - (i.quantity_returned + i.quantity_used + i.quantity_assigned)} {i.item_unit} available</option>)}
              </select>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Quantity *</label>
              <input style={s.input} type="number" value={childAllocForm.quantity_allocated} min={0}
                onChange={e => setChildAllocForm(f => ({ ...f, quantity_allocated: e.target.value }))} />
            </div>
            <div style={s.formRow}>
              <button style={s.btn} onClick={() => setShowChildAlloc(false)}>Cancel</button>
              <button style={s.btnLg} onClick={handleChildAlloc}>Allocate</button>
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
              />


              <label style={s.label}>Location *</label>
              <input style={s.input} value={addSubForm.location}
                onChange={e => setAddSubForm(f => ({ ...f, location: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAddSub()} />
            </div>
            <div style={s.fieldGroup}>
              <p style={s.warningNote}>
                ⚠ Note: If this Sub project has child projects, please leave Contract Value empty.
              </p>
              <label style={s.label}>Contract Value (Ignore if this Sub Project has Child Projects)</label>
              <input style={s.input} type='number' step='0.01'
                value={addSubForm.contract_value} onChange={e => setAddSubForm(f => ({ ...f, contract_value: e.target.value }))} />

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

      {/* sub allocated items */}

      {showAllocated && (
        <div style={s.overlay} onClick={() => { setShowAllocated(false); setAdjustingId(""); setAdjustingIdForReturn(""); setMainAllocErr("") }}>
          <div style={{ ...s.formPanel, maxWidth: 660, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', flexShrink: 0 }}>
              <p style={s.formTitle}>Allocated items to {subProject?.title}</p>

              <button style={{ ...s.btn, padding: '4px 8px' }} onClick={() => { setShowAllocated(false); setAdjustingId(""); setAdjustingIdForReturn(""); setMainAllocErr("") }}>✕</button>
            </div>

            {
              allocatedItemsForSub?.length === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={s.empty}>No items allocated to this sub-project yet</p>
                </div>
              )
            }
            <div style={{ overflowY: 'auto', flex: 1, padding: '0.75rem 1.25rem 1rem' }}>
              {allocatedItemsForSub?.map(item => {
                const remaining = item.quantity_allocated - item.quantity_used - item.quantity_returned - item.quantity_assigned + item.quantity_received_back;
                return (
                  <div key={item.id} style={{ border: '1px solid #98b4ec', borderRadius: 2, width: "100%", padding: '0.875rem 1rem', marginBottom: '0.625rem' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 500 }}>{item.item_name}</span>
                      <span style={{ fontWeight: 400, color: "#bcd0f8", fontSize: "13px" }}>{item.allocated_at.split(" ")[0]} - {item.allocated_at.split(" ")[1]}</span>
                    </div>

                    {/* Stats row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
                      gap: 4,
                      margin: '8px 0'
                    }}>
                      {[
                        { label: 'Allocated', value: item.quantity_allocated, bg: 'rgba(56,139,253,0.15)', color: '#58a6ff' },
                        { label: 'Used', value: item.quantity_used, bg: 'rgba(63,185,80,0.15)', color: '#3fb950' },
                        { label: 'Returned', value: item.quantity_returned, bg: 'rgba(210,153,34,0.15)', color: '#d29922' },
                        {
                          label: 'Remaining', value: remaining, bg: remaining <= 0 ? 'rgba(248,81,73,0.15)' : 'rgba(139,148,158,0.15)',
                          color: remaining <= 0 ? '#f85149' : '#8b949e'
                        },
                        { label: 'Assigned', value: item.quantity_assigned, bg: 'rgba(188,140,255,0.15)', color: '#bc8cff' },
                        { label: 'Received Back', value: item.quantity_received_back, bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
                      ].map(({ label, value, bg, color }) => (
                        <span key={label} style={{ ...s.statBadge, background: bg, color, padding: "10px 20px", textAlign: "center" }}>
                          {label}: <strong>{value}</strong>
                        </span>
                      ))}


                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: "space-between", width: "100%", }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {adjustingId === item.id ? (
                          <div style={{ display: 'flex', gap: 5 }}>

                            <button style={{ backgroundColor: "transparent", padding: "4px 8px", color: "#3fb950", border: "1px solid #3fb950", borderRadius: 2 }} onClick={() => {
                              setMarkUsedAllocation(item);
                              if (usedQty === 0 || !usedQty) { toast.error("Enter the amount"); return }
                              const remaining = (item.quantity_allocated + item.quantity_received_back) - (item.quantity_assigned + item.quantity_returned + item.quantity_used);
                              if (remaining < usedQty) { toast.error(`Maximum is ${remaining}`); return }
                              if (item.quantity_allocated - item.quantity_returned - item.quantity_used > 0) handleMarkUsed(item)
                              else toast.error("Not available remaining items to use")
                            }}>Mark Usedx</button>
                            <input
                              style={{ ...s.input, flex: 1, height: 26 }}
                              type="number"
                              min={1}
                              autoFocus
                              max={remaining}
                              placeholder="Used"
                              value={usedQty}
                              onChange={e => setUsedQty(parseInt(e.target.value))}
                            />

                          </div>

                        ) : item.quantity_allocated - item.quantity_returned - item.quantity_used - item.quantity_assigned + item.quantity_received_back > 0 ? (
                          <button style={{ backgroundColor: "transparent", padding: "4px 8px", color: "#3fb950", border: "1px solid #3fb950", borderRadius: 2 }} onClick={() => { setUsedQty(0); setAdjustingId(item.id) }}>
                            Mark Used
                          </button>
                        ) : (<span style={{ color: '#6b7280', fontSize: 12 }}>No available to mark as used</span>)}




                      </div>

                      <div style={{ display: 'flex', gap: 5 }}>
                        {item.quantity_remaining > 0 && adjustingIdForReturn === item.id ? (
                          <div style={{ display: 'flex', gap: 5 }}>

                            <input
                              style={{ ...s.input, flex: 1, height: 26 }}
                              type="number"
                              min={1}
                              autoFocus
                              max={remaining}
                              placeholder="Qty to return"
                              value={qtyToReturn}
                              onChange={e => setQtyToReturn(parseInt(e.target.value))}
                            />
                            <button style={{ backgroundColor: "transparent", padding: "4px 8px", color: "#d29922", border: "1px solid #d29922", borderRadius: 2 }} onClick={() => {
                              const remaining = (item.quantity_allocated + item.quantity_received_back) - (item.quantity_assigned + item.quantity_returned + item.quantity_used);
                              if (qtyToReturn === 0 || !qtyToReturn) { toast.error("Enter the amount"); setQtyToReturn(0); return }
                              if (remaining < qtyToReturn) { toast.error(`Maximum is ${remaining}`); setQtyToReturn(0); return }

                              handleReturnInSub(item)
                            }}>Return</button>
                          </div>) : item.quantity_allocated - item.quantity_returned - item.quantity_used - item.quantity_assigned + item.quantity_received_back > 0 ? (
                            <button style={{ backgroundColor: "transparent", padding: "4px 8px", color: "#d29922", border: "1px solid #d29922", borderRadius: 2 }} onClick={() => adjustingIdForReturn === item.id ? setAdjustingIdForReturn("") : setAdjustingIdForReturn(item.id)}>
                              Return
                            </button>
                          ) : (<span style={{ color: '#6b7280', fontSize: 12 }}>No available to return</span>)}



                      </div>

                    </div>

                    {/* Mark as used */}


                  </div>
                );
              })}
            </div>

            {/* Footer */}
            {
              allocatedItemsForSub?.length !== 0 && (
                <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                  <button style={s.btn} onClick={() => { setShowAllocated(false); setAdjustingId(""); setAdjustingIdForReturn(""); setMainAllocErr("") }}>Close</button>
                </div>
              )
            }


          </div>
        </div>
      )}

      {/* Add child project */}
      {showAddChild && (
        <div style={s.overlay} onClick={() => { setShowAddChild(false); setAddChildForm({ title: '', notes: '', location: '', contract_value: '' }); setAddChildErr('') }}>
          <div style={s.formPanel} onClick={e => e.stopPropagation()}>
            <p style={s.formTitle}>New child project under <em style={{ color: '#818cf8' }}>{subProject?.title}</em></p>
            {addChildErr && <div style={s.errBox}>{addChildErr}</div>}
            <div style={s.fieldGroup}>
              <label style={s.label}>Title *</label>
              <input style={s.input} value={addChildForm.title} autoFocus
                onChange={e => setAddChildForm(f => ({ ...f, title: e.target.value }))}
              />

              <label style={s.label}>Location *</label>
              <input style={s.input} value={addChildForm.location}
                onChange={e => setAddChildForm(f => ({ ...f, location: e.target.value }))}
              />


              <label style={s.label}>Contract Value *</label>
              <input type='number' style={s.input} value={addChildForm.contract_value}
                onChange={e => setAddChildForm(f => ({ ...f, contract_value: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAddChild()} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Notes</label>
              <textarea style={{ ...s.input, minHeight: 60, resize: 'vertical' }}
                value={addChildForm.notes} onChange={e => setAddChildForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={s.formRow}>
              <button style={s.btn} onClick={() => { setShowAddChild(false); setAddChildForm({ title: '', notes: '', location: '', contract_value: '' }); setAddChildErr('') }}>Cancel</button>
              <button style={s.btnLg} onClick={handleAddChild}>Add</button>
            </div>
          </div>
        </div>
      )}

      {
        errorTitle && (
          <div style={s.overlay} onClick={() => { }}>
            <div style={s.formPanel} onClick={e => e.stopPropagation()}>
              <p style={s.formTitle}>{errorTitle}</p>


              <div style={s.formRow}>
                <button style={s.btn} onClick={() => setErrorTitle("")}>OK</button>
              </div>
            </div>
          </div>
        )
      }
      {/* Return from project allocation */}
      {returning && (
        <div style={s.overlay} onClick={() => setReturning(null)}>
          <div style={s.formPanel} onClick={e => e.stopPropagation()}>
            <p style={s.formTitle}>Return to inventory — {returning.item_name}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
              Max: <strong style={{ color: '#f59e0b' }}>{returning.quantity_allocated - (returning.quantity_used + returning.quantity_returned + returning.quantity_assigned)} items</strong>
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

      {/* modal */}

      {
        showModal && (
          <div style={s.overlay}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <p style={s.modalTitle}>
                This Project has Child Projects
              </p>
              <div style={s.modalFooter}>
                <button style={s.btnPrimary} onClick={() => setShowModal(false)}>
                  Close
                </button>

              </div>
            </div>
          </div>
        )
      }

      {/* Mark used */}
      {showMarkUsedModal && markUsedAllocation && (
        <div style={s.overlay} onClick={() => { }}>
          <div style={s.formPanel} onClick={e => e.stopPropagation()}>
            <p style={s.formTitle}>Mark usedqq — {markUsedAllocation?.item_name}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
              Remaining to use : <strong style={{ color: '#e5e7eb' }}>{(markUsedAllocation?.quantity_allocated + markUsedAllocation?.quantity_received_back) - markUsedAllocation?.quantity_returned - markUsedAllocation?.quantity_used - markUsedAllocation?.quantity_assigned} items of {markUsedAllocation?.item_unit_size || "this item"}</strong>
            </p>
            <div style={s.fieldGroup}>
              <label style={s.label}>Quantity used</label>
              <input style={s.input} type="number" value={usedQty} autoFocus min={0}
                onChange={e => setUsedQty(parseInt(e.target.value) || 0)}
                onKeyDown={e => e.key === 'Enter' && handleMarkUsed(markUsedAllocation)} />
            </div>
            <div style={s.formRow}>
              <button style={s.btn} onClick={() => { setShowMarkUsedModal(false); setUsedQty(0); }}>Cancel</button>
              <button style={s.btnLg} onClick={() => handleMarkUsed(markUsedAllocation)}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}