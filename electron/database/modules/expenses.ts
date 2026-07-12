import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';



interface ExpenseLog {
    subProjectId?:string,
    childProjectId?:string,
    logDate:string,
    fuelAmount?:number,
    accommodationAmount?:number,
    foodAmount?:number,
    transportAmount?:number,
    otherDescription?:string,
    totalAmount?:number,
    otherAmount?:number,
    notes?:string
    expenseLogWorkers?: ExpenseLogWorker[]
}

interface ExpenseLogWorker {
    expenseLogId?:string,
    workerId:string,
    amount:number,
    paidDate?:string
}

export class ExpensesRepository {
    private db:Database.Database

    constructor(db:Database.Database) {
        this.db = db
    }

createExpenseLog(input: ExpenseLog): any {    
    const isSubProject = input.subProjectId && !input.childProjectId;
    const isChildProject = input.childProjectId && !input.subProjectId;

    if (!isSubProject && !isChildProject) {
        throw new Error('Exactly one of subProjectId or childProjectId must be provided');
    }
    const expenseId = randomUUID();

    const run = this.db.transaction(() => {
        this.db.prepare(`
            INSERT INTO expense_logs 
            (id, 
            sub_project_id, 
            child_project_id, 
            log_date, 
            fuel_amount, 
            accommodation_amount, 
            food_amount,
            transport_amount,
            other_description, 
            other_amount, 
            total_amount, 
            notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            expenseId, input.subProjectId ?? null, input.childProjectId ?? null, input.logDate ?? null,
            input.fuelAmount ?? 0, input.accommodationAmount ?? 0, input.foodAmount ?? 0,
            input.transportAmount ?? 0,
             input.otherDescription ?? null, input.otherAmount ?? 0,
            input.totalAmount ?? 0, input.notes ?? null
        );
        
        const insertWorker = this.db.prepare(`
            INSERT INTO expense_log_workers (id, sub_project_id, child_project_id, expense_log_id, worker_id, amount, date_paid)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            
            for (const worker of input.expenseLogWorkers ?? []) {
                insertWorker.run(randomUUID(), input.subProjectId ?? null, input.childProjectId ?? null, expenseId, worker.workerId, worker.amount ?? 0, worker.paidDate ?? null);
            }
    });

    run();
    return expenseId;
}

getSalaryAdvanceByWorkerAndDatePeriod (startDate:string, endDate:string, workerId:string){
    const workerData = this.db.prepare(`SELECT * FROM expense_log_workers WHERE worker_id = ? AND is_deleted = 0 AND date_paid BETWEEN ? AND ? `).all(workerId, startDate, endDate);
    console.log(workerData)
}
getExpenseLogsBySubProject(subProjectId: string): any[] {
    const logs = this.db.prepare(`
        SELECT * FROM expense_logs WHERE sub_project_id = ? AND is_deleted = 0
    `).all(subProjectId);
    return logs;
}

getExpenseLogsByChildProject(childProjectId: string): any[] {
    
    const logs = this.db.prepare(`
        SELECT * FROM expense_logs WHERE child_project_id = ? AND is_deleted = 0
    `).all(childProjectId);
    return logs;
}

getExpenseLogWorkersBySubProject(subProjectId: string): any[] {
    
    const workers = this.db.prepare(`
        SELECT * FROM expense_log_workers WHERE sub_project_id = ? AND is_deleted = 0
    `).all(subProjectId);
    return workers;
}

getExpenseLogWorkersByChildProject(childProjectId: string): any[] {
    
    const workers = this.db.prepare(`
        SELECT * FROM expense_log_workers WHERE child_project_id = ? AND is_deleted = 0
    `).all(childProjectId);
    return workers;
}

getExpenseLogsByWorker(workerId: string, startDate:string, endDate:string): any[] {
    const logs = this.db.prepare(`
        SELECT * FROM expense_log_workers WHERE worker_id = ? AND is_deleted = 0 AND date_paid BETWEEN ? AND ?
    `).all(workerId, startDate, endDate);
    return logs;
}

deleteExpenseLog(expenseLogId: string): { success: boolean } {
    const run = this.db.transaction(() => {
        // delete dependent worker rows first (FK: expense_log_workers.expense_log_id)
        this.db.prepare(`
            UPDATE expense_log_workers SET is_deleted = 1, is_synced = 0 WHERE expense_log_id = ? AND is_deleted = 0
        `).run(expenseLogId);

        const result = this.db.prepare(`
            UPDATE expense_logs SET is_deleted = 1, is_synced = 0 WHERE id = ? AND is_deleted = 0
        `).run(expenseLogId);

        if (result.changes === 0) {
            throw new Error(`Expense log with id ${expenseLogId} not found`);
        }
    });

    run();
    return { success: true };
}

deleteExpenseLogWorker(expenseLogWorkerId: string): { success: boolean } {
    
    const result = this.db.prepare(`
        UPDATE expense_log_workers SET is_deleted = 1, is_synced = 0 WHERE id = ? AND is_deleted = 0
    `).run(expenseLogWorkerId);

    if (result.changes === 0) {
        throw new Error(`Expense log worker with id ${expenseLogWorkerId} not found`);
    }

    return { success: true };
}

}
