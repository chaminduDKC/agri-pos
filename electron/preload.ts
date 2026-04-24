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

  
})

export interface IElectronAPI {
  ping:   () => Promise<string>
  dbTest: () => Promise<{ success: boolean; users?: any[]; error?: string }>

  clients: {
    getAll:  () => Promise<{ success: boolean; data?: any[]; error?: string }>
    getById: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>
    search:  (query: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
    create:  (input: any) => Promise<{ success: boolean; data?: any; error?: string }>
    update:  (id: string, input: any) => Promise<{ success: boolean; data?: any; error?: string }>
    delete:  (id: string) => Promise<{ success: boolean; error?: string }>
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
    create: (input: any) => Promise<any>; 
    update: (id: string, input: any) => Promise<any>; 
    updateStatus: (id: string, status: string) => Promise<any>; 
    delete: (id: string) => Promise<any> 
  },
   sync: { getStatus: () => Promise<any>; now: () => Promise<any>; onStatus: (fn: (d: any) => void) => () => void }
  quotations: { getAll: () => Promise<any>; getByIdWithItems: (id: string) => Promise<any>; search: (q: string) => Promise<any>; create: (i: any) => Promise<any>; update: (id: string, i: any) => Promise<any>; updateStatus: (id: string, s: string) => Promise<any>; delete: (id: string) => Promise<any> }
  workers:    { getAll: () => Promise<any>; getById: (id: string) => Promise<any>; create: (i: any) => Promise<any>; update: (id: string, i: any) => Promise<any>; delete: (id: string) => Promise<any> }
  attendance: { getByProject: (id: string) => Promise<any>; getByWorkerAndPeriod: (wId: string, f: string, t: string) => Promise<any>; getSummary: (wId: string, f: string, t: string) => Promise<any>; mark: (i: any) => Promise<any>; delete: (id: string) => Promise<any> }
  paysheets:  { getAll: () => Promise<any>; getByWorker: (id: string) => Promise<any>; create: (i: any) => Promise<any>; updateStatus: (id: string, s: string) => Promise<any>; delete: (id: string) => Promise<any> }
  invoices:   { getAll: () => Promise<any>; getByClient: (id: string) => Promise<any>; getOutstandingSummary: () => Promise<any>; create: (i: any) => Promise<any>; update: (id: string, i: any) => Promise<any>; recordPayment: (id: string, amount: number) => Promise<any>; delete: (id: string) => Promise<any> }




}

declare global {
  interface Window { api: IElectronAPI }
}
