import { useEffect, useState } from "react"
import { QuotationInput, QuotationItemInput, useQuotations } from "../hooks/useQuotations";




const emptyItem: QuotationItemInput = { item_name: '', quantity: 1, unit_price: 0, }
const emptyForm: QuotationInput = { client_id: '', project_id: '', status: 'draft', valid_until: '', notes: '', transport_installation: 0, items: [{ ...emptyItem }] }

const STATUSES = ['draft', 'sent', 'approved', 'rejected'] as const

export const QuotationForm = () => {
    const { createQuotation, updateQuotation, } = useQuotations()

    

    const [clients, setClients] = useState<{ id: string; name: string }[]>([])
    const [form, setForm] = useState<QuotationInput>(emptyForm)
    const [formError, setFormError] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)


    const [projects, setProjects] = useState<{ id: string; title: string; client_id: string }[]>([])
    const [inventoryItems, setInventoryItems] = useState<{ id: string; name: string; unit_price: number }[]>([])

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

    const clientProjects = projects.filter(p => p.client_id === form.client_id)
    const client = clients.find(cl => cl.id === form.client_id)
    const project = clientProjects.find(cp => cp.id === form.project_id)


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
    const closeForm = () => { setEditingId(null); setForm(emptyForm); setFormError(null) }

    const handleSave = async () => {
        if (!form.client_id) { setFormError('Client is required'); return }
        if (!form.items.length) { setFormError('Add at least one line item'); return }
        if (form.items.some(i => !i.item_name.trim())) { setFormError('All line items need a name'); return }
        //setSaving(true)
        console.log("form is ")
        console.log(form)

        console.log(form)
        const err = editingId
            ? await updateQuotation(editingId, form)
            : await createQuotation(form)
        setSaving(false)
        if (err) { setFormError(err) } else { closeForm() }
    }
    const lineTotal = (item: QuotationItemInput) =>
        (item.quantity * item.unit_price)
    const grandTotal = form.items.reduce((sum, item) => sum + lineTotal(item), 0)



    return (
        <div style={{ ...s.page, display: 'flex', gap: 40, }}>
            <div style={{flex:1}}>
                {formError && <p style={s.err}>{formError}</p>}
                <div style={s.grid2}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
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
                <div >
                    <label style={s.label} htmlFor="t&i">Transport & Installation</label>
                    <input value={form.transport_installation} onChange={(e) =>
                        setForm(f => ({
                            ...f,
                            transport_installation: parseFloat(e.target.value) || 0
                        }))
                    } style={{ ...s.input, width: "50%" }} id="t&i" type="number" />
                </div>

                {/* Line items */}
                <div style={{ marginTop: 20, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ ...s.label, marginTop: 0 }}>Line items *</label>
                    <button style={s.btnSm} onClick={addLine}>+ Add line</button>
                </div>

                <table style={s.table}>
                    <thead>
                        <tr>
                            {['Item', 'Qty', 'Unit price', 'Total', ''].map(h =>
                                <th key={h} style={s.th}>{h}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {form.items.map((item, i) => (
                            <tr key={i}>
                                <td style={s.td}>
                                    {/* Pick from inventory OR type custom name */}
                                    <select style={{ ...s.input, marginBottom: 4, fontSize: 12 }}
                                        value={item.item_id ?? ''}
                                        onChange={e => e.target.value ? pickInventoryItem(i, e.target.value) : updateLine(i, 'item_id', undefined)}>
                                        <option value="">Custom item...</option>
                                        {inventoryItems.map(inv => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                                    </select>
                                    <input style={{ ...s.input, fontSize: 12 }} autoFocus placeholder="Item name" value={item.item_name}
                                        onChange={e => updateLine(i, 'item_name', e.target.value)} />
                                </td>
                                <td style={s.td}>
                                    <input style={{ ...s.input, width: 60 }} type="number" value={item.quantity}
                                        onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td style={s.td}>
                                    <input style={{ ...s.input, width: 90 }} type="number" value={item.unit_price}
                                        onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)} onKeyDown={(e) => { if (e.key === "Enter") addLine(); if (e.key === "Delete") removeLine(i) }} />
                                </td>

                                <td style={{ ...s.td, fontWeight: 500, whiteSpace: 'nowrap' }}>
                                    {lineTotal(item).toLocaleString('en-LK', {
                                        style: 'currency',
                                        currency: 'LKR'
                                    })}
                                </td>
                                <td style={s.td}>
                                    {form.items.length > 0 &&
                                        <button style={{ ...s.btnSm, color: '#dc2626', borderColor: '#dc2626' }} onClick={() => removeLine(i)}>✕</button>
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>


                <div style={{ textAlign: 'right', fontSize: 15, color: "whitesmoke", fontWeight: 600, marginTop: 12 }}>
                    Total: {(grandTotal + form.transport_installation).toLocaleString('en-LK', {
                        minimumFractionDigits: 2, style: 'currency',
                        currency: 'LKR'
                    })}
                </div>

                <label style={s.label}>Notes</label>
                <textarea style={{ ...s.input, height: 60, resize: 'vertical' }}
                    value={form.notes ?? ''}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

                <div style={s.modalActions}>

                    <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Quotation'}
                    </button>
                </div>
            </div>
            <div style={{ marginTop: 20, flex: 1 }}>
                {form.items.length > -1 ? (
                    <div style={{ border: "1px solid whitesmoke", backgroundColor: "whitesmoke", padding: "10px 20px", borderRadius: "10px" }}>
                        <div>
                            <h1 style={{ textAlign: "center", fontSize: "40px", color: "#005C6F" }}>SOUTHERN GREENHOUSE</h1>

                        </div>
                        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                            <p>Client: <strong>{client?.name}</strong></p>
                            <p>Project: <strong>{project?.title}</strong></p>
                            <p>Valid Until: {form?.valid_until}</p>
                            <p>Status: <span style={{ backgroundColor: "#005C6F", color: "whitesmoke", borderRadius: "5px", padding: "2px 20px" }}>{form?.status}</span></p>
                        </div>

                       <table style={{...s.table, marginTop:"10px"}}>
                        <thead style={{backgroundColor:"green"}}>
                            <tr>
                                {["No" ,'Item', 'Qty', 'Unit Price (LKR)','Line Total (LKR)'].map(h =>
                    <th key={h} style={h === "Item" || h === "No" ? {...s.td, textAlign:"left"}  : {...s.td, textAlign:"right"}}>{h}</th>
                  )}
                            </tr>
                        </thead>
                        <tbody>
                            {form.items.map((item:any, idx:number)=>{
                                 const total = item.quantity * item.unit_price;
                            
                            return (
                                
                                 <tr key={item.id}>
                                    <td style={{...s.td, color:"black"}}>{idx+1}</td>
                    <td style={{...s.td, color:"black"}}>{item.item_name}</td>
                    <td style={{...s.td, textAlign:"right", color:"black"}}>{item.quantity}</td>
                    <td style={{...s.td, textAlign:"right", color:"black"}}>{parseFloat(item.unit_price).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                    <td style={{ ...s.td, fontWeight:500, display:"flex",  color:"black", justifyContent:"flex-end" }}>
                      
                    {(total).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </td>
                  </tr>
                            )})}
                        </tbody>

                       </table>
                        <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end"}}>

                            <p style={{display:"flex",gap:"20px"}}>
                            <span>Transport & Installation: </span>
                            <span>{form.transport_installation.toLocaleString('en-LK', {minimumFractionDigits:2 })}</span>
                             </p>
                        <p style={{display:"flex",gap:"20px"}}>
                            <span>Total: </span>
                            <span> {(grandTotal + form.transport_installation).toLocaleString('en-LK', { style: "currency", currency: "LKR" })}</span>
                           </p>
                        </div>
                        

                        <div style={{
                            backgroundColor: "#C2DFB5",
                            padding: "20px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center"
                        }}>
                            <p>Thank you for considering our services.</p>
                            <strong>This quotation is valid until {form.valid_until}</strong>
                        </div>
                    </div>
                ) : (
                    <h1>No items yet</h1>
                )}
            </div>
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

