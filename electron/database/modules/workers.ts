// electron/database/modules/workers.ts

import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

export interface Worker {
  id: string
  user_id: string
  user_name: string   // joined from users
  nic: string | null
  daily_rate: number
  phone: string | null
  address: string | null
  joined_date: string | null
}

export interface WorkerInput {
  name: string        // creates a user entry too
  nic?: string
  daily_rate: number
  phone?: string
  address?: string
  joined_date?: string
}

export interface AttendanceRecord {
  id: string
  worker_id: string
  worker_name: string   // joined
  project_id: string
  project_title: string // joined
  work_date: string
  hours_worked: number
  overtime_hours: number
  status: 'present' | 'absent' | 'half-day'
  notes: string | null
}

export interface AttendanceInput {
  worker_id: string
  project_id: string
  work_date: string
  hours_worked?: number
  overtime_hours?: number
  status?: string
  notes?: string
}

export class WorkersRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // ── GET ALL WORKERS ───────────────────────────────────────
  getAll(): Worker[] {
    return this.db.prepare(`
      SELECT w.*, u.name AS user_name
      FROM workers w
      JOIN users u ON u.id = w.user_id
      ORDER BY u.name ASC
    `).all() as Worker[]
  }

  getById(id: string): Worker | undefined {
    return this.db.prepare(`
      SELECT w.*, u.name AS user_name
      FROM workers w
      JOIN users u ON u.id = w.user_id
      WHERE w.id = ?
    `).get(id) as Worker | undefined
  }

  // ── CREATE WORKER ─────────────────────────────────────────
  // WHY create a user entry too?
  //   Workers must exist in the users table (foreign key).
  //   We create a user with role='worker' automatically so
  //   the admin doesn't have to do two separate steps.
  create(input: WorkerInput): Worker {
    const userId   = randomUUID()
    const workerId = randomUUID()

    const doCreate = this.db.transaction(() => {
      // Create the user account first
      this.db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (?, ?, ?, ?, 'worker')
      `).run(
        userId,
        input.name,
        `worker_${Date.now()}@local`,  // placeholder email
        'WORKER_ACCOUNT',
      )

      // Then create the worker profile
      this.db.prepare(`
        INSERT INTO workers (id, user_id, nic, daily_rate, phone, address, joined_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        workerId,
        userId,
        input.nic         ?? null,
        input.daily_rate,
        input.phone       ?? null,
        input.address     ?? null,
        input.joined_date ?? null,
      )
    })

    doCreate()
    return this.getById(workerId)!
  }

  // ── UPDATE WORKER ─────────────────────────────────────────
  update(id: string, input: Partial<WorkerInput>): Worker | undefined {
    const worker = this.getById(id)
    if (!worker) return undefined

    this.db.transaction(() => {
      if (input.name) {
        this.db.prepare(`UPDATE users SET name = ? WHERE id = ?`).run(input.name, worker.user_id)
      }
      this.db.prepare(`
        UPDATE workers SET
          nic         = COALESCE(?, nic),
          daily_rate  = COALESCE(?, daily_rate),
          phone       = ?,
          address     = ?,
          joined_date = ?
        WHERE id = ?
      `).run(
        input.nic         ?? null,
        input.daily_rate  ?? null,
        input.phone       ?? null,
        input.address     ?? null,
        input.joined_date ?? null,
        id,
      )
    })()

    return this.getById(id)
  }

  delete(id: string): { success: boolean } {
    const result = this.db.prepare(`DELETE FROM workers WHERE id = ?`).run(id)
    return { success: result.changes > 0 }
  }
}

// ─────────────────────────────────────────────────────────────

