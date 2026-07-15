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

  saveDay(input: LedgerInput) :string | undefined {

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
      input.projectId ?? "",
      input.subProjectId ?? "",
      nextSeq.next,
      input.date ?? "",
      input.paymentGiven ?? 0,
      input.balanceReturned ?? 0,
      balanceFromPreviousDay,
      balanceToNextDay
    );
      input.completedChildIds.forEach(id => {
          this.db.prepare(`UPDATE child_projects 
            SET status = 'completed', ledger_id = ?,
            completed_date = ? WHERE id = ? AND is_deleted = 0`).run(rowId,input.date, id)
          
        });
    return rowId;
  } 
);
return run()
}

updateRecord(id:string, input:LedgerInput) {
  if(!id) throw new Error("Provide an ID")

  const existingRecord = this.db.prepare(`SELECT * FROM ledger WHERE id = ? AND is_deleted = 0`).get(id!) as LedgerOutput | undefined 
  if(!existingRecord) throw new Error("No ledger record found for given Id");
console.log(input)
  console.log("Start")
  const run = this.db.transaction(()=>{
  console.log("End")

    this.db.prepare(`UPDATE ledger SET date = ?,                
                                        payment_given = ?,
                                        balance_returned = ?,
                                        balance_to_next_day = ?,
                                        is_synced = 0
                                        WHERE id = ? AND is_deleted = 0
      `).run( input.date, input.paymentGiven, input.balanceReturned, input.balanceReturned, existingRecord.id)
  

         this.db.prepare(`
          UPDATE child_projects 
          SET status = 'pending', ledger_id = ?, completed_date = ?, is_synced = 0
          WHERE ledger_id = ? AND is_deleted = 0
          `).run(null, null,existingRecord.id)
  
          if(input.completedChildIds.length > 0){
            input.completedChildIds.forEach(element => {
              this.db.prepare(`
                UPDATE child_projects SET status = 'completed', completed_date = ?, is_synced = 0, ledger_id = ? WHERE id = ? AND is_deleted = 0
                `).run(input.date,existingRecord.id, element )
            });
          }
  })
  run();
  console.log("End")
  
}




getById(id:string):LedgerOutput | undefined {

  if(!id) throw new Error("Provide an id")
  const data = this.db.prepare(`SELECT * FROM ledger WHERE id = ? AND is_deleted = 0`).get(id) as LedgerOutput | undefined
  if(!data) throw new Error("No data for provided id")
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
  `).all(date) as LedgerOutput [] | undefined;

  return rows ?? null;
}

getRecentLedgerRecord(){
  const row = this.db.prepare(`SELECT * 
    FROM ledger
    ORDER BY entry_seq DESC
    LIMIT 1
    `).get() as LedgerOutput | undefined

    return row;
}


getChildProjectsByLedgerId(id:string){
  if(!id) throw new Error("Invalid id")
  const rows = this.db.prepare(`SELECT * 
    FROM child_projects
    WHERE ledger_id = ? AND is_deleted = 0 AND status = 'completed'
    `).all(id) as any []

    return rows;
}
getAllRecords(pgNumber:number, pgSize:number){
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