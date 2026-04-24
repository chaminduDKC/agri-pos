// src/pages/Inventory.tsx
import { useState } from 'react'
import { useItems, type Item, type ItemInput } from '../hooks/useItems'
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import ComboBox from '../components/ComboBox';


const UNITS = ['units', 'meters', 'kg', 'liters', 'rolls', 'boxes', 'bags', 'pairs']
const emptyForm: ItemInput = { name: '', category: '', unit: 'units', quantity: 0, low_stock_threshold: 5, barcode: '', supplier: '', unit_price: 0 }

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
  const [category, setCategory]     = useState('')
    const [sku, setSku] = useState<string>('')
  

  // Filter items
  const lowStockIds = new Set(items.filter(i => i.quantity < i.low_stock_threshold).map(i => i.id))
  const filtered = filter === 'all'       ? items
                 : filter === 'low'       ? items.filter(i => lowStockIds.has(i.id))
                 : items.filter(i => i.category === filter)

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setFormError(null); setShowForm(true)}

  const openEdit = (item: Item) => {
    setEditingId(item.id)
    setForm({ name: item.name, category: item.category ?? '', unit: item.unit, quantity: item.quantity, low_stock_threshold: item.low_stock_threshold, barcode: item.barcode ?? '', supplier: item.supplier ?? '', unit_price: item.unit_price })
    setFormError(null); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setSku(''); setEditingId(null); setForm(emptyForm); setFormError(null) }

  const handleSave = async () => {
    console.log(category);
    
    if (!form.name.trim()) { setFormError('Item name is required'); return }
    if (!form.unit.trim()) { setFormError('Unit is required'); return }
    setSaving(true)
    const err = editingId ? await updateItem(editingId, form) : await createItem(form)
    setSaving(false)
    if (err) { setFormError(err) } else { closeForm() }
  }

  const handleSetQty = async (id: string) => {
    const qty = parseFloat(newQty)
    if (isNaN(qty) || qty < 0) return
    await setQuantity(id, qty)
    setAdjustingId(null); setNewQty('')
  }

  const handleDelete = async (id: string) => {
    const err = await deleteItem(id)
    if (err) alert(err)
    setDeletingId(null)
  }

