// electron/database/modules/allocations.ts

import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

// ── Types ─────────────────────────────────────────────────────

export interface SubProject {
  id: string
  project_id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  parent_id:string | null
  level: number
  notes: string | null
  created_at: string
}

export interface ProjectAllocation {
  id: string
  project_id: string
  item_id: string | null
  item_name: string
  item_unit: string
  item_unit_size: string | null
  source: 'local' | 'external'
  quantity_allocated: number
  quantity_used: number
  quantity_returned: number
  quantity_assigned_for_sub: number
  quantity_remaining: number  // computed: allocated - used - returned
}

export interface SubProjectAllocation {
  id: string
  sub_project_id: string
  sub_project_title: string  // joined
  project_allocation_id: string
  item_name: string          // joined
  item_unit: string          // joined
  quantity_assigned: number
  quantity_used: number
  quantity_remaining: number // computed: assigned - used
}

export interface AllocationInput {
  project_id: string
  item_id?: string
  item_name: string
  item_unit: string
  item_unit_size?: string
  source: 'local' | 'external'
  quantity_allocated: number
}

export interface SubProjectInput {
  project_id: string
  title: string
  location:string
  status?: string
  notes?: string
}

export interface SubProjectAllocationInput {
  sub_project_id: string
  allocation_id: string
  quantity_allocated: number
}

export interface Allocation {
  id: string
  project_id: string
  item_id: string | null
  item_name: string
  item_unit: string
  item_unit_size: string | null
  source: 'local' | 'external'
  quantity_allocated: number
  quantity_assigned: number
  quantity_used: number
  quantity_returned: number
  quantity_received_back: number
  created_at: string
}

export interface SubAllocation {
  id: string
  sub_project_id: string
  allocation_id: string | null
  quantity_allocated: number
  quantity_assigned: number
  quantity_used: number
  quantity_returned: number
  quantity_received_back: number
  allocated_at: string
  item_name?: string
  item_unit?: string
  item_unit_size?: string | null
  source?: 'local' | 'external'
  quantity_remaining?: number
}

export interface ChildAllocation {
  id: string
  parent_id: string
  allocation_id: string | null
  quantity_allocated: number
  quantity_used: number
  quantity_returned: number
  allocated_at: string
  // joined
  item_name?: string
  item_unit?: string
  item_unit_size?: string | null
  source?: 'local' | 'external'
  quantity_remaining?: number
}

export interface CreateAllocationInput {
  project_id: string
  item_id?: string
  item_name: string
  item_unit: string
  item_unit_size?: string
  source: 'local' | 'external'
  quantity_allocated: number
}

export interface CreateSubAllocationInput {
  sub_project_id: string
  allocation_id: string      
  quantity_allocated: number
  quantity_received_back:number
}

export interface CreateChildAllocationInput {
  child_project_id: string
  parent_id: string          // references sub_allocations.id
  allocation_id: string      // references allocations.id (for source tracking)
  quantity_allocated: number
}

export interface MarkUsedInput {
  id: string
  quantity_used: number
}

export interface ReturnInput {
  id: string
  quantity_returned: number
}


// ── SubProjectsRepository ─────────────────────────────────────

