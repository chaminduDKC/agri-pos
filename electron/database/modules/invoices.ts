// electron/database/modules/invoices.ts

import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

export interface Invoice {
  id: string
  project_id: string
  project_title: string   // joined
  client_id: string
  client_name: string     // joined
  quotation_id: string | null
  amount_due: number
  amount_paid: number
  amount_remaining: number  // computed: amount_due - amount_paid
  payment_status: 'pending' | 'partial' | 'paid'
  due_date: string | null
  notes: string | null
  created_at: string
}

export interface InvoiceInput {
  project_id: string
  client_id: string
  quotation_id?: string
  amount_due: number
  amount_paid?: number
  due_date?: string
  notes?: string
}

export class InvoicesRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // ── GET ALL ───────────────────────────────────────────────
  getAll(): Invoice[] {
    return this.db.prepare(`
      SELECT
        i.*,
        p.title AS project_title,
        c.name  AS client_name,
        (i.amount_due - i.amount_paid) AS amount_remaining
      FROM invoices i
      JOIN projects p ON p.id = i.project_id
      JOIN clients  c ON c.id = i.client_id
      ORDER BY i.created_at DESC
    `).all() as Invoice[]
  }

  getById(id: string): Invoice | undefined {
    return this.db.prepare(`
      SELECT
        i.*,
        p.title AS project_title,
        c.name  AS client_name,
        (i.amount_due - i.amount_paid) AS amount_remaining
      FROM invoices i
      JOIN projects p ON p.id = i.project_id
      JOIN clients  c ON c.id = i.client_id
      WHERE i.id = ?
    `).get(id) as Invoice | undefined
  }

  getByClient(clientId: string): Invoice[] {
    return this.db.prepare(`
      SELECT
        i.*,
        p.title AS project_title,
        c.name  AS client_name,
        (i.amount_due - i.amount_paid) AS amount_remaining
      FROM invoices i
      JOIN projects p ON p.id = i.project_id
      JOIN clients  c ON c.id = i.client_id
      WHERE i.client_id = ?
      ORDER BY i.created_at DESC
    `).all(clientId) as Invoice[]
  }

  // ── CREATE ────────────────────────────────────────────────
  create(input: InvoiceInput): Invoice {
    const id          = randomUUID()
    const amount_paid = input.amount_paid ?? 0

    // Derive payment status automatically from amounts
    const payment_status = deriveStatus(input.amount_due, amount_paid)

    this.db.prepare(`
      INSERT INTO invoices
        (id, project_id, client_id, quotation_id, amount_due, amount_paid, payment_status, due_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.project_id,
      input.client_id,
      input.quotation_id ?? null,
      input.amount_due,
      amount_paid,
      payment_status,
      input.due_date ?? null,
      input.notes    ?? null,
    )

    return this.getById(id)!
  }

  // ── RECORD PAYMENT ────────────────────────────────────────
  // WHY a separate method for payments?
  //   Recording a payment only changes amount_paid.
  //   The status is then derived automatically — no manual
  //   status selection needed. Less chance of human error.
  recordPayment(id: string, additionalAmount: number): Invoice | undefined {
    const invoice = this.getById(id)
    if (!invoice) return undefined

    const newPaid   = Math.min(invoice.amount_paid + additionalAmount, invoice.amount_due)
    const newStatus = deriveStatus(invoice.amount_due, newPaid)

    this.db.prepare(`
      UPDATE invoices
      SET amount_paid    = ?,
          payment_status = ?
      WHERE id = ?
    `).run(newPaid, newStatus, id)

    return this.getById(id)
  }

  // ── UPDATE ────────────────────────────────────────────────
  update(id: string, input: Partial<InvoiceInput>): Invoice | undefined {
    const invoice = this.getById(id)
    if (!invoice) return undefined

    const amount_due  = input.amount_due  ?? invoice.amount_due
    const amount_paid = input.amount_paid ?? invoice.amount_paid
    const status      = deriveStatus(amount_due, amount_paid)

    this.db.prepare(`
      UPDATE invoices SET
        quotation_id   = COALESCE(?, quotation_id),
        amount_due     = ?,
        amount_paid    = ?,
        payment_status = ?,
        due_date       = ?,
        notes          = ?
      WHERE id = ?
    `).run(
      input.quotation_id ?? null,
      amount_due,
      amount_paid,
      status,
      input.due_date ?? null,
      input.notes    ?? null,
      id,
    )

    return this.getById(id)
  }

  delete(id: string): { success: boolean } {
    const result = this.db.prepare(`DELETE FROM invoices WHERE id = ?`).run(id)
    return { success: result.changes > 0 }
  }

  // ── OUTSTANDING SUMMARY ───────────────────────────────────
  // For the dashboard — total amount outstanding across all invoices
  getOutstandingSummary(): { total_due: number; total_paid: number; total_remaining: number } {
    const row = this.db.prepare(`
      SELECT
        SUM(amount_due)  AS total_due,
        SUM(amount_paid) AS total_paid,
        SUM(amount_due - amount_paid) AS total_remaining
      FROM invoices
      WHERE payment_status != 'paid'
    `).get() as any

    return {
      total_due:       row?.total_due       ?? 0,
      total_paid:      row?.total_paid      ?? 0,
      total_remaining: row?.total_remaining ?? 0,
    }
  }
}

// ── Helper ────────────────────────────────────────────────────
// Derives payment status from amounts so it's always consistent.
// Called on create, update, and recordPayment.
function deriveStatus(due: number, paid: number): string {
  if (paid <= 0)    return 'pending'
  if (paid >= due)  return 'paid'
  return 'partial'
}
