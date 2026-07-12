import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "react-toastify";


const s: Record<string, React.CSSProperties> = {

    page: { margin: '0 auto', display: 'flex', flexDirection: 'column', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' },
    header: { borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: "center", gap: 16, flexShrink: 0, paddingBottom: 10 },
    backBtn: { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13, padding: 0 },
    headerInfo: { flex: 1 },
    headerTitle: { margin: 0, fontSize: 17, fontWeight: 700, color: '#e5e7eb' },
    headerSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
    divider: {
        height: '1px',
        backgroundColor: '#21262D',
        border: 'none',
        margin: '2px 0',
    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    },

    amountInput: {
        backgroundColor: '#0D1117',
        border: '1px solid #30363D',
        borderRadius: '6px',
        color: '#E6EDF3',
        fontSize: '13px',
        padding: '8px 10px 8px 38px',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
    },
    amountWrap: {
        position: 'relative',
    },
    amountPrefix: {
        position: 'absolute',
        left: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#7D8590',
        fontSize: '12px',
        pointerEvents: 'none',
    },

    sectionLabel: {
        color: '#7D8590',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.07em',
        textTransform: 'uppercase' as const,
        margin: 0,
    },
    workerRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 11px',
        borderRadius: '7px',
        border: '1px solid #21262D',
    },
    workerRowActive: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 11px',
        borderRadius: '7px',
        border: '1px solid #238636',
    },
    workerInfo: {
        flex: 1,
        minWidth: 0,
    },
    workerName: {
        color: '#E6EDF3',
        fontSize: '13px',
        fontWeight: 500,
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    workerRole: {
        color: '#7D8590',
        fontSize: '11px',
        marginTop: '1px',
    },
    workerAmountWrap: {
        position: 'relative' as const,
        width: '110px',
        flexShrink: 0,
    },
    workerAmountInput: {
        width: '100%',
        border: '1px solid #30363D',
        borderRadius: '6px',
        color: '#E6EDF3',
        fontSize: '13px',
        padding: '6px 8px 6px 30px',
        outline: 'none',
        boxSizing: 'border-box' as const,
    },
    workerAmountInputDisabled: {
        width: '100%',
        backgroundColor: '#0D1117',
        border: '1px solid #21262D',
        borderRadius: '6px',
        color: '#3D444D',
        fontSize: '13px',
        padding: '6px 8px 6px 30px',
        outline: 'none',
        boxSizing: 'border-box' as const,
    },
    workerPrefix: {
        position: 'absolute' as const,
        left: '8px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#7D8590',
        fontSize: '11px',
        pointerEvents: 'none' as const,
    },
    twoCol: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
    },
    formRow: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        marginTop: '4px',
    },
    btn: {
        backgroundColor: 'transparent',
        border: '1px solid #30363D',
        borderRadius: '6px',
        color: '#8B949E',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        padding: '8px 16px',
    },
    btnLg: {
        backgroundColor: '#238636',
        border: '1px solid #2EA043',
        borderRadius: '6px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 600,
        padding: '8px 20px',
    },
    label: { display: 'block', fontSize: 11, color: '#9ca3af', marginBottom: 5, fontWeight: 500 },
    input: { width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #374151', borderRadius: 6, color: '#e5e7eb', padding: '8px 10px', fontSize: 13, outline: 'none' },
    expenseSection: {
        flex: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
    },
    salaryExpenseSection: {
        flex: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
    },
    expenseSectionTitle: {
        fontSize: 13,
        fontWeight: 600,
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        margin: 0,
    },
    expenseEmpty: {
        fontSize: 13,
        color: '#6b7280',
        padding: '16px 0',
        textAlign: 'center',
    },
    expenseList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxHeight: 500,
        overflowY: 'auto',
        paddingRight: 4,
    },
    expenseCard: {
        background: '#161B22',
        border: '1px solid #21262D',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    expenseCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    expenseDate: {
        fontSize: 12,
        color: '#9ca3af',
        fontWeight: 600,
        margin: 0,
    },
    expenseTotal: {
        fontSize: 14,
        fontWeight: 700,
        color: '#22c55e',
        margin: 0,
    },
    expenseGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
    },
    expenseItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
    },
    expenseItemLabel: {
        fontSize: 11,
        color: '#6b7280',
        margin: 0,
    },
    expenseItemValue: {
        fontSize: 13,
        color: '#e5e7eb',
        fontWeight: 500,
        margin: 0,
    },
    expenseOtherDesc: {
        fontSize: 11,
        color: '#6b7280',
        fontStyle: 'italic',
    },
    // add to your `s` object
    expenseCardActions: {
        display: 'flex',
        gap: 8,
        marginTop: 4,
        justifyContent: 'flex-end',
    },
    editBtn: {
        background: 'transparent',
        border: '1px solid #6366f1',
        color: '#6366f1',
        borderRadius: 6,
        padding: '5px 12px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background 0.15s ease',
    },
    deleteBtn: {
        background: 'transparent',
        border: '1px solid #7f1d1d',
        color: '#f87171',
        borderRadius: 6,
        padding: '5px 12px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background 0.15s ease',
    },
    // add to your `s` object
    salaryCardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 20,
    },
    salaryCardActions: {
        display: 'flex',
        gap: 8,
        marginLeft: 'auto',
    },
    // add to your `s` object
    summaryCard: {
        background: '#161B22',
        border: '1px solid #21262D',
        borderRadius: 10,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 420,
        marginTop: 20,
    },
    summaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 13,
        color: '#9ca3af',
        margin: 0,
    },
    summaryValue: {
        fontSize: 14,
        color: '#e5e7eb',
        fontWeight: 500,
        margin: 0,
    },
    summaryDivider: {
        height: '1px',
        backgroundColor: '#21262D',
        border: 'none',
        margin: '4px 0',
    },
    summaryTotalLabel: {
        fontSize: 13,
        color: '#e5e7eb',
        fontWeight: 600,
        margin: 0,
    },
    summaryTotalValue: {
        fontSize: 15,
        color: '#e5e7eb',
        fontWeight: 700,
        margin: 0,
    },
    summaryProfitRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        paddingTop: 12,
        borderTop: '1px solid #21262D',
    },
    summaryProfitLabel: {
        fontSize: 14,
        fontWeight: 700,
        margin: 0,
        color: '#e5e7eb',
    },
    summaryProfitValuePositive: {
        fontSize: 18,
        fontWeight: 800,
        margin: 0,
        color: '#22c55e',
    },
    summaryProfitValueNegative: {
        fontSize: 18,
        fontWeight: 800,
        margin: 0,
        color: '#f87171',
    },

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


}



