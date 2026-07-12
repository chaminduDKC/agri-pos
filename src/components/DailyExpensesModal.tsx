import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Worker {
  id: string;
  name: string;
  role: string;
  daily_rate: number;
}

interface WorkerEntry {
  workerId: string;
  checked: boolean;
  amount: string;
}

interface OtherExpense {
  description: string;
  amount: string;
}

interface DailyExpensePayload {
  date: string;
  salary: { workerId: string; amount: number }[];
  fuel: number;
  accommodation: number;
  other: { description: string; amount: number }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DailyExpensePayload) => void;
  workers: Worker[];
  projectTitle?: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "16px",
  },
  modal: {
    backgroundColor: "#161B22",
    border: "1px solid #30363D",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "580px",
    maxHeight: "90vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "20px 24px 16px",
    borderBottom: "1px solid #21262D",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    backgroundColor: "#161B22",
    zIndex: 10,
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  headerTitle: {
    color: "#E6EDF3",
    fontSize: "16px",
    fontWeight: 600,
    margin: 0,
  },
  headerSub: {
    color: "#7D8590",
    fontSize: "12px",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#7D8590",
    cursor: "pointer",
    fontSize: "20px",
    lineHeight: 1,
    padding: "2px 4px",
    borderRadius: "4px",
  },
  body: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sectionDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  sectionLabel: {
    color: "#7D8590",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  sectionTotal: {
    marginLeft: "auto",
    color: "#3FB950",
    fontSize: "12px",
    fontWeight: 600,
  },
  divider: {
    height: "1px",
    backgroundColor: "#21262D",
    border: "none",
    margin: 0,
  },
  label: {
    color: "#8B949E",
    fontSize: "12px",
    fontWeight: 500,
    marginBottom: "4px",
    display: "block",
  },
  input: {
    width: "100%",
    backgroundColor: "#0D1117",
    border: "1px solid #30363D",
    borderRadius: "6px",
    color: "#E6EDF3",
    fontSize: "13px",
    padding: "8px 10px",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  amountInput: {
    width: "100%",
    backgroundColor: "#0D1117",
    border: "1px solid #30363D",
    borderRadius: "6px",
    color: "#E6EDF3",
    fontSize: "13px",
    padding: "8px 10px 8px 30px",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  amountWrap: {
    position: "relative" as const,
  },
  amountPrefix: {
    position: "absolute" as const,
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#7D8590",
    fontSize: "12px",
    pointerEvents: "none" as const,
  },
  // Worker rows
  workerRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    backgroundColor: "#0D1117",
    borderRadius: "8px",
    border: "1px solid #21262D",
  },
  workerRowActive: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    backgroundColor: "#0D1117",
    borderRadius: "8px",
    border: "1px solid #238636",
  },
  checkbox: {
    width: "16px",
    height: "16px",
    accentColor: "#238636",
    cursor: "pointer",
    flexShrink: 0,
  },
  workerInfo: {
    flex: 1,
    minWidth: 0,
  },
  workerName: {
    color: "#E6EDF3",
    fontSize: "13px",
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  workerRole: {
    color: "#7D8590",
    fontSize: "11px",
    marginTop: "1px",
  },
  workerAmountWrap: {
    position: "relative" as const,
    width: "110px",
    flexShrink: 0,
  },
  workerAmountInput: {
    width: "100%",
    backgroundColor: "#161B22",
    border: "1px solid #30363D",
    borderRadius: "6px",
    color: "#E6EDF3",
    fontSize: "13px",
    padding: "6px 8px 6px 24px",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  workerAmountInputDisabled: {
    width: "100%",
    backgroundColor: "#0D1117",
    border: "1px solid #21262D",
    borderRadius: "6px",
    color: "#3D444D",
    fontSize: "13px",
    padding: "6px 8px 6px 24px",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  workerPrefix: {
    position: "absolute" as const,
    left: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#7D8590",
    fontSize: "11px",
    pointerEvents: "none" as const,
  },
  // Other expense row
  otherRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  removeBtn: {
    background: "none",
    border: "1px solid #30363D",
    borderRadius: "6px",
    color: "#7D8590",
    cursor: "pointer",
    fontSize: "16px",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addBtn: {
    background: "none",
    border: "1px dashed #30363D",
    borderRadius: "6px",
    color: "#7D8590",
    cursor: "pointer",
    fontSize: "12px",
    padding: "7px 12px",
    width: "100%",
    textAlign: "left" as const,
  },
  // Footer
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid #21262D",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    position: "sticky" as const,
    bottom: 0,
    backgroundColor: "#161B22",
  },
  footerTotal: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1px",
  },
  footerTotalLabel: {
    color: "#7D8590",
    fontSize: "11px",
  },
  footerTotalValue: {
    color: "#E6EDF3",
    fontSize: "18px",
    fontWeight: 700,
  },
  footerActions: {
    display: "flex",
    gap: "8px",
  },
  cancelBtn: {
    backgroundColor: "transparent",
    border: "1px solid #30363D",
    borderRadius: "6px",
    color: "#8B949E",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    padding: "8px 16px",
  },
  saveBtn: {
    backgroundColor: "#238636",
    border: "1px solid #2EA043",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    padding: "8px 20px",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DailyExpenseModal({
  isOpen,
  onClose,
  onSubmit,
  workers,
  projectTitle,
}: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [workerEntries, setWorkerEntries] = useState<WorkerEntry[]>(
    workers.map((w) => ({ workerId: w.id, checked: false, amount: String(w.daily_rate) }))
  );
  const [fuel, setFuel] = useState("");
  const [accommodation, setAccommodation] = useState("");
  const [others, setOthers] = useState<OtherExpense[]>([{ description: "", amount: "" }]);

  if (!isOpen) return null;

  // ─── Derived totals ───────────────────────────────────────────────────────

  const salaryTotal = workerEntries
    .filter((e) => e.checked)
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const grandTotal =
    salaryTotal +
    (parseFloat(fuel) || 0) +
    (parseFloat(accommodation) || 0) +
    others.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);

  const fmt = (n: number) =>
    n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const toggleWorker = (idx: number) => {
    setWorkerEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, checked: !e.checked } : e))
    );
  };

  const setWorkerAmount = (idx: number, val: string) => {
    setWorkerEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, amount: val } : e))
    );
  };

  const addOther = () => setOthers((prev) => [...prev, { description: "", amount: "" }]);

  const removeOther = (idx: number) =>
    setOthers((prev) => prev.filter((_, i) => i !== idx));

  const setOtherField = (idx: number, field: keyof OtherExpense, val: string) => {
    setOthers((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, [field]: val } : o))
    );
  };

  const handleSubmit = () => {
    const payload: DailyExpensePayload = {
      date,
      salary: workerEntries
        .filter((e) => e.checked)
        .map((e) => ({ workerId: e.workerId, amount: parseFloat(e.amount) || 0 })),
      fuel: parseFloat(fuel) || 0,
      accommodation: parseFloat(accommodation) || 0,
      other: others
        .filter((o) => o.description && o.amount)
        .map((o) => ({ description: o.description, amount: parseFloat(o.amount) || 0 })),
    };
    onSubmit(payload);
    onClose();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <p style={styles.headerTitle}>Log Daily Expenses</p>
            {projectTitle && <p style={styles.headerSub}>{projectTitle}</p>}
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>

          {/* Date */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={{ ...styles.sectionDot, backgroundColor: "#58A6FF" }} />
              <span style={styles.sectionLabel}>Date</span>
            </div>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              style={styles.input}
            />
          </div>

          <hr style={styles.divider} />

          {/* Salary */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={{ ...styles.sectionDot, backgroundColor: "#3FB950" }} />
              <span style={styles.sectionLabel}>Salary</span>
              {salaryTotal > 0 && (
                <span style={styles.sectionTotal}>Rs. {fmt(salaryTotal)}</span>
              )}
            </div>

            {workers.length === 0 ? (
              <p style={{ color: "#7D8590", fontSize: "13px", margin: 0 }}>
                No workers assigned to this project.
              </p>
            ) : (
              workerEntries.map((entry, idx) => {
                const worker = workers.find((w) => w.id === entry.workerId)!;
                return (
                  <div
                    key={entry.workerId}
                    style={entry.checked ? styles.workerRowActive : styles.workerRow}
                  >
                    <input
                      type="checkbox"
                      checked={entry.checked}
                      onChange={() => toggleWorker(idx)}
                      style={styles.checkbox}
                    />
                    <div style={styles.workerInfo}>
                      <div style={styles.workerName}>{worker.name}</div>
                      <div style={styles.workerRole}>{worker.role} · Rs. {worker.daily_rate.toLocaleString()}/day</div>
                    </div>
                    <div style={styles.workerAmountWrap}>
                      <span style={styles.workerPrefix}>Rs.</span>
                      <input
                        type="number"
                        value={entry.amount}
                        disabled={!entry.checked}
                        onChange={(e) => setWorkerAmount(idx, e.target.value)}
                        style={entry.checked ? styles.workerAmountInput : styles.workerAmountInputDisabled}
                        min={0}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <hr style={styles.divider} />

          {/* Fuel */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={{ ...styles.sectionDot, backgroundColor: "#F78166" }} />
              <span style={styles.sectionLabel}>Fuel</span>
            </div>
            <div style={styles.amountWrap}>
              <span style={styles.amountPrefix}>Rs.</span>
              <input
                type="number"
                placeholder="0.00"
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
                style={styles.amountInput}
                min={0}
              />
            </div>
          </div>

          <hr style={styles.divider} />

          {/* Accommodation */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={{ ...styles.sectionDot, backgroundColor: "#D2A8FF" }} />
              <span style={styles.sectionLabel}>Accommodation</span>
            </div>
            <div style={styles.amountWrap}>
              <span style={styles.amountPrefix}>Rs.</span>
              <input
                type="number"
                placeholder="0.00"
                value={accommodation}
                onChange={(e) => setAccommodation(e.target.value)}
                style={styles.amountInput}
                min={0}
              />
            </div>
          </div>

          <hr style={styles.divider} />

          {/* Other */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={{ ...styles.sectionDot, backgroundColor: "#E3B341" }} />
              <span style={styles.sectionLabel}>Other</span>
            </div>

            {others.map((o, idx) => (
              <div key={idx} style={styles.otherRow}>
                <input
                  type="text"
                  placeholder="Description"
                  value={o.description}
                  onChange={(e) => setOtherField(idx, "description", e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                />
                <div style={{ ...styles.amountWrap, width: "130px", flexShrink: 0 }}>
                  <span style={styles.amountPrefix}>Rs.</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={o.amount}
                    onChange={(e) => setOtherField(idx, "amount", e.target.value)}
                    style={styles.amountInput}
                    min={0}
                  />
                </div>
                {others.length > 1 && (
                  <button style={styles.removeBtn} onClick={() => removeOther(idx)}>
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button style={styles.addBtn} onClick={addOther}>
              + Add another item
            </button>
          </div>

        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerTotal}>
            <span style={styles.footerTotalLabel}>Total today</span>
            <span style={styles.footerTotalValue}>Rs. {fmt(grandTotal)}</span>
          </div>
          <div style={styles.footerActions}>
            <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button style={styles.saveBtn} onClick={handleSubmit}>Save Log</button>
          </div>
        </div>

      </div>
    </div>
  );
}