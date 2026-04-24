// electron/database/modules/quotations.ts

import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

export interface QuotationItem {
  id: string
  quotation_id: string
  item_id: string | null
  item_name: string
  quantity: number
  unit_price: number
  labor_cost: number
  line_total: number  // computed: (quantity * unit_price) + labor_cost
}

export interface Quotation {
  id: string
  client_id: string
  client_name: string   // joined
  project_id: string | null
  project_title: string | null  // joined
  created_by: string
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  total_amount: number
  valid_until: string | null
  notes: string | null
  created_at: string
}

export interface QuotationWithItems extends Quotation {
  items: QuotationItem[]
}

export interface QuotationItemInput {
  item_id?: string
  item_name: string
  quantity: number
  unit_price: number
  labor_cost?: number
}

export interface QuotationInput {
  client_id: string
  project_id?: string
  status?: string
  valid_until?: string
  notes?: string
  items: QuotationItemInput[]
}

export class QuotationsRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // ── GET ALL ───────────────────────────────────────────────
  // Returns quotation headers only (no line items).
  // Line items are fetched separately when you open a quotation.
  // WHY? Loading all items for all quotations would be slow
  // and wasteful when displaying a list.
  getAll(): Quotation[] {
    return this.db.prepare(`
      SELECT
        q.*,
        c.name  AS client_name,
        p.title AS project_title
      FROM quotations q
      JOIN  clients  c ON c.id = q.client_id
      LEFT JOIN projects p ON p.id = q.project_id
      ORDER BY q.created_at DESC
    `).all() as Quotation[]
  }

  // ── GET BY ID WITH ITEMS ──────────────────────────────────
  // Returns a single quotation with all its line items.
  // Used when opening a quotation to view or edit it.
  getByIdWithItems(id: string): QuotationWithItems | undefined {
    const quotation = this.db.prepare(`
      SELECT
        q.*,
        c.name  AS client_name,
        p.title AS project_title
      FROM quotations q
      JOIN  clients  c ON c.id = q.client_id
      LEFT JOIN projects p ON p.id = q.project_id
      WHERE q.id = ?
    `).get(id) as Quotation | undefined

    if (!quotation) return undefined

    const items = this.db.prepare(`
      SELECT
        *,
        (quantity * unit_price) + labor_cost AS line_total
      FROM quotation_items
      WHERE quotation_id = ?
      ORDER BY rowid ASC
    `).all(id) as QuotationItem[]

    return { ...quotation, items }
  }

  // ── CREATE WITH ITEMS ─────────────────────────────────────
  // WHY db.transaction()?
  //   We're writing to TWO tables. If inserting an item fails
  //   halfway through, we'd have a quotation with missing items.
  //   A transaction guarantees all inserts succeed or none do.
  create(input: QuotationInput, createdBy: string): QuotationWithItems {
    const id = randomUUID()

    // Calculate total from line items
    const total = input.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price) + (item.labor_cost ?? 0)
    }, 0)

    // db.transaction() returns a function. Calling that function
    // wraps everything inside in a single atomic transaction.
    const insert = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO quotations (id, client_id, project_id, created_by, status, total_amount, valid_until, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.client_id,
        input.project_id  ?? null,
        createdBy,
        input.status      ?? 'draft',
        total,
        input.valid_until ?? null,
        input.notes       ?? null,
      )

      for (const item of input.items) {
        this.db.prepare(`
          INSERT INTO quotation_items (id, quotation_id, item_id, item_name, quantity, unit_price, labor_cost)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          id,
          item.item_id  ?? null,
          item.item_name,
          item.quantity,
          item.unit_price,
          item.labor_cost ?? 0,
        )
      }
    })

    insert() // execute the transaction
    return this.getByIdWithItems(id)!
  }

  // ── UPDATE WITH ITEMS ─────────────────────────────────────
  // WHY delete all items then re-insert?
  //   Diffing which items changed, which are new, which are
  //   deleted is complex. For a quotation editor, the simpler
  //   approach is: delete all old lines, insert the new ones.
  //   ON DELETE CASCADE on quotation_items handles the deletion.
  //   This is safe because quotations aren't live inventory —
  //   they're just documents.
  update(id: string, input: QuotationInput): QuotationWithItems | undefined {
    const total = input.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price) + (item.labor_cost ?? 0)
    }, 0)

    const doUpdate = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE quotations SET
          client_id    = ?,
          project_id   = ?,
          status       = ?,
          total_amount = ?,
          valid_until  = ?,
          notes        = ?
        WHERE id = ?
      `).run(
        input.client_id,
        input.project_id  ?? null,
        input.status      ?? 'draft',
        total,
        input.valid_until ?? null,
        input.notes       ?? null,
        id,
      )

      // Delete all existing line items (ON DELETE CASCADE would
      // handle this if we deleted the quotation, but here we're
      // just replacing the items while keeping the quotation)
      this.db.prepare(`DELETE FROM quotation_items WHERE quotation_id = ?`).run(id)

      for (const item of input.items) {
        this.db.prepare(`
          INSERT INTO quotation_items (id, quotation_id, item_id, item_name, quantity, unit_price, labor_cost)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          id,
          item.item_id  ?? null,
          item.item_name,
          item.quantity,
          item.unit_price,
          item.labor_cost ?? 0,
        )
      }
    })

    doUpdate()
    return this.getByIdWithItems(id)
  }

  // ── UPDATE STATUS ─────────────────────────────────────────
  updateStatus(id: string, status: string): Quotation | undefined {
    this.db.prepare(`UPDATE quotations SET status = ? WHERE id = ?`).run(status, id)
    return this.getAll().find(q => q.id === id)
  }

  // ── DELETE ────────────────────────────────────────────────
  // Deleting the quotation also deletes its items automatically
  // because of ON DELETE CASCADE on quotation_items.quotation_id
  delete(id: string): { success: boolean } {
    const result = this.db.prepare(`DELETE FROM quotations WHERE id = ?`).run(id)
    return { success: result.changes > 0 }
  }

  // ── SEARCH ────────────────────────────────────────────────
  search(query: string): Quotation[] {
    const term = `%${query}%`
    return this.db.prepare(`
      SELECT q.*, c.name AS client_name, p.title AS project_title
      FROM quotations q
      JOIN clients c ON c.id = q.client_id
      LEFT JOIN projects p ON p.id = q.project_id
      WHERE c.name  LIKE ?
         OR p.title LIKE ?
         OR q.notes LIKE ?
      ORDER BY q.created_at DESC
    `).all(term, term, term) as Quotation[]
  }
}
