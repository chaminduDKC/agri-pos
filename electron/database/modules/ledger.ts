import Database from 'better-sqlite3'

interface LedgerInput{
  date:string,
  projectId:string,
  subProjectId:string,
  paymentGiven:number | 0,
  balanceReturned:number | 0,
  completedChildIds: string [],

}
interface LedgerOutput{
  id:string,
  projectId:string,
  subProjectId:string,
  date:string,
  paymentGiven:number | 0,
  balanceReturned:number | 0,
  balanceToNextDay:number | 0,
  balanceFromPrevDay:number | 0,
  completedChildProjectIds: string [],

}
export class LedgerRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // saveDay(input:LedgerInput){
  //   const uuid = crypto.randomUUID()
  //   if(!input.date) throw new Error("Please provide a date")
  //   if(input.balanceReturned < 0 || input.paymentGiven < 0) throw new Error("Please Enter valid numbers")
    

  //   const run = this.db.transaction(()=>{

  //     const prevRow = this.db.prepare(`
  //       SELECT balance_to_next_day 
  //       FROM ledger 
  //       WHERE date < ? 
  //       AND is_deleted = 0
  //       ORDER BY date DESC
  //       LIMIT 1
  //     `).get(input.date) as {balance_to_next_day:number} | undefined

  //     const balanveFromPrevDay = prevRow?.balance_to_next_day ?? 0;

  //     this.db.prepare(`
  //       INSERT INTO ledger (id, date, payment_given, 
  //       balance_returned, balance_from_previous_day, balance_to_next_day)
  //       VALUES (?, ?, ?, ?, ?, ?)`).run(
  //         uuid, input.date, input.paymentGiven ?? 0, 
  //         input.balanceReturned ?? 0, 
  //         balanveFromPrevDay, 
  //         input.balanceReturned ?? 0
  //       )

  //       input.completedChildProjectIds.forEach(id => {
  //         this.db.prepare(`UPDATE child_projects 
  //           SET status = 'completed',
  //           completed_date = ? WHERE id = ? AND is_deleted = 0`).run(input.date, id, )
          
  //       });



  //   }) 
  //   run()
  // }



  saveDay(input: LedgerInput) :string | undefined {

  if (!input.date) throw new Error("Please provide a date");
  if (input.balanceReturned < 0 || input.paymentGiven < 0) {
    throw new Error("Please enter valid numbers");
  }

  const run = this.db.transaction(() => {
    // 0. Check if a row already exists for this date (so we know if this is an edit)
    const existing = this.db.prepare(`
      SELECT id, payment_given, balance_returned
      FROM ledger WHERE date = ?
    `).get(input.date) as { id: string; payment_given: number; balance_returned: number } | undefined;

    const rowId = existing?.id ?? crypto.randomUUID();
    const prevRow = this.db.prepare(`
      SELECT balance_to_next_day
      FROM ledger
      WHERE date < ?
      ORDER BY date DESC
      LIMIT 1
    `).get(input.date) as { balance_to_next_day: number } | undefined;

    const balanceFromPreviousDay = prevRow?.balance_to_next_day ?? 0;
    const balanceToNextDay = input.balanceReturned ?? 0;

    this.db.prepare(`
      INSERT INTO ledger
        (id, project_id, sub_project_id, date, payment_given, balance_returned, balance_from_previous_day, balance_to_next_day)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        payment_given = excluded.payment_given,
        balance_returned = excluded.balance_returned,
        balance_from_previous_day = excluded.balance_from_previous_day,
        balance_to_next_day = excluded.balance_to_next_day
    `).run(
      rowId,
      input.projectId,
      input.subProjectId,
      input.date,
      input.paymentGiven ?? 0,
      input.balanceReturned ?? 0,
      balanceFromPreviousDay,
      balanceToNextDay
    );

    console.log("Chids")
    console.log(input.completedChildIds)
      input.completedChildIds.forEach(id => {
          this.db.prepare(`UPDATE child_projects 
            SET status = 'completed',
            completed_date = ? WHERE id = ? AND is_deleted = 0`).run(input.date, id, )
          
        });

    // 1. Log the change, only if this was actually an edit (not a first-time entry)
    if (existing) {
      this.db.prepare(`
        INSERT INTO ledger_audit
          (id, ledger_id, date, old_payment_given, old_balance_returned, new_payment_given, new_balance_returned)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        rowId,
        input.date,
        existing.payment_given,
        existing.balance_returned,
        input.paymentGiven ?? 0,
        input.balanceReturned ?? 0
      );
    }

    // 2. Patch next day (same as before)
    const nextRow = this.db.prepare(`
      SELECT id FROM ledger
      WHERE date > ?
      ORDER BY date ASC
      LIMIT 1
    `).get(input.date) as { id: string } | undefined;

    if (nextRow) {
      this.db.prepare(`
        UPDATE ledger
        SET balance_from_previous_day = ?
        WHERE id = ?
      `).run(balanceToNextDay, nextRow.id);
    }
    return rowId;
  } 
  
);

return run()
  
}

getById(id:string):LedgerOutput | undefined {

  if(!id) throw new Error("Provide an id")
  const data = this.db.prepare(`SELECT * FROM ledger WHERE id = ? AND is_deleted = 0`).get(id) as LedgerOutput | undefined
  if(!data) throw new Error("No data for provided id")
    return data;
}

// New method: fetch a single day for editing
getDayByDate(date: string) {
  const row = this.db.prepare(`
    SELECT * FROM ledger WHERE date = ?
  `).get(date) as LedgerOutput | undefined;

  return row ?? null;
}
getTodayLedgerRecord(date: string) {
  const row = this.db.prepare(`
    SELECT * FROM ledger WHERE date = ?
  `).get(date) as LedgerOutput | undefined;

  return row ?? null;
}

getAllRecords(pgNumber:number, pgSize:number){
  const offset = (pgNumber - 1) * pgSize;

  const rows = this.db.prepare(`
    SELECT * FROM ledger
    WHERE is_deleted = 0
    ORDER BY date DESC
    LIMIT ? OFFSET ?
  `).all(pgSize, offset);

  const { total } = this.db.prepare(`
    SELECT COUNT(*) as total FROM ledger WHERE is_deleted = 0
  `).get() as { total: number };

  return { rows, total, pgNumber, pgSize, totalPages: Math.ceil(total / pgSize) };
}
}