export class SubProjectsRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  getByProject(projectId: string): SubProject[] {
    return this.db.prepare(`
      SELECT * FROM sub_projects
      WHERE project_id = ?
      ORDER BY created_at DESC
    `).all(projectId) as SubProject[]
  }

  getById(id: string): SubProject | undefined {
    return this.db.prepare(`SELECT * FROM sub_projects WHERE id = ?`).get(id) as SubProject | undefined
  }

  create(input: SubProjectInput): SubProject {
    const id = randomUUID()
    
    console.log('Creating sub-project with input:', input)
    this.db.prepare(`
      INSERT INTO sub_projects (id, project_id, title, location, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, input.project_id, input.title, input.location, input.status ?? 'pending', input.notes ?? null)
    return this.getById(id)!
  }


  updateStatus(id: string, status: string): SubProject | undefined {
    const sub = this.db.prepare(`SELECT * FROM sub_projects WHERE id = ?`).get(id) as SubProject | undefined
    if (!sub) throw new Error('Sub-project not found')
      const childs = this.db.prepare(`SELECT * FROM child_projects WHERE parent_id = ?`).all(id) as any[];
    if(childs.length> 0){
      const completedCount = childs.filter((c:any)=> c.status === "completed").length;
      if(status === "completed" && completedCount < childs.length){
        throw new Error(`Cannot mark as completed: ${childs.length - completedCount} child projects still not completed.`)
      }
    }
    this.db.prepare(`UPDATE sub_projects SET status = ? WHERE id = ?`).run(status, id)
    return this.getById(id)
  }

  update(id: string, input: Partial<SubProjectInput>): SubProject | undefined {
    this.db.prepare(`
      UPDATE sub_projects SET
        title  = COALESCE(?, title),
        status = COALESCE(?, status),
        notes  = ?
      WHERE id = ?
    `).run(input.title ?? null, input.status ?? null, input.notes ?? null, id)
    return this.getById(id)
  }

  delete(id: string): { success: boolean } {
    const result = this.db.prepare(`DELETE FROM sub_projects WHERE id = ?`).run(id)
    return { success: result.changes > 0 }
  }
}

// ── AllocationsRepository ─────────────────────────────────────

export class AllocationsRepository {
  constructor(private db: Database.Database) {}

  // ── Main Allocations ────────────────────────────────────────────────────────



markUsed(id: string, qty: number) {

  const tables = [
    "allocations",
    "sub_allocations",
    "child_allocations"
  ];

  for (const table of tables) {

    const result = this.db
      .prepare(`SELECT * FROM ${table} WHERE id = ?`)
      .get(id);

    if (result) {
      this.db.prepare(`UPDATE ${table} SET quantity_used = quantity_used + ? WHERE id = ?`).run(qty, id)
      console.log(`ID belongs to table: ${table}`);
      console.log(result);

      return {
        table,
        data: result
      };
    }
  }

  console.log("ID not found in any table");

  return null;
}



  getByProject(projectId: string): Allocation[] {
    return this.db.prepare(`
      SELECT * FROM allocations
      WHERE project_id = ?
      ORDER BY created_at ASC
    `).all(projectId) as Allocation[]
  }

  getById(id: string): Allocation | undefined {
    return this.db.prepare(`SELECT * FROM allocations WHERE id = ?`).get(id) as Allocation | undefined
  }

  create(input: CreateAllocationInput): Allocation {
    const id = randomUUID()
    this.db.prepare(`
      INSERT INTO allocations
        (id, project_id, item_id, item_name, item_unit, item_unit_size, source, quantity_allocated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.project_id,
      input.item_id ?? null,
      input.item_name,
      input.item_unit,
      input.item_unit_size ?? null,
      input.source,
      input.quantity_allocated,
    )

    // deduct from inventory

    if(input.source !== "local") return this.getById(id)!
    this.db.prepare(`
        UPDATE items SET quantity = quantity - ? WHERE id = ?
      `).run(input.quantity_allocated, input.item_id)
    return this.getById(id)!
  }

  /**
   * Return quantity from a main allocation back to inventory.
   * Only allowed if source is 'local'.
   * quantity_returned cannot exceed (quantity_allocated - quantity_assigned - quantity_used).
   */
  returnToInventory(id: string, quantity: number): Allocation {
    const alloc = this.getById(id)
    if (!alloc) throw new Error('Allocation not found')
    if (alloc.source !== 'local') throw new Error('Only local allocations can be returned to inventory')

    const returnable = alloc.quantity_allocated - alloc.quantity_assigned - alloc.quantity_used - alloc.quantity_returned
    if (quantity > returnable) {
      throw new Error(`Only ${returnable} ${alloc.item_unit} can be returned (${alloc.quantity_assigned} is assigned to sub-projects)`)
    }

    this.db.prepare(`
      UPDATE allocations SET quantity_returned = quantity_returned + ? WHERE id = ?
    `).run(quantity, id)

    this.db.prepare(`
        UPDATE items SET quantity = quantity + ? WHERE id = ?
      `).run(quantity, alloc.item_id);
    return this.getById(id)!
  }

  /**
   * Delete a main allocation only if nothing is still outstanding.
   */
  delete(id: string): void {
    const alloc = this.getById(id)
    if (!alloc) throw new Error('Allocation not found')

    const remaining = alloc.quantity_allocated - alloc.quantity_used - alloc.quantity_returned
    if (remaining > 0) {
      throw new Error(`Cannot delete: ${remaining} ${alloc.item_unit} still remaining`)
    }

    this.db.prepare(`DELETE FROM allocations WHERE id = ?`).run(id)
  }

  // ── Sub Allocations ─────────────────────────────────────────────────────────

  getSubAllocationsBySubProject(subProjectId: string): SubAllocation[] {
    return this.db.prepare(`
      SELECT
        sa.*,
        a.item_name,
        a.item_unit,
        a.item_unit_size,
        a.source,
        (sa.quantity_allocated - sa.quantity_used - sa.quantity_returned) AS quantity_remaining
      FROM sub_allocations sa
      LEFT JOIN allocations a ON a.id = sa.allocation_id
      WHERE sa.sub_project_id = ?
      ORDER BY sa.allocated_at ASC
    `).all(subProjectId) as SubAllocation[]
  }

  getSubAllocationById(id: string): SubAllocation | undefined {
    return this.db.prepare(`SELECT * FROM sub_allocations WHERE id = ?`).get(id) as SubAllocation | undefined
  }

  /**
   * Allocate from a main allocation down to a sub-project.
   * Deducts from allocations.quantity_allocated available pool (tracks via quantity_assigned).
   */
  createSubAllocation(input: CreateSubAllocationInput): SubAllocation {
    const mainAlloc = this.getById(input.allocation_id)
    console.log(input);
    
    if (!mainAlloc) throw new Error('Main allocation not found')

    const available =
      mainAlloc.quantity_allocated -
      mainAlloc.quantity_assigned -
      mainAlloc.quantity_used -
      mainAlloc.quantity_returned

    if (input.quantity_allocated + input.quantity_received_back > available) {
      throw new Error(`Only ${available} ${mainAlloc.item_unit} available to assign`)
    }

    const id = randomUUID()

    const run = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO sub_allocations
          (id, sub_project_id, allocation_id, quantity_allocated, quantity_assigned, quantity_used, quantity_returned)
        VALUES (?, ?, ?, ?, 0, 0, 0)
      `).run(id, input.sub_project_id, input.allocation_id, input.quantity_allocated)

      this.db.prepare(`
        UPDATE allocations SET quantity_assigned = quantity_assigned + ? WHERE id = ?
      `).run(input.quantity_allocated, input.allocation_id)
    })

    run()
    return this.getSubAllocationById(id)!
  }

  /**
   * Mark quantity as used at sub level.
   * Propagates up to main allocation.
   * Blocked if the sub-project has any child projects.
   */
  markSubUsed(input: MarkUsedInput): SubAllocation {
    const sa = this.getSubAllocationById(input.id)
    if (!sa) throw new Error('Sub allocation not found')

    // Check if this sub-project has children — if so, usage must go through children
    const childCount = (this.db.prepare(`
      SELECT COUNT(*) AS cnt FROM child_projects WHERE parent_id = ?
    `).get(sa.sub_project_id) as { cnt: number }).cnt

    if (childCount > 0) {
      throw new Error('This sub-project has child projects. Mark usage through child projects instead.')
    }

    const usable = sa.quantity_allocated - sa.quantity_used - sa.quantity_returned
    if (input.quantity_used > usable) {
      throw new Error(`Only ${usable} ${sa.quantity_allocated} available to mark as used`)
    }

    const run = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE sub_allocations SET quantity_used = quantity_used + ? WHERE id = ?
      `).run(input.quantity_used, input.id)

      if (sa.allocation_id) {
        this.db.prepare(`
          UPDATE allocations SET quantity_used = quantity_used + ? WHERE id = ?
        `).run(input.quantity_used, sa.allocation_id)
      }
    })

    run()
    this._checkAndCompleteSubProject(sa.sub_project_id)
    return this.getSubAllocationById(input.id)!
  }


 
  /**
   * Return quantity from sub-allocation back to the main allocation pool.
   * Blocked if the sub-project has any child projects.
   */
  returnSubToMain(id: string, quantity: number): SubAllocation {
    const sa = this.getSubAllocationById(id)
    if (!sa) throw new Error('Sub allocation not found')


    const returnable = sa.quantity_allocated - sa.quantity_used - sa.quantity_returned
    if (quantity > returnable) {
      throw new Error(`Only ${returnable} can be returned`)
    }

    const run = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE sub_allocations SET quantity_returned = quantity_returned + ? WHERE id = ?
      `).run(quantity, id)

      if (sa.allocation_id) {
        // Free up the assigned pool in main allocation
        this.db.prepare(`
          UPDATE allocations
          SET quantity_received_back = quantity_received_back + ?
          WHERE id = ?
        `).run(quantity, sa.allocation_id)
      }
    })

    run()
    return this.getSubAllocationById(id)!
  }

  deleteSubAllocation(id: string): void {
    const sa = this.getSubAllocationById(id)
    if (!sa) throw new Error('Sub allocation not found')

    const remaining = sa.quantity_allocated - sa.quantity_used - sa.quantity_returned
    if (remaining > 0) throw new Error(`Cannot delete: ${remaining} still remaining`)

    const run = this.db.transaction(() => {
      this.db.prepare(`DELETE FROM sub_allocations WHERE id = ?`).run(id)
      if (sa.allocation_id) {
        this.db.prepare(`
          UPDATE allocations SET quantity_assigned = quantity_assigned - ? WHERE id = ?
        `).run(sa.quantity_allocated, sa.allocation_id)
      }
    })

    run()
  }

  // ── Child Allocations ───────────────────────────────────────────────────────

  getChildAllocationsByChildProject(childProjectId: string): ChildAllocation[] {
    console.log("called");
    
    return this.db.prepare(`
      SELECT
        ca.*,
        a.item_name,
        a.item_unit,
        a.item_unit_size,
        a.source,
        (ca.quantity_allocated - ca.quantity_used - ca.quantity_returned) AS quantity_remaining
      FROM child_allocations ca
      LEFT JOIN allocations a ON a.id = ca.allocation_id
      WHERE ca.child_project_id = ?
      ORDER BY ca.allocated_at ASC
    `).all(childProjectId) as ChildAllocation[]
  }

  getChildAllocationById(id: string): ChildAllocation | undefined {
    return this.db.prepare(`SELECT * FROM child_allocations WHERE id = ?`).get(id) as ChildAllocation | undefined
  }

  /**
   * Allocate from a sub-allocation down to a child project.
   * Deducts from sub_allocations.quantity_assigned pool.
   */
  createChildAllocation(input: CreateChildAllocationInput): ChildAllocation {
    const subAlloc = this.getSubAllocationById(input.parent_id)
    if (!subAlloc) throw new Error('Sub allocation not found')

    const available =
      subAlloc.quantity_allocated -
      subAlloc.quantity_assigned -
      subAlloc.quantity_used -
      subAlloc.quantity_returned

    if (input.quantity_allocated > available) {
      throw new Error(`Only ${available} available to assign to child`)
    }

    const id = randomUUID()

    const run = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO child_allocations
          (id, child_project_id, parent_id, allocation_id, quantity_allocated, quantity_used, quantity_returned)
        VALUES (?, ?, ?, ?, ?, 0, 0)
      `).run(id, input.child_project_id, input.parent_id, input.allocation_id, input.quantity_allocated)

      this.db.prepare(`
        UPDATE sub_allocations SET quantity_assigned = quantity_assigned + ? WHERE id = ?
      `).run(input.quantity_allocated, input.parent_id)
    })

    run()
    return this.getChildAllocationById(id)!
  }

  /**
   * Mark quantity as used at child level.
   * Propagates up to sub_allocation and main allocation.
   */
  markChildUsed(input: MarkUsedInput): ChildAllocation {
    const ca = this.getChildAllocationById(input.id)
    if (!ca) throw new Error('Child allocation not found')

    const usable = ca.quantity_allocated - ca.quantity_used - ca.quantity_returned
    if (input.quantity_used > usable) {
      throw new Error(`Only ${usable} available to mark as used`)
    }

    const run = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE child_allocations SET quantity_used = quantity_used + ? WHERE id = ?
      `).run(input.quantity_used, input.id)

      // Propagate to sub allocation
      this.db.prepare(`
        UPDATE sub_allocations SET quantity_used = quantity_used + ? WHERE id = ?
      `).run(input.quantity_used, ca.parent_id)

      // Propagate to main allocation
      if (ca.allocation_id) {
        this.db.prepare(`
          UPDATE allocations SET quantity_used = quantity_used + ? WHERE id = ?
        `).run(input.quantity_used, ca.allocation_id)
      }
    })

    run()

    // Check if parent sub-project should auto-complete
    const subAlloc = this.getSubAllocationById(ca.parent_id)
    if (subAlloc) this._checkAndCompleteSubProject(subAlloc.sub_project_id)

    return this.getChildAllocationById(input.id)!
  }

  /**
   * Return quantity from child allocation back up the chain.
   */
  returnChildToSub(id: string, quantity: number): ChildAllocation {
    const ca = this.getChildAllocationById(id)
    if (!ca) throw new Error('Child allocation not found')

    const returnable = ca.quantity_allocated - ca.quantity_used - ca.quantity_returned
    if (quantity > returnable) throw new Error(`Only ${returnable} can be returned`)

    const run = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE child_allocations SET quantity_returned = quantity_returned + ? WHERE id = ?
      `).run(quantity, id)

      // Free the assigned slot in sub allocation
      this.db.prepare(`
        UPDATE sub_allocations
        SET quantity_received_back = quantity_received_back + ?
        WHERE id = ?
      `).run(quantity,  ca.parent_id)

    })

    run()
    return this.getChildAllocationById(id)!
  }

  deleteChildAllocation(id: string): void {
    const ca = this.getChildAllocationById(id)
    if (!ca) throw new Error('Child allocation not found')

    const remaining = ca.quantity_allocated - ca.quantity_used - ca.quantity_returned
    if (remaining > 0) throw new Error(`Cannot delete: ${remaining} still remaining`)

    const run = this.db.transaction(() => {
      this.db.prepare(`DELETE FROM child_allocations WHERE id = ?`).run(id)
      this.db.prepare(`
        UPDATE sub_allocations SET quantity_assigned = quantity_assigned - ? WHERE id = ?
      `).run(ca.quantity_allocated, ca.parent_id)
    })

    run()
  }

  // ── Auto-complete helpers ───────────────────────────────────────────────────

  /**
   * If all sub-allocations of a sub-project are fully used/returned,
   * auto-mark the sub-project as completed.
   * Then check if the parent project should also complete.
   */
  private _checkAndCompleteSubProject(subProjectId: string): void {
    const allocs = this.getSubAllocationsBySubProject(subProjectId)
    if (allocs.length === 0) return

    const allDone = allocs.every(a => (a.quantity_allocated - a.quantity_used - a.quantity_returned) === 0)
    if (!allDone) return

    this.db.prepare(`UPDATE sub_projects SET status = 'completed' WHERE id = ?`).run(subProjectId)

    const subProject = this.db.prepare(`SELECT * FROM sub_projects WHERE id = ?`).get(subProjectId) as { project_id: string } | undefined
    if (subProject) this._checkAndCompleteProject(subProject.project_id)
  }

  private _checkAndCompleteProject(projectId: string): void {
    const subs = this.db.prepare(`
      SELECT status FROM sub_projects WHERE project_id = ?
    `).all(projectId) as { status: string }[]

    if (subs.length === 0) return
    const allDone = subs.every(s => s.status === 'completed')
    if (allDone) {
      this.db.prepare(`UPDATE projects SET status = 'completed' WHERE id = ?`).run(projectId)
    }
  }

}

