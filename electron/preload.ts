import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  ping:   () => ipcRenderer.invoke('ping'),
  dbTest: () => ipcRenderer.invoke('db:test'),

   // ── Sync ────────────────────────────────────────────────
  sync: {
    getStatus: ()  => ipcRenderer.invoke('sync:getStatus'),
    now:       ()  => ipcRenderer.invoke('sync:now'),
    // Subscribe to live status pushes from main process
    onStatus: (fn: (data: { status: string; pendingCount: number }) => void) => {
      ipcRenderer.on('sync:status', (_event, data) => fn(data))
      return () => ipcRenderer.removeAllListeners('sync:status')
    },
  },

  checkInternet: () => ipcRenderer.invoke('checkInternet'),
  generatePdf: (data:any) => ipcRenderer.invoke('generateQuotationPdf', data),
  generatePaysheetPdf: (data:any) => ipcRenderer.invoke('generatePaysheetPdf', data), 
  generateInvoicePdf: (data:any) => ipcRenderer.invoke('generateInvoicePdf', data), 
  updateCompanyDetails:(data:any)=> ipcRenderer.invoke('updateCompanyDetails', data),
  getCompanyDetails:()=> ipcRenderer.invoke('getCompanyDetails'),
   auth: {
    login:    (email: string, password: string) => ipcRenderer.invoke('auth:login', email, password),
    logout:   ()                                => ipcRenderer.invoke('auth:logout'),
    getUser:  ()                                => ipcRenderer.invoke('auth:getUser'),
    isLoggedIn: ()                              => ipcRenderer.invoke('auth:isLoggedIn'),

    // Subscribe to session expired event pushed from main process
    // Returns an unsubscribe function
    onSessionExpired: (fn: () => void) => {
      ipcRenderer.on('auth:sessionExpired', fn)
      return () => ipcRenderer.removeListener('auth:sessionExpired', fn)
    },
  },

  clients: {
    getAll:  ()                       => ipcRenderer.invoke('db:clients:getAll'),
    getById: (id: string)             => ipcRenderer.invoke('db:clients:getById', id),
    search:  (query: string)          => ipcRenderer.invoke('db:clients:search', query),
    create:  (input: any)             => ipcRenderer.invoke('db:clients:create', input),
    update:  (id: string, input: any) => ipcRenderer.invoke('db:clients:update', id, input),
    delete:  (id: string)             => ipcRenderer.invoke('db:clients:delete', id),
  },
  items: {
    getAll:        ()                       => ipcRenderer.invoke('db:items:getAll'),
    getLowStock:   ()                       => ipcRenderer.invoke('db:items:getLowStock'),
    getCategories: ()                       => ipcRenderer.invoke('db:items:getCategories'),
    getByBarcode:  (barcode: string)        => ipcRenderer.invoke('db:items:getByBarcode', barcode),
    search:        (q: string)              => ipcRenderer.invoke('db:items:search', q),
    create:        (input: any)             => ipcRenderer.invoke('db:items:create', input),
    update:        (id: string, input: any) => ipcRenderer.invoke('db:items:update', id, input),
    setQuantity:   (id: string, qty: number)=> ipcRenderer.invoke('db:items:setQuantity', id, qty),
    delete:        (id: string)             => ipcRenderer.invoke('db:items:delete', id),
  },

  projects: {
    getAll:         ()                        => ipcRenderer.invoke('db:projects:getAll'),
    getById:        (id: string)              => ipcRenderer.invoke('db:projects:getById', id),
    getByClient:    (clientId: string)        => ipcRenderer.invoke('db:projects:getByClient', clientId),
    search:         (q: string)               => ipcRenderer.invoke('db:projects:search', q),
    getStatusCounts:()                        => ipcRenderer.invoke('db:projects:getStatusCounts'),
    getAllIncompleteProjects:()                        => ipcRenderer.invoke('db:projects:getAllIncompleteProjects'),
    create:         (input: any)              => ipcRenderer.invoke('db:projects:create', input),
    update:         (id: string, input: any)  => ipcRenderer.invoke('db:projects:update', id, input),
    updateStatus:   (id: string, status: string) => ipcRenderer.invoke('db:projects:updateStatus', id, status),
    delete:         (id: string)              => ipcRenderer.invoke('db:projects:delete', id),
    cascadeDelete:   (id: string)                 => ipcRenderer.invoke('db:projects:cascadeDelete', id),

  },

  quotations: {
    getAll:            ()                           => ipcRenderer.invoke('db:quotations:getAll'),
    getByIdWithItems:  (id: string)                 => ipcRenderer.invoke('db:quotations:getByIdWithItems', id),
    search:            (q: string)                  => ipcRenderer.invoke('db:quotations:search', q),
    create:            (input: any)                 => ipcRenderer.invoke('db:quotations:create', input),
    update:            (id: string, input: any)     => ipcRenderer.invoke('db:quotations:update', id, input),
    updateStatus:      (id: string, status: string) => ipcRenderer.invoke('db:quotations:updateStatus', id, status),
    delete:            (id: string)                 => ipcRenderer.invoke('db:quotations:delete', id),
  },

  workers: {
    getAll:  ()                       => ipcRenderer.invoke('db:workers:getAll'),
    getById: (id: string)             => ipcRenderer.invoke('db:workers:getById', id),
    create:  (input: any)             => ipcRenderer.invoke('db:workers:create', input),
    update:  (id: string, input: any) => ipcRenderer.invoke('db:workers:update', id, input),
    delete:  (id: string)             => ipcRenderer.invoke('db:workers:delete', id),
  },

  attendance: {
    getByProject:        (projectId: string)                => ipcRenderer.invoke('db:attendance:getByProject', projectId),
    getByWorkerAndPeriod:(workerId: string, from: string, to: string) => ipcRenderer.invoke('db:attendance:getByWorkerAndPeriod', workerId, from, to),
    getSummary:          (workerId: string, from: string, to: string) => ipcRenderer.invoke('db:attendance:getSummary', workerId, from, to),
    mark:                (input: any)                       => ipcRenderer.invoke('db:attendance:mark', input),
    delete:              (id: string)                       => ipcRenderer.invoke('db:attendance:delete', id),
  },

  paysheets: {
    getAll:       ()                           => ipcRenderer.invoke('db:paysheets:getAll'),
    getByWorker:  (workerId: string)           => ipcRenderer.invoke('db:paysheets:getByWorker', workerId),
    create:       (input: any)                 => ipcRenderer.invoke('db:paysheets:create', input),
    updateStatus: (id: string, status: string) => ipcRenderer.invoke('db:paysheets:updateStatus', id, status),
    delete:       (id: string)                 => ipcRenderer.invoke('db:paysheets:delete', id),
  },

  invoices: {
    getAll:                 ()                        => ipcRenderer.invoke('db:invoices:getAll'),
    getByClient:            (clientId: string)        => ipcRenderer.invoke('db:invoices:getByClient', clientId),
    getOutstandingSummary:  ()                        => ipcRenderer.invoke('db:invoices:getOutstandingSummary'),
    create:                 (input: any)              => ipcRenderer.invoke('db:invoices:create', input),
    update:                 (id: string, input: any)  => ipcRenderer.invoke('db:invoices:update', id, input),
    recordPayment:          (id: string, amount: number) => ipcRenderer.invoke('db:invoices:recordPayment', id, amount),
    delete:                 (id: string)              => ipcRenderer.invoke('db:invoices:delete', id),
  },
  allocations:{
    returnChildToSub:(id:string, quantity:number)=> ipcRenderer.invoke('db:allocations:returnChildToSub', id, quantity),
    markChildUsed:(input:any)=> ipcRenderer.invoke('db:allocations:markChildUsed', input),
    returnSubToMain:(id:string, quantity:number)=> ipcRenderer.invoke('db:allocations:returnSubToMain', id, quantity),
    markSubUsed:(id:string, quantity:any)=> ipcRenderer.invoke('db:allocations:markSubUsed', id, quantity),
    createSubAllocation:(input:any)=> ipcRenderer.invoke('db:allocations:createSubAllocation', input),
    createChildAllocation:(input:any)=> ipcRenderer.invoke('db:allocations:createChildAllocation', input),
    create:(input:any)=> ipcRenderer.invoke('db:allocations:create', input),
    getChildAllocationsByChildProject:(childId:string)=> ipcRenderer.invoke('db:allocations:getChildAllocationsByChildProject', childId),
    getByProject: (projectId: string) => ipcRenderer.invoke('db:allocations:getByProject', projectId),
    getById: (id: string) => ipcRenderer.invoke('db:allocations:getById', id),
    allocate: (input: any) => ipcRenderer.invoke('db:allocations:allocate', input),
    returnToInventory: (id: string, quantity: number) => ipcRenderer.invoke('db:allocations:returnToInventory', id, quantity),
    delete: (id: string) => ipcRenderer.invoke('db:allocations:delete', id),
    getSubAllocations: (projectAllocationId: string) => ipcRenderer.invoke('db:allocations:getSubAllocations', projectAllocationId),
    getSubAllocationsBySubProject: (subProjectId: string) => ipcRenderer.invoke('db:allocations:getSubAllocationsBySubProject', subProjectId),
    assignToSubProject: (input: any) => ipcRenderer.invoke('db:allocations:assignToSubProject', input),
    markUsed: (id: string, quantityUsed: number) => ipcRenderer.invoke('db:allocations:markUsed', id, quantityUsed),
  },
  subProjects:{
    getByProject: (projectId: string) => ipcRenderer.invoke('db:subProjects:getByProject', projectId),
    getIncompleteSubProjectsByProject: (projectId: string) => ipcRenderer.invoke('db:subProjects:getIncompleteSubProjectsByProject', projectId),
    getById: (id: string) => ipcRenderer.invoke('db:subProjects:getById', id),
    create: (input: any) => ipcRenderer.invoke('db:subProjects:create', input),
    createChild: (input: any) => ipcRenderer.invoke('db:subProjects:createChild', input),
    updateStatus: (id: string, status: string) => ipcRenderer.invoke('db:subProjects:updateStatus', id, status),
    update: (id: string, input: any) => ipcRenderer.invoke('db:subProjects:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('db:subProjects:delete', id),
  },
  childProjects:{
    updateStatus: (id: string, status: string) => ipcRenderer.invoke('db:childProjects:updateStatus', id, status),
getBySubProject:(subId:string)=> ipcRenderer.invoke('db:childProjects:getBySubProject', subId),
getIncompleteChildProjectsBySubProject:(subId:string)=> ipcRenderer.invoke('db:childProjects:getIncompleteChildProjectsBySubProject', subId),
delete:(childId:string)=> ipcRenderer.invoke('db:childProjects:delete', childId),
create:(input:any)=> ipcRenderer.invoke('db:childProjects:create', input),
getById:(id:string)=> ipcRenderer.invoke('db:childProjects:getById', id),
update:(id:string, input:any)=> ipcRenderer.invoke('db:childProjects:update', id, input)
  },

  expenses:{
    createExpenseLog: (input:any) => ipcRenderer.invoke('db:expenses:createExpenseLog', input),
    getExpenseLogsBySubProject: (subProjectId: string) => ipcRenderer.invoke('db:expenses:getExpenseLogsBySubProject', subProjectId),
    getExpenseLogsByChildProject: (childProjectId: string) => ipcRenderer.invoke('db:expenses:getExpenseLogsByChildProject', childProjectId),
    getExpenseLogWorkersBySubProject: (subProjectId: string) => ipcRenderer.invoke('db:expenses:getExpenseLogWorkersBySubProject', subProjectId),
    getExpenseLogWorkersByChildProject: (childProjectId: string) => ipcRenderer.invoke('db:expenses:getExpenseLogWorkersByChildProject', childProjectId),
    getExpenseLogsByWorker: (workerId: string, startDate:string, endDate:string) => ipcRenderer.invoke('db:expenses:getExpenseLogsByWorker', workerId, startDate, endDate),
    deleteExpenseLog: (expenseLogId: string) => ipcRenderer.invoke('db:expenses:deleteExpenseLog', expenseLogId),
    deleteExpenseLogWorker: (expenseLogWorkerId: string) => ipcRenderer.invoke('db:expenses:deleteExpenseLogWorker', expenseLogWorkerId),
    getSalaryAdvanceByWorkerAndDatePeriod: (startDate:string, endDate: string, workerId:string) => ipcRenderer.invoke('db:expenses:getSalaryAdvanceByWorkerAndDatePeriod', startDate, endDate, workerId)
  },

  ledger:{
    saveDay:(input:any)=> ipcRenderer.invoke('db:ledger:saveDay', input),
    updateRecord:(id:string, input:any)=> ipcRenderer.invoke('db:ledger:updateRecord', id, input),
    getDayByDate:(date:string)=> ipcRenderer.invoke('db:ledger:getDayByDate', date),
    getChildProjectsByLedgerId:(id:string)=> ipcRenderer.invoke('db:ledger:getChildProjectsByLedgerId', id),
    getById:(id:string)=> ipcRenderer.invoke('db:ledger:getById', id),
    getTodayLedgerRecord:(date:string)=> ipcRenderer.invoke('db:ledger:getTodayLedgerRecord', date),
    getRecentLedgerRecord:()=> ipcRenderer.invoke('db:ledger:getRecentLedgerRecord'),
    getAllRecords:(pgNumber:number, pgSize:number)=> ipcRenderer.invoke('db:ledger:getAllRecords', pgNumber, pgSize),
  }

  
})

