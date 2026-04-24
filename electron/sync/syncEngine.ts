// electron/sync/syncEngine.ts
// ─────────────────────────────────────────────────────────────
// The sync engine reads pending rows from sync_log and pushes
// them to the cloud API one by one.
//
// RETRY LOGIC:
//   If a push fails, the row stays synced=0 and is retried
//   on the next sync run. This means sync is idempotent —
//   running it twice won't cause duplicate data on the cloud
//   because the cloud API should handle upserts (INSERT OR REPLACE).
//
// CONFLICT RESOLUTION STRATEGY (simple):
//   Last write wins. The cloud always accepts whatever the
//   local device sends. For a more complex strategy (e.g.
//   merging changes from multiple devices), you'd compare
//   timestamps and decide per-field which value wins.
//   For this app, one device per business is the common case,
//   so last-write-wins is fine.
// ─────────────────────────────────────────────────────────────

import { SyncLogger, type SyncLogRow } from './syncLogger'

export interface SyncConfig {
  // The base URL of your cloud API
  // e.g. 'https://api.yourdomain.com'
  apiBaseUrl: string

  // Auth token for the API — set after user logs in
  authToken: string | null

  // How many rows to push per sync run (batch size)
  // Smaller = safer but slower. Larger = faster but riskier.
  batchSize?: number
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export class SyncEngine {
  private logger: SyncLogger
  private config: SyncConfig
  private status: SyncStatus = 'idle'
  private onStatusChange?: (status: SyncStatus, pendingCount: number) => void

  constructor(logger: SyncLogger, config: SyncConfig) {
    this.logger = logger
    this.config = config
  }

  // ── Subscribe to status changes ───────────────────────────
  // The UI calls this to get live sync status updates.
  // Whenever the engine changes state, it calls this callback.
  onStatus(fn: (status: SyncStatus, pendingCount: number) => void) {
    this.onStatusChange = fn
  }

  private setStatus(status: SyncStatus) {
    this.status = status
    this.onStatusChange?.(status, this.logger.getPendingCount())
  }

  // ── Run a sync cycle ──────────────────────────────────────
  // Call this:
  //   1. When the app detects internet connection restored
  //   2. On a timer (e.g. every 60 seconds)
  //   3. Manually when user clicks "Sync now"
  async sync(): Promise<{ pushed: number; failed: number }> {
    if (this.status === 'syncing') {
      console.log('[Sync] Already syncing, skipping')
      return { pushed: 0, failed: 0 }
    }

    if (!this.config.authToken) {
      console.log('[Sync] No auth token, skipping')
      console.log('finding token')
      
      return { pushed: 0, failed: 0 }
    }

    const pending = this.logger.getPending()

    if (pending.length === 0) {
      console.log('[Sync] Nothing to sync')
      this.setStatus('idle')
      return { pushed: 0, failed: 0 }
    }

    console.log(`[Sync] Starting — ${pending.length} rows pending`)
    this.setStatus('syncing')

    let pushed = 0
    let failed = 0
    const batch = pending.slice(0, this.config.batchSize ?? 50)

    for (const row of batch) {
      try {
        await this.pushRow(row)
        this.logger.markSynced(row.id)
        pushed++
      } catch (err: any) {
        console.error(`[Sync] Failed to push row ${row.id}:`, err.message)
        this.logger.markFailed(row.id, err.message)
        failed++

        // If it's a network error, stop trying — no point continuing
        if (err.message.includes('fetch') || err.message.includes('network')) {
          this.setStatus('offline')
          break
        }
      }
    }

    const remainingCount = this.logger.getPendingCount()
    this.setStatus(remainingCount > 0 && failed === 0 ? 'idle' : failed > 0 ? 'error' : 'idle')

    console.log(`[Sync] Done — pushed: ${pushed}, failed: ${failed}, remaining: ${remainingCount}`)
    return { pushed, failed }
  }

  // ── Push a single row to the cloud ────────────────────────
  private async pushRow(row: SyncLogRow): Promise<void> {
    const url = `${this.config.apiBaseUrl}/sync`

    // WHY send the full payload?
    //   The cloud receives the complete record and can do an
    //   upsert (INSERT OR REPLACE) without needing to look
    //   anything up. Simpler and faster.
    const body = {
      table_name: row.table_name,
      record_id:  row.record_id,
      operation:  row.operation,
      payload:    row.payload ? JSON.parse(row.payload) : null,
      created_at: row.created_at,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.authToken}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text}`)
    }
  }

  getStatus(): SyncStatus { return this.status }
  getPendingCount(): number { return this.logger.getPendingCount() }
}
