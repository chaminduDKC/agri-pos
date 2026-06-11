

export const SCHEMA_VERSION = 1
// Bump this number when you change the schema in future.
// The migration system in migrations.ts uses this to know
// whether to run updates.

export const schema = `

CREATE TABLE IF NOT EXISTS users (
  id            TEXT     PRIMARY KEY,
  name          TEXT     NOT NULL,
  email         TEXT     NOT NULL UNIQUE,
  password_hash TEXT     NOT NULL,
  role          TEXT     NOT NULL
                         CHECK(role IN ('admin','manager','worker')),
  is_active     INTEGER  DEFAULT 1,   -- 1 = active, 0 = deactivated
  created_at    TEXT     DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id          TEXT     PRIMARY KEY,
  name        TEXT     NOT NULL,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  notes       TEXT,
  created_at  TEXT     DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS items (
  id                  TEXT     PRIMARY KEY,
  name                TEXT     NOT NULL,
  unit_size           TEXT,   -- e.g. '1.5' for 1.5 kg bags, '0.25' for 250ml bottles
  category            TEXT,
  unit                TEXT     NOT NULL,   -- 'meters', 'units', 'kg'
  quantity            REAL     DEFAULT 0,
  low_stock_threshold REAL     DEFAULT 5,
  barcode             TEXT     UNIQUE,     -- scanned from product label
  supplier            TEXT,
  unit_price          REAL     DEFAULT 0,
  source              TEXT     NOT NULL
                               CHECK(source IN ('local','external')),
  created_at          TEXT     DEFAULT (datetime('now')),
  updated_at          TEXT     DEFAULT (datetime('now'))
);






CREATE TABLE IF NOT EXISTS projects (
  id          TEXT     PRIMARY KEY,
  client_id   TEXT     NOT NULL REFERENCES clients(id),
  created_by  TEXT     NOT NULL REFERENCES users(id),
  title       TEXT     NOT NULL,
  location    TEXT,
  status      TEXT     DEFAULT 'pending'
                       CHECK(status IN ('pending','active','completed','cancelled')),
  start_date  TEXT,
  end_date    TEXT,
  notes       TEXT,
  created_at  TEXT     DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quotations (
  id            TEXT     PRIMARY KEY,
  client_id     TEXT     NOT NULL REFERENCES clients(id),
  project_id    TEXT     REFERENCES projects(id),  -- optional at creation
  created_by    TEXT     NOT NULL REFERENCES users(id),
  status        TEXT     DEFAULT 'draft'
                         CHECK(status IN ('draft','sent','approved','rejected')),
  total_amount  REAL     DEFAULT 0,
  transport_installation REAL DEFAULT 0,
  valid_until   TEXT,
  notes         TEXT,
  created_at    TEXT     DEFAULT (datetime('now'))
);

-- Each item line gets its own row here. This is the header-detail pattern.
CREATE TABLE IF NOT EXISTS quotation_items (
  id            TEXT     PRIMARY KEY,
  quotation_id  TEXT     NOT NULL REFERENCES quotations(id)
                         ON DELETE CASCADE,  -- delete lines when quote deleted
  item_id       TEXT     REFERENCES items(id),
  item_name     TEXT     NOT NULL,  -- snapshot: name at time of quoting
  quantity      REAL     NOT NULL,
  unit_price    REAL     NOT NULL,  -- snapshot: price at time of quoting
  labor_cost    REAL     DEFAULT 0
);




CREATE TABLE IF NOT EXISTS workers (
  id           TEXT     PRIMARY KEY,
  user_id      TEXT     NOT NULL UNIQUE REFERENCES users(id),
  nic          TEXT     UNIQUE,   -- national identity card
  daily_rate   REAL     NOT NULL DEFAULT 0,
  phone        TEXT,
  address      TEXT,
  joined_date  TEXT
);

CREATE TABLE IF NOT EXISTS attendance (
  id             TEXT     PRIMARY KEY,
  worker_id      TEXT     NOT NULL REFERENCES workers(id),
  project_id     TEXT     NOT NULL REFERENCES projects(id),
  work_date      TEXT     NOT NULL,
  hours_worked   REAL     DEFAULT 8,
  overtime_hours REAL     DEFAULT 0,
  status         TEXT     DEFAULT 'present'
                          CHECK(status IN ('present','absent','half-day')),
  notes          TEXT,
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
  daily_rate    REAL     NOT NULL,  -- snapshot at time of payment
  overtime_pay  REAL     DEFAULT 0,
  total_amount  REAL     NOT NULL,
  status        TEXT     DEFAULT 'draft'
                         CHECK(status IN ('draft','approved','paid')),
  created_at    TEXT     DEFAULT (datetime('now'))
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
  created_at      TEXT     DEFAULT (datetime('now'))
);




CREATE TABLE IF NOT EXISTS sub_projects (
  id          TEXT     PRIMARY KEY,
  project_id  TEXT     NOT NULL REFERENCES projects(id),
  title       TEXT     NOT NULL,
  location    TEXT     NOT NULL,
  status      TEXT     DEFAULT 'pending'
                       CHECK(status IN ('pending','in_progress','completed')),
  notes       TEXT,
  created_at  TEXT     DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS child_projects (
  id          TEXT     PRIMARY KEY,
  parent_id   TEXT     NOT NULL REFERENCES sub_projects(id),
  project_id  TEXT     NOT NULL REFERENCES projects(id),
  title       TEXT     NOT NULL,
  location    TEXT     NOT NULL,
  status      TEXT     DEFAULT 'pending'
                       CHECK(status IN ('pending','in_progress','completed')),
  notes       TEXT,
  created_at  TEXT     DEFAULT (datetime('now'))
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
  created_at          TEXT     DEFAULT (datetime('now'))
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
  allocated_at              TEXT  DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS child_allocations (
  id                        TEXT  PRIMARY KEY,
  parent_id                 TEXT  NOT NULL REFERENCES sub_allocations(id),
  child_project_id          TEXT  NOT NULL REFERENCES child_projects(id),
  allocation_id     TEXT  REFERENCES allocations(id),
  quantity_allocated  REAL     NOT NULL,
  quantity_used             REAL  DEFAULT 0,
  quantity_returned         REAL  DEFAULT 0,
  allocated_at              TEXT  DEFAULT (datetime('now'))
);




CREATE TABLE IF NOT EXISTS sync_log (
  id          TEXT     PRIMARY KEY,
  table_name  TEXT     NOT NULL,
  record_id   TEXT     NOT NULL,
  operation   TEXT     NOT NULL
              CHECK(operation IN ('INSERT','UPDATE','DELETE')),
  payload     TEXT,               -- JSON snapshot of the changed record
  synced      INTEGER  DEFAULT 0, -- 0 = pending, 1 = done
  created_at  TEXT     DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS meta (
  key    TEXT  PRIMARY KEY,
  value  TEXT
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
