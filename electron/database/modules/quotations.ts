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
  transport_installation: number
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
}

export interface QuotationInput {
  client_id: string
  project_id?: string
  status?: string
  valid_until?: string
  transport_installation:number
  notes?: string
  items: QuotationItemInput[]
}

export class QuotationsRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }


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
        (quantity * unit_price) AS line_total
      FROM quotation_items
      WHERE quotation_id = ?
      ORDER BY rowid ASC
    `).all(id) as QuotationItem[]

    return { ...quotation, items }
  }


  create(input: QuotationInput, createdBy: string): QuotationWithItems {
    const id = randomUUID()

    const total = input.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price)
    }, 0)
    const insert = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO quotations (id, client_id, project_id, created_by, status, total_amount, valid_until, notes, transport_installation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.client_id,
        input.project_id  ?? null,
        createdBy,
        input.status      ?? 'draft',
        total,
        input.valid_until ?? null,
        input.notes       ?? null,
        input.transport_installation
      )

      for (const item of input.items) {
        this.db.prepare(`
          INSERT INTO quotation_items (id, quotation_id, item_id, item_name, quantity, unit_price)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          id,
          item.item_id  ?? null,
          item.item_name,
          item.quantity,
          item.unit_price,
          
        )
      }
    })

    insert() // execute the transaction
    return this.getByIdWithItems(id)!
  }


  update(id: string, input: QuotationInput): QuotationWithItems | undefined {
    const total = input.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price)
    }, 0)

    const doUpdate = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE quotations SET
          client_id    = ?,
          project_id   = ?,
          status       = ?,
          total_amount = ?,
          valid_until  = ?,
          transport_installation = ?,
          notes        = ?
        WHERE id = ?
      `).run(
        input.client_id,
        input.project_id  ?? null,
        input.status      ?? 'draft',
        total,
        input.valid_until ?? null,
        input.transport_installation,
        input.notes       ?? null,
        id,
      )

    
      this.db.prepare(`DELETE FROM quotation_items WHERE quotation_id = ?`).run(id)

      for (const item of input.items) {
        this.db.prepare(`
          INSERT INTO quotation_items (id, quotation_id, item_id, item_name, quantity, unit_price)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          id,
          item.item_id  ?? null,
          item.item_name,
          item.quantity,
          item.unit_price,
        
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
