

//{ db.ts
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE IS THE SINGLE ENTRY POINT FOR THE DATABASE:

//   All database access in your app goes through this file.
//   It ensures:
//     1. Only ONE connection is ever open (singleton pattern)
//     2. Foreign keys are always enabled
//     3. Schema is always initialized on first run
//     4. Migrations run automatically on startup

//   Usage anywhere in main process:
//     import { getDb } from './database/db'
//     const db = getDb()
//     const clients = db.prepare('SELECT * FROM clients').all()
// ─────────────────────────────────────────────────────────────}

import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'
import { schema, SCHEMA_VERSION } from './schema'
import { runMigrations } from './migrations'

// Module-level variable — holds the single database connection.
// null means not yet initialized. We use a singleton so we don't
// accidentally open multiple connections to the same file.
let db: Database.Database | null = null

// ─── getDb ────────────────────────────────────────────────────
// Call this anywhere in the main process to get the db connection.
// Safe to call multiple times — always returns the same instance.
export function getDb(): Database.Database {
  if (!db) {
    throw new Error('[DB] Database not initialized. Call initializeDb() first in main.ts')
  }
  return db
}

// ─── initializeDb ─────────────────────────────────────────────
// Call this ONCE in main.ts when the app starts (before any window).
// It handles everything: path, creation, schema, migrations.
export function initializeDb(): void {
  if (db) {
    console.log('[DB] Already initialized, skipping')
    return
  }

  // WHERE DOES THE DATABASE FILE LIVE?
  //
  // app.getPath('userData') returns the OS-specific app data folder:
  //   Windows:  C:\Users\<user>\AppData\Roaming\YourAppName
  //   Mac:      ~/Library/Application Support/YourAppName
  //   Linux:    ~/.config/YourAppName
  //
  // WHY HERE and not next to the .exe?
  //   The app installation folder is often read-only on Windows.
  //   userData is always writable and persists across app updates.
  const userDataPath = app.getPath('userData')
  const dbDir = path.join(userDataPath, 'database')
  const dbPath = path.join(dbDir, 'irrigation.db')

  // Create the directory if it doesn't exist yet (first run)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
    console.log(`[DB] Created database directory: ${dbDir}`)
  }

  console.log(`[DB] Opening database at: ${dbPath}`)

  // Open the connection
  // verbose: logs every SQL statement to console in development
  db = new Database(dbPath, {
    //verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
  })

  // CRITICAL: Enable foreign key enforcement.
  // SQLite disables this by default! Without this line, REFERENCES
  // constraints are silently ignored — you could delete a client
  // that has projects and SQLite wouldn't complain.
  db.pragma('foreign_keys = ON')

  // Enable WAL mode (Write-Ahead Logging).
  // WHY? WAL allows reads and writes to happen concurrently without
  // blocking each other. Much better performance for a desktop app
  // where the UI is reading while background sync is writing.
  db.pragma('journal_mode = WAL')

  // Run all CREATE TABLE IF NOT EXISTS statements
  // Safe to run every startup — IF NOT EXISTS means no harm if tables exist
  db.exec(schema)
  console.log('[DB] Schema applied')

  // Run any pending migrations (upgrades the schema if version changed)
  runMigrations(db, SCHEMA_VERSION)

  // Seed a default admin user on very first run
  seedDefaultAdmin(db)

  console.log('[DB] Database ready')
}

// ─── seedDefaultAdmin ─────────────────────────────────────────
// WHY: On first launch, there are no users. The app would be
// locked out with no way to log in. We create one default admin.
// The user should change this password immediately after first login.
function seedDefaultAdmin(db: Database.Database): void {
  const existing = db.prepare(`SELECT id FROM users LIMIT 1`).get()

  if (existing) {
    return // Users already exist, skip seeding
  }

  console.log('[DB] First run — seeding default admin user')

  // Generate a UUID for the admin user.
  // randomUUID() is built into Node.js — no extra package needed.
  const id = randomUUID()

  // WARNING: In production, hash this password with bcrypt.
  // For now we use a placeholder. We'll add proper auth later.
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, 'Admin', 'admin@irrigation.local', 'CHANGE_ME', 'admin')

  console.log('[DB] Default admin created: admin@irrigation.local')
  console.log('[DB] ⚠  Change the default password before going to production!')
}

// ─── closeDb ──────────────────────────────────────────────────
// Call this in main.ts when the app is about to quit.
// Ensures any pending WAL writes are flushed to disk cleanly.
export function closeDb(): void {
  if (db) {
    db.close()
    db = null
    console.log('[DB] Database connection closed')
  }
}
