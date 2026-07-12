// src/pages/Paysheets.tsx
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify';

interface Worker { id: string; user_name: string; daily_rate: number; fixed_salary: number ; overtime_rate:number; nic: string | null; phone: string | null }
interface AttendanceRecord { id: string; worker_id: string; worker_name: string; project_title: string; work_date: string; status: string; hours_worked: number; overtime_hours: number }
interface Paysheet { 
  id: string; worker_id: string; worker_name: string; 
  project_title: string | null; fixed_salary:number; period_start: string; 
  overtime_hours:number; overtime_rate:number;present_days:number; absent_days:number; half_days:number; salary_advance:number
  period_end: string; total_days: number; daily_rate: number; overtime_pay: number; 
  total_amount: number; status: string; created_at: string }
interface Summary { total_days: number; total_overtime: number; present_days: number; absent_days: number; half_days: number }
export interface WorkerPayment {
  amount: number;
  child_project_id: string | null;
  created_at: string;
  date_paid: string;
  expense_log_id: string;
  id: string;
  is_deleted: number;
  is_synced: number;
  sub_project_id: string;
  worker_id: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:    { bg: '#f3f4f6', color: '#374151' },
  approved: { bg: '#dcfce7', color: '#166534' },
  paid:     { bg: '#dbeafe', color: '#1e40af' },
}

