// src/pages/Inventory.tsx
import { useState } from 'react'
import { useItems, type Item, type ItemInput } from '../hooks/useItems'
import ComboBox from '../components/ComboBox';
import { toast } from 'react-toastify';


const UNITS = ['units', 'meters', 'kg', 'liters', 'rolls', 'boxes', 'bags', 'pairs']
const emptyForm: ItemInput = { name: '', category: '', unit: 'units', quantity: 0, low_stock_threshold: 5, barcode: '', supplier: '', unit_price: 0, source:"local",unit_size:"" }

export default function Inventory() {
  const { items, categories, loading, error, search, createItem, updateItem, setQuantity, deleteItem } = useItems()

  const [filter, setFilter]         = useState('all')
  const [showForm, setShowForm]     = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [form, setForm]             = useState<ItemInput>(emptyForm)
  const [formError, setFormError]   = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [newQty, setNewQty]         = useState('')
    const [sku, setSku] = useState<string>('')
  

  // Filter items
  const lowStockIds = new Set(items.filter(i => i.quantity < i.low_stock_threshold).map(i => i.id))
  const filtered = filter === 'all'       ? items
                 : filter === 'low'       ? items.filter(i => lowStockIds.has(i.id))
                 : items.filter(i => i.category === filter)

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setFormError(null); setShowForm(true)}

  const openEdit = (item: Item) => {
    setEditingId(item.id)
    setForm({ name: item.name, category: item.category ?? '', source: item.source ?? '', unit: item.unit, quantity: item.quantity, low_stock_threshold: item.low_stock_threshold, barcode: item.barcode ?? '', supplier: item.supplier ?? '', unit_size: item.unit_size ?? '', unit_price: item.unit_price })
    setFormError(null); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setSku(''); setEditingId(null); setForm(emptyForm); setFormError(null) }

  const handleSave = async () => {
   
    
    if (!form.name.trim()) { setFormError('Item name is required'); return }
    if (!form.unit.trim()) { setFormError('Unit is required'); return }
    setSaving(true)
    console.log(form.unit_size)
    const err = editingId ? await updateItem(editingId, form) : await createItem(form)
    setSaving(false)
    if (err) { setFormError(err) } else { closeForm() }
  }

  const handleSetQty = async (id: string) => {
    const qty = parseFloat(newQty)
    if (isNaN(qty) || qty < 0) return
    await setQuantity(id, qty)
    toast.success("Quantity changed successfully")
    setAdjustingId(null); setNewQty('')
  }

  const handleDelete = async (id: string) => {
    const err = await deleteItem(id)
    if (err) alert(err)
    setDeletingId(null)
  }

