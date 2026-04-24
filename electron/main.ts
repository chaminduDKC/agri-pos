import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initializeDb, closeDb, getDb } from './database/db'
import { ClientsRepository }    from './database/modules/clients'
import { ItemsRepository }      from './database/modules/items'
import { ProjectsRepository }   from './database/modules/projects'
import { QuotationsRepository } from './database/modules/quotations'
import { WorkersRepository, AttendanceRepository } from './database/modules/workers'
import { PaysheetsRepository }  from './database/modules/paysheets'
import { InvoicesRepository }   from './database/modules/invoices'
import { SyncLogger }           from './sync/syncLogger'
import { SyncEngine }           from './sync/syncEngine'
import { NetMonitor }           from './sync/netMonitor'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST     = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null
let syncEngine: SyncEngine | null = null
let netMonitor: NetMonitor | null = null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    width: 1280, height: 800,minWidth:1000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  //win.webContents.openDevTools()
  if (VITE_DEV_SERVER_URL) { win.loadURL(VITE_DEV_SERVER_URL) }
  else { win.loadFile(path.join(RENDERER_DIST, 'index.html')) }
}

app.whenReady().then(() => {
  try { initializeDb() } catch (err) { console.error('[DB] Failed:', err); app.quit(); return }

  // ── Initialise sync ─────────────────────────────────────
  const db         = getDb()
  const syncLogger = new SyncLogger(db)

  syncEngine = new SyncEngine(syncLogger, {
    // Replace with your actual API URL when you have a cloud backend
    apiBaseUrl: process.env.CLOUD_API_URL ?? 'https://your-api.example.com',
    authToken:  null,  // Set this after user logs in
    batchSize:  50,
  })

  // Push sync status updates to the renderer window
  syncEngine.onStatus((status, pendingCount) => {
    win?.webContents.send('sync:status', { status, pendingCount })
  })

  // Start network monitor — triggers sync when internet returns
  netMonitor = new NetMonitor({ intervalMs: 15_000 })
  netMonitor.start({
    onReconnect:  () => syncEngine?.sync(),
    onDisconnect: () => win?.webContents.send('sync:status', { status: 'offline', pendingCount: syncLogger.getPendingCount() }),
  })

  // Also sync on a timer in case reconnect is missed
  setInterval(() => {
    if (netMonitor?.getIsOnline()) syncEngine?.sync()
  }, 60_000)

  registerIpcHandlers(syncLogger)
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('before-quit', () => {
  netMonitor?.stop()
  closeDb()
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

function registerIpcHandlers(syncLogger: SyncLogger) {
  const db = getDb()
  const clients    = new ClientsRepository(db)
  const items      = new ItemsRepository(db)
  const projects   = new ProjectsRepository(db)
  const quotations = new QuotationsRepository(db)
  const workers    = new WorkersRepository(db)
  const attendance = new AttendanceRepository(db)
  const paysheets  = new PaysheetsRepository(db)
  const invoices   = new InvoicesRepository(db)

  const getAdminId = () => (db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string }).id

  // ── Test ──────────────────────────────────────────────────
  ipcMain.handle('ping',    () => 'pong')
  ipcMain.handle('db:test', () => {
    try { return { success: true, users: db.prepare('SELECT id,name,email,role FROM users').all() } }
    catch (err: any) { return { success: false, error: err.message } }
  })

  // ── Sync ──────────────────────────────────────────────────
  ipcMain.handle('sync:getStatus', () => ({
    status:       syncEngine?.getStatus() ?? 'idle',
    pendingCount: syncLogger.getPendingCount(),
    isOnline:     netMonitor?.getIsOnline() ?? true,
  }))

  ipcMain.handle('sync:now', async () => {
    if (!syncEngine) return { success: false, error: 'Sync not initialised' }
    console.log("Try to sync")
    const result = await syncEngine.sync()
    console.log(result)

    return { success: true, data: result }
  })

  // ── Clients ───────────────────────────────────────────────
  ipcMain.handle('db:clients:getAll',  () => wrap(() => clients.getAllWithStats()))
  ipcMain.handle('db:clients:getById', (_e, id)        => wrap(() => clients.getById(id)))
  ipcMain.handle('db:clients:search',  (_e, q)         => wrap(() => clients.search(q)))
  ipcMain.handle('db:clients:create',  (_e, input)     => wrap(() => {
    if (!input?.name?.trim()) throw new Error('Client name is required')
    return syncLogger.loggedWrite('clients', input.id ?? '', 'INSERT',
      () => clients.create(input),
      input
    )
  }))
  ipcMain.handle('db:clients:update',  (_e, id, input) => wrap(() => {
    if (!input?.name?.trim()) throw new Error('Client name is required')
    return syncLogger.loggedWrite('clients', id, 'UPDATE',
      () => clients.update(id, input),
      { id, ...input }
    )
  }))
  ipcMain.handle('db:clients:delete',  (_e, id) =>
    wrapDelete(() => syncLogger.loggedWrite('clients', id, 'DELETE', () => clients.delete(id)), 'client has projects linked to them'))

  // ── Items ─────────────────────────────────────────────────
  ipcMain.handle('db:items:getAll',        () => wrap(() => items.getAll()))
  ipcMain.handle('db:items:getLowStock',   () => wrap(() => items.getLowStock()))
  ipcMain.handle('db:items:getCategories', () => wrap(() => items.getCategories()))
  ipcMain.handle('db:items:getByBarcode',  (_e, barcode) => wrap(() => {
    const item = items.getByBarcode(barcode)
    if (!item) throw new Error('No item found with that barcode')
    return item
  }))
  ipcMain.handle('db:items:search',      (_e, q)         => wrap(() => items.search(q)))
  ipcMain.handle('db:items:create',      (_e, input)     => wrap(() => {
    if (!input?.name?.trim()) throw new Error('Item name is required')
    if (!input?.unit?.trim()) throw new Error('Unit is required')
    return syncLogger.loggedWrite('items', '', 'INSERT', () => items.create(input), input)
  }))
  ipcMain.handle('db:items:update',      (_e, id, input) => wrap(() => {
    if (!input?.name?.trim()) throw new Error('Item name is required')
    if (!input?.unit?.trim()) throw new Error('Unit is required')
    return syncLogger.loggedWrite('items', id, 'UPDATE', () => items.update(id, input), { id, ...input })
  }))
  ipcMain.handle('db:items:setQuantity', (_e, id, qty)   => wrap(() =>
    syncLogger.loggedWrite('items', id, 'UPDATE', () => items.setQuantity(id, qty), { id, quantity: qty })
  ))
  ipcMain.handle('db:items:delete',      (_e, id) =>
    wrapDelete(() => syncLogger.loggedWrite('items', id, 'DELETE', () => items.delete(id)), 'item has been used in projects'))

  // ── Projects ──────────────────────────────────────────────
  ipcMain.handle('db:projects:getAll',          () => wrap(() => projects.getAll()))
  ipcMain.handle('db:projects:getById',         (_e, id)       => wrap(() => projects.getById(id)))
  ipcMain.handle('db:projects:getByClient',     (_e, clientId) => wrap(() => projects.getByClient(clientId)))
  ipcMain.handle('db:projects:search',          (_e, q)        => wrap(() => projects.search(q)))
  ipcMain.handle('db:projects:getStatusCounts', () => wrap(() => projects.getStatusCounts()))
  ipcMain.handle('db:projects:create',          (_e, input)    => wrap(() => {
    if (!input?.title?.trim())     throw new Error('Project title is required')
    if (!input?.client_id?.trim()) throw new Error('Client is required')
    return syncLogger.loggedWrite('projects', '', 'INSERT',
      () => projects.create(input, getAdminId()), input)
  }))
  ipcMain.handle('db:projects:update',       (_e, id, input)  => wrap(() =>
    syncLogger.loggedWrite('projects', id, 'UPDATE', () => projects.update(id, input), { id, ...input })
  ))
  ipcMain.handle('db:projects:updateStatus', (_e, id, status) => wrap(() =>
    syncLogger.loggedWrite('projects', id, 'UPDATE', () => projects.updateStatus(id, status), { id, status })
  ))
  ipcMain.handle('db:projects:cascadeDelete', (_e, id) => wrap(() => projects.cascadeDelete(id)))

  ipcMain.handle('db:projects:delete',       (_e, id) =>
    wrapDelete(() => syncLogger.loggedWrite('projects', id, 'DELETE', () => projects.delete(id)), 'project has materials or attendance linked to it'))

  // ── Quotations ────────────────────────────────────────────
  ipcMain.handle('db:quotations:getAll',           () => wrap(() => quotations.getAll()))
  ipcMain.handle('db:quotations:getByIdWithItems', (_e, id) => wrap(() => {
    const q = quotations.getByIdWithItems(id)
    if (!q) throw new Error('Quotation not found')
    return q
  }))
  ipcMain.handle('db:quotations:search',           (_e, q)        => wrap(() => quotations.search(q)))
  ipcMain.handle('db:quotations:create',           (_e, input)    => wrap(() => {
    if (!input?.client_id?.trim()) throw new Error('Client is required')
    if (!input?.items?.length)     throw new Error('At least one line item is required')
    return syncLogger.loggedWrite('quotations', '', 'INSERT',
      () => quotations.create(input, getAdminId()), input)
  }))
  ipcMain.handle('db:quotations:update',           (_e, id, input) => wrap(() => {
    if (!input?.client_id?.trim()) throw new Error('Client is required')
    if (!input?.items?.length)     throw new Error('At least one line item is required')
    return syncLogger.loggedWrite('quotations', id, 'UPDATE',
      () => quotations.update(id, input), { id, ...input })
  }))
  ipcMain.handle('db:quotations:updateStatus',     (_e, id, status) => wrap(() =>
    syncLogger.loggedWrite('quotations', id, 'UPDATE',
      () => quotations.updateStatus(id, status), { id, status })
  ))
  ipcMain.handle('db:quotations:delete',           (_e, id) =>
    wrapDelete(() => syncLogger.loggedWrite('quotations', id, 'DELETE', () => quotations.delete(id)), 'quotation is linked to an invoice'))

  // ── Workers ───────────────────────────────────────────────
  ipcMain.handle('db:workers:getAll',  () => wrap(() => workers.getAll()))
  ipcMain.handle('db:workers:getById', (_e, id) => wrap(() => workers.getById(id)))
  ipcMain.handle('db:workers:create',  (_e, input) => wrap(() => {
    if (!input?.name?.trim())      throw new Error('Worker name is required')
    if (input?.daily_rate == null) throw new Error('Daily rate is required')
    return syncLogger.loggedWrite('workers', '', 'INSERT', () => workers.create(input), input)
  }))
  ipcMain.handle('db:workers:update',  (_e, id, input) => wrap(() =>
    syncLogger.loggedWrite('workers', id, 'UPDATE', () => workers.update(id, input), { id, ...input })
  ))
  ipcMain.handle('db:workers:delete',  (_e, id) =>
    wrapDelete(() => syncLogger.loggedWrite('workers', id, 'DELETE', () => workers.delete(id)), 'worker has attendance or paysheets linked'))

  // ── Attendance ────────────────────────────────────────────
  ipcMain.handle('db:attendance:getByProject',         (_e, projectId)           => wrap(() => attendance.getByProject(projectId)))
  ipcMain.handle('db:attendance:getByWorkerAndPeriod', (_e, workerId, from, to)  => wrap(() => attendance.getByWorkerAndPeriod(workerId, from, to)))
  ipcMain.handle('db:attendance:getSummary',           (_e, workerId, from, to)  => wrap(() => attendance.getSummary(workerId, from, to)))
  ipcMain.handle('db:attendance:mark',                 (_e, input)               => wrap(() =>
    syncLogger.loggedWrite('attendance', input.worker_id, 'INSERT', () => attendance.mark(input), input)
  ))
  ipcMain.handle('db:attendance:delete',               (_e, id) => wrap(() =>
    syncLogger.loggedWrite('attendance', id, 'DELETE', () => attendance.delete(id))
  ))

  // ── Paysheets ─────────────────────────────────────────────
  ipcMain.handle('db:paysheets:getAll',       () => wrap(() => paysheets.getAll()))
  ipcMain.handle('db:paysheets:getByWorker',  (_e, workerId) => wrap(() => paysheets.getByWorker(workerId)))
  ipcMain.handle('db:paysheets:create',       (_e, input)    => wrap(() => {
    if (!input?.worker_id)    throw new Error('Worker is required')
    if (!input?.period_start) throw new Error('Period start is required')
    if (!input?.period_end)   throw new Error('Period end is required')
    return syncLogger.loggedWrite('paysheets', '', 'INSERT', () => paysheets.create(input), input)
  }))
  ipcMain.handle('db:paysheets:updateStatus', (_e, id, status) => wrap(() =>
    syncLogger.loggedWrite('paysheets', id, 'UPDATE',
      () => paysheets.updateStatus(id, status, getAdminId()), { id, status })
  ))
  ipcMain.handle('db:paysheets:delete',       (_e, id) => wrap(() =>
    syncLogger.loggedWrite('paysheets', id, 'DELETE', () => paysheets.delete(id))
  ))

  // ── Invoices ──────────────────────────────────────────────
  ipcMain.handle('db:invoices:getAll',                () => wrap(() => invoices.getAll()))
  ipcMain.handle('db:invoices:getByClient',           (_e, clientId) => wrap(() => invoices.getByClient(clientId)))
  ipcMain.handle('db:invoices:getOutstandingSummary', () => wrap(() => invoices.getOutstandingSummary()))
  ipcMain.handle('db:invoices:create',                (_e, input) => wrap(() => {
    if (!input?.project_id) throw new Error('Project is required')
    if (!input?.client_id)  throw new Error('Client is required')
    if (!input?.amount_due) throw new Error('Amount due is required')
    return syncLogger.loggedWrite('invoices', '', 'INSERT', () => invoices.create(input), input)
  }))
  ipcMain.handle('db:invoices:update',                (_e, id, input) => wrap(() =>
    syncLogger.loggedWrite('invoices', id, 'UPDATE', () => invoices.update(id, input), { id, ...input })
  ))
  ipcMain.handle('db:invoices:recordPayment',         (_e, id, amount) => wrap(() => {
    if (!amount || amount <= 0) throw new Error('Payment amount must be greater than 0')
    return syncLogger.loggedWrite('invoices', id, 'UPDATE',
      () => invoices.recordPayment(id, amount), { id, payment: amount })
  }))
  ipcMain.handle('db:invoices:delete',                (_e, id) =>
    wrapDelete(() => syncLogger.loggedWrite('invoices', id, 'DELETE', () => invoices.delete(id)), 'invoice cannot be deleted'))
}

// ── Helpers ───────────────────────────────────────────────────
function wrap<T>(fn: () => T): { success: boolean; data?: T; error?: string } {
  try { return { success: true, data: fn() } }
  catch (err: any) {
    if (err.message.includes('UNIQUE') && err.message.includes('barcode'))
      return { success: false, error: 'That barcode is already used by another item' }
    return { success: false, error: err.message }
  }
}

function wrapDelete(fn: () => { success: boolean }, fkMsg: string) {
  try {
    const result = fn()
    return { success: result.success }
  } catch (err: any) {
    if (err.message.includes('FOREIGN KEY'))
      return { success: false, error: `Cannot delete — ${fkMsg}.` }
    return { success: false, error: err.message }
  }
}
