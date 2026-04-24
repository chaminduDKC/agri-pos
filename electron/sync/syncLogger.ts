// electron/sync/syncLogger.ts
// ─────────────────────────────────────────────────────────────
// WHY THIS EXISTS:
//
//   Every time your app creates, updates or deletes a record,
//   this logger writes a corresponding row to sync_log.
//   The sync engine reads sync_log later and pushes those
//   changes to the cloud.
//
//   The critical rule: the DB write and the sync_log write
//   MUST happen in the same transaction. This guarantees you
//   can never have a local change that wasn't logged.
//
// HOW TO USE:
//
//   Instead of calling db.prepare(...).run() directly,
//   wrap it with syncLogger.loggedWrite():
//
//   // Before:
//   db.prepare('INSERT INTO clients ...').run(id, name)
//
//   // After:
//   syncLogger.loggedWrite('clients', id, 'INSERT', () => {
//     db.prepare('INSERT INTO clients ...').run(id, name)
//   })
//
//   That's it. The logger handles sync_log automatically.
// ─────────────────────────────────────────────────────────────

import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

export type Operation = 'INSERT' | 'UPDATE' | 'DELETE'

export class SyncLogger {
  private db: Database.Database

  // Prepared statement cached at construction time.
  // WHY? Preparing a statement once and reusing it is faster
  // than preparing it on every call.
  private insertLog: Database.Statement

  constructor(db: Database.Database) {
    this.db = db
    this.insertLog = db.prepare(`
      INSERT INTO sync_log (id, table_name, record_id, operation, payload, synced)
      VALUES (?, ?, ?, ?, ?, 0)
    `)
  }

  // ── loggedWrite ───────────────────────────────────────────
  // Runs your database write AND logs it to sync_log in one
  // atomic transaction.
  //
  // Parameters:
  //   tableName  — which table changed e.g. 'clients'
  //   recordId   — the UUID of the changed row
  //   operation  — 'INSERT', 'UPDATE', or 'DELETE'
  //   writeFn    — function that performs the actual DB write
  //   payload    — optional: the full record as JSON snapshot
  //                (useful for INSERT and UPDATE so the cloud
  //                 has the data without doing a follow-up query)
  loggedWrite<T>(
    tableName: string,
    recordId: string,
    operation: Operation,
    writeFn: () => T,
    payload?: object,
  ): T {
    let result: T

    // db.transaction() wraps everything in one atomic unit
    const run = this.db.transaction(() => {
      // 1. Run the actual database write
      result = writeFn()

      // 2. Log to sync_log in the same transaction
      this.insertLog.run(
        randomUUID(),
        tableName,
        recordId,
        operation,
        payload ? JSON.stringify(payload) : null,
      )
    })

    run()
    return result!
  }

  // ── getPending ────────────────────────────────────────────
  // Returns all unsynced rows ordered oldest first.
  // The sync engine calls this when it's ready to push.
  getPending(): SyncLogRow[] {
    return this.db.prepare(`
      SELECT * FROM sync_log
      WHERE synced = 0
      ORDER BY created_at ASC
    `).all() as SyncLogRow[]
  }

  // ── markSynced ────────────────────────────────────────────
  // Called by the sync engine after a row was successfully
  // pushed to the cloud.
  markSynced(id: string): void {
    this.db.prepare(`
      UPDATE sync_log SET synced = 1 WHERE id = ?
    `).run(id)
  }

  // ── markFailed ────────────────────────────────────────────
  // Marks a row with a failure reason so you can investigate.
  // Does NOT mark as synced — it will be retried next time.
  markFailed(id: string, reason: string): void {
    this.db.prepare(`
      UPDATE sync_log
      SET payload = json_patch(COALESCE(payload, '{}'), json_object('_error', ?))
      WHERE id = ?
    `).run(reason, id)
  }

  // ── getPendingCount ───────────────────────────────────────
  // Quick count for the UI indicator (e.g. "3 unsynced changes")
  getPendingCount(): number {
    const row = this.db.prepare(`
      SELECT COUNT(*) AS count FROM sync_log WHERE synced = 0
    `).get() as { count: number }
    return row.count
  }
}

export interface SyncLogRow {
  id: string
  table_name: string
  record_id: string
  operation: Operation
  payload: string | null
  synced: number
  created_at: string
}
