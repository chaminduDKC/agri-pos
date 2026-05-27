import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initializeDb, closeDb, getDb } from './database/db'
import { registerAuthHandlers } from './auth/authHandlers'
import { ClientsRepository }    from './database/modules/clients'
import { ItemsRepository }      from './database/modules/items'
import { ProjectsRepository }   from './database/modules/projects'
import { QuotationsRepository } from './database/modules/quotations'
import { WorkersRepository, AttendanceRepository } from './database/modules/workers'
import { PaysheetsRepository }  from './database/modules/paysheets'
import { InvoicesRepository }   from './database/modules/invoices'
import { AllocationsRepository, ChildProjectsRepository, SubProjectsRepository } from './database/modules/allocations'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST     = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    width: 1280, height: 800, minWidth: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  if (VITE_DEV_SERVER_URL) { win.loadURL(VITE_DEV_SERVER_URL) }
  else { win.loadFile(path.join(RENDERER_DIST, 'index.html')) }
}

app.whenReady().then(() => {
  try { initializeDb() } catch (err) { console.error('[DB] Failed:', err); app.quit(); return }

  registerAuthHandlers(ipcMain, () => win)
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('before-quit', () => closeDb())
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

function registerIpcHandlers() {
  const db = getDb()
  const clients     = new ClientsRepository(db)
  const items       = new ItemsRepository(db)
  const projects    = new ProjectsRepository(db)
  const quotations  = new QuotationsRepository(db)
  const workers     = new WorkersRepository(db)
  const attendance  = new AttendanceRepository(db)
  const paysheets   = new PaysheetsRepository(db)
  const invoices    = new InvoicesRepository(db)
  const allocations = new AllocationsRepository(db)
  const subProjects = new SubProjectsRepository(db)
  const childProjects = new ChildProjectsRepository(db)

  const getAdminId = () => (db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string }).id

  // ── Test ──────────────────────────────────────────────────
  ipcMain.handle('ping',    () => 'pong')
  ipcMain.handle('db:test', () => {
    try { return { success: true, users: db.prepare('SELECT id,name,email,role FROM users').all() } }
    catch (err: any) { return { success: false, error: err.message } }
  })

  // ── Clients ───────────────────────────────────────────────
  ipcMain.handle('db:clients:getAll',  () => wrap(() => clients.getAllWithStats()))
  ipcMain.handle('db:clients:getById', (_e, id)        => wrap(() => clients.getById(id)))
  ipcMain.handle('db:clients:search',  (_e, q)         => wrap(() => clients.search(q)))
  ipcMain.handle('db:clients:create',  (_e, input)     => wrap(() => {
    if (!input?.name?.trim()) throw new Error('Client name is required')
    return clients.create(input)
  }))
  ipcMain.handle('db:clients:update',  (_e, id, input) => wrap(() => {
    if (!input?.name?.trim()) throw new Error('Client name is required')
    return clients.update(id, input)
  }))
  ipcMain.handle('db:clients:delete',  (_e, id) =>
    wrapDelete(() => clients.delete(id), 'client has projects linked to them'))

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
    return items.create(input)
  }))
  ipcMain.handle('db:items:update',      (_e, id, input) => wrap(() => {
    if (!input?.name?.trim()) throw new Error('Item name is required')
    if (!input?.unit?.trim()) throw new Error('Unit is required')
    return items.update(id, input)
  }))
  ipcMain.handle('db:items:setQuantity', (_e, id, qty)   => wrap(() => items.setQuantity(id, qty)))
  ipcMain.handle('db:items:delete',      (_e, id) =>
    wrapDelete(() => items.delete(id), 'item has been used in projects'))

  // ── Projects ──────────────────────────────────────────────
  ipcMain.handle('db:projects:getAll',          () => wrap(() => projects.getAll()))
  ipcMain.handle('db:projects:getById',         (_e, id)       => wrap(() => projects.getById(id)))
  ipcMain.handle('db:projects:getByClient',     (_e, clientId) => wrap(() => projects.getByClient(clientId)))
  ipcMain.handle('db:projects:search',          (_e, q)        => wrap(() => projects.search(q)))
  ipcMain.handle('db:projects:getStatusCounts', () => wrap(() => projects.getStatusCounts()))
  ipcMain.handle('db:projects:create',          (_e, input)    => wrap(() => {
    if (!input?.title?.trim())     throw new Error('Project title is required')
    if (!input?.client_id?.trim()) throw new Error('Client is required')
    return projects.create(input, getAdminId())
  }))
  ipcMain.handle('db:projects:update',         (_e, id, input)  => wrap(() => projects.update(id, input)))
  ipcMain.handle('db:projects:updateStatus',   (_e, id, status) => wrap(() => projects.updateStatus(id, status)))
  ipcMain.handle('db:projects:cascadeDelete',  (_e, id)         => wrap(() => projects.cascadeDelete(id)))
  ipcMain.handle('db:projects:fullDelete',     (_e, id)         => wrap(() => projects.fullDelete(id)))
  ipcMain.handle('db:projects:delete',         (_e, id) =>
    wrapDelete(() => projects.delete(id), 'project has materials or attendance linked to it'))

  // ── Quotations ────────────────────────────────────────────
  ipcMain.handle('db:quotations:getAll',           () => wrap(() => quotations.getAll()))
  ipcMain.handle('db:quotations:getByIdWithItems', (_e, id) => wrap(() => {
    const q = quotations.getByIdWithItems(id)
    if (!q) throw new Error('Quotation not found')
    return q
  }))
  ipcMain.handle('db:quotations:search',           (_e, q)         => wrap(() => quotations.search(q)))
  ipcMain.handle('db:quotations:create',           (_e, input)     => wrap(() => {
    if (!input?.client_id?.trim()) throw new Error('Client is required')
    if (!input?.items?.length)     throw new Error('At least one line item is required')
    return quotations.create(input, getAdminId())
  }))
  ipcMain.handle('db:quotations:update',           (_e, id, input) => wrap(() => {
    if (!input?.client_id?.trim()) throw new Error('Client is required')
    if (!input?.items?.length)     throw new Error('At least one line item is required')
    return quotations.update(id, input)
  }))
  ipcMain.handle('db:quotations:updateStatus',     (_e, id, status) => wrap(() => quotations.updateStatus(id, status)))
  ipcMain.handle('db:quotations:delete',           (_e, id) =>
    wrapDelete(() => quotations.delete(id), 'quotation is linked to an invoice'))

  // ── Workers ───────────────────────────────────────────────
  ipcMain.handle('db:workers:getAll',  () => wrap(() => workers.getAll()))
  ipcMain.handle('db:workers:getById', (_e, id)        => wrap(() => workers.getById(id)))
  ipcMain.handle('db:workers:create',  (_e, input)     => wrap(() => {
    if (!input?.name?.trim())      throw new Error('Worker name is required')
    if (input?.daily_rate == null) throw new Error('Daily rate is required')
    return workers.create(input)
  }))
  ipcMain.handle('db:workers:update',  (_e, id, input) => wrap(() => workers.update(id, input)))
  ipcMain.handle('db:workers:delete',  (_e, id) =>
    wrapDelete(() => workers.delete(id), 'worker has attendance or paysheets linked'))

  // ── Attendance ────────────────────────────────────────────
  ipcMain.handle('db:attendance:getByProject',         (_e, projectId)          => wrap(() => attendance.getByProject(projectId)))
  ipcMain.handle('db:attendance:getByWorkerAndPeriod', (_e, wId, from, to)      => wrap(() => attendance.getByWorkerAndPeriod(wId, from, to)))
  ipcMain.handle('db:attendance:getSummary',           (_e, wId, from, to)      => wrap(() => attendance.getSummary(wId, from, to)))
  ipcMain.handle('db:attendance:mark',                 (_e, input)              => wrap(() => attendance.mark(input)))
  ipcMain.handle('db:attendance:delete',               (_e, id)                 => wrap(() => attendance.delete(id)))

  // ── Paysheets ─────────────────────────────────────────────
  ipcMain.handle('db:paysheets:getAll',       () => wrap(() => paysheets.getAll()))
  ipcMain.handle('db:paysheets:getByWorker',  (_e, workerId) => wrap(() => paysheets.getByWorker(workerId)))
  ipcMain.handle('db:paysheets:create',       (_e, input)    => wrap(() => {
    if (!input?.worker_id)    throw new Error('Worker is required')
    if (!input?.period_start) throw new Error('Period start is required')
    if (!input?.period_end)   throw new Error('Period end is required')
    return paysheets.create(input)
  }))
  ipcMain.handle('db:paysheets:updateStatus', (_e, id, status) => wrap(() => paysheets.updateStatus(id, status, getAdminId())))
  ipcMain.handle('db:paysheets:delete',       (_e, id)         => wrap(() => paysheets.delete(id)))

  // ── Invoices ──────────────────────────────────────────────
  ipcMain.handle('db:invoices:getAll',                () => wrap(() => invoices.getAll()))
  ipcMain.handle('db:invoices:getByClient',           (_e, clientId) => wrap(() => invoices.getByClient(clientId)))
  ipcMain.handle('db:invoices:getOutstandingSummary', () => wrap(() => invoices.getOutstandingSummary()))
  ipcMain.handle('db:invoices:create',                (_e, input) => wrap(() => {
    if (!input?.project_id) throw new Error('Project is required')
    if (!input?.client_id)  throw new Error('Client is required')
    if (!input?.amount_due) throw new Error('Amount due is required')
    return invoices.create(input)
  }))
  ipcMain.handle('db:invoices:update',                (_e, id, input) => wrap(() => invoices.update(id, input)))
  ipcMain.handle('db:invoices:recordPayment',         (_e, id, amount) => wrap(() => {
    if (!amount || amount <= 0) throw new Error('Payment amount must be greater than 0')
    return invoices.recordPayment(id, amount)
  }))
  ipcMain.handle('db:invoices:delete',                (_e, id) =>
    wrapDelete(() => invoices.delete(id), 'invoice cannot be deleted'))

  // ── Sub-projects ──────────────────────────────────────────
  ipcMain.handle('db:subProjects:getByProject', (_e, projectId) => wrap(() => subProjects.getByProject(projectId)))
  ipcMain.handle('db:subProjects:create',       (_e, input)     => wrap(() => subProjects.create(input)))
  ipcMain.handle('db:subProjects:createChild',  (_e, input)     => wrap(() => subProjects.createChild(input)))
  ipcMain.handle('db:subProjects:updateStatus', (_e, id, status)=> wrap(() => subProjects.updateStatus(id, status)))
  ipcMain.handle('db:subProjects:update',       (_e, id, input) => wrap(() => subProjects.update(id, input)))
  ipcMain.handle('db:subProjects:delete',       (_e, id)        => wrap(() => subProjects.delete(id)))

  // ── Allocations ───────────────────────────────────────────
  ipcMain.handle('db:allocations:getByProject',                 (_e, projectId)          => wrap(() => allocations.getByProject(projectId)))
  ipcMain.handle('db:allocations:getChildAllocationsByChildProject',                 (_e, childProjectId)          => wrap(() => allocations.getChildAllocationsByChildProject(childProjectId)))
  ipcMain.handle('db:allocations:getById',                 (_e, id)          => wrap(() => allocations.getById(id)))
  ipcMain.handle('db:allocations:getChildAllocationById',                 (_e, id)          => wrap(() => allocations.getChildAllocationById(id)))
  ipcMain.handle('db:allocations:delete',                 (_e, id)          => wrap(() => allocations.delete(id)))
  ipcMain.handle('db:allocations:deleteSubAllocation',                 (_e, id)          => wrap(() => allocations.deleteSubAllocation(id)))
  ipcMain.handle('db:allocations:deleteChildAllocation',                 (_e, id)          => wrap(() => allocations.deleteChildAllocation(id)))
  ipcMain.handle('db:allocations:create',                     (_e, input)              => wrap(() => allocations.create(input)))
  ipcMain.handle('db:allocations:markChildUsed',                     (_e, input)              => wrap(() => allocations.markChildUsed(input)))
  ipcMain.handle('db:allocations:markUsed',                     (_e, id, qty)              => wrap(() => allocations.markUsed(id, qty)))
  ipcMain.handle('db:allocations:createSubAllocation',                     (_e, input)              => wrap(() => allocations.createSubAllocation(input)))
  ipcMain.handle('db:allocations:createChildAllocation',                     (_e, input)              => wrap(() => allocations.createChildAllocation(input)))
  ipcMain.handle('db:allocations:getSubAllocationById',                     (_e, id)              => wrap(() => allocations.getSubAllocationById(id)))
  ipcMain.handle('db:allocations:returnToInventory',            (_e, id, qty)            => wrap(() => allocations.returnToInventory(id, qty)))
  ipcMain.handle('db:allocations:returnSubToMain',            (_e, id, qty)            => wrap(() => allocations.returnSubToMain(id, qty)))
  ipcMain.handle('db:allocations:returnChildToSub',            (_e, id, qty)            => wrap(() => allocations.returnChildToSub(id, qty)))
  ipcMain.handle('db:allocations:getSubAllocationsBySubProject',(_e, subProjectId)       => wrap(() => allocations.getSubAllocationsBySubProject(subProjectId)))



// -child projects
  ipcMain.handle('db:childProjects:getBySubProject', (_e, subId)=> wrap(()=> childProjects.getBySubProject(subId)))
  ipcMain.handle('db:childProjects:create', (_e, input)=> wrap(()=> childProjects.create(input)))
  ipcMain.handle('db:childProjects:delete', (_e, childId)=> wrap(()=> childProjects.delete(childId)))
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