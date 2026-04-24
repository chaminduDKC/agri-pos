// DbTest.tsx
// ─────────────────────────────────────────────────────────────
// A temporary test component to verify the full pipeline works:
//   React → preload → main → SQLite → back to React
//
// Add this to your App.tsx or Home.tsx temporarily.
// Delete it once you confirm everything is connected.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'

export function DbTest() {
  const [result, setResult] = useState<string>('Not tested yet')
  const [loading, setLoading] = useState(false)

  async function testPing() {
    setLoading(true)
    try {
      const response = await window.api.ping()
      setResult(`✅ Ping: ${response}`)
    } catch (err: any) {
      setResult(`❌ Error: ${err.message}`)
    }
    setLoading(false)
  }

  async function testDb() {
    setLoading(true)
    try {
      const response = await window.api.dbTest()
      if (response.success) {
        setResult(`✅ DB works! Users found: ${JSON.stringify(response.users, null, 2)}`)
      } else {
        setResult(`❌ DB error: ${response.error}`)
      }
    } catch (err: any) {
      setResult(`❌ Error: ${err.message}`)
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h3>Database Connection Test</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <button onClick={testPing} disabled={loading}>
          Test Ping
        </button>
        <button onClick={testDb} disabled={loading}>
          Test Database
        </button>
      </div>
      <pre style={{
        background: '#f5f5f5',
        padding: '12px',
        borderRadius: '6px',
        whiteSpace: 'pre-wrap',
        fontSize: '13px'
      }}>
        {loading ? 'Loading...' : result}
      </pre>
    </div>
  )
}
