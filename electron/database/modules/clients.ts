// electron/database/modules/clients.ts
// ─────────────────────────────────────────────────────────────
// WHY A SEPARATE FILE PER MODULE?
//
//   All SQL for clients lives here. Main.ts just calls these
//   functions — it doesn't write any SQL itself. This separation
//   means if you need to fix a query, you know exactly where to go.
//
//   This pattern is called a REPOSITORY — a class that abstracts
//   all database operations for one entity.
//
// HOW PREPARED STATEMENTS WORK:
//
//   NEVER do this (SQL injection risk):
//     db.exec(`SELECT * FROM clients WHERE id = '${id}'`)
//
//   ALWAYS do this (safe — values are passed separately):
//     db.prepare('SELECT * FROM clients WHERE id = ?').get(id)
//
//   The '?' is a placeholder. SQLite receives the value separately
//   and never treats it as SQL code. This prevents SQL injection.
// ─────────────────────────────────────────────────────────────

import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

// TypeScript interface — defines the shape of a Client object.
// Using this everywhere means TypeScript will warn you if you
// accidentally pass the wrong fields.
export interface Client {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
}

// Input type for creating/updating — no id or created_at needed
export interface ClientInput {
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export class ClientsRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  getAll(): Client[] {
    return this.db
      .prepare(`
        SELECT id, name, phone, email, address, notes, created_at
        FROM clients WHERE is_deleted = 0
        ORDER BY created_at DESC
      `)
      .all() as Client[]
  }

  getById(id: string): Client | undefined {
    return this.db
      .prepare(`
        SELECT id, name, phone, email, address, notes, created_at
        FROM clients
        WHERE id = ? AND is_deleted = 0
      `)
      .get(id) as Client | undefined
  }


search(query: string): Client[] {
    const term = `%${query}%`
    return this.db
      .prepare(`
        SELECT id, name, phone, email, address, notes, created_at
        FROM clients
        WHERE (name  LIKE ?
           OR phone LIKE ?
           OR email LIKE ?)
          AND is_deleted = 0
        ORDER BY name ASC
      `)
      .all(term, term, term) as Client[]
  }

  create(input: ClientInput): Client {
    const id = randomUUID()

    this.db
      .prepare(`
        INSERT INTO clients (id, name, phone, email, address, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        input.name,
        input.phone   ?? null,
        input.email   ?? null,
        input.address ?? null,
        input.notes   ?? null
      )

    // Fetch and return the full record (includes created_at from DB)
    return this.getById(id)!
  }


  update(id: string, input: ClientInput): Client | undefined {
    this.db
      .prepare(`
        UPDATE clients
        SET name    = ?,
            phone   = ?,
            email   = ?,
            address = ?,
            notes   = ?,
            is_synced = 0
        WHERE id = ? AND is_deleted = 0
      `)
      .run(
        input.name,
        input.phone   ?? null,
        input.email   ?? null,
        input.address ?? null,
        input.notes   ?? null,
        id
      )

    return this.getById(id)
  }


  delete(id: string): { success: boolean } {
    const result = this.db
      .prepare(`UPDATE clients SET is_deleted = 1, is_synced = 0 WHERE id = ? AND is_deleted = 0`)
      .run(id)

    return { success: result.changes > 0 }
  }

getAllWithStats(): (Client & { project_count: number })[] {
    return this.db
      .prepare(`
        SELECT
          c.id,
          c.name,
          c.phone,
          c.email,
          c.address,
          c.notes,
          c.created_at,
          COUNT(p.id) AS project_count
        FROM clients c
        LEFT JOIN projects p ON p.client_id = c.id AND p.is_deleted = 0
        WHERE c.is_deleted = 0
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `)
      .all() as (Client & { project_count: number })[]
  }
}