export interface IElectronAPI {
  ping:   () => Promise<string>
  dbTest: () => Promise<{ success: boolean; users?: any[]; error?: string }>

  checkInternet: () => Promise<boolean>
  generatePdf: (data:any) => Promise<{ success: boolean; filePath?: string; error?: string }>
  generatePaysheetPdf: (data:any) => Promise<{ success: boolean; filePath?: string; error?: string }>
  generateInvoicePdf: (data:any) => Promise<{ success: boolean; filePath?: string; error?: string }>
  updateCompanyDetails: (data:any) => Promise<{ success: boolean; error?: string }>
  getCompanyDetails: () => Promise<{ success: boolean; data?:any, error?: string }>


  expenses:{
    createExpenseLog: (input:any) => Promise<{ success: boolean; data?: any; error?: string }>
    getExpenseLogsBySubProject: (subProjectId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
    getExpenseLogsByChildProject: (childProjectId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
    getExpenseLogWorkersBySubProject: (subProjectId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
    getExpenseLogWorkersByChildProject: (childProjectId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
    getExpenseLogsByWorker: (workerId: string, startDate:string, endDate:string) => Promise<{ success: boolean; data?: any[]; error?: string }>
    deleteExpenseLog: (expenseLogId: string) => Promise<{ success: boolean; error?: string }>
    deleteExpenseLogWorker: (expenseLogWorkerId: string) => Promise<{ success: boolean; error?: string }>
  }


  clients: {
    getAll:  () => Promise<{ success: boolean; data?: any[]; error?: string }>
    getById: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>
    search:  (query: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
    create:  (input: any) => Promise<{ success: boolean; data?: any; error?: string }>
    update:  (id: string, input: any) => Promise<{ success: boolean; data?: any; error?: string }>
    delete:  (id: string) => Promise<{ success: boolean; error?: string }>
  },
   auth: {
    login:            (email: string, password: string) => Promise<{ success: boolean; user?: any; error?: string }>
    logout:           () => Promise<{ success: boolean }>
    getUser:          () => Promise<{ success: boolean; user?: any }>
    isLoggedIn:       () => Promise<boolean>
    onSessionExpired: (fn: () => void) => () => void
  },

  items: {
    getAll:        () => Promise<any>
    getLowStock:   () => Promise<any>
    getCategories: () => Promise<any>
    getByBarcode:  (barcode: string) => Promise<any>
    search:        (q: string) => Promise<any>
    create:        (input: any) => Promise<any>
    update:        (id: string, input: any) => Promise<any>
    setQuantity:   (id: string, qty: number) => Promise<any>
    delete:        (id: string) => Promise<any>
  },
  projects: { 
    getAll: () => Promise<any>; 
    getById: (id: string) => Promise<any>; 
    getByClient: (id: string) => Promise<any>; 
    search: (q: string) => Promise<any>; 
    getStatusCounts: () => Promise<any>; 
    getAllIncompleteProjects: () => Promise<any>; 
    create: (input: any) => Promise<any>; 
    update: (id: string, input: any) => Promise<any>; 
    updateStatus: (id: string, status: string) => Promise<any>; 
    delete: (id: string) => Promise<any> 
    cascadeDelete: (id: string) => Promise<any>
  },
  subProjects:{
    getByProject: (projectId: string) => Promise<any>;
    getIncompleteSubProjectsByProject: (projectId: string) => Promise<any>;
    getById: (id: string) => Promise<any>;
    create: (input: any) => Promise<any>;
    createChild: (input: any) => Promise<any>;
    updateStatus: (id: string, status: string) => Promise<any>;
    update: (id: string, input: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
  },
  childProjects:{
    updateStatus: (id: string, status: string) => Promise<any>;
    getBySubProject:(subId:string)=> Promise<any>
    getIncompleteChildProjectsBySubProject:(subId:string)=> Promise<any>
    delete:(childId:string)=> Promise<any>
    create:(input:any)=> Promise<any>
    getById:(id:string)=> Promise<any>
    update:(id:string, input:any)=> Promise<any>
  },
  ledger:{
    saveDay:(input:any)=> Promise<any>
    updateRecord:(id:string,input:any)=> Promise<any>
    getDayByDate:(date:string)=> Promise<any>
    getTodayLedgerRecord:(date:string)=> Promise<any>
    getChildProjectsByLedgerId:(id:string)=> Promise<any>
    getById:(id:string)=> Promise<any>
    getRecentLedgerRecord:()=> Promise<any>
    getAllRecords:(pgNumber:number, pgSize:number)=> Promise<any>
  }
  
   sync: { getStatus: () => Promise<any>; now: () => Promise<any>; onStatus: (fn: (d: any) => void) => () => void }
  quotations: { getAll: () => Promise<any>; getByIdWithItems: (id: string) => Promise<any>; search: (q: string) => Promise<any>; create: (i: any) => Promise<any>; update: (id: string, i: any) => Promise<any>; updateStatus: (id: string, s: string) => Promise<any>; delete: (id: string) => Promise<any> }
  workers:    { getAll: () => Promise<any>; getById: (id: string) => Promise<any>; create: (i: any) => Promise<any>; update: (id: string, i: any) => Promise<any>; delete: (id: string) => Promise<any> }
  attendance: { getByProject: (id: string) => Promise<any>; getByWorkerAndPeriod: (wId: string, f: string, t: string) => Promise<any>; getSummary: (wId: string, f: string, t: string) => Promise<any>; mark: (i: any) => Promise<any>; delete: (id: string) => Promise<any> }
  paysheets:  { getAll: () => Promise<any>; getByWorker: (id: string) => Promise<any>; create: (i: any) => Promise<any>; updateStatus: (id: string, s: string) => Promise<any>; delete: (id: string) => Promise<any> }
  invoices:   { getAll: () => Promise<any>; getByClient: (id: string) => Promise<any>; getOutstandingSummary: () => Promise<any>; create: (i: any) => Promise<any>; update: (id: string, i: any) => Promise<any>; recordPayment: (id: string, amount: number) => Promise<any>; delete: (id: string) => Promise<any> }
  allocations:{returnChildToSub:(id:string, quantity:number)=> Promise<any>,markChildUsed:(input:any)=> Promise<any>,returnSubToMain:(id:string, quantity:number)=> Promise<any>,markSubUsed:(input:any)=> Promise<any>,createChildAllocation:(input:any)=> Promise<any>,create:(input:any)=> Promise<any>, createSubAllocation:(input:any)=> Promise<any>, getChildAllocationsByChildProject:(childId:string)=> Promise<any>,
    getByProject: (projectId: string) => Promise<any>; getById: (id: string) => Promise<any>; allocate: (input: any) => Promise<any>; returnToInventory: (id: string, quantity: number) => Promise<any>; delete: (id: string) => Promise<any>; getSubAllocations: (projectAllocationId: string) => Promise<any>; getSubAllocationsBySubProject: (subProjectId: string) => Promise<any>; assignToSubProject: (input: any) => Promise<any>; markUsed: (id: string, quantityUsed: number) => Promise<any> }




}

declare global {
  interface Window { api: IElectronAPI }
}