export class ChildProjectsRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  updateStatus(id:string, status:string){
    const child = this.db.prepare(`SELECT * FROM child_projects WHERE id = ?`).get(id) as any;
    if(!child) throw new Error ("Child project not found")
    this.db.prepare(`UPDATE child_projects SET status = ? WHERE id = ?`).run(status, id)
      return this.db.prepare(`SELECT * FROM child_projects WHERE id = ?`).get(id) as any;
  }
  getBySubProject(subId: string): any[] {
    return this.db.prepare(`
      SELECT * FROM child_projects
      WHERE parent_id = ?
      ORDER BY created_at ASC
    `).all(subId) as any[]
  }
  delete(childId: string){
    const child = this.db.prepare(`SELECT * FROM child_projects WHERE id = ?`).get(childId) as any;
    if(!child) throw new Error ("Child project not found")
      const childAllocs = this.db.prepare(`SELECT * FROM child_allocations WHERE child_project_id = ?`).all(childId) as any[];
      if(childAllocs.length > 0) throw new Error("Cannot delete child project with existing allocations. Please delete allocations first.")
     this.db.prepare(`DELETE FROM child_projects WHERE id = ?`).run(childId);
    const result = this.db.prepare(`DELETE FROM child_projects WHERE id = ?`).run(childId);
    return { success: result.changes > 0 }
  }

  create(input:any){
    console.log("Create child with ", input);
      const id = randomUUID();

  this.db.prepare(`
    INSERT INTO child_projects
      (id, parent_id, project_id, title, location, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.parent_id,
    input.project_id,
    input.title,
    input.location,
    input.notes ?? null,
    'pending'
  );
    const all = this.db.prepare(`SELECT * FROM child_projects
      WHERE parent_id = ?
      ORDER BY created_at ASC`).all(input.parent_id) as any[];

      console.log("all chikds arew ",all );
      
    
  }
}