interface SubProject {
    id: string; project_id: string; parent_id: string | null
    contract_value: number | null; location: string | null
    title: string; status: string; notes: string | null; level: number
}



interface ExpenseLog {
    id: string
    accommodation_amount: number
    created_at: string
    fuel_amount: number
    transport_amount: number
    food_amount: number
    is_deleted: number
    is_synced: number
    log_date: string
    notes: string | null
    other_amount: number
    other_description: string | null
    total_amount: number
}

interface ExpenseLogWorker {
    amount: number
    child_project_id: string | null
    created_at: string
    date_paid: string
    expense_log_id: string
    id: string
    is_deleted: number
    is_synced: number
    sub_project_id: string
    worker_id: string
}

const ProjectAnalytics = () => {

    const navigate = useNavigate()
    const [project, setProject] = useState<SubProject>()
    const [projectType, setProjectType] = useState<string>();
    const today = new Date().toISOString().split('T')[0]
    const [date, setDate] = useState(today)
    const [fuel, setFuel] = useState('')
    const [accommodation, setAccommodation] = useState('')
    const [transport, setTransport] = useState('')
    const [food, setFood] = useState('')
    const [otherDesc, setOtherDesc] = useState('')
    const [otherAmount, setOtherAmount] = useState('')
    const [workers, setWorkers] = useState<any[]>([])
    const [workerEntries, setWorkerEntries] = useState<any[]>([])
    const [expenseLogs, setExpenseLogs] = useState<ExpenseLog[]>([])
    const [expenseLogWorkers, setExpenseLogWorkers] = useState<ExpenseLogWorker[]>([])
    const [loading, setLoading] = useState(false);
    const [totalExpenses, setTotalExpenses] = useState<number>(0);
    const [salariesPaidForThisProject, setSalariesPaidForThisProject] = useState<number>(0);
    const [deletingId, setDeletingId] = useState<string | "">('')
    const [deleteLogType, setDeleteLogType] = useState<string | "">("");
    const [isDeleting, setIsDeleting] = useState(false);



    const { id } = useParams<{ id: string }>()

    const fetchExpenses = async (type: "Sub" | "Child") => {
        const res = type === "Sub"
            ? await window.api.expenses.getExpenseLogsBySubProject(id!)
            : await window.api.expenses.getExpenseLogsByChildProject(id!)

        if (res.success) {
            console.log("res.data")
            console.log(res.data)
            setExpenseLogs(res.data || [])
            setTotalExpenses(res.data?.reduce((acc, log) => acc + (log.total_amount || 0), 0) || 0)
        }
    }

    const fetchExpenseLogWorkersBySubProject = async () => {
        const res = await window.api.expenses.getExpenseLogWorkersBySubProject(id!)
        if (res.success) {
            setExpenseLogWorkers(res.data || [])
            setSalariesPaidForThisProject(res.data?.reduce((acc, log) => acc + (log.amount || 0), 0) || 0)
        }
    }


    const fetchExpenseLogWorkersByChildProject = async () => {
        const res = await window.api.expenses.getExpenseLogWorkersByChildProject(id!)
        if (res.success) {
            setExpenseLogWorkers(res.data || [])
            setSalariesPaidForThisProject(res.data?.reduce((acc, log) => acc + (log.amount || 0), 0) || 0)
        }
    }
    const fetchWorkers = async () => {
        const res = await window.api.workers.getAll();
        if (res.success) {
            setWorkers(res.data || [])
        }
    }

    // resolves and returns the type instead of only setting state
    const resolveProjectType = async (): Promise<"Sub" | "Child" | null> => {

        console.log("No id", id)

        const subRes = await window.api.subProjects.getById(id!)
        console.log(subRes)
        if (subRes.success && subRes.data) {
            setProject(subRes.data)
            setProjectType("Sub")
            console.log("Sub Project")
            return "Sub"
        }

        const childRes = await window.api.childProjects.getById(id!)
        console.log(childRes)
        if (childRes.success && childRes.data) {
            setProject(childRes.data)
            setProjectType("Child")
            console.log("Child Project")
            return "Child"
        }

        console.log("Null Project")
        return null
    }

    useEffect(() => {
        const load = async () => {
            const type = await resolveProjectType()
            if (!type) return

            fetchWorkers()
            fetchExpenses(type)
            if (type === 'Sub') {
                fetchExpenseLogWorkersBySubProject()
            }
            else {
                fetchExpenseLogWorkersByChildProject()
            }
        }
        load()
    }, [id])

    const clearFields = () => {
        setDate(today)
        setFuel('')
        setAccommodation('')
        setOtherDesc('')
        setOtherAmount('')

        setTransport("")
        setFood("")
    }
    useEffect(() => {
        setWorkerEntries(
            workers.map(w => ({ workerId: w.id, checked: false, amount: String(w.daily_rate) }))
        )
    }, [workers])

    const handleSubmit = async () => {
        setLoading(true);

        try {
            console.log("Submitting expense log", { date, fuel, accommodation, otherDesc, otherAmount, workerEntries, transport, food })
            setLoading(false);

            const res = await window.api.expenses.createExpenseLog({
                subProjectId: projectType === "Sub" ? project?.id : undefined,
                childProjectId: projectType === "Child" ? project?.id : undefined,
                logDate: date,
                fuelAmount: fuel ? Number(fuel) : 0,
                accommodationAmount: accommodation ? Number(accommodation) : 0,
                otherDescription: otherDesc || undefined,
                transportAmount: transport ? Number(transport) : 0,
                foodAmount: food ? Number(food) : 0,
                otherAmount: otherAmount ? Number(otherAmount) : 0,
                totalAmount: (Number(fuel || 0) + Number(accommodation || 0) + Number(otherAmount || 0) + Number(food || 0) + Number(transport || 0)),
                notes: undefined,
                expenseLogWorkers: workerEntries.filter(e => e.checked).map(e => ({
                    workerId: e.workerId,
                    amount: Number(e.amount),
                    paidDate: date
                }))

            });
            if (res.success) {
                setLoading(false);
                toast.success("Expense log created successfully")
                if (projectType === "Child") fetchExpenses("Child");
                if (projectType === "Sub") fetchExpenses("Sub")
                if (projectType === 'Sub') {
                    fetchExpenseLogWorkersBySubProject()
                }
                else {
                    fetchExpenseLogWorkersByChildProject()
                }
                clearFields();
            } else {
                toast.error(res.error || "Failed to create expense log");
                setLoading(false);

            }
        } catch (error) {
            toast.error("Something went wrong");
            setLoading(false);

            console.error(error);
        }


    }


    const toggleWorker = (idx: number) => {
        setWorkerEntries(prev => prev.map((e, i) => i === idx ? { ...e, checked: !e.checked } : e))
    }
    const setWorkerAmount = (idx: number, val: string) => {
        setWorkerEntries(prev => prev.map((e, i) => i === idx ? { ...e, amount: val } : e))
    }
    const handleEditExpenseLog = (log: ExpenseLog) => {
        console.log("Edit log", log)
    }

    const handleEditExpenseLogWorker = (log: ExpenseLogWorker) => {
        console.log("Edit log", log)
    }

    const handleDeleteExpenseLog = async (logId: string) => {
        try {
            const res = await window.api.expenses.deleteExpenseLog(logId);
            if (res.success) {
                toast.success("Expense log deleted successfully");
                if (projectType === "Child") fetchExpenses("Child");
                if (projectType === "Sub") fetchExpenses("Sub")
                if (projectType === 'Sub') {
                    fetchExpenseLogWorkersBySubProject()
                }
                else {
                    fetchExpenseLogWorkersByChildProject()
                }
            } else {
                toast.error(res.error || "Failed to delete expense log");
            }
        } catch (error) {
            toast.error("Something went wrong");
        }
    }

    const handleDeleteSalaryLog = async (logId: string) => {
        try {
            const res = await window.api.expenses.deleteExpenseLogWorker(logId);
            if (res.success) {
                toast.success("Salary log deleted successfully");
                if (projectType === "Child") fetchExpenses("Child");
                if (projectType === "Sub") fetchExpenses("Sub")
                if (projectType === 'Sub') {
                    fetchExpenseLogWorkersBySubProject()
                }
                else {
                    fetchExpenseLogWorkersByChildProject()
                }

            } else {
                toast.error(res.error || "Failed to delete salary log");
            }
        } catch (error) {
            toast.error("Something went wrong");
        }
    }

    const handleConfirmDelete = async () => {
        if (!deletingId || !deleteLogType) return;

        setIsDeleting(true);
        try {
            if (deleteLogType === "regular") {
                await handleDeleteExpenseLog(deletingId);
            } else if (deleteLogType === "salary") {
                await handleDeleteSalaryLog(deletingId);
            }
        } finally {
            setIsDeleting(false);
            setDeletingId("");
            setDeleteLogType("");
        }
    }

    const cancelDelete = () => {
        setDeletingId("");
        setDeleteLogType("");
    }
    return (


        <div style={s.page}>

            <div style={s.header}>
                <button style={s.backBtn} onClick={() => navigate(-1)}>← Projects</button>
                <div style={s.headerInfo}>
                    <h2 style={s.headerTitle}>{projectType === "Child" ? "Child Project " : "Sub Project "}: {project?.title}</h2>
                    <p style={s.headerTitle}>{project?.contract_value ? ` Rs ${project?.contract_value?.toLocaleString()}` : ''} - Location{project?.location ? ` · ${project?.location}` : ''}</p>
                </div>
                <p style={s.headerTitle}>Project expenses</p>
            </div>
            <div style={{ display: 'flex', gap: 12, padding: "10px", borderBottom: '1px solid #21262D' }}>
                <div style={{ flex: 1.3 }} >
                    <div style={s.fieldGroup}>
                        <label style={s.label}>Date *</label>
                        <input
                            type="date"
                            style={{ ...s.input, colorScheme: 'dark' } as React.CSSProperties}
                            value={date}
                            max={today}

                            onChange={e => setDate(e.target.value)}
                        />
                    </div>
                    <hr style={s.divider} />


                    {
                        workers.length === 0 ? (

                            <p style={s.sectionLabel}>No Workers Yet</p>
                        ) : (
                            <div>
                                <p style={s.sectionLabel}>Advance Payments for Workers</p>

                                {
                                    workers.map((entry, idx) => {
                                        return (
                                            <div key={entry.workerId} style={entry.checked ? s.workerRowActive : s.workerRow}>
                                                <input
                                                    type="checkbox"
                                                    checked={entry.checked}
                                                    onChange={() => toggleWorker(idx)}
                                                    style={{ width: 15, height: 15, accentColor: '#238636', cursor: 'pointer', flexShrink: 0 }}
                                                />
                                                <div style={s.workerInfo}>
                                                    <div style={s.workerName}>{entry.user_name}</div>
                                                    <div style={s.workerRole}>Rs. {entry.daily_rate.toLocaleString()}/day</div>
                                                </div>
                                                <div style={s.workerAmountWrap}>
                                                    <span style={s.workerPrefix}>Rs.</span>
                                                    <input
                                                        type="number"
                                                        value={entry.amount}
                                                        disabled={entry.checked}
                                                        onChange={e => setWorkerAmount(idx, e.target.value)}
                                                        style={entry.checked ? s.workerAmountInput : s.workerAmountInputDisabled}
                                                        min={0}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })
                                }


                            </div>

                        )
                    }
                    <hr style={s.divider} />
                    <p style={s.sectionLabel}>Expenses</p>
                    <div style={s.twoCol}>
                        <div style={s.fieldGroup}>
                            <label style={s.label}>Fuel</label>
                            <div style={s.amountWrap}>
                                <span style={s.amountPrefix}>Rs.</span>
                                <input type="number" placeholder="0.00" value={fuel} min={0}
                                    onChange={e => setFuel(e.target.value)} style={s.amountInput} />
                            </div>
                        </div>
                        <div style={s.fieldGroup}>
                            <label style={s.label}>Accommodation</label>
                            <div style={s.amountWrap}>
                                <span style={s.amountPrefix}>Rs.</span>
                                <input type="number" placeholder="0.00" value={accommodation} min={0}
                                    onChange={e => setAccommodation(e.target.value)} style={s.amountInput} />
                            </div>
                        </div>
                    </div>

                    <div style={s.twoCol}>
                        <div style={s.fieldGroup}>
                            <label style={s.label}>Transport</label>
                            <div style={s.amountWrap}>
                                <span style={s.amountPrefix}>Rs.</span>
                                <input type="number" placeholder="0.00" value={transport} min={0}
                                    onChange={e => setTransport(e.target.value)} style={s.amountInput} />
                            </div>
                        </div>
                        <div style={s.fieldGroup}>
                            <label style={s.label}>Foods</label>
                            <div style={s.amountWrap}>
                                <span style={s.amountPrefix}>Rs.</span>
                                <input type="number" placeholder="0.00" value={food} min={0}
                                    onChange={e => setFood(e.target.value)} style={s.amountInput} />
                            </div>
                        </div>
                    </div>


                    <hr style={s.divider} />
                    <p style={s.sectionLabel}>Other</p>
                    <div style={s.fieldGroup}>
                        <label style={s.label}>Description</label>
                        <input style={s.input} placeholder="e.g. Equipment rental"
                            value={otherDesc} onChange={e => setOtherDesc(e.target.value)} />
                    </div>
                    <div style={s.fieldGroup}>
                        <label style={s.label}>Amount</label>
                        <div style={s.amountWrap}>
                            <span style={s.amountPrefix}>Rs.</span>
                            <input type="number" placeholder="0.00" value={otherAmount} min={0}
                                onChange={e => setOtherAmount(e.target.value)} style={s.amountInput} />
                        </div>
                    </div>
                    <div style={s.formRow}>
                        <button style={s.btn} >Cancel</button>
                        <button style={s.btnLg} onClick={handleSubmit} disabled={loading}>
                            {loading ? "Saving..." : "Save log"}
                        </button>
                    </div>
                </div>


                {/* This Project Regular Expenses   */}

                <div style={s.expenseSection}>
                    <p style={s.expenseSectionTitle}>This Project Expenses</p>

                    {expenseLogs.length === 0 ? (
                        <div style={s.expenseEmpty}>No expense records found</div>
                    ) : (
                        <div style={s.expenseList}>
                            {expenseLogs.map((log: ExpenseLog, idx: number) => (
                                <div key={idx} style={s.expenseCard}>
                                    <div style={s.expenseCardHeader}>
                                        <p style={s.expenseDate}>{log.log_date}</p>
                                        <p style={s.expenseTotal}>Rs. {log.total_amount.toLocaleString("en-LK", {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                                    </div>

                                    <div style={s.expenseGrid}>
                                        <div style={s.expenseItem}>
                                            <p style={s.expenseItemLabel}>Fuel</p>
                                            <p style={s.expenseItemValue}>Rs. {log.fuel_amount?.toLocaleString("en-LK", {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                                        </div>
                                        <div style={s.expenseItem}>
                                            <p style={s.expenseItemLabel}>Accommodation</p>
                                            <p style={s.expenseItemValue}>Rs. {log.accommodation_amount?.toLocaleString("en-LK", {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                                        </div>
                                        <div style={s.expenseItem}>
                                            <p style={s.expenseItemLabel}>Transport</p>
                                            <p style={s.expenseItemValue}>Rs. {log.transport_amount?.toLocaleString("en-LK", {minimumFractionDigits:2, maximumFractionDigits:2})}</p>

                                        </div>
                                        <div style={s.expenseItem}>
                                            <p style={s.expenseItemLabel}>Foods</p>
                                            <p style={s.expenseItemValue}>Rs. {log.food_amount?.toLocaleString("en-LK", {minimumFractionDigits:2, maximumFractionDigits:2})}</p>

                                        </div>
                                        <div style={s.expenseItem}>
                                            <p style={s.expenseItemLabel}>Other</p>
                                            <p style={s.expenseItemValue}>Rs. {log.other_amount?.toLocaleString("en-LK", {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                                            {log.other_description && (
                                                <span style={s.expenseOtherDesc}>{log.other_description}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div style={s.expenseCardActions}>
                                        <button
                                            style={s.editBtn}
                                            onClick={() => handleEditExpenseLog(log)}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            style={s.deleteBtn}
                                            onClick={() => { setDeleteLogType("regular"); setDeletingId(log.id) }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>)}
                </div>


                {/* This Project Salary Expenses   */}
                <div style={s.salaryExpenseSection}>
                    <p style={s.expenseSectionTitle}>This Project Salary Expenses</p>

                    {expenseLogWorkers.length === 0 ? (
                        <div style={s.expenseEmpty}>No salary expense records found</div>
                    ) : (
                        <div style={s.expenseList}>
                            {expenseLogWorkers.map((log: ExpenseLogWorker, idx: number) => (
                                <div key={idx} style={s.expenseCard}>
                                    <div style={s.salaryCardHeader}>
                                        <div style={s.expenseItem}>
                                            <p style={s.expenseItemLabel}>Date</p>
                                            <p style={s.expenseDate}>{log.date_paid}</p>
                                        </div>

                                        <div style={s.expenseItem}>
                                            <p style={s.expenseItemLabel}>Name</p>
                                            <p style={s.expenseItemValue}>
                                                {workers.find((w) => w.id === log.worker_id)?.user_name || "Unknown Worker"}
                                            </p>
                                        </div>

                                        <div style={s.expenseItem}>
                                            <p style={s.expenseItemLabel}>Amount</p>
                                            <p style={s.expenseTotal}>Rs. {log.amount.toLocaleString("en-LK", {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                                        </div>

                                        <div style={s.salaryCardActions}>
                                            <button
                                                style={s.editBtn}
                                                onClick={() => handleEditExpenseLogWorker(log)}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)')}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                style={s.deleteBtn}
                                                onClick={() => { setDeleteLogType("salary"); setDeletingId(log.id) }}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)')}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>


            </div>

            {/* total area */}

            <div style={s.summaryCard}>
                <div style={s.summaryRow}>
                    <p style={s.summaryLabel}>Contract value for this project</p>
                    <p style={s.summaryValue}>Rs. {project?.contract_value?.toLocaleString("en-LK", {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                </div>

                <div style={s.summaryRow}>
                    <p style={s.summaryLabel}>Expenses for this project</p>
                    <p style={s.summaryValue}>Rs. {totalExpenses?.toLocaleString("en-LK", {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                </div>

                <div style={s.summaryRow}>
                    <p style={s.summaryLabel}>Salaries paid for this project</p>
                    <p style={s.summaryValue}>Rs. {salariesPaidForThisProject?.toLocaleString("en-LK", {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                </div>

                <hr style={s.summaryDivider} />

                <div style={s.summaryRow}>
                    <p style={s.summaryTotalLabel}>Total spent</p>
                    <p style={s.summaryTotalValue}>
                        Rs. {((totalExpenses ?? 0) + (salariesPaidForThisProject ?? 0)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>

                <div style={s.summaryProfitRow}>
                    <p style={s.summaryProfitLabel}>Net Profit</p>
                    <p style={
                        ((project?.contract_value ?? 0) - ((totalExpenses ?? 0) + (salariesPaidForThisProject ?? 0))) >= 0
                            ? s.summaryProfitValuePositive
                            : s.summaryProfitValueNegative
                    }>
                        Rs. {((project?.contract_value ?? 0) - ((totalExpenses ?? 0) + (salariesPaidForThisProject ?? 0))).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* overlays / delete modal */}
            {deletingId && deleteLogType && (
                <div style={s.overlay} onClick={cancelDelete}>
                    <div style={s.modal} onClick={e => e.stopPropagation()}>
                        <p style={s.modalTitle}>
                            {deleteLogType === "regular"
                                ? "Are you sure you want to delete this expense log?"
                                : "Are you sure you want to delete this salary payment?"}
                        </p>
                        <div style={s.modalFooter}>
                            <button style={s.btnPrimary} onClick={cancelDelete} disabled={isDeleting}>
                                Cancel
                            </button>
                            <button
                                style={{ ...s.btnPrimary, backgroundColor: '#dc2626', borderColor: '#fca5a5', opacity: isDeleting ? 0.6 : 1 }}
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

    )
}

export default ProjectAnalytics