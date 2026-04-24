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

  // ── GET ALL ───────────────────────────────────────────────
  // Returns all clients, newest first.
  // WHY ORDER BY created_at DESC?
  //   Most recently added clients appear at the top — more useful
  //   than alphabetical when you're actively adding new clients.
  getAll(): Client[] {
    return this.db
      .prepare(`
        SELECT id, name, phone, email, address, notes, created_at
        FROM clients
        ORDER BY created_at DESC
      `)
      .all() as Client[]
  }

  // ── GET BY ID ─────────────────────────────────────────────
  // Returns one client or undefined if not found.
  // Used when opening a client's detail page.
  getById(id: string): Client | undefined {
    return this.db
      .prepare(`
        SELECT id, name, phone, email, address, notes, created_at
        FROM clients
        WHERE id = ?
      `)
      .get(id) as Client | undefined
  }

  // ── SEARCH ────────────────────────────────────────────────
  // Simple name/phone/email search using SQL LIKE.
  // The '%' wildcard means "anything before or after the search term".
  // e.g. searching "silva" matches "John Silva", "Silva Homes", etc.
  search(query: string): Client[] {
    const term = `%${query}%`
    return this.db
      .prepare(`
        SELECT id, name, phone, email, address, notes, created_at
        FROM clients
        WHERE name    LIKE ?
           OR phone   LIKE ?
           OR email   LIKE ?
        ORDER BY name ASC
      `)
      .all(term, term, term) as Client[]
  }

  // ── CREATE ────────────────────────────────────────────────
  // Inserts a new client and returns the complete created record.
  //
  // WHY return the full record after insert?
  //   The UI needs the id and created_at that were generated
  //   server-side. Returning the full record means the UI can
  //   immediately add it to the list without a second fetch.
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

  // ── UPDATE ────────────────────────────────────────────────
  // Updates only the fields that can be changed.
  // Note: id and created_at are never updated.
  //
  // Returns the updated record so the UI can refresh in place.
  update(id: string, input: ClientInput): Client | undefined {
    this.db
      .prepare(`
        UPDATE clients
        SET name    = ?,
            phone   = ?,
            email   = ?,
            address = ?,
            notes   = ?
        WHERE id = ?
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

  // ── DELETE ────────────────────────────────────────────────
  // Deletes a client by id.
  //
  // WHY check changes?
  //   stmt.run() returns info including 'changes' — the number of
  //   rows affected. If changes = 0, the id didn't exist.
  //   We return a success flag so the UI can handle "not found".
  //
  // NOTE: If this client has projects linked to them, SQLite will
  // throw a FOREIGN KEY constraint error. The UI should warn the
  // user before deleting a client that has projects.
  delete(id: string): { success: boolean } {
    const result = this.db
      .prepare(`DELETE FROM clients WHERE id = ?`)
      .run(id)

    return { success: result.changes > 0 }
  }

  // ── GET WITH STATS ────────────────────────────────────────
  // Returns clients with extra counts — useful for the list view
  // to show "3 projects" next to each client without a separate call.
  //
  // This uses a SQL JOIN + COUNT — your first multi-table query!
  // LEFT JOIN means: include clients even if they have 0 projects.
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
        LEFT JOIN projects p ON p.client_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `)
      .all() as (Client & { project_count: number })[]
  }
}
