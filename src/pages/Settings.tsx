import { useState, useEffect } from 'react'

interface CompanyDetails {
  companyName: string
  address: string
  phone: string
  email: string
}

const Settings = () => {
  const [form, setForm] = useState<CompanyDetails>({
    companyName: '',
    address: '',
    phone: '',
    email: '',
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const res = await window.api.getCompanyDetails()
      console.log(res)
      if (res.success) {console.log(res);setForm(res.data ?? form)}
      setLoading(false)
    }
    load()
  }, [])

  const set = (key: keyof CompanyDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!form.companyName.trim()) { setErr('Company name is required'); return }
    setErr(null)
    setSaving(true)
    const res = await window.api.updateCompanyDetails(form)
    setSaving(false)
    if (res.success) {
      console.log(res)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      setErr(res.error ?? 'Failed to save company details')
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>Settings</h1>

      <div style={s.columns}>

        {/* Column 1 — Company details */}
        <div style={s.panel}>
          <p style={s.panelTitle}>Company details</p>

          {err && <div style={s.errBox}>{err}</div>}
          {saved && <div style={s.successBox}>Saved</div>}

          {loading ? (
            <p style={s.muted}>Loading...</p>
          ) : (
            <>
              <label style={s.label}>Company name *</label>
              <input style={s.input} value={form.companyName} onChange={set('companyName')}
                placeholder="e.g. SouthernGreenhouse" />

              <label style={s.label}>Address</label>
              <textarea style={{ ...s.input, minHeight: 64, resize: 'vertical' }}
                value={form.address} onChange={set('address')}
                placeholder="e.g. No 12, Main Street, Galle" />

              <label style={s.label}>Phone</label>
              <input style={s.input} value={form.phone} onChange={set('phone')}
                placeholder="e.g. 077 123 4567" />

              <label style={s.label}>Email</label>
              <input style={s.input} type="email" value={form.email} onChange={set('email')}
                placeholder="e.g. info@southerngreenhouse.lk" />

              <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </>
          )}
        </div>

        {/* Column 2 — placeholder */}
        <div style={s.panel}>
          <p style={s.panelTitle}>Preferences</p>
          <p style={s.muted}>Coming soon</p>
        </div>

        {/* Column 3 — placeholder */}
        <div style={s.panel}>
          <p style={s.panelTitle}>Backup & sync</p>
          <p style={s.muted}>Coming soon</p>
        </div>

      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { padding: 0 },

  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: '0 0 20px',
    color: 'var(--text)',
  },

  columns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    alignItems: 'start',
  },

  panel: {
    background: 'var(--surface)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius)',
    padding: 20,
  },

  panelTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: '0 0 16px',
    color: 'var(--text)',
  },

  muted: {
    color: 'var(--text-dim)',
    fontSize: 14,
  },

  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-muted)',
    marginTop: 14,
    marginBottom: 5,
  },

  input: {
    width: '100%',
    padding: '9px 12px',
    fontSize: 14,
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-sm)',
    boxSizing: 'border-box',
    background: 'var(--bg)',
    color: 'var(--text)',
  },

  btnPrimary: {
    marginTop: 20,
    padding: '9px 18px',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  },

  errBox: {
    background: 'var(--danger-bg)',
    border: '1px solid var(--danger)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--danger)',
    marginBottom: 14,
  },

  successBox: {
    background: '#dcfce7',
    border: '1px solid #86efac',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: '#166534',
    marginBottom: 14,
  },
}

export default Settings