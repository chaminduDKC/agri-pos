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
  present_days: number
  half_days: number
  absent_days: number
  salary_advance: number
  fixed_salary: number
  overtime_hours: number
  overtime_rate: number
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
      LEFT JOIN projects p ON p.id = ps.project_id AND p.is_deleted = 0
        WHERE ps.is_deleted = 0
        AND w.is_deleted = 0
        AND u.is_deleted = 0
      ORDER BY ps.created_at DESC
    `).all() as Paysheet[]
  }

  getById(id: string): Paysheet | undefined {
    return this.db.prepare(`
      SELECT ps.*, u.name AS worker_name, p.title AS project_title
      FROM paysheets ps
      JOIN workers  w ON w.id  = ps.worker_id
      JOIN users    u ON u.id  = w.user_id
      LEFT JOIN projects p ON p.id = ps.project_id AND p.is_deleted = 0
      WHERE ps.id = ?
      AND ps.is_deleted = 0
      AND w.is_deleted = 0
      AND u.is_deleted = 0

    `).get(id) as Paysheet | undefined
  }

  getByWorker(workerId: string): Paysheet[] {
    return this.db.prepare(`
      SELECT ps.*, u.name AS worker_name, p.title AS project_title
      FROM paysheets ps
      JOIN workers  w ON w.id  = ps.worker_id
      JOIN users    u ON u.id  = w.user_id
      LEFT JOIN projects p ON p.id = ps.project_id AND p.is_deleted = 0
      WHERE ps.worker_id = ? AND ps.is_deleted = 0 AND w.is_deleted = 0 AND u.is_deleted = 0
      ORDER BY ps.period_start DESC
    `).all(workerId) as Paysheet[]
  }

  create(input: PaysheetInput): Paysheet {
        
    const id = randomUUID()
    this.db.prepare(`
      INSERT INTO paysheets
        (id, worker_id, project_id, period_start, period_end, total_days, present_days,
        half_days, absent_days, salary_advance, fixed_salary, daily_rate, overtime_rate, overtime_hours, total_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(
      id,
      input.worker_id,
      input.project_id  ?? null,
      input.period_start,
      input.period_end,
      input.total_days ?? 0,
      input.present_days ?? 0,
      input.half_days ?? 0,
      input.absent_days ?? 0,
      input.salary_advance ?? 0,
      input.fixed_salary ?? 0,
      input.daily_rate ?? 0,
      input.overtime_rate ?? 0,
      input.overtime_hours ?? 0,
      input.total_amount ?? 0,
    )
    return this.getById(id)!
  }


  updateStatus(id: string, status: string, approvedBy?: string): Paysheet | undefined {
    this.db.prepare(`
      UPDATE paysheets
      SET status      = ?, is_synced = 0
          approved_by = COALESCE(?, approved_by)
      WHERE id = ? AND is_deleted = 0
    `).run(status, approvedBy ?? null, id)
    return this.getById(id)
  }

  delete(id: string): { success: boolean } {
    // Only allow deleting draft paysheets
    const ps = this.getById(id)
    if (ps && ps.status !== 'draft') {
      throw new Error('Only draft paysheets can be deleted')
    }
    const result = this.db.prepare(`UPDATE paysheets SET is_deleted = 1, is_synced = 0 WHERE id = ? AND is_deleted = 0`).run(id)
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
        AND is_deleted = 0
    `).get(from, to) as { total: number | null }
    return row?.total ?? 0
  }
}
