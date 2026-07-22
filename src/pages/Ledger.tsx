import React, { useEffect, useState } from "react"
import { toast } from "react-toastify";

interface SubProject {
    id: string
    title: string
    location: string
    ledger_id: string
    status: string
}



interface LedgerRecord {
    id: string;
    project_id: string;
    sub_project_id: string;
    date: string; // 'YYYY-MM-DD'
    payment_given: number;
    balance_returned: number;
    balance_from_previous_day: number;
    balance_to_next_day: number;
    created_at: string;
    
    project_name?: string;
    sub_project_name?: string;
    
    completed_child_projects?: SubProject[];
}
const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
type FilterLevel = 'project' | 'sub_project' | 'child';

const PAGE_SIZE = 20;
const Ledger = () => {
    const [projects, setProjects] = useState<SubProject[]>();
    const [subProjects, setSubProjects] = useState<SubProject[]>();
    const [childProjects, setChildProjects] = useState<SubProject[]>();
    const [project, setProject] = useState<SubProject>();
    const [subProject, setSubProject] = useState<SubProject>();
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [editingMode, setEditingMode] = useState(false);

    const [form, setForm] = useState({
        project_level: "",
        project_id: "",
        sub_project_id: "",
        date: getTodayDateString(),
        today_payment: 0,
        returned_money: 0,
        completed_child_ids: [] as string[],
        completed_sub_ids: [] as string[],
        completed_project_ids: [] as string[],
    })
    const [ledgerData, setLedgerData] = useState<LedgerRecord[] | undefined>();
    const [recentLedger, setRecentLedger] = useState<LedgerRecord>();
    const [editingId, setEditingId] = useState<string>("");

    useEffect(() => {
        getAllIncompleteProjects()
        getRecentLedgerRecord()
    }, [])

    const childProjectsForLedgerId = async (id: string) => {
       try {
         const res = await window.api.ledger.getChildProjectsByLedgerId(id);
         if (res.success && res.data) {
             setRecentLedger(prev => {
                 if (!prev) return prev
                 return { ...prev, completed_child_projects: res.data }
             })
         }
       } catch (error) {
         console.log(error)
       }
    }
    const getRecentLedgerRecord = async () => {
       try {
         const res = await window.api.ledger.getRecentLedgerRecord();
         if (res.success && res.data) {
             setRecentLedger(res.data)
             await childProjectsForLedgerId(res.data.id)
         }
         else {
             console.log("No way")
         }
       } catch (error) {
         console.log(error)
       }
    }
    const getAllIncompleteProjects = async () => {
        const res = await window.api.projects.getAllIncompleteProjects();
        if (res.success) {
            setProjects(res.data)
        }
    }
    const getSubProjectsForSelectedProject = async (id: string) => {
        try {
            const res = await window.api.subProjects.getIncompleteSubProjectsByProject(id)
            if (res.success) {
                setSubProjects(res.data)
                console.log("incomplete projects for selected sub")
                console.log(res.data)
            }
        } catch (error) {
             console.log(error)
        }
    }
    const getChildProjectsForSelectedSubProject = async (id: string) => {
        try {
             const res = await window.api.childProjects.getIncompleteChildProjectsBySubProject(id)
        if (res.success) {
            setChildProjects(res.data)
           
        }
        } catch (error) {
            console.log(error)
        }
       
    }
    const getAllChildProjectsForSelectedSubProject = async (id: string) => {
        try {
             const res = await window.api.childProjects.getBySubProject(id)
        if (res.success) {
            setChildProjects(res.data)
           
        }
        } catch (error) {
             console.log(error)
        }
       
    }


    const [filterLevel, setFilterLevel] = useState<FilterLevel>('child');
    const todayCost = Number(form.today_payment || 0) - Number(form.returned_money || 0);

    const initialForm = {
        project_level: "",
        project_id: "",
        sub_project_id: "",
        date: "",
        today_payment: 0,
        returned_money: 0,
        completed_child_ids: [] as string[],
        completed_sub_ids: [] as string[],
        completed_project_ids: [] as string[],
    };

    const handleCancel = () => {
        setForm(initialForm);
        setChildProjects(undefined);
        setSubProjects(undefined);
        getAllIncompleteProjects();
        getRecentLedgerRecord();
    };

    const handleSave = async (projectLevel:string) => {
        if (!form.date || !form.today_payment) {
            toast.warn("Date, payment given are required.")
            return;
        }
        
        try {
                const res = await window.api.ledger.saveDay({
                projectLevel: projectLevel,
                date: form.date,
                paymentGiven: Number(form.today_payment),
                balanceReturned: Number(form.returned_money),
                completedChildIds: form.completed_child_ids,
                projectId: form.project_id,
                subProjectId: form.sub_project_id,
                completedSubIds:form.completed_sub_ids,
                completedProjectIds:form.completed_project_ids
            });

            if (res.success) {
                fetchLedgerData(page)
                getRecentLedgerRecord();
                handleCancel();
            } else {
                console.error('Save failed:', res.error);
            }
            
            
        } catch (err) {
            console.error('Failed to save ledger day:', err);
        }
    };

    const handleUpdate = async () => {
        if (!editingId) { toast.error("No id selected"); return }
        console.log(form);
        console.log(filterLevel);
        
      

        try {
            const res = await window.api.ledger.updateRecord(editingId, {
                date: form.date,
                projectLevel:filterLevel,
                paymentGiven: Number(form.today_payment),
                balanceReturned: Number(form.returned_money),
                completedChildIds: form.completed_child_ids,
                completedProjectIds:form.completed_project_ids,
                completedSubIds:form.completed_sub_ids,
                projectId: form.project_id,
                subProjectId: form.sub_project_id
            })
            if (res.success) {
                toast.success("Record updated successfully")
            } else {
                console.log(res)
                toast.error("Failed to update record")

            }
        } catch (error) {
            console.log(error)
        }

    }
    const fetchLedgerData = async (pageNum: number) => {
        try {
 const res = await window.api.ledger.getAllRecords(pageNum, PAGE_SIZE);

        if (res.success) {
            setLedgerData(res.data.rows);
            setTotalPages(res.data.totalPages);
        }
        } catch (error){
             console.log(error)
        }
       
    };

    useEffect(() => {
        fetchLedgerData(page);
    }, [page]);

    return (
        <div style={s.page} >
            <div style={s.form}>
                <div style={s.fieldBox}>
                    <label style={s.inputLabel}>Filter Level</label>

                    <div style={s.radioGroup}>
                        <label style={s.radioLabel}>
                            <input
                                type="radio"
                                name="filterLevel"
                                value="project"
                                checked={filterLevel === 'project'}
                                onChange={() => setFilterLevel('project')}
                            />
                            Project
                        </label>

                        <label style={s.radioLabel}>
                            <input
                                type="radio"
                                name="filterLevel"
                                value="sub_project"
                                checked={filterLevel === 'sub_project'}
                                onChange={() => setFilterLevel('sub_project')}
                            />
                            Sub Project
                        </label>

                        <label style={s.radioLabel}>
                            <input
                                type="radio"
                                name="filterLevel"
                                value="child"
                                checked={filterLevel === 'child'}
                                onChange={() => setFilterLevel('child')}
                            />
                            Child Project
                        </label>
                    </div>
                </div>

                <div style={s.fieldBox}>
                    <label htmlFor="date" style={s.inputLabel}>Date</label>
                    <input type="date" disabled={editingMode} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} value={form.date} style={s.input} />
                </div>
                <div style={s.fieldBox}>
                    <label htmlFor="payment" style={s.inputLabel}>Today Paid Amount</label>
                    <input type="number" onChange={e => setForm(prev => ({ ...prev, today_payment: Number(e.target.value) }))} value={form.today_payment} style={s.input} />
                </div>
                <div style={s.fieldBox}>
                    <label htmlFor="payment" style={s.inputLabel}>Returned today</label>
                    <input type="number" onChange={e => setForm(prev => ({ ...prev, returned_money: Number(e.target.value) }))} value={form.returned_money} style={s.input} />
                </div>



                {filterLevel === 'project' && (
                   <div>
                     <div>
                        {projects?.length === 0 ? (
                            <p>No Projects Available</p>
                        ) : (
                            projects?.map((p: SubProject, idx: number) => {
                                 const isChecked = form.completed_project_ids.includes(p.id);
                                 console.log(projects.length)
                                    const toggleChecked = () => {
                                        setForm(f => ({
                                            ...f,
                                            completed_project_ids: isChecked
                                                ? f.completed_project_ids.filter(id => id !== p.id)
                                                : [...f.completed_project_ids, p.id],
                                        }));
                                    };
                                return (
                                   <div key={idx} style={s.checkboxRow}>
                                            <input type="checkbox" id={p.id} checked={isChecked} onChange={toggleChecked} />
                                            <label style={s.inputLabel} htmlFor={p.id}>{p.title} at {p.location} currently {p.status}</label>
                                        </div>
                                )
                            })
                        )}
                    </div>
                    <div style={s.buttonRow}>
                            <button type="button" style={s.cancelButton} onClick={() => { handleCancel(), setEditingMode(false) }}>Cancel</button>
                            {
                                editingMode ? (

                                    <button type="button" style={s.saveButton} onClick={handleUpdate}>Save Changes</button>
                                ) : (

                                    <button type="button" style={s.saveButton} onClick={()=> {handleSave(filterLevel)}}>Save</button>
                                )
                            }
                        </div>
                   </div>
                )}

                {filterLevel === 'sub_project' && (
                    <div>
                        <div style={s.fieldBox}>
                            <label htmlFor="payment" style={s.inputLabel}>Select Project</label>



                            <select
                                style={s.input}
                                value={form.project_id}
                                onChange={e => {
                                    setForm(f => ({ ...f, project_id: e.target.value }))
                                    getSubProjectsForSelectedProject(e.target.value)
                                }}
                            >
                               
                                <option value="">Select Project...</option>
                                
                                {projects?.map(p => (
                                    <option key={p.id} value={ p.id  }>
                                        {p.title} at {p.location}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            {subProjects?.length === 0 ? (
                                <p>No Sub Projects Available</p>
                            ) : (
                                subProjects?.map((p: SubProject, idx: number) => {
                                     const isChecked = form.completed_sub_ids.includes(p.id);
                                    const toggleChecked = () => {
                                        setForm(f => ({
                                            ...f,
                                            completed_sub_ids: isChecked
                                                ? f.completed_sub_ids.filter(id => id !== p.id)
                                                : [...f.completed_sub_ids, p.id],
                                        }));
                                    };
                                    return (
                                        <div key={idx} style={s.checkboxRow}>
                                            <input type="checkbox" id={p.id} checked={isChecked} onChange={toggleChecked} />
                                            <label style={s.inputLabel} htmlFor={p.id}>{p.title} at {p.location} currently {p.status}</label>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                        <div style={s.buttonRow}>
                            <button type="button" style={s.cancelButton} onClick={() => { handleCancel(), setEditingMode(false) }}>Cancel</button>
                            {
                                editingMode ? (

                                    <button type="button" style={s.saveButton} onClick={handleUpdate}>Save Changes</button>
                                ) : (

                                    <button type="button" style={s.saveButton} onClick={()=> handleSave(filterLevel)}>Save</button>
                                )
                            }
                        </div>
                    </div>
                )}

                {filterLevel === 'child' && (
                    <div>
                        <div style={s.fieldBox}>
                            <label htmlFor="payment" style={s.inputLabel}>Select Project</label>
                            <select
                                disabled={editingMode}
                                style={s.input}
                                value={form.project_id}
                                onChange={e => {
                                    setForm(f => ({ ...f, project_id: e.target.value }))
                                    getSubProjectsForSelectedProject(e.target.value)
                                }}
                            >
                                <option disabled={editingMode} value="">Select Project...</option>
                                {projects?.map(p => (
                                    <option key={p.id} value={p.id}>
                                        { p.title} at { p.location}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={s.fieldBox}>
                            <label htmlFor="payment" style={s.inputLabel}>Select Sub Project</label>
                            <select
                                disabled={editingMode}
                                style={s.input}
                                value={form.sub_project_id}
                                onChange={e => {
                                    setForm(f => ({ ...f, sub_project_id: e.target.value }))
                                    if (editingMode) {
                                        getAllChildProjectsForSelectedSubProject(e.target.value)
                                    }
                                    getChildProjectsForSelectedSubProject(e.target.value)
                                }}
                            >
                                <option value="">Select Sub Project...</option>
                                {subProjects?.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.title} at {p.location}
                                    </option>
                                ))}
                            </select>
                        </div>



                        <div style={s.childProjectList}>
                            {childProjects?.length === 0 ? (
                                <p style={s.inputLabel}>No Child Projects Available</p>
                            ) : (
                                childProjects?.map((p: SubProject) => {
                                    const isChecked = form.completed_child_ids.includes(p.id);
                                    const toggleChecked = () => {
                                        setForm(f => ({
                                            ...f,
                                            completed_child_ids: isChecked
                                                ? f.completed_child_ids.filter(id => id !== p.id)
                                                : [...f.completed_child_ids, p.id],
                                        }));
                                    };

                                    return (
                                        <div key={p.id} style={s.checkboxRow}>
                                            <input type="checkbox" id={p.id} checked={isChecked} onChange={toggleChecked} />
                                            <label style={s.inputLabel} htmlFor={p.id}>{p.title} at {p.location} currently {p.status}</label>
                                        </div>
                                    );
                                })
                            )}
                        </div>




                        <div style={s.buttonRow}>
                            <button type="button" style={s.cancelButton} onClick={() => { handleCancel(), setEditingMode(false) }}>Cancel</button>
                            {
                                editingMode ? (

                                    <button type="button" style={s.saveButton} onClick={handleUpdate}>Save Changes</button>
                                ) : (

                                    <button type="button" style={s.saveButton} onClick={()=> handleSave(filterLevel)}>Save</button>
                                )
                            }
                        </div>
                    </div>
                )}

            </div>
            <div style={s.previewCard}>
                {form.project_id === "" && recentLedger ? (

                    <div>
                        <div style={s.previewHeader}>Recent Record</div>
                        <div style={s.previewRow}>
                            <span style={s.previewLabel}>Date</span>
                            <span style={s.previewValue}>{recentLedger.date || '—'}</span>
                        </div>

                        <div style={s.previewRow}>
                            <span style={s.previewLabel}>Balance From Previous Day</span>
                            <span style={s.previewValue}>
                                Rs. {Number(recentLedger.balance_from_previous_day || 0).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                        <div style={s.previewRow}>
                            <span style={s.previewLabel}>Payment Given</span>
                            <span style={s.previewValue}>
                                Rs. {Number(recentLedger.payment_given || 0).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>

                        <div style={s.previewRow}>
                            <span style={s.previewLabel}>Balance Returned</span>
                            <span style={s.previewValue}>
                                Rs. {Number(recentLedger.balance_returned || 0).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>

                        <div style={s.previewRow}>
                            <span style={s.previewLabel}>Total Cost</span>
                            <span style={s.previewValueHighlight}>
                                Rs. {((recentLedger.balance_from_previous_day + recentLedger.payment_given) - (recentLedger.balance_returned)).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>

                        <div style={s.previewRow}>
                            <span style={s.previewLabel}>Balance to Next Day</span>
                            <span style={s.previewValueHighlight}>
                                Rs. {recentLedger.balance_to_next_day.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>

                        <div style={s.previewDivider} />

                        <div style={s.previewLabel}>
                            Completed  {filterLevel?.split("_")[0].toUpperCase() ?? "CHILD"} Projects ({recentLedger.completed_child_projects?.length})
                        </div>
                        {recentLedger?.completed_child_projects?.length === 0 ? (
                            <p style={s.mutedText}>No Selected Child Projects</p>
                        ) : (
                            <ul style={s.previewList}>
                                {recentLedger?.completed_child_projects?.map(id => {
                                    return (
                                        <li key={id.id}>{id?.title ?? id.id}</li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                ) : (
                    <div>
                        <div style={s.previewHeader}>Record's Preview</div>

                        <div style={s.previewRow}>
                            <span style={s.previewLabel}>Date</span>
                            <span style={s.previewValue}>{form.date || '—'}</span>
                        </div>

                        <div style={s.previewRow}>
                            <span style={s.previewLabel}>Balance From Previous Day</span>
                            <span style={s.previewValue}>
                                Rs. {Number(recentLedger?.balance_from_previous_day || 0).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                        <div style={s.previewRow}>
                            <span style={s.previewLabel}>Payment Given</span>
                            <span style={s.previewValue}>
                                Rs. {Number(form.today_payment || 0).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>

                        <div style={s.previewRow}>
                            <span style={s.previewLabel}>Balance Returned</span>
                            <span style={s.previewValue}>
                                Rs. {Number(form.returned_money || 0).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>

                        <div style={s.previewRow}>
                            <span style={s.previewLabel}>Total Cost for Today</span>
                            <span style={s.previewValueHighlight}>
                                Rs. {todayCost.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>

                        <div style={s.previewRow}>
                            <span style={s.previewLabel}>Balance to Next Day</span>
                            <span style={s.previewValueHighlight}>
                                Rs. {form.returned_money.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>

                        <div style={s.previewDivider} />

                        <div style={s.previewLabel}>
                            Completed {filterLevel?.split("_")[0].toUpperCase() ?? "MAIN"}
                             ({filterLevel === "child" ? form.completed_child_ids.length : filterLevel === "sub_project" ? form.completed_sub_ids.length : form.completed_project_ids.length})
                        </div>

                        {filterLevel === "project" && form.completed_project_ids.length !== 0 && (
                            <ul style={s.previewList}>
                                {form.completed_project_ids.map((pr:string, idx:number)=>{
                                const project = projects?.find((p:SubProject)=> p.id === pr)
                                return <li key={idx}>{project?.title ?? pr}</li>;
                            })}
                            </ul>
                            
                        )}

                        
                        {filterLevel === "sub_project" && form.completed_sub_ids.length !== 0 && (
                            <ul style={s.previewList}>
                                { form.completed_sub_ids.map((pr:string, idx:number)=>{
                                const subProject = subProjects?.find((p:SubProject)=> p.id === pr)
                                return <li key={idx}>{subProject?.title ?? pr}</li>;
                            })}
                            </ul>
                           
                        )}


                           {filterLevel === "child" && form.completed_child_ids.length !== 0 && (
                            <ul style={s.previewList}>
                                {
                                     form.completed_child_ids.map((pr:string, idx:number)=>{
                                const childProject = childProjects?.find((p:SubProject)=> p.id === pr)
                                return <li key={idx}>{childProject?.title ?? pr}</li>;
                            })
                                }
                            </ul>
                           
                        )}

                        {form.completed_child_ids.length === 0 && form.completed_project_ids.length === 0 && form.completed_sub_ids.length === 0 && (
                              <p style={s.mutedText}>None selected yet</p>
                        )}

                       
                    </div>
                )}

            </div>
            {/* //////////////////////////////////////////////// */}
            <div style={s.wrapper}>
                <table style={s.table}>
                    <thead>
                        <tr>
                            <th style={s.th}></th>
                            <th style={s.th}>Date</th>

                            <th style={s.th}>Opening Balance</th>
                            <th style={s.th}>Payment Given</th>
                            <th style={s.th}>Balance Returned</th>
                            <th style={s.th}>Closing Balance</th>
                            <th style={s.th}>Cost</th>
                            <th style={s.th}>View Project</th>

                        </tr>
                    </thead>
                    <tbody>
                        {ledgerData?.map((r: LedgerRecord, idx: number) => (
                            <tr key={idx}>
                                <td style={s.td}>
                                    {idx !== 10 && (
                                        <button
                                            onClick={async () => {
    // Compute the level locally, don't rely on state for logic in this same handler
    let level: 'sub_project' | 'project' | 'child';
    console.log(r)
    if (r.project_id === null && r.sub_project_id === null) {
        level = 'project';
    } else if (r.project_id  && r.sub_project_id) {
        level = 'child';
    } else {
        level = 'sub_project';
    }
    setFilterLevel(level); // still update state, for the UI / other renders

    await getSubProjectsForSelectedProject(r.project_id);
    setEditingMode(true);
    setEditingId(r.id);
    await getAllChildProjectsForSelectedSubProject(r.sub_project_id);
   

    const ledgerRes = await window.api.ledger.getById(r.id);
    if (ledgerRes.success) {
        console.log("ledgerRes.data")
        console.log(ledgerRes.data)
        setRecentLedger(ledgerRes.data);
    }

    if(level === 'child'){
        const currentProject = await window.api.ledger.getProjectsByLedgerId(r.id)
        setProjects(currentProject.data)
        console.log("currentProject.data")
        console.log(currentProject.data)
        const currentSub = await window.api.ledger.getSubProjectsByLedgerId(r.id);
        setSubProjects(currentSub.data)
        console.log("currentSub.data")
        console.log(currentSub.data)
        
        
    } else if(level === "sub_project") {
        const currentProjects = await window.api.ledger.getProjectsByLedgerId(r.id)
        setProjects(currentProjects.data)
        const currentSubProjects = await window.api.ledger.getSubProjectsByLedgerId(r.id)
        setSubProjects(currentSubProjects.data)
    } else {
        const currentProjects = await window.api.ledger.getProjectsByLedgerId(r.id)
        setProjects(currentProjects.data)
    }

       const res = 
        level === "child" 
        ? await window.api.ledger.getChildProjectsByLedgerId(r.id)
        : level === "sub_project" ? await window.api.ledger.getSubProjectsByLedgerId(r.id)
        : await window.api.ledger.getProjectsByLedgerId(r.id);

    const completedIds = res.success && res.data
        ? res.data.map((c: SubProject) => c.id)
        : [];

    setForm(prev => ({
        ...prev,
        date: r.date,
        today_payment: r.payment_given,
        project_id: r.project_id,
        returned_money: r.balance_returned,
        sub_project_id: r.sub_project_id,
        completed_child_ids: level === 'child' ? completedIds : [],
        completed_sub_ids: level === 'sub_project' ? completedIds : [],
        completed_project_ids: level === 'project' ? completedIds : [],
    }));
}}
                                        >
                                            Edit
                                        </button>
                                    )}
                                </td>
                                <td style={s.td}> {r.date}</td>

                                <td style={s.td}>{r.balance_from_previous_day}</td>
                                <td style={s.td}>{r.payment_given}</td>
                                <td style={s.td}>{r.balance_returned}</td>
                                <td style={s.td}>{r.balance_to_next_day}</td>
                                <td style={s.td}>{r.balance_from_previous_day + r.payment_given - r.balance_returned}</td>
                                <td style={s.td}><button>View</button></td>

                            </tr>
                        ))}
                    </tbody>
                </table>
                <div style={s.pagination}>
                    <button
                        style={s.pageBtn}
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        Previous
                    </button>

                    <span style={s.pageInfo}>
                        Page {page} of {totalPages}
                    </span>

                    <button
                        style={s.pageBtn}
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>

        </div>
    )
}

const s: Record<string, React.CSSProperties> = {
    page: {
        display: "grid",
        gap: "10px",
        gridTemplateColumns: "minmax(80px, 1fr) minmax(80px, 1fr) minmax(150px, 3fr) ",
    },
    form: {
        display: "flex",
        width: "100%",
        flexDirection: "column",

        border: '1px solid var(--border-color, #333)',
        borderRadius: '10px',
        padding: '16px 20px',
    },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    formPanel: { background: '#111827', border: '1px solid #374151', borderRadius: 10, padding: 10, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' },
    formTitle: { fontSize: 15, fontWeight: 700, color: '#e5e7eb', margin: '0 0 18px' },
    pagination: {
        position: 'absolute',
        alignItems: 'center',
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
        gap: 12,
        marginBottom: 12,

    },
    pageBtn: {
        background: 'transparent',
        border: '1px solid #374151',
        padding: "4px 10px",
        color: 'var(--text-primary)',
        borderRadius: 6,

        fontSize: 14,
        cursor: 'pointer',
    },
    pageInfo: {
        margin: "0px 10px",
        fontSize: 14,
        color: 'var(--text-secondary)',
    },
    previewCard: {
        border: '1px solid var(--border-color, #333)',
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },


    previewHeader: {
        fontSize: '15px',
        fontWeight: 600,
        color: 'whitesmoke',
        marginBottom: '4px',
    },
    previewRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '14px',
    },
    previewLabel: {
        color: '#aaa',
    },
    previewValue: {
        color: 'whitesmoke',
    },
    previewValueHighlight: {
        color: '#4caf50',
        fontWeight: 600,
    },
    previewDivider: {
        height: '1px',
        backgroundColor: 'var(--border-color, #333)',
        margin: '4px 0',
    },
    previewList: {
        margin: 0,
        paddingLeft: '18px',
        color: 'whitesmoke',
        fontSize: '13px',
    },
    mutedText: {
        color: '#777',
        fontSize: '13px',
    },


    radioGroup: {
        display: 'flex',
        gap: '16px',
        marginTop: '6px',
    },
    radioLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        color: 'whitesmoke',
        cursor: 'pointer',
    },
    fieldBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginBottom: '16px',
    },

    inputLabel: {
        fontSize: '13px',
        fontWeight: 500,
        color: '#8B949E',
        letterSpacing: '0.2px',
    },

    input: {
        backgroundColor: '#21262D',
        border: '1px solid #30363D',
        borderRadius: '6px',
        padding: '8px 12px',
        fontSize: '14px',
        color: '#E6EDF3',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
    },

    checkboxRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 4px',
        borderBottom: '1px solid #21262D',
    },

    childProjectList: {
        maxHeight: '300px',
        overflowY: 'auto',
        border: '1px solid #21262D',
        borderRadius: '6px',
        padding: '4px 8px',
        marginBottom: '8px',

        // custom scrollbar, matching the pattern you built earlier
        scrollbarWidth: 'thin',
        scrollbarColor: '#30363D #161B22',
    },

    buttonRow: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '20px',
        // no change needed here — it now sits right after a bounded-height list
    },

    cancelButton: {
        backgroundColor: 'transparent',
        border: '1px solid #30363D',
        borderRadius: '6px',
        padding: '8px 18px',
        fontSize: '14px',
        color: '#C9D1D9',
        cursor: 'pointer',
    },

    saveButton: {
        backgroundColor: '#238636',
        border: '1px solid #2EA043',
        borderRadius: '6px',
        padding: '8px 18px',
        fontSize: '14px',
        fontWeight: 500,
        color: '#FFFFFF',
        cursor: 'pointer',
    },
    wrapper: {
        position: "relative",
        background: 'var(--bg-secondary, #1e1f24)',
        border: '1px solid var(--border-color, #2c2d33)',
        borderRadius: 10,
        padding: 20,
        color: 'var(--text-primary, #e8e8ec)',
        fontFamily: 'inherit',
    },
    headerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: 600,
        margin: 0,
        color: 'var(--text-primary, #e8e8ec)',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 15,
    },
    th: {
        textAlign: 'right',
        padding: '10px 12px',
        color: 'var(--text-secondary, #9a9ba3)',
        fontWeight: 500,
        borderBottom: '1px solid var(--border-color, #2c2d33)',
        whiteSpace: 'nowrap',
    },
    thLeft: {
        textAlign: 'left',
        padding: '10px 12px',
        color: 'var(--text-secondary, #9a9ba3)',
        fontWeight: 500,
        borderBottom: '1px solid var(--border-color, #2c2d33)',
        whiteSpace: 'nowrap',
    },
    td: {
        textAlign: 'right',
        padding: '10px 12px',
        borderBottom: '1px solid var(--border-color, #454546)',
        color: "#9a9ba3",
        verticalAlign: 'top',
    },

    tdLeft: {
        textAlign: 'left',
        padding: '10px 12px',
        borderBottom: '1px solid var(--border-color, #24252b)',
        verticalAlign: 'top',
    },
    rowToday: {
        background: 'rgba(122, 162, 255, 0.06)',
    },
    projectName: {
        fontWeight: 600,
        color: 'var(--text-primary, #e8e8ec)',
    },
    subProjectName: {
        fontSize: 12,
        color: 'var(--text-secondary, #9a9ba3)',
        marginTop: 2,
    },
    childTag: {
        display: 'inline-block',
        fontSize: 11,
        padding: '2px 7px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.06)',
        color: 'var(--text-secondary, #9a9ba3)',
        marginRight: 4,
        marginBottom: 4,
    },
    costPositive: {
        color: '#f0a35c',
        fontWeight: 600,
    },
    todayBadge: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.4,
        color: 'var(--accent-color, #7aa2ff)',
        border: '1px solid var(--accent-color, #7aa2ff)',
        borderRadius: 5,
        padding: '2px 6px',
        marginLeft: 8,
        textTransform: 'uppercase',
    },
    editBtn: {
        background: 'transparent',
        border: '1px solid var(--accent-color, #7aa2ff)',
        color: 'var(--accent-color, #7aa2ff)',
        borderRadius: 6,
        padding: '5px 12px',
        fontSize: 12,
        cursor: 'pointer',
    },
}

export default Ledger