interface AttendanceDetails{
  overtime_hours:number | 0
}
export default function Paysheets() {
  const [tab, setTab]             = useState<'paysheets' | 'attendance' | 'workers'>('paysheets')
  const [workers, setWorkers]     = useState<Worker[]>([])
  const [projects, setProjects]   = useState<{ id: string; title: string ; date:string}[]>([])
  const [paysheets, setPaysheets] = useState<Paysheet[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading]     = useState(true)

  // Worker form
  const [showWorkerForm, setShowWorkerForm] = useState(false)
  const [workerForm, setWorkerForm] = useState({ name: '', daily_rate: 0, nic: '', phone: '', address: '', fixed_salary:0, overtime_rate:0 })
  const [workerErr, setWorkerErr]   = useState<string | null>(null)

  // Attendance form
  const [attForm, setAttForm] = useState({ worker_id: '', project_id: '', work_date: new Date().toISOString().slice(0,10), status: 'present', overtime_hours: 0 })
  const [attErr, setAttErr]   = useState<string | null>(null)
  const [attProject, setAttProject] = useState('')

  // Paysheet generation
  const [genForm, setGenForm] = useState({ worker_id: '', project_id: '', period_start: '', period_end: '' })
  const [genSummary, setGenSummary] = useState<Summary | null>(null)
  const [genErr, setGenErr]   = useState<string | null>(null)

  const [workerPayments, setWorkerPayments] = useState<WorkerPayment[]>()
  const [attendanceDetails, setAttendaceDetails] = useState<AttendanceDetails[]>();

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [w, p, ps] = await Promise.all([
      window.api.workers.getAll(),
      window.api.projects.getAll(),
      window.api.paysheets.getAll(),
    ])
    if (w.success) console.log(w.data);  setWorkers(w.data ?? [])
    if (p.success)  {setProjects(p.data ?? []); console.log(p.data)}
    if (ps.success) {setPaysheets(ps.data ?? []); console.log(ps.data)}
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // Load attendance when project filter changes
  useEffect(() => {
    if (!attProject) { setAttendance([]); return }
    window.api.attendance.getByProject(attProject).then(res => {
      if (res.success) setAttendance(res.data ?? [])
    })
  }, [attProject])

  // Preview paysheet calculation
  const previewPaysheet = async () => {
    if (!genForm.worker_id || !genForm.period_start || !genForm.period_end) return
    getAttendanceByWorkerAndPeriod();
    const workerPaymentsRes = await window.api.expenses.getExpenseLogsByWorker(genForm.worker_id, genForm.period_start, genForm.period_end)
    console.log("workerPayments");
    console.log(workerPaymentsRes);
    setWorkerPayments(workerPaymentsRes?.data)
    
    const res = await window.api.attendance.getSummary(genForm.worker_id, genForm.period_start, genForm.period_end)
    if (res.success) console.log(res.data);setGenSummary(res.data)
  }

  // Save worker
  const saveWorker = async () => {
    if (!workerForm.name.trim())  { setWorkerErr('Name is required'); return }
    if (!workerForm.daily_rate && !workerForm.fixed_salary)   { setWorkerErr('Daily rate or Salary is required'); return }
    const res = await window.api.workers.create(workerForm)
    if (res.success) { toast.success("Worker created successfully"); setShowWorkerForm(false); setWorkerForm({ name:'', daily_rate:0, nic:'', phone:'', address:'' , fixed_salary:0, overtime_rate:0}); loadAll() }
    else {
      setWorkerErr(res.error ?? 'Failed')
      toast.error("Failed to create worker")
    }
  }

  const clearForm = ()=>{
    setAttForm({worker_id:"", project_id:"", overtime_hours:0, status:"", work_date:""});
  }
  // Mark attendance
  const markAttendance = async () => {
    if (!attForm.worker_id)  { setAttErr('Select a worker'); return }
    if (!attForm.project_id) { setAttErr('Select a project'); return }
    const res = await window.api.attendance.mark(attForm)
    if (res.success) {
      toast.success("Attendance marked successfully")
      clearForm()
      setAttErr(null)
      if (attProject === attForm.project_id) {
        window.api.attendance.getByProject(attProject).then(r => { if (r.success) setAttendance(r.data ?? []) })
      }
    } else setAttErr(res.error ?? 'Failed')
  }

  const getAttendanceByWorkerAndPeriod = async ()=>{
    if (!genForm.worker_id || !genForm.period_start || !genForm.period_end) return
    const res = await window.api.attendance.getByWorkerAndPeriod(genForm.worker_id, genForm.period_start, genForm.period_end);
    if(res.success){
      console.log("res.data")
      console.log(res.data)
      setAttendaceDetails(res.data)
    }

  }
  const overtimeHours = attendanceDetails?.reduce((total, rec)=> total + rec.overtime_hours, 0)
  // Generate paysheet
  const generatePaysheet = async () => {
    if (!genSummary) { setGenErr('Preview the summary first'); return }
    const worker = workers.find(w => w.id === genForm.worker_id)
    if (!worker) return
    const overtime_pay = worker.overtime_rate * genSummary.total_overtime
    const total = worker.fixed_salary ? worker.fixed_salary + (overtime_pay) : (worker.daily_rate * genSummary.total_days) + overtime_pay;
    console.log(genSummary)
    console.log(overtime_pay)
    console.log(total)
    
    const res = await window.api.paysheets.create({
      worker_id:    genForm.worker_id,
      project_id:   genForm.project_id || null,
      period_start: genForm.period_start,
      period_end:   genForm.period_end,
      total_days:   genSummary.total_days,
      half_days : genSummary?.half_days,
      absent_days: genSummary?.absent_days,
      present_days: genSummary?.present_days,
      salary_advance : salaryAdvance,
      daily_rate:   worker.daily_rate,
      overtime_rate:worker.overtime_rate,
      overtime_hours:overtimeHours,
      fixed_salary: worker.fixed_salary,
      overtime_pay: overtimeHours ? worker.overtime_rate * overtimeHours : 0,
      total_amount: total ,
    })
    if (res.success) {
      setPaysheets(prev => [res.data, ...prev])
      setGenSummary(null)
      setGenErr(null)
      setTab('paysheets')
    } else setGenErr(res.error ?? 'Failed')
  }

  const updatePaysheetStatus = async (id: string, status: string) => {
    const res = await window.api.paysheets.updateStatus(id, status)
    if (res.success) setPaysheets(prev => prev.map(p => p.id === id ? res.data : p))
  }

  const deletePaysheet = async (id: string) => {
    const res = await window.api.paysheets.delete(id)
    if (res.success) setPaysheets(prev => prev.filter(p => p.id !== id))
    else alert(res.error)
  }

  const deleteWorker = async (id: string) => {
    const res = await window.api.workers.delete(id)
    if(res.success) setWorkers(prev => prev.filter(w => w.id !== id))
      else alert(res.error)
  }
  const selectedWorker = workers.find(w => w.id === genForm.worker_id)
  const overtimePay    = genSummary && selectedWorker && selectedWorker?.overtime_rate * genSummary?.total_overtime
  const salaryAdvance  = workerPayments?.reduce((total, payment)=> total + payment.amount, 0)
  const totalAmount    = (selectedWorker?.fixed_salary ? selectedWorker.fixed_salary + overtimePay!  :  genSummary ? (genSummary.total_days * (selectedWorker?.daily_rate ?? 0)) + overtimePay! : 0) - salaryAdvance!



  const generatePdf = async (ps:Paysheet)=>{
    console.log(ps)
    const res = await window.api.generatePaysheetPdf(ps)
  }

  if (loading) return <p style={{ padding: 32, color: '#888' }}>Loading...</p>

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>Pay Sheets</h2>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {(['paysheets', 'attendance', 'workers'] as const).map(t => (
          <button key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── PAYSHEETS TAB ──────────────────────────────── */}
      {tab === 'paysheets' && (
        <div>
          {/* Generate form */}
          <div style={s.panel}>
            <p style={s.panelTitle}>Generate paysheet</p>
            <div style={s.grid3}>
              <div>
                <label style={s.label}>Worker</label>
                <select style={s.input} value={genForm.worker_id}
                  onChange={e => { setGenForm(f => ({ ...f, worker_id: e.target.value })); setGenSummary(null) }}>
                  <option value="">Select worker...</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.user_name} — Rs {w.daily_rate}/day</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Period start</label>
                <input style={s.input} type="date" value={genForm.period_start}
                  onChange={e => { setGenForm(f => ({ ...f, period_start: e.target.value })); setGenSummary(null) }} />
              </div>
              <div>
                <label style={s.label}>Period end</label>
                <input style={s.input} type="date" value={genForm.period_end}
                  onChange={e => { setGenForm(f => ({ ...f, period_end: e.target.value })); setGenSummary(null) }} />
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
              <button style={s.btnSecondary} onClick={previewPaysheet}>Preview from attendance</button>
              {genSummary && (
                <button style={s.btnPrimary} onClick={generatePaysheet}>Generate paysheet</button>
              )}
            </div>
            {genErr && <p style={s.err}>{genErr}</p>}

            {/* Preview summary */}
            {genSummary && selectedWorker && (
              <div style={s.summary}>
  <div style={s.summaryRow}><span>Present days</span><strong>{genSummary.present_days}</strong></div>
  <div style={s.summaryRow}><span>Half days</span><strong>{genSummary.half_days}</strong></div>
  <div style={s.summaryRow}><span>Absent days</span><strong>{genSummary.absent_days}</strong></div>
  <div style={s.summaryRow}><span>Total payable days</span><strong>{genSummary.total_days}</strong></div>
  <div style={s.summaryRow}><span>Overtime hours</span><strong>{genSummary.total_overtime}h</strong></div>
  <div style={{ ...s.summaryRow, borderTop: '1px solid #374151', paddingTop: 8, marginTop: 4 }}>
    {selectedWorker.fixed_salary ? (
      <span>Fixed salary</span>
    ) : (
      <span>Base pay ({genSummary.total_days} × Rs {selectedWorker.daily_rate})</span>
    )}
    <strong>
      Rs {(selectedWorker.fixed_salary ? selectedWorker.fixed_salary : genSummary.total_days * selectedWorker.daily_rate ).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}
    </strong>
  </div>
  <div style={s.summaryRow}>
    <span>Overtime pay</span>
    <strong>Rs {overtimePay?.toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</strong>
  </div>

<div style={s.summaryRow}>
    <strong>Deductions</strong>
  </div>

  <div style={s.summaryRow}>
    <span>Salary Advance</span>
    <strong>Rs {salaryAdvance?.toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</strong>
  </div>

  <div style={{ ...s.summaryRow, fontSize: 15,borderTop: '1px solid #374151', fontWeight: 700 }}>
    <span>Total</span>
    <span>Rs {totalAmount.toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
  </div>
</div>
            )}
          </div>

          {/* Paysheets list */}
          {paysheets.length === 0
            ? <p style={s.muted}>No paysheets yet. Generate one above.</p>
            : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Worker','Period','Days','Daily rate or Fixed Salary','OT Hours','OT rate','Present','Absent','Half','Advance', "Net Salary", 'Status', 'Action', 'PDF'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {paysheets.map(ps => {
                      const sc = STATUS_COLORS[ps.status]
                      return (
                        <tr key={ps.id}>
                          <td style={s.td}><strong>{ps.worker_name}</strong></td>
                          
                          <td style={s.td}><span style={{ fontSize:12 }}>{ps.period_start} → {ps.period_end}</span></td>
                          <td style={s.td}>{ps.total_days}</td>
                          <td style={s.td}>Rs {(ps.daily_rate === 0 ? ps.fixed_salary : ps.daily_rate).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                          <td style={s.td}>{ps.overtime_hours ?? 0}</td>
                          <td style={s.td}>Rs {ps.overtime_rate?.toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                          <td style={s.td}>{ps.present_days ?? 0}</td>
                          <td style={s.td}>{ps.absent_days ?? 0}</td>
                          <td style={s.td}>{ps.half_days ?? 0}</td>
                          <td style={{ ...s.td, fontWeight:600 }}>Rs {ps.salary_advance?.toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                          <td style={{ ...s.td, fontWeight:600 }}>Rs {(ps.total_amount - ps.salary_advance).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                          <td style={s.td}>
                            <select value={ps.status} onChange={e => updatePaysheetStatus(ps.id, e.target.value)}
                              style={{ fontSize:11, padding:'3px 8px', borderRadius:12, background: sc.bg, color: sc.color, border:'none', cursor:'pointer', appearance:'none' }}>
                              {['draft','approved','paid'].map(st => <option key={st} value={st}>{st.charAt(0).toUpperCase()+st.slice(1)}</option>)}
                            </select>
                          </td>
                          <td style={s.td}>
                            {ps.status === 'draft' &&
                              <button style={{ ...s.btnSm, color:'#dc2626' }} onClick={() => deletePaysheet(ps.id)}>Delete</button>
                            }
                          </td>
                          <td style={s.td}><button onClick={()=> generatePdf(ps)}>Generate PDF</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      )}

      {/* ── ATTENDANCE TAB ─────────────────────────────── */}
      {tab === 'attendance' && (
        <div>
          <div style={s.panel}>
            <p style={s.panelTitle}>Mark attendance</p>
            <div style={s.grid3}>
              <div>
                <label style={s.label}>Worker</label>
                <select style={s.input} value={attForm.worker_id} onChange={e => setAttForm(f => ({ ...f, worker_id: e.target.value }))}>
                  <option value="">Select...</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.user_name}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Project</label>
                <select style={s.input} value={attForm.project_id} onChange={e => setAttForm(f => ({ ...f, project_id: e.target.value }))}>
                  <option value="">Select...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Date</label>
                <input style={s.input} type="date" value={attForm.work_date} onChange={e => setAttForm(f => ({ ...f, work_date: e.target.value }))} />
              </div>
            </div>
            <div style={{ ...s.grid3, marginTop: 8 }}>
              <div>
                <label style={s.label}>Status</label>
                <select style={s.input} value={attForm.status} onChange={e => setAttForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="present">Present</option>
                  <option value="half-day">Half day</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Overtime hours</label>
                <input style={s.input} type="number" min="0" step="0.5" value={attForm.overtime_hours}
                  onChange={e => setAttForm(f => ({ ...f, overtime_hours: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div style={{ display:'flex', alignItems:'flex-end' }}>
                <button style={{ ...s.btnPrimary, width:'100%' }} onClick={markAttendance}>Mark</button>
              </div>
            </div>
            {attErr && <p style={s.err}>{attErr}</p>}
          </div>

          {/* Attendance log by project */}
          <div style={{display:"flex", gap:40}}>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>View attendance for project</label>
            <select style={{ ...s.input, maxWidth: 320 }} value={attProject} onChange={e => setAttProject(e.target.value)}>
              <option value="">Select project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
           <div style={{ marginBottom: 12 }}>
            <label style={s.label}>View attendance for date</label>
            <select style={{ ...s.input, maxWidth: 320 }} value={attProject} onChange={e => setAttProject(e.target.value)}>
              <option value="">Select project...</option>
              {attendance.map(p => <option key={p.id} value={p.id}>{p.work_date}</option>)}
            </select>
          </div>
          </div>

          {attendance.length > 0 && (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>{['Worker','Date','Status','Hours','Overtime',''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {attendance.map(a => (
                    <tr key={a.id}>
                      <td style={s.td}>{a.worker_name}</td>
                      <td style={s.td}>{a.work_date}</td>
                      <td style={s.td}>
                        <span style={{
                          fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:500,
                          background: a.status==='present' ? '#dcfce7' : a.status==='absent' ? '#fee2e2' : '#fef9c3',
                          color:      a.status==='present' ? '#166534' : a.status==='absent' ? '#991b1b' : '#854d0e',
                        }}>{a.status}</span>
                      </td>
                      <td style={s.td}>{a.hours_worked}h</td>
                      <td style={s.td}>{a.overtime_hours}h</td>
                      <td style={s.td}>
                        <button style={{ ...s.btnSm, fontSize:11, color:'#dc2626' }}
                          onClick={async () => {
                            await window.api.attendance.delete(a.id)
                            setAttendance(prev => prev.filter(r => r.id !== a.id))
                          }}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── WORKERS TAB ────────────────────────────────── */}
      {tab === 'workers' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <button style={s.btnPrimary} onClick={() => setShowWorkerForm(true)}>+ Add Worker</button>
          </div>

          {showWorkerForm && (

            <div style={s.overlay} onClick={()=> {setShowWorkerForm(false)}}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>

            <div style={{ ...s.panel, marginBottom: 16 }}>
              <p style={s.panelTitle}>New worker</p>
              {workerErr && <p style={s.err}>{workerErr}</p>}
              <div style={s.grid3}>
                <div>
                  <label style={s.label}>Full name *</label>
                  <input style={s.input} value={workerForm.name} autoFocus onChange={e => setWorkerForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label style={s.label}>Fixed Salary (Rs) *</label>
                  <input style={s.input} type="number" value={workerForm.fixed_salary} onChange={e => setWorkerForm(f => ({ ...f, fixed_salary: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label style={s.label}>Daily rate (Rs) *</label>
                  <input disabled={workerForm.fixed_salary ? true : false } style={s.input} type="number" value={workerForm.daily_rate} onChange={e => setWorkerForm(f => ({ ...f, daily_rate: parseFloat(e.target.value) || 0 }))} />
                </div>

                <div>
                  <label style={s.label}>Overtime rate (Rs) *</label>
                  <input style={s.input} type="number" value={workerForm.overtime_rate} onChange={e => setWorkerForm(f => ({ ...f, overtime_rate: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label style={s.label}>NIC</label>
                  <input style={s.input} value={workerForm.nic} onChange={e => setWorkerForm(f => ({ ...f, nic: e.target.value }))} />
                </div>
              </div>
              <div style={s.grid3}>
                <div>
                  <label style={s.label}>Phone</label>
                  <input style={s.input} value={workerForm.phone} onChange={e => setWorkerForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label style={s.label}>Address</label>
                  <input style={s.input} value={workerForm.address} onChange={e => setWorkerForm(f => ({ ...f, address: e.target.value }))} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <button style={s.btnPrimary} onClick={saveWorker}>Save worker</button>
                <button style={s.btnSm} onClick={() => setShowWorkerForm(false)}>Cancel</button>
              </div>
            </div>
            </div>
            </div>
          )}

          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>{['Name','Daily rate', "Fixed Salary", "Overtime Rate", 'NIC','Phone', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {workers.map(w => (
                  <tr key={w.id}>
                    <td style={s.td}><strong>{w?.user_name }</strong></td>
                    <td style={s.td}>Rs {w.daily_rate?.toLocaleString()}</td>
                    <td style={s.td}>Rs {w.fixed_salary?.toLocaleString()}</td>
                    <td style={s.td}>Rs {w.overtime_rate?.toLocaleString()}</td>
                    <td style={s.td}>{w.nic ?? <span style={{ color:'#d1d5db' }}>—</span>}</td>
                    <td style={s.td}>{w.phone ?? <span style={{ color:'#d1d5db' }}>—</span>}</td>
                    <td style={s.td} onClick={()=> {
                
                      deleteWorker(w.id)
                    }}>Delete</td>
                  </tr>
                ))}
                {workers.length === 0 && (
                  <tr><td colSpan={4} style={{ ...s.td, textAlign:'center', color:'#9ca3af', padding:32 }}>No workers yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
const s: Record<string, React.CSSProperties> = {
  page: { margin: '0 auto' },
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
    maxWidth: 520,
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid #2c3443'
  },
  header: { marginBottom: 16 },

  title: {
    fontSize: 22,
    fontWeight: 600,
    margin: 0,
    color: '#e5e7eb'
  },

  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 20,
    borderBottom: '1px solid #2c3443'
  },

  tab: {
    padding: '8px 16px',
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

  panel: {
    background: '#232a36',
    border: '1px solid #2c3443',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20
  },

  panelTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e5e7eb',
    margin: '0 0 12px'
  },

  summary: {
    marginTop: 16,
    padding: 14,
    background: '#1e2430',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },

  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: '#9ca3af'
  },

  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12
  },

  tableWrap: {
    background: '#232a36',
    border: '1px solid #2c3443',
    borderRadius: 10,
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
    fontSize: 11,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: '1px solid #2c3443',
    background: '#1e2430'
  },

  td: {
    padding: '11px 14px',
    borderBottom: '1px solid #2c3443',
    verticalAlign: 'middle',
    color: '#e5e7eb'
  },

  muted: {
    color: '#6b7280',
    fontSize: 14,
    padding: '20px 0'
  },

  err: {
    color: '#f87171',
    fontSize: 13,
    marginTop: 8
  },

  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: '#9ca3af',
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

  btnSecondary: {
    padding: '9px 16px',
    background: 'transparent',
    color: '#818cf8',
    border: '1px solid #818cf8',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer'
  },

  btnSm: {
    padding: '5px 10px',
    background: '#232a36',
    border: '1px solid #2c3443',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    color: '#e5e7eb'
  }
};
