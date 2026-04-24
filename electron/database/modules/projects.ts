// electron/database/modules/projects.ts

import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

export interface Project {
  id: string
  client_id: string
  client_name: string   // joined from clients table
  created_by: string
  title: string
  location: string | null
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
}

export interface ProjectInput {
  client_id: string
  title: string
  location?: string
  status?: string
  start_date?: string
  end_date?: string
  notes?: string
}

export class ProjectsRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // ── GET ALL ───────────────────────────────────────────────
  // WHY JOIN clients here?
  //   The project list needs to show the client name.
  //   Doing one JOIN query is cleaner and faster than fetching
  //   projects then looking up each client separately.
  getAll(): Project[] {
    return this.db.prepare(`
      SELECT
        p.*,
        c.name AS client_name
      FROM projects p
      JOIN clients c ON c.id = p.client_id
      ORDER BY p.created_at DESC
    `).all() as Project[]
  }

  // ── GET BY ID ─────────────────────────────────────────────
  getById(id: string): Project | undefined {
    return this.db.prepare(`
      SELECT p.*, c.name AS client_name
      FROM projects p
      JOIN clients c ON c.id = p.client_id
      WHERE p.id = ?
    `).get(id) as Project | undefined
  }

  // ── GET BY CLIENT ─────────────────────────────────────────
  // Used in a future client detail page to list their projects.
  getByClient(clientId: string): Project[] {
    return this.db.prepare(`
      SELECT p.*, c.name AS client_name
      FROM projects p
      JOIN clients c ON c.id = p.client_id
      WHERE p.client_id = ?
      ORDER BY p.created_at DESC
    `).all(clientId) as Project[]
  }

  // ── GET BY STATUS ─────────────────────────────────────────
  getByStatus(status: string): Project[] {
    return this.db.prepare(`
      SELECT p.*, c.name AS client_name
      FROM projects p
      JOIN clients c ON c.id = p.client_id
      WHERE p.status = ?
      ORDER BY p.created_at DESC
    `).all(status) as Project[]
  }

  // ── SEARCH ────────────────────────────────────────────────
  search(query: string): Project[] {
    const term = `%${query}%`
    return this.db.prepare(`
      SELECT p.*, c.name AS client_name
      FROM projects p
      JOIN clients c ON c.id = p.client_id
      WHERE p.title    LIKE ?
         OR p.location LIKE ?
         OR c.name     LIKE ?
      ORDER BY p.created_at DESC
    `).all(term, term, term) as Project[]
  }

  // ── CREATE ────────────────────────────────────────────────
  create(input: ProjectInput, createdBy: string): Project {
    const id = randomUUID()
    this.db.prepare(`
      INSERT INTO projects (id, client_id, created_by, title, location, status, start_date, end_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.client_id,
      createdBy,
      input.title,
      input.location   ?? null,
      input.status     ?? 'pending',
      input.start_date ?? null,
      input.end_date   ?? null,
      input.notes      ?? null,
    )
    return this.getById(id)!
  }

  // ── UPDATE ────────────────────────────────────────────────
  update(id: string, input: Partial<ProjectInput>): Project | undefined {
    this.db.prepare(`
      UPDATE projects SET
        client_id  = COALESCE(?, client_id),
        title      = COALESCE(?, title),
        location   = ?,
        status     = COALESCE(?, status),
        start_date = ?,
        end_date   = ?,
        notes      = ?
      WHERE id = ?
    `).run(
      input.client_id  ?? null,
      input.title      ?? null,
      input.location   ?? null,
      input.status     ?? null,
      input.start_date ?? null,
      input.end_date   ?? null,
      input.notes      ?? null,
      id,
    )
    return this.getById(id)
  }

  // ── UPDATE STATUS ONLY ────────────────────────────────────
  // Quick status change without opening the full edit form.
  updateStatus(id: string, status: string): Project | undefined {
    this.db.prepare(`UPDATE projects SET status = ? WHERE id = ?`).run(status, id)
    return this.getById(id)
  }
cascadeDelete(id: string): { success: boolean; error?: string } { 
    const hasMaterials = this.db.prepare(`SELECT 1 FROM materials WHERE project_id = ? LIMIT 1`).get(id)
    const hasAttendance = this.db.prepare(`SELECT 1 FROM attendance WHERE project_id = ? LIMIT 1`).get(id)

    if (hasMaterials || hasAttendance) {
      return { success: false, error: 'Project has linked materials or attendance records' }
    }

    const result = this.db.prepare(`DELETE FROM projects WHERE id = ?`).run(id)
    return { success: result.changes > 0 }
  }

  // ── DELETE ────────────────────────────────────────────────
  delete(id: string): { success: boolean } {
    const result = this.db.prepare(`DELETE FROM projects WHERE id = ?`).run(id)
    return { success: result.changes > 0 }
  }

  // ── STATS ─────────────────────────────────────────────────
  // For the dashboard — counts per status in a single query.
  getStatusCounts(): Record<string, number> {
    const rows = this.db.prepare(`
      SELECT status, COUNT(*) as count FROM projects GROUP BY status
    `).all() as { status: string; count: number }[]

    return rows.reduce((acc, row) => {
      acc[row.status] = row.count
      return acc
    }, {} as Record<string, number>)
  }
}
