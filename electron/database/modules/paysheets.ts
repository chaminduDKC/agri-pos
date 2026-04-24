// electron/database/modules/paysheets.ts

import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

export interface Paysheet {
  id: string
  worker_id: string
  worker_name: string   // joined
  project_id: string | null
  project_title: string | null  // joined
  approved_by: string | null
  period_start: string
  period_end: string
  total_days: number
  daily_rate: number
  overtime_pay: number
  total_amount: number
  status: 'draft' | 'approved' | 'paid'
  created_at: string
}

export interface PaysheetInput {
  worker_id: string
  project_id?: string
  period_start: string
  period_end: string
  total_days: number
  daily_rate: number
  overtime_pay?: number
  total_amount: number
}

export class PaysheetsRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // ── GET ALL ───────────────────────────────────────────────
  getAll(): Paysheet[] {
    return this.db.prepare(`
      SELECT
        ps.*,
        u.name  AS worker_name,
        p.title AS project_title
      FROM paysheets ps
      JOIN workers  w ON w.id  = ps.worker_id
      JOIN users    u ON u.id  = w.user_id
      LEFT JOIN projects p ON p.id = ps.project_id
      ORDER BY ps.created_at DESC
    `).all() as Paysheet[]
  }

  getById(id: string): Paysheet | undefined {
    return this.db.prepare(`
      SELECT ps.*, u.name AS worker_name, p.title AS project_title
      FROM paysheets ps
      JOIN workers  w ON w.id  = ps.worker_id
      JOIN users    u ON u.id  = w.user_id
      LEFT JOIN projects p ON p.id = ps.project_id
      WHERE ps.id = ?
    `).get(id) as Paysheet | undefined
  }

  getByWorker(workerId: string): Paysheet[] {
    return this.db.prepare(`
      SELECT ps.*, u.name AS worker_name, p.title AS project_title
      FROM paysheets ps
      JOIN workers  w ON w.id  = ps.worker_id
      JOIN users    u ON u.id  = w.user_id
      LEFT JOIN projects p ON p.id = ps.project_id
      WHERE ps.worker_id = ?
      ORDER BY ps.period_start DESC
    `).all(workerId) as Paysheet[]
  }

  // ── CREATE ────────────────────────────────────────────────
  // WHY store daily_rate inside the paysheet?
  //   SNAPSHOT PATTERN: the worker's daily_rate might change
  //   in future. Once a paysheet is created, the rate used
  //   to calculate it must be frozen here permanently.
  create(input: PaysheetInput): Paysheet {
    const id = randomUUID()
    this.db.prepare(`
      INSERT INTO paysheets
        (id, worker_id, project_id, period_start, period_end, total_days, daily_rate, overtime_pay, total_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(
      id,
      input.worker_id,
      input.project_id  ?? null,
      input.period_start,
      input.period_end,
      input.total_days,
      input.daily_rate,
      input.overtime_pay ?? 0,
      input.total_amount,
    )
    return this.getById(id)!
  }

  // ── UPDATE STATUS ─────────────────────────────────────────
  // Paysheets move: draft → approved → paid
  // Once approved, the amounts are considered final.
  updateStatus(id: string, status: string, approvedBy?: string): Paysheet | undefined {
    this.db.prepare(`
      UPDATE paysheets
      SET status      = ?,
          approved_by = COALESCE(?, approved_by)
      WHERE id = ?
    `).run(status, approvedBy ?? null, id)
    return this.getById(id)
  }

  delete(id: string): { success: boolean } {
    // Only allow deleting draft paysheets
    const ps = this.getById(id)
    if (ps && ps.status !== 'draft') {
      throw new Error('Only draft paysheets can be deleted')
    }
    const result = this.db.prepare(`DELETE FROM paysheets WHERE id = ?`).run(id)
    return { success: result.changes > 0 }
  }

  // ── SUMMARY FOR DASHBOARD ─────────────────────────────────
  getTotalPaid(from: string, to: string): number {
    const row = this.db.prepare(`
      SELECT SUM(total_amount) AS total
      FROM paysheets
      WHERE status = 'paid'
        AND period_start >= ?
        AND period_end   <= ?
    `).get(from, to) as { total: number | null }
    return row?.total ?? 0
  }
}