export class AttendanceRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // ── GET FOR PROJECT ───────────────────────────────────────
  // All attendance records for a given project, newest first.
  getByProject(projectId: string): AttendanceRecord[] {
    return this.db.prepare(`
      SELECT
        a.*,
        u.name AS worker_name,
        p.title AS project_title
      FROM attendance a
      JOIN workers  w ON w.id = a.worker_id
      JOIN users    u ON u.id = w.user_id
      JOIN projects p ON p.id = a.project_id
      WHERE a.project_id = ?
      ORDER BY a.work_date DESC
    `).all(projectId) as AttendanceRecord[]
  }

  // ── GET FOR WORKER IN DATE RANGE ──────────────────────────
  // Used to calculate what goes into a paysheet.
  getByWorkerAndPeriod(workerId: string, from: string, to: string): AttendanceRecord[] {
    return this.db.prepare(`
      SELECT
        a.*,
        u.name  AS worker_name,
        p.title AS project_title
      FROM attendance a
      JOIN workers  w ON w.id = a.worker_id
      JOIN users    u ON u.id = w.user_id
      JOIN projects p ON p.id = a.project_id
      WHERE a.worker_id = ?
        AND a.work_date >= ?
        AND a.work_date <= ?
      ORDER BY a.work_date ASC
    `).all(workerId, from, to) as AttendanceRecord[]
  }

  // ── CALCULATE SUMMARY ─────────────────────────────────────
  // Aggregate query — returns totals for the paysheet preview.
  // COUNT with status != 'absent' counts actual working days.
  // Half-day counts as 0.5 via CASE expression.
  getSummary(workerId: string, from: string, to: string): {
    total_days: number
    total_overtime: number
    present_days: number
    absent_days: number
    half_days: number
  } {
    const row = this.db.prepare(`
      SELECT
        COUNT(CASE WHEN status = 'present'  THEN 1 END) AS present_days,
        COUNT(CASE WHEN status = 'absent'   THEN 1 END) AS absent_days,
        COUNT(CASE WHEN status = 'half-day' THEN 1 END) AS half_days,
        SUM(CASE
          WHEN status = 'present'  THEN 1
          WHEN status = 'half-day' THEN 0.5
          ELSE 0
        END) AS total_days,
        SUM(overtime_hours) AS total_overtime
      FROM attendance
      WHERE worker_id = ?
        AND work_date >= ?
        AND work_date <= ?
    `).get(workerId, from, to) as any

    return {
      total_days:     row?.total_days     ?? 0,
      total_overtime: row?.total_overtime ?? 0,
      present_days:   row?.present_days   ?? 0,
      absent_days:    row?.absent_days    ?? 0,
      half_days:      row?.half_days      ?? 0,
    }
  }

  // ── MARK ATTENDANCE ───────────────────────────────────────
  // INSERT OR REPLACE handles the UNIQUE(worker, project, date)
  // constraint — if a record exists for that day, it updates it.
  mark(input: AttendanceInput): AttendanceRecord {
    const id = randomUUID()
    this.db.prepare(`
      INSERT INTO attendance (id, worker_id, project_id, work_date, hours_worked, overtime_hours, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(worker_id, project_id, work_date)
      DO UPDATE SET
        hours_worked   = excluded.hours_worked,
        overtime_hours = excluded.overtime_hours,
        status         = excluded.status,
        notes          = excluded.notes
    `).run(
      id,
      input.worker_id,
      input.project_id,
      input.work_date,
      input.hours_worked    ?? 8,
      input.overtime_hours  ?? 0,
      input.status          ?? 'present',
      input.notes           ?? null,
    )

    // Fetch back the actual saved record (id may differ if it was an update)
    return this.db.prepare(`
      SELECT a.*, u.name AS worker_name, p.title AS project_title
      FROM attendance a
      JOIN workers  w ON w.id = a.worker_id
      JOIN users    u ON u.id = w.user_id
      JOIN projects p ON p.id = a.project_id
      WHERE a.worker_id = ? AND a.project_id = ? AND a.work_date = ?
    `).get(input.worker_id, input.project_id, input.work_date) as AttendanceRecord
  }

  delete(id: string): { success: boolean } {
    const result = this.db.prepare(`DELETE FROM attendance WHERE id = ?`).run(id)
    return { success: result.changes > 0 }
  }
}