const handleCreateSku = (cat: string, name: string, unit_size: string | undefined) => {
  const raw = `${cat}-${name}-${unit_size || ''}`.trim().toUpperCase();

  const final = raw
    .replace(/[^A-Z0-9]+/g, '-')  
    .replace(/-+/g, '-')          
    .replace(/^-|-$/g, '');        

  setSku(final);
  setForm(f => ({ ...f, barcode: final }));
  console.log(final);
};


  const field = (key: keyof ItemInput, autoFocus:Boolean, label: string, type = 'text', opts?: any) => (
    <div key={key}>
      <label style={s.label}>{label}</label>
      <input autoFocus={autoFocus} style={s.input} type={type} value={String(form[key] ?? '')}
        onChange={e => {
          setForm(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }));
          if(key === 'name' || key === 'category' || key === 'unit_size'){
            const cat = key === 'category' ? e.target.value : form.category ?? '';
            const name = key === 'name' ? e.target.value : form.name;
            const unit_size = key === 'unit_size' ? e.target.value : form.unit_size ?? '';
            handleCreateSku(cat, name, unit_size);
          }
        }}
        {...opts} />
    </div>
  )

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Inventory</h2>
          <p style={s.sub}>{items.length} items · <span style={{ color: lowStockIds.size > 0 ? '#dc2626' : '#16a34a' }}>{lowStockIds.size} low stock</span></p>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        
        <button style={s.btnPrimary} onClick={openAdd}>+ Add Item</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={s.filterBar}>
        <input style={{ ...s.search, flex:1 }} placeholder="Search items, barcode, supplier..." onChange={e => search(e.target.value)} />
        <div style={s.filters}>
          {['all', 'low', ...categories].map(cat => (
            <button key={cat} style={{ ...s.filterBtn, ...(filter === cat ? s.filterActive : {}) }} onClick={() => setFilter(cat)}>
              {cat === 'all' ? 'All' : cat === 'low' ? `⚠ Low stock (${lowStockIds.size})` : cat === "" ? "Uncategorized" : cat}
            </button>
          ))}
        </div>
      </div>

      {loading && <p style={s.muted}>Loading...</p>}
      {error   && <p style={s.err}>{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <div style={s.empty}>
          <p style={{ marginBottom: 12 }}>{filter === 'low' ? 'No low stock items.' : 'No items yet.'}</p>
          {filter === 'all' && <button style={s.btnPrimary} onClick={openAdd}>Add your first item</button>}
        </div>
      )}

      {/* Table */}
      <div style={s.listWrapper}>
      {filtered.length > 0 && (
        <div style={s.tableWrap}>
          <table style={{...s.table, position:"relative"}}>
            <thead style={{position:"sticky"}}>
              <tr>
                {['Name', 'Category', 'Unit', 'Quantity', 'Low stock at', 'Unit price', 'Unit size', 'SKU', ''].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map(item => {
                const isLow = lowStockIds.has(item.id)
                return (
                  <tr key={item.id} style={isLow ? { background: '#f82500' } : {}}>
                    <td style={s.td}>
                      <span style={{ fontWeight: 500 }}>{item.name}</span>
                      {item.supplier && <span style={{ display:'block', fontSize:11, color:'#9ca3af' }}>{item.supplier}</span>}
                    </td>
                    <td style={s.td}>{item.category ?? <span style={{ color:'#d1d5db' }}>—</span>}</td>
                    <td style={s.td}>{item.unit}</td>
                    <td style={s.td}>
                      {adjustingId === item.id ? (
                        <span style={{ display:'flex',color:"#d1d5db", gap:4, alignItems:'center' }}>
                          <input style={{ ...s.input, color:"#d1d5db", width:70, padding:'4px 8px' }} type="number" value={newQty}
                            onChange={e => setNewQty(e.target.value)} autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleSetQty(item.id); if (e.key === 'Escape') setAdjustingId(null) }} />
                          <button style={s.btnSm} onClick={() => handleSetQty(item.id)}>Set</button>
                          <button style={s.btnSm} onClick={() => setAdjustingId(null)}>✕</button>
                        </span>
                      ) : (
                        <span style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <span style={{ color: isLow ? 'color:"#d1d5db",' : undefined, fontWeight: isLow ? 600 : 400 }}>
                            {item.quantity}
                          </span>
                          {isLow && <span style={{...s.lowBadge, color:"#ffffff",}}>Low</span>}
                          <button style={{ ...s.btnSm, fontSize:11, padding:'2px 7px' }}
                            onClick={() => { setAdjustingId(item.id); setNewQty(String(item.quantity)) }}>
                            Adjust
                          </button>
                        </span>
                      )}
                    </td>
                    <td style={s.td}>{item.low_stock_threshold}</td>
                    <td style={s.td}>Rs <span style={{textAlign:'right'}}>{item.unit_price.toFixed(2)}</span></td>
                    <td style={s.td}>{item?.unit_size ?? ""}</td>
                    <td style={s.td}>{item.barcode ?? <span style={{ color:'#d1d5db' }}>—</span>}</td>
                    <td style={{ ...s.td, textAlign:'right' }}>
                      <span style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                        <button style={s.btnSm} onClick={() => openEdit(item)}>Edit</button>
                        {deletingId === item.id ? (
                          <>
                            <button style={s.btnDanger} onClick={() => handleDelete(item.id)}>Yes, delete</button>
                            <button style={s.btnSm} onClick={() => setDeletingId(null)}>Cancel</button>
                          </>
                        ) : (
                          <button style={s.btnSm} onClick={() => setDeletingId(item.id)}>Delete</button>
                        )}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
      

      {/* Modal */}
      {showForm && (
  <div style={s.overlay}>
    <div style={s.modal} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={s.modalTitle}>{editingId ? 'Edit Item' : 'New Item'}</h3>
        <button style={s.btnSm} onClick={closeForm} disabled={saving}>Close</button>
      </div>

      {formError && <p style={s.err}>{formError}</p>}

      {/* Row 1: Name + Category */}
      <div style={s.grid2}>
        {field('name', true, 'Name *')}
        <div>
          <label style={s.label}>Category</label>
          <ComboBox
            value={form.category ?? ''}
            options={categories}
            onChange={val => setForm(f => ({ ...f, category: val }))}
            placeholder="e.g. pipes, valves, pumps..."
          />
        </div>
      </div>

      {/* Row 2: Unit + Unit size */}
      <div style={s.grid2}>
        <div>
          <label style={s.label}>Unit *</label>
          <select style={s.input} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label style={s.label}>Unit size</label>
          <input
            style={s.input}
            type='text'
            placeholder="60m..."
            value={form.unit_size || ''}
            onChange={e => {
              setForm(f => ({ ...f, unit_size: e.target.value }));
              handleCreateSku(e.target.value, form.name, form.category);
            }}
          />
        </div>
      </div>

      {/* Row 3: Unit price + Quantity */}
      <div style={s.grid2}>
        {field('unit_price', false, 'Unit price (Rs)', 'number')}
        {field('quantity',false, 'Initial quantity', 'number')}
      </div>

      {/* Row 4: Alert threshold + SKU */}
      <div style={s.grid2}>
        {field('low_stock_threshold', false, 'Alert when below', 'number')}
        <div style={{
          width: '100%', marginTop: 32, padding: '6px 12px', fontSize: 14,
          border: '1px solid #e5e7eb', borderRadius: 6, boxSizing: 'border-box'
        }}>
          <span style={{ color: '#ffffff', fontStyle: 'italic' }}>
            {sku ? sku : <span style={{ color: '#ffffff', fontStyle: 'italic' }}>SKU will be generated here</span>}
          </span>
        </div>
      </div>

      {/* Row 5: Supplier */}
      <div style={s.grid2}>
        {field('supplier', false,'Supplier')}
      </div>

      <div style={s.modalActions}>
        <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Item'}
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
listWrapper:{
     overflowY: 'auto',
  height: 'calc(100vh - 180px)',
  },
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
    color: 'var(--text)'
  },

  sub: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginTop: 3
  },

  filterBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16
  },

  search: {
    padding: '10px 14px',
    fontSize: 14,
    border: '1px solid var(--border)',
    borderRadius: 8,
    boxSizing: 'border-box',
    background: 'var(--surface)',
    color: 'var(--text)',
    outline: 'none'
  },

  filters: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap'
  },

  filterBtn: {
    padding: '5px 12px',
    fontSize: 12,
    border: '1px solid var(--border)',
    borderRadius: 20,
    background: 'var(--surface)',
    cursor: 'pointer',
    color: 'var(--text-muted)'
  },

  filterActive: {
    background: 'var(--primary)',
    color: '#fff',
    borderColor: 'var(--primary)'
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

  tableWrap: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
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
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface-2)'
  },

  td: {
    padding: '12px 14px',
    borderBottom: '1px solid var(--border)',
    fontSize: 14,
    verticalAlign: 'middle',
    color: 'var(--text)'
  },

  lowBadge: {
    fontSize: 12,
    padding: '1px 6px',
    borderRadius: 10,
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    fontWeight: 600
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
    padding: '5px 10px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
    cursor: 'pointer',
    color: 'var(--text)'
  },

  btnDanger: {
    padding: '5px 10px',
    background: 'var(--danger)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
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
    background: 'var(--surface)',
    borderRadius: 12,
    padding: 28,
    width: '100%',
    maxWidth: 540,
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    maxHeight: '90vh',
    overflowY: 'auto',
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
    marginTop: 20
  },

  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12
  },

  closeBtn: {
    borderRadius: 10,
    padding: '4px 8px',
    background: 'var(--surface-3)',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--danger)',
    fontSize: 12
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
