// electron/database/modules/items.ts

import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

export interface Item {
  id: string
  name: string
  category: string | null
  unit: string
  quantity: number
  low_stock_threshold: number
  barcode: string | null
  supplier: string | null
  source: 'local' | 'external'
  unit_size: string | null
  unit_price: number
  updated_at: string
}

export interface ItemInput {
  name: string
  category?: string
  unit: string
  quantity?: number
  low_stock_threshold?: number
  barcode?: string
  supplier?: string
  source?: 'local' | 'external'
  unit_price?: number,
  unit_size?:string
}

export class ItemsRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // ── GET ALL ───────────────────────────────────────────────
  getAll(): Item[] {
    return this.db.prepare(`
      SELECT * FROM items WHERE is_deleted = 0 ORDER BY name ASC 
    `).all() as Item[]
  }

  getLowStock(): Item[] {
    return this.db.prepare(`
      SELECT * FROM items
      WHERE quantity < low_stock_threshold AND is_deleted = 0
      ORDER BY (low_stock_threshold - quantity) DESC
    `).all() as Item[]
  }

  // ── GET BY BARCODE ────────────────────────────────────────
  // Called when a barcode is scanned — returns the matching item
  // instantly so the user doesn't have to search manually.
  getByBarcode(barcode: string): Item | undefined {
    return this.db.prepare(`
      SELECT * FROM items WHERE barcode = ? AND is_deleted = 0
    `).get(barcode) as Item | undefined
  }

  // ── GET BY ID ─────────────────────────────────────────────
  getById(id: string): Item | undefined {
    return this.db.prepare(`
      SELECT * FROM items WHERE id = ? AND is_deleted = 0
    `).get(id) as Item | undefined
  }

  // ── SEARCH ────────────────────────────────────────────────
  search(query: string): Item[] {
    const term = `%${query}%`
    return this.db.prepare(`
      SELECT * FROM items
      WHERE name     LIKE ?
         OR category LIKE ?
         OR barcode  LIKE ?
         OR supplier LIKE ?
          AND is_deleted = 0
      ORDER BY name ASC
    `).all(term, term, term, term) as Item[]
  }

  // ── GET BY CATEGORY ───────────────────────────────────────
  getByCategory(category: string): Item[] {
    return this.db.prepare(`
      SELECT * FROM items WHERE category = ? AND is_deleted = 0 ORDER BY name ASC
    `).all(category) as Item[]
  }

  // ── GET ALL CATEGORIES ────────────────────────────────────
  // Returns the distinct list of categories for the filter dropdown.
  // DISTINCT means duplicates are removed automatically by SQL.
  getCategories(): string[] {
    const rows = this.db.prepare(`
      SELECT DISTINCT category FROM items
      WHERE category IS NOT NULL AND is_deleted = 0
      ORDER BY category ASC
    `).all() as { category: string }[]
    return rows.map(r => r.category)
  }

  // ── CREATE ────────────────────────────────────────────────
  create(input: ItemInput) {
    console.log(input)
    const id = randomUUID()
    this.db.prepare(`
      INSERT INTO items (id, name, category, unit, quantity, low_stock_threshold, barcode, supplier, source, unit_price, unit_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name,
      input.category        ?? null,
      input.unit,
      input.quantity        ?? 0,
      input.low_stock_threshold ?? 5,
      input.barcode         ?? null,
      input.supplier        ?? null,
      input.source          ?? 'local',
      input.unit_price      ?? 0,
      input.unit_size       ?? null,
    )
    return this.getById(id)!
  }

  // ── UPDATE ────────────────────────────────────────────────
  update(id: string, input: ItemInput): Item | undefined {
    console.log(input, id)
    this.db.prepare(`
      UPDATE items SET
        name                = ?,
        category            = ?,
        unit                = ?,
        low_stock_threshold = ?,
        barcode             = ?,
        supplier            = ?,
        unit_price          = ?,
        unit_size           = ?,
        source              = ?,
        quantity              = ?,
        is_synced = 0
        updated_at          = datetime('now')
      WHERE id = ?
    `).run(
      input.name,
      input.category        ?? null,
      input.unit,
      input.low_stock_threshold ?? 5,
      input.barcode         ?? null,
      input.supplier        ?? null,
      input.unit_price      ?? 0,
      input.unit_size       ?? null,
      input.source          ?? 'local',
      input.quantity ?? 0,
    
      id,
    )
    return this.getById(id)
  }

  // ── ADJUST QUANTITY ───────────────────────────────────────
  // WHY SEPARATE from update()?
  //   Quantity changes happen in two ways:
  //   1. Manual stock adjustment (admin sets qty directly)
  //   2. Automatic: items issued to / returned from a project
  //
  //   Keeping this separate means material_issues can call it
  //   cleanly without needing to pass all the other fields.
  //
  //   delta is positive to ADD stock, negative to REMOVE stock.
  //   e.g. adjustQuantity(id, -10) removes 10 from stock.
  adjustQuantity(id: string, delta: number): Item | undefined {
    this.db.prepare(`
      UPDATE items
      SET quantity   = quantity + ?, is_synced = 0
          updated_at = datetime('now')
      WHERE id = ? AND is_deleted = 0
    `).run(delta, id)
    return this.getById(id)
  }

  // ── SET QUANTITY ──────────────────────────────────────────
  // For manual stock correction — admin sets the exact value.
  setQuantity(id: string, quantity: number): Item | undefined {
    this.db.prepare(`
      UPDATE items
      SET quantity   = ?, is_synced = 0
          updated_at = datetime('now')
      WHERE id = ? AND is_deleted = 0
    `).run(quantity, id)
    return this.getById(id)
  }

  // ── DELETE ────────────────────────────────────────────────
  delete(id: string): { success: boolean } {
    const result = this.db.prepare(`UPDATE items SET is_deleted = 1, is_synced = 0 WHERE id = ? AND is_deleted = 0`).run(id)
    return { success: result.changes > 0 }
  }
}
