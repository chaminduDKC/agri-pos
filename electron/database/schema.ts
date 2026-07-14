

export const SCHEMA_VERSION = 1


export const schema = `

CREATE TABLE IF NOT EXISTS users (
  id            TEXT     PRIMARY KEY,
  name          TEXT     NOT NULL,
  email         TEXT     NOT NULL UNIQUE,
  password_hash TEXT     NOT NULL,
  role          TEXT     NOT NULL
                         CHECK(role IN ('admin','manager','worker')),
  is_active     INTEGER  DEFAULT 1,  
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  created_at    TEXT     DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS clients (
  id          TEXT     PRIMARY KEY,
  name        TEXT     NOT NULL,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  notes       TEXT,
  role         TEXT DEFAULT 'worker',
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  created_at  TEXT     DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS items (
  id                  TEXT     PRIMARY KEY,
  name                TEXT     NOT NULL,
  unit_size           TEXT,   
  category            TEXT,
  unit                TEXT     NOT NULL,   
  quantity            REAL     DEFAULT 0,
  low_stock_threshold REAL     DEFAULT 5,
  barcode             TEXT     UNIQUE,     
  supplier            TEXT,
  unit_price          REAL     DEFAULT 0,
  source              TEXT     NOT NULL
                               CHECK(source IN ('local','external')),
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  created_at          TEXT     DEFAULT (datetime('now', 'localtime')),
  updated_at          TEXT     DEFAULT (datetime('now', 'localtime'))
);



CREATE TABLE IF NOT EXISTS ledger (
  id            TEXT     PRIMARY KEY,
  project_id        TEXT REFERENCES projects(id),
sub_project_id    TEXT REFERENCES sub_projects(id),
  date                        TEXT NOT NULL,          -- no longer UNIQUE
  entry_seq                   INTEGER NOT NULL, 
  payment_given REAL     NOT NULL DEFAULT 0,
  balance_returned REAL  NOT NULL DEFAULT 0,
  balance_from_previous_day REAL NOT NULL DEFAULT 0,
  balance_to_next_day REAL NOT NULL DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  created_at          TEXT     DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS ledger_audit (
  id            TEXT     PRIMARY KEY,
  ledger_id     TEXT     NOT NULL,
  date          TEXT     NOT NULL,
  old_payment_given REAL,
  old_balance_returned REAL,
  new_payment_given REAL NOT NULL,
  new_balance_returned REAL NOT NULL,
   is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  edited_at     TEXT     NOT NULL DEFAULT (datetime('now', 'localtime'))
);


CREATE TABLE IF NOT EXISTS projects (
  id          TEXT     PRIMARY KEY,
  client_id   TEXT     NOT NULL REFERENCES clients(id),
  created_by  TEXT     NOT NULL REFERENCES users(id),
  title       TEXT     NOT NULL,
  location    TEXT,
  contract_value REAL DEFAULT 0,
  status      TEXT     DEFAULT 'pending'
                       CHECK(status IN ('pending','active','completed','cancelled')),
  start_date  TEXT,
  end_date    TEXT,
  notes       TEXT,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  created_at  TEXT     DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS quotations (
  id            TEXT     PRIMARY KEY,
  client_id     TEXT     NOT NULL REFERENCES clients(id),
  project_id    TEXT     REFERENCES projects(id),  
  created_by    TEXT     NOT NULL REFERENCES users(id),
  status        TEXT     DEFAULT 'draft'
                         CHECK(status IN ('draft','sent','approved','rejected')),
  total_amount  REAL     DEFAULT 0,
  transport_installation REAL DEFAULT 0,
  valid_until   TEXT,
  notes         TEXT,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  created_at    TEXT     DEFAULT (datetime('now', 'localtime'))
);

-- Each item line gets its own row here. This is the header-detail pattern.
CREATE TABLE IF NOT EXISTS quotation_items (
  id            TEXT     PRIMARY KEY,
  quotation_id  TEXT     NOT NULL REFERENCES quotations(id)
                         ON DELETE CASCADE,  
  item_id       TEXT     REFERENCES items(id),
  item_name     TEXT     NOT NULL,  
  quantity      REAL     NOT NULL,
  unit_price    REAL     NOT NULL,  
  labor_cost    REAL     DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0
);




CREATE TABLE IF NOT EXISTS workers (
  id           TEXT     PRIMARY KEY,
  user_id      TEXT     NOT NULL UNIQUE REFERENCES users(id),
  nic          TEXT     UNIQUE, 
  daily_rate   REAL,
  fixed_salary REAL,
  overtime_rate REAL ,
  phone        TEXT,
  address      TEXT,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  joined_date  TEXT
);

CREATE TABLE IF NOT EXISTS attendance (
  id             TEXT     PRIMARY KEY,
  worker_id      TEXT     NOT NULL REFERENCES workers(id),
 project_id        TEXT REFERENCES projects(id),
sub_project_id    TEXT REFERENCES sub_projects(id),
child_project_id  TEXT REFERENCES child_projects(id),
  work_date      TEXT     NOT NULL,
  hours_worked   REAL     DEFAULT 8,
  overtime_hours REAL     DEFAULT 0,
   is_paid      INTEGER DEFAULT 0,
  status         TEXT     DEFAULT 'present'
                          CHECK(status IN ('present','absent','half-day')),
  notes          TEXT,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  UNIQUE(worker_id, project_id, work_date)
);


CREATE TABLE IF NOT EXISTS paysheets (
  id            TEXT     PRIMARY KEY,
  worker_id     TEXT     NOT NULL REFERENCES workers(id),
  project_id    TEXT     REFERENCES projects(id),
  approved_by   TEXT     REFERENCES users(id),
  period_start  TEXT     NOT NULL,
  period_end    TEXT     NOT NULL,
  total_days    REAL     DEFAULT 0,
  present_days REAL DEFAULT 0,
  half_days REAL DEFAULT 0,
  absent_days REAL DEFAULT 0,
  salary_advance REAL DEFAULT 0,
  fixed_salary REAL DEFAULT 0,
  daily_rate    REAL     DEFAULT 0,  
  overtime_rate  REAL     DEFAULT 0,
  overtime_hours REAL DEFAULT 0,
  total_amount  REAL     NOT NULL,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  status        TEXT     DEFAULT 'draft'
                         CHECK(status IN ('draft','approved','paid')),
  created_at    TEXT     DEFAULT (datetime('now', 'localtime'))
);



CREATE TABLE IF NOT EXISTS invoices (
  id              TEXT     PRIMARY KEY,
  project_id      TEXT     NOT NULL REFERENCES projects(id),
  client_id       TEXT     NOT NULL REFERENCES clients(id),
  quotation_id    TEXT     REFERENCES quotations(id),
  amount_due      REAL     NOT NULL,
  amount_paid     REAL     DEFAULT 0,
  payment_status  TEXT     DEFAULT 'pending'
                           CHECK(payment_status IN ('pending','partial','paid')),
  due_date        TEXT,
  notes           TEXT,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  created_at      TEXT     DEFAULT (datetime('now', 'localtime'))
);




CREATE TABLE IF NOT EXISTS sub_projects (
  id          TEXT     PRIMARY KEY,
  project_id  TEXT     NOT NULL REFERENCES projects(id),
  title       TEXT     NOT NULL,
  location    TEXT     NOT NULL,
  contract_value REAL DEFAULT 0,
  status      TEXT     DEFAULT 'pending'
                       CHECK(status IN ('pending','in_progress','completed')),
  notes       TEXT,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  created_at  TEXT     DEFAULT (datetime('now', 'localtime'))
);


CREATE TABLE IF NOT EXISTS child_projects (
  id          TEXT     PRIMARY KEY,
  parent_id   TEXT     NOT NULL REFERENCES sub_projects(id),
  project_id  TEXT     NOT NULL REFERENCES projects(id),
  ledger_id   TEXT ,
   contract_value REAL DEFAULT 0,
  title       TEXT     NOT NULL,
  location    TEXT     NOT NULL,
  status      TEXT     DEFAULT 'pending'
                       CHECK(status IN ('pending','in_progress','completed')),
  notes       TEXT,
  completed_date       TEXT,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  created_at  TEXT     DEFAULT (datetime('now', 'localtime'))
);


CREATE TABLE IF NOT EXISTS expense_logs (
  id TEXT PRIMARY KEY,               
  sub_project_id TEXT DEFAULT NULL REFERENCES sub_projects(id),   
  child_project_id TEXT DEFAULT NULL REFERENCES child_projects(id),   
  log_date TEXT NOT NULL,            
  fuel_amount REAL DEFAULT 0,
  accommodation_amount REAL DEFAULT 0,
  food_amount REAL DEFAULT 0,
  transport_amount REAL DEFAULT 0,
  other_description TEXT,
  other_amount REAL DEFAULT 0,
  total_amount REAL NOT NULL,       
  notes TEXT DEFAULT NULL,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime')),
  CHECK (
    (sub_project_id IS NOT NULL AND child_project_id IS NULL)
    OR (sub_project_id IS NULL AND child_project_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS expense_log_workers (
  id TEXT PRIMARY KEY,              
  expense_log_id TEXT NOT NULL,     
  worker_id TEXT NOT NULL,          
  amount REAL NOT NULL,
  date_paid TEXT,   
   sub_project_id TEXT DEFAULT NULL REFERENCES sub_projects(id),   
  child_project_id TEXT DEFAULT NULL REFERENCES child_projects(id),                 
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (expense_log_id) REFERENCES expense_logs(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES workers(id)
);

CREATE TABLE IF NOT EXISTS allocations (
  id                  TEXT     PRIMARY KEY,
  project_id          TEXT     NOT NULL REFERENCES projects(id),
  item_id             TEXT     REFERENCES items(id),
  item_name           TEXT     NOT NULL,
  item_unit           TEXT     NOT NULL,
  item_unit_size      TEXT,
  source              TEXT     NOT NULL
                               CHECK(source IN ('local','external')),
  quantity_allocated  REAL     NOT NULL,
  quantity_assigned   REAL     DEFAULT 0,
  quantity_used       REAL     DEFAULT 0,
  quantity_returned   REAL     DEFAULT 0,
  quantity_received_back   REAL     DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  created_at          TEXT     DEFAULT (datetime('now', 'localtime'))
);



CREATE TABLE IF NOT EXISTS sub_allocations (
  id                        TEXT  PRIMARY KEY,
  sub_project_id            TEXT  NOT NULL REFERENCES sub_projects(id),
  allocation_id     TEXT  REFERENCES allocations(id),
  quantity_allocated  REAL     NOT NULL,
  quantity_assigned         REAL  NOT NULL,
  quantity_used             REAL  DEFAULT 0,
  quantity_returned         REAL  DEFAULT 0,
  quantity_received_back   REAL     DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  allocated_at              TEXT  DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS child_allocations (
  id                        TEXT  PRIMARY KEY,
  parent_id                 TEXT  NOT NULL REFERENCES sub_allocations(id),
  child_project_id          TEXT  NOT NULL REFERENCES child_projects(id),
  allocation_id     TEXT  REFERENCES allocations(id),
  quantity_allocated  REAL     NOT NULL,
  quantity_used             REAL  DEFAULT 0,
  quantity_returned         REAL  DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  allocated_at              TEXT  DEFAULT (datetime('now', 'localtime'))
);




CREATE TABLE IF NOT EXISTS sync_log (
  id          TEXT     PRIMARY KEY,
  table_name  TEXT     NOT NULL,
  record_id   TEXT     NOT NULL,
  operation   TEXT     NOT NULL
              CHECK(operation IN ('INSERT','UPDATE','DELETE')),
  payload     TEXT,              
  synced      INTEGER  DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0,
  created_at  TEXT     DEFAULT (datetime('now', 'localtime'))
);


CREATE TABLE IF NOT EXISTS meta (
  key    TEXT  PRIMARY KEY,
  value  TEXT,
  is_deleted INTEGER DEFAULT 0,
  is_synced INTEGER DEFAULT 0
);




-- "Get all projects for client X"
CREATE INDEX IF NOT EXISTS idx_projects_client
  ON projects(client_id);

-- "Get all quotes for client X"
CREATE INDEX IF NOT EXISTS idx_quotations_client
  ON quotations(client_id);



-- "Get attendance for worker X"
CREATE INDEX IF NOT EXISTS idx_attendance_worker
  ON attendance(worker_id);

-- "Get all unsynced rows" — most important sync query
CREATE INDEX IF NOT EXISTS idx_sync_pending
  ON sync_log(synced)
  WHERE synced = 0;

-- "Find item by barcode" — used during scanning
CREATE INDEX IF NOT EXISTS idx_items_barcode
  ON items(barcode);

`