const handleCreateSku = (cat: string, name: string) => {
  const raw = `${cat}-${name}`.trim().toUpperCase();

  const final = raw
    .replace(/[^A-Z0-9]+/g, '-')  
    .replace(/-+/g, '-')          
    .replace(/^-|-$/g, '');        

  setSku(final);
  setForm(f => ({ ...f, barcode: final }));
  console.log(final);
};


  const field = (key: keyof ItemInput, label: string, type = 'text', opts?: any) => (
    <div key={key}>
      <label style={s.label}>{label}</label>
      <input style={s.input} type={type} value={String(form[key] ?? '')}
        onChange={e => {
          setForm(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }));
          if(key === 'name' || key === 'category'){
            const cat = key === 'category' ? e.target.value : form.category ?? '';
            const name = key === 'name' ? e.target.value : form.name;
            handleCreateSku(cat, name);
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
              {cat === 'all' ? 'All' : cat === 'low' ? `⚠ Low stock (${lowStockIds.size})` : cat}
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
      {filtered.length > 0 && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Name', 'Category', 'Unit', 'Quantity', 'Low stock at', 'Unit price', 'SKU', ''].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const isLow = lowStockIds.has(item.id)
                return (
                  <tr key={item.id} style={isLow ? { background: '#fef2f2' } : {}}>
                    <td style={s.td}>
                      <span style={{ fontWeight: 500 }}>{item.name}</span>
                      {item.supplier && <span style={{ display:'block', fontSize:11, color:'#9ca3af' }}>{item.supplier}</span>}
                    </td>
                    <td style={s.td}>{item.category ?? <span style={{ color:'#d1d5db' }}>—</span>}</td>
                    <td style={s.td}>{item.unit}</td>
                    <td style={s.td}>
                      {adjustingId === item.id ? (
                        <span style={{ display:'flex', gap:4, alignItems:'center' }}>
                          <input style={{ ...s.input, width:70, padding:'4px 8px' }} type="number" value={newQty}
                            onChange={e => setNewQty(e.target.value)} autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleSetQty(item.id); if (e.key === 'Escape') setAdjustingId(null) }} />
                          <button style={s.btnSm} onClick={() => handleSetQty(item.id)}>Set</button>
                          <button style={s.btnSm} onClick={() => setAdjustingId(null)}>✕</button>
                        </span>
                      ) : (
                        <span style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <span style={{ color: isLow ? '#dc2626' : undefined, fontWeight: isLow ? 600 : 400 }}>
                            {item.quantity}
                          </span>
                          {isLow && <span style={s.lowBadge}>Low</span>}
                          <button style={{ ...s.btnSm, fontSize:11, padding:'2px 7px' }}
                            onClick={() => { setAdjustingId(item.id); setNewQty(String(item.quantity)) }}>
                            Adjust
                          </button>
                        </span>
                      )}
                    </td>
                    <td style={s.td}>{item.low_stock_threshold}</td>
                    <td style={s.td}>Rs {item.unit_price.toFixed(2)}</td>
                    <td style={s.td}><code style={{ fontSize:11 }}>{item.barcode ?? <span style={{ color:'#d1d5db' }}>—</span>}</code></td>
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

      {/* Modal */}
      {showForm && (
        <div style={s.overlay} >
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 ,}}>
              <h3 style={s.modalTitle}>{editingId ? 'Edit Item' : 'New Item'}</h3>
              <button style={s.btnSm} onClick={closeForm} disabled={saving}>Close</button>
            </div>
            
            {formError && <p style={s.err}>{formError}</p>}
            <div style={s.grid2}>
              {field('name', 'Name *')}
              <div>
                <label style={s.label}>Category</label>
                <ComboBox
                  value={form.category ?? ''}
                  options={categories}
                  onChange={val => {
                    setForm(f => ({ ...f, category: val }))
                    handleCreateSku(val, form.name);
                  }}
                  placeholder="e.g. pipes, valves, pumps..."
                />
              </div>
            </div>
            <div style={s.grid2}>
              <div>
                <label style={s.label}>Unit *</label>
                <select style={s.input} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              {field('quantity', 'Initial quantity', 'number')}
            </div>
            <div style={s.grid2}>
              {field('low_stock_threshold', 'Alert when below', 'number')}
              {field('unit_price', 'Unit price (Rs)', 'number')}
            </div>
            <div style={s.grid2}>
              
              <div style={{
                width:'100%', marginTop:32, padding:'6px 12px', fontSize:14, border:'1px solid #e5e7eb', borderRadius:6, boxSizing:'border-box'
              }}>
                
                {sku ? sku : <span style={{ color:'#d1d5db', fontStyle:'italic' }}>SKU will be generated based on category and name</span>}
              </div>
              {field('supplier', 'Supplier')}
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
  page:        { maxWidth: 1100 },
  header:      { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 },
  title:       { fontSize:22, fontWeight:600, margin:0 },
  sub:         { fontSize:13, color:'#888', marginTop:3 },
  filterBar:   { display:'flex', flexDirection:'column', gap:8, marginBottom:16 },
  search:      { padding:'10px 14px', fontSize:14, border:'1px solid #e5e7eb', borderRadius:8, boxSizing:'border-box', background:'#fff' },
  filters:     { display:'flex', gap:6, flexWrap:'wrap' },
  filterBtn:   { padding:'5px 12px', fontSize:12, border:'1px solid #e5e7eb', borderRadius:20, background:'#fff', cursor:'pointer', color:'#374151' },
  filterActive:{ background:'#4f46e5', color:'#fff', borderColor:'#4f46e5' },
  muted:       { color:'#888', fontSize:14 },
  err:         { color:'#dc2626', fontSize:13, marginBottom:10 },
  empty:       { textAlign:'center', padding:'60px 0', color:'#9ca3af' },
  tableWrap:   { background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, overflow:'hidden' },
  table:       { width:'100%', borderCollapse:'collapse', fontSize:13 },
  th:          { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5, borderBottom:'1px solid #e5e7eb', background:'#f9fafb' },
  td:          { padding:'12px 14px', borderBottom:'1px solid #f3f4f6', verticalAlign:'middle' },
  lowBadge:    { fontSize:10, padding:'1px 6px', borderRadius:10, background:'#fee2e2', color:'#dc2626', fontWeight:600 },
  btnPrimary:  { padding:'9px 16px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:8, fontSize:13, cursor:'pointer', fontWeight:500 },
  btnSm:       { padding:'5px 10px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:6, fontSize:12, cursor:'pointer' },
  btnDanger:   { padding:'5px 10px', background:'#dc2626', color:'#fff', border:'none', borderRadius:6, fontSize:12, cursor:'pointer' },
  overlay:     { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  modal:       { background:'#fff', borderRadius:12, padding:28, width:'100%', maxWidth:540, boxShadow:'0 20px 60px rgba(0,0,0,0.12)', maxHeight:'90vh', overflowY:'auto' },
  modalTitle:  { fontSize:16, fontWeight:600, margin:'0 0 16px' },
  modalActions:{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 },
  grid2:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  closeBtn:    { borderRadius:10, padding:'4px 8px', background:'#f3f4f6', border:'none', cursor:'pointer', color:'#dc2626', fontSize:12 },
  label:       { display:'block', fontSize:12, fontWeight:500, color:'#374151', marginTop:12, marginBottom:4 },
  input:       { width:'100%', padding:'8px 12px', fontSize:14, border:'1px solid #e5e7eb', borderRadius:6, boxSizing:'border-box' },
}
