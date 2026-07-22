import Database from 'better-sqlite3'

interface LedgerInput {
  date: string,
  projectLevel: string,
  projectId: string,
  subProjectId: string,
  paymentGiven: number | 0,
  balanceReturned: number | 0,
  completedChildIds: string[],
  completedSubIds: string[],
  completedProjectIds: string[],

}
interface LedgerOutput {
  id: string,
  projectId: string,
  subProjectId: string,
  date: string,
  paymentGiven: number | 0,
  balanceReturned: number | 0,
  balanceToNextDay: number | 0,
  balanceFromPrevDay: number | 0,
  completedChildProjectIds: string[],

}
export class LedgerRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  saveDay(input: LedgerInput): string | undefined {

    console.log(input)
    if (!input.date) throw new Error("Please provide a date");
    if (input.balanceReturned < 0 || input.paymentGiven < 0) {
      throw new Error("Please enter valid numbers");
    }
    const run = this.db.transaction(() => {
      const rowId = crypto.randomUUID();
      const prevRow = this.db.prepare(`
      SELECT balance_to_next_day
      FROM ledger
       WHERE is_deleted = 0
      ORDER BY entry_seq DESC
      LIMIT 1
    `).get() as { balance_to_next_day: number } | undefined;
      const balanceFromPreviousDay = prevRow?.balance_to_next_day ?? 0;
      const balanceToNextDay = input.balanceReturned ?? 0;
      const nextSeq = this.db.prepare(`
      SELECT COALESCE(MAX(entry_seq), 0) + 1 as next FROM ledger
    `).get() as { next: number };
      this.db.prepare(`
      INSERT INTO ledger
        (id, project_id, sub_project_id, entry_seq,
        date, payment_given, balance_returned, 
        balance_from_previous_day, balance_to_next_day)
       VALUES (?, ?, ?, ?, ?, ?, ?,?, ?)
    `).run(
        rowId,
        input.projectId || null,
        input.subProjectId || null,
        nextSeq.next,
        input.date || null,
        input.paymentGiven ?? 0,
        input.balanceReturned ?? 0,
        balanceFromPreviousDay,
        balanceToNextDay
      );

      const totalCost = (balanceFromPreviousDay + input.paymentGiven) - balanceToNextDay;


      if (input.projectLevel.toLowerCase() === "child".toLowerCase()) {

        const costPerChild = totalCost / input.completedChildIds.length;

        input.completedChildIds.forEach(id => {
          this.db.prepare(`UPDATE child_projects 
            SET status = 'completed', ledger_id = ?, cost = ?, is_synced = 0,
            completed_date = ? WHERE id = ? AND is_deleted = 0`).run(rowId, costPerChild, input.date, id)

        });
        this.db.prepare(`UPDATE sub_projects SET cost = cost + ?, ledger_id = ?, is_synced = 0 WHERE is_deleted = 0 AND id = ?`).run(totalCost, rowId, input.subProjectId);
        this.db.prepare(`UPDATE projects SET cost = cost + ?, ledger_id = ?, is_synced = 0 WHERE is_deleted = 0 AND id = ?`).run(totalCost, rowId, input.projectId)

        const childs = this.db.prepare(`
            SELECT * FROM child_projects WHERE parent_id = ? AND is_deleted = 0
            `).all(input.subProjectId) as any[];
        const completedChilds = this.db.prepare(`
            SELECT * FROM child_projects WHERE parent_id = ? AND status = 'completed' AND is_deleted = 0 
            `).all(input.subProjectId) as any[];

        if (childs.length === completedChilds.length) {
          this.db.prepare(`UPDATE sub_projects SET status = 'completed', is_synced = 0
              WHERE id = ? AND is_deleted = 0`).run(input.subProjectId)
        }

        const subs = this.db.prepare('SELECT * FROM sub_projects WHERE project_id = ? AND is_deleted = 0').all(input.projectId) as any[];
        const completedSubs = this.db.prepare(`SELECT * FROM sub_projects WHERE project_id = ? AND status = 'completed' AND is_deleted = 0`).all(input.projectId) as any[];

        if (subs.length === completedSubs.length) {
          this.db.prepare(`UPDATE projects SET status = 'completed', is_synced = 0
              WHERE id = ? AND is_deleted = 0`).run(input.projectId)
        }

      } else if (input.projectLevel.toLocaleLowerCase() === "sub_project") {
        const costPerSub = totalCost / input.completedSubIds.length;

        console.log("Calling to sub")
        input.completedSubIds.forEach(id => {

          this.db.prepare(`UPDATE sub_projects 
          SET status = 'completed', ledger_id = ?, cost = ?,
          completed_date = ? WHERE id = ? AND is_deleted = 0`).run(rowId, costPerSub, input.date, id)

          const childCount = this.db.prepare(`SELECT COUNT(*) as count FROM child_projects WHERE is_deleted = 0 AND parent_id = ?`).get(id) as { count: number };
          const costPerChild = costPerSub / childCount.count
          this.db.prepare(`UPDATE child_projects SET cost = ?, ledger_id = ?, status = 'completed', is_synced = 0 WHERE is_deleted = 0 AND parent_id = ?`).run(costPerChild, rowId, id)


        });
        this.db.prepare(`UPDATE projects SET cost = cost + ?, ledger_id = ?, is_synced = 0 WHERE id = ? AND is_deleted = 0`).run(totalCost, rowId, input.projectId)




        const subs = this.db.prepare('SELECT * FROM sub_projects WHERE project_id = ? AND is_deleted = 0').all(input.projectId) as any[];
        const completedSubs = this.db.prepare(`SELECT * FROM sub_projects WHERE project_id = ? AND status = 'completed' AND is_deleted = 0`).all(input.projectId) as any[];

        if (subs.length === completedSubs.length) {
          this.db.prepare(`UPDATE projects SET status = 'completed', is_synced = 0
              WHERE id = ? AND is_deleted = 0`).run(input.projectId)
        }

      } else if (input.projectLevel.toLocaleLowerCase() === "project") {
        const costPerProject = totalCost / input.completedProjectIds.length;

        input.completedProjectIds.forEach(id => {
          this.db.prepare(`UPDATE projects 
  SET status = 'completed',cost = ?, ledger_id = ?,
  completed_date = ? WHERE id = ? AND is_deleted = 0`).run(costPerProject, rowId, input.date, id)

          const subCountRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM sub_projects WHERE project_id = ? AND is_deleted = 0
                                    `).get(id) as { count: number };

          if (subCountRow.count !== 0) {
            const costPerSub = costPerProject / subCountRow.count;
            this.db.prepare(`UPDATE sub_projects SET cost = ?, ledger_id = ?, status = 'completed', is_synced = 0 WHERE is_deleted = 0 AND project_id = ?`).run(costPerSub, rowId, id)

            const childCountRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM child_projects WHERE is_deleted = 0 AND project_id = ?
                                    `).get(id) as { count: number };
            if (childCountRow.count !== 0) {
              const costPerChild = costPerSub / childCountRow.count;

              this.db.prepare(`UPDATE child_projects SET cost = ?, ledger_id = ?, status = 'completed', is_synced = 0 WHERE is_deleted = 0 AND project_id = ?`).run(costPerChild, rowId, id)
            }
          }




        });

      } else {
        return
      }
      return rowId;
    }
    );
    return run()
  }



  updateRecord(id: string, input: LedgerInput) {
    if (!id) throw new Error("Provide an ID")
      console.log(input)

    const existingRecord = this.db.prepare(`SELECT * FROM ledger WHERE id = ? AND is_deleted = 0`).get(id!) as LedgerOutput | undefined
    if (!existingRecord) throw new Error("No ledger record found for given Id");

    const run = this.db.transaction(() => {

      this.db.prepare(`UPDATE ledger SET date = ?,                
                                        payment_given = ?,
                                        balance_returned = ?,
                                        balance_to_next_day = ?,
                                        is_synced = 0
                                        WHERE id = ? AND is_deleted = 0
      `).run(input.date, input.paymentGiven, input.balanceReturned, input.balanceReturned, existingRecord.id)






      if (input.projectLevel === "project") {
        console.log("Project level update")
        const existingProjects = this.db.prepare(`SELECT COUNT(*) as count FROM projects WHERE ledger_id = ? AND is_deleted = 0`).get(existingRecord.id) as { count: number }
        const prevRow = this.db.prepare(`
      SELECT balance_to_next_day
      FROM ledger
       WHERE is_deleted = 0
      ORDER BY entry_seq DESC
      LIMIT 1
    `).get() as { balance_to_next_day: number } | undefined;
        const balanceFromPreviousDay = prevRow?.balance_to_next_day ?? 0;
        const costPerProject = ((input.paymentGiven + balanceFromPreviousDay) - input.balanceReturned) / input.completedProjectIds.length;

        
        if (existingProjects.count !== input.completedProjectIds.length && input.completedProjectIds.length > 0) {
          console.log("1st condition")
          console.log("Projects has been changed")

          this.db.prepare(`UPDATE projects SET status = 'pending', cost = ?, completed_date = ?, ledger_id = ?, is_synced = 0 WHERE ledger_id = ?`).run(0, null, null, existingRecord.id)
          this.db.prepare(`UPDATE sub_projects SET status = 'pending', cost = ?, completed_date = ?, ledger_id = ?, is_synced = 0 WHERE ledger_id = ?`).run(0, null, null, existingRecord.id)
          this.db.prepare(`UPDATE child_projects SET status = 'pending', cost = ?, completed_date = ?, ledger_id = ?, is_synced = 0 WHERE ledger_id = ?`).run(0, null, null, existingRecord.id)

          input.completedProjectIds.forEach(id => {
            this.db.prepare(`UPDATE projects 
                              SET status = 'completed', is_synced = 0, completed_date = ?, ledger_id = ?, cost = ?
                              WHERE id = ? AND is_deleted = 0
                              `).run(input.date, existingRecord.id, costPerProject, id)

            const subs = this.db.prepare(`SELECT id FROM sub_projects WHERE project_id = ? AND is_deleted = 0`).all(id) as { id: string }[];
            const subCount = subs.length;

            if (subCount !== 0) {
              const costPerSub = costPerProject / subCount;

              subs.forEach(sub => {
                this.db.prepare(`UPDATE sub_projects SET cost = ?, is_synced = 0, completed_date = ?, status = 'completed', ledger_id = ? WHERE id = ? AND is_deleted = 0`)
                  .run(costPerSub, input.date ?? null, existingRecord.id, sub.id);

                const childCount = this.db.prepare(`SELECT COUNT(*) as count FROM child_projects WHERE parent_id = ? AND is_deleted = 0`).get(sub.id) as { count: number };

                if (childCount.count !== 0) {
                  const costPerChild = costPerSub / childCount.count;
                  this.db.prepare(`UPDATE child_projects SET cost = ?, is_synced = 0, completed_date = ?, status = 'completed', ledger_id = ? WHERE parent_id = ? AND is_deleted = 0`)
                    .run(costPerChild, input.date ?? null, existingRecord.id, sub.id);
                  }
                });
              }
            });
          } else  if(input.completedProjectIds.length === 0) {
          console.log("2nd condition")
          this.db.prepare(`UPDATE projects SET status = 'pending', cost = ?, completed_date = ?, ledger_id = ?, is_synced = 0 WHERE ledger_id = ?`).run(0, null, null, existingRecord.id)
          this.db.prepare(`UPDATE sub_projects SET status = 'pending', cost = ?, completed_date = ?, ledger_id = ?, is_synced = 0 WHERE ledger_id = ?`).run(0, null, null, existingRecord.id)
          this.db.prepare(`UPDATE child_projects SET status = 'pending', cost = ?, completed_date = ?, ledger_id = ?, is_synced = 0 WHERE ledger_id = ?`).run(0, null, null, existingRecord.id)
        }
          else if (existingProjects.count === input.completedProjectIds.length){
            console.log("3rd condition")
            this.db.prepare(`UPDATE projects SET cost = ?, completed_date = ?, is_synced = 0 WHERE ledger_id = ? AND is_deleted = 0`).run(costPerProject, input.date, existingRecord.id); 
            // divide the cost and set date
            
          }





















        ///////////////////////////////////
      } else if (input.projectLevel === 'sub_project') {

      } else {

      }

      this.db.prepare(`
          UPDATE child_projects 
          SET status = 'pending', ledger_id = ?, completed_date = ?, is_synced = 0
          WHERE ledger_id = ? AND is_deleted = 0
          `).run(null, null, existingRecord.id)

      if (input.completedChildIds.length > 0) {
        input.completedChildIds.forEach(element => {
          this.db.prepare(`
                UPDATE child_projects SET status = 'completed', completed_date = ?, is_synced = 0, ledger_id = ? WHERE id = ? AND is_deleted = 0
                `).run(input.date, existingRecord.id, element)
        });
      }
    })
    run();
    console.log("End")

  }




  getById(id: string): LedgerOutput | undefined {

    if (!id) throw new Error("Provide an id")
    const data = this.db.prepare(`SELECT * FROM ledger WHERE id = ? AND is_deleted = 0`).get(id) as LedgerOutput | undefined
    if (!data) throw new Error("No data for provided id")
    return data;
  }

  getDayByDate(date: string) {
    const rows = this.db.prepare(`
    SELECT * FROM ledger WHERE date = ?
  `).all(date) as LedgerOutput[] | undefined;

    return rows ?? null;
  }
  getTodayLedgerRecord(date: string) {
    const rows = this.db.prepare(`
    SELECT * FROM ledger WHERE date = ?
  `).all(date) as LedgerOutput[] | undefined;

    return rows ?? null;
  }

  getRecentLedgerRecord() {
    const row = this.db.prepare(`SELECT * 
    FROM ledger
    ORDER BY entry_seq DESC
    LIMIT 1
    `).get() as LedgerOutput | undefined

    return row;
  }


  getChildProjectsByLedgerId(id: string) {
    console.log("Called child Projects")
    if (!id) throw new Error("Invalid id")
    const rows = this.db.prepare(`SELECT * 
    FROM child_projects
    WHERE ledger_id = ? AND is_deleted = 0 AND status = 'completed'
    `).all(id) as any[]

    return rows;
  }

  getSubProjectsByLedgerId(id: string) {
    console.log("Called sub Projects")
    if (!id) throw new Error("Invalid id")
    const rows = this.db.prepare(`SELECT * 
    FROM sub_projects
    WHERE ledger_id = ? AND is_deleted = 0 
    `).all(id) as any[]

    return rows;
  }

  getProjectsByLedgerId(id: string) {
    console.log("Called Projects")
    if (!id) throw new Error("Invalid id")
    const rows = this.db.prepare(`SELECT * 
    FROM projects
    WHERE ledger_id = ? AND is_deleted = 0 
    `).all(id) as any[]

    return rows;
  }
  getAllRecords(pgNumber: number, pgSize: number) {
    const offset = (pgNumber - 1) * pgSize;

    const rows = this.db.prepare(`
    SELECT * FROM ledger
    WHERE is_deleted = 0
    ORDER BY entry_seq DESC
    LIMIT ? OFFSET ?
  `).all(pgSize, offset);

    const { total } = this.db.prepare(`
    SELECT COUNT(*) as total FROM ledger WHERE is_deleted = 0
  `).get() as { total: number };

    return { rows, total, pgNumber, pgSize, totalPages: Math.ceil(total / pgSize) };
  }
}