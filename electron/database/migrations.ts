// migrations.ts
// ─────────────────────────────────────────────────────────────
// WHY MIGRATIONS EXIST:
//
//   Your schema will change over time. You'll add a new column,
//   rename a table, add a new table. The problem: users already
//   have a database file with the old schema.
//
//   You CANNOT just drop and recreate tables — that destroys data.
//   Migrations let you evolve the schema safely, one version at a time.
//
//   HOW IT WORKS:
//   1. The `meta` table stores the current schema version number.
//   2. On startup, we compare stored version vs SCHEMA_VERSION.
//   3. If stored < current, we run only the missing migration steps.
//   4. Each migration step is a function that makes one small change.
//
//   EXAMPLE: user is on version 1, app is now version 3.
//   We run migration_2() then migration_3(). Never migration_1() again.
// ─────────────────────────────────────────────────────────────

import type Database from 'better-sqlite3'

// ─── Add new migrations here as your schema evolves ───────────
//
// Each key is the version number being UPGRADED TO.
// The function receives the db connection and runs SQL changes.
//
// RULES:
//   - Never edit an existing migration — users may have already run it.
//   - Only add new entries at the end.
//   - Keep each migration small and focused.
//
const migrations: Record<number, (db: Database.Database) => void> = {

  // Version 1: initial schema — nothing to migrate, schema.ts handles it.
  1: (_db) => {
    // Initial setup is handled by schema.ts (CREATE TABLE IF NOT EXISTS).
    // This entry just marks version 1 as "done" in the meta table.
  },

  // Example of a future migration — DO NOT uncomment until you need it:
  //
  // 2: (db) => {
  //   // Add a new column to projects for tracking GPS coordinates
  //   db.exec(`ALTER TABLE projects ADD COLUMN gps_location TEXT`)
  // },
  //
  // 3: (db) => {
  //   // Add supplier_id table and link items to it
  //   db.exec(`
  //     CREATE TABLE IF NOT EXISTS suppliers ( ... );
  //     ALTER TABLE items ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id);
  //   `)
  // },

}

// ─── Run pending migrations ────────────────────────────────────
export function runMigrations(db: Database.Database, targetVersion: number): void {

  // Read what version the database is currently on
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).get() as
    | { value: string }
    | undefined

  const currentVersion = row ? parseInt(row.value, 10) : 0

  if (currentVersion === targetVersion) {
    console.log(`[DB] Schema up to date (version ${targetVersion})`)
    return
  }

  console.log(`[DB] Migrating schema: version ${currentVersion} → ${targetVersion}`)

  // Run each missing migration in order
  // e.g. if current=1 and target=3, run migrations[2] then migrations[3]
  for (let v = currentVersion + 1; v <= targetVersion; v++) {
    const migrate = migrations[v]
    if (!migrate) {
      throw new Error(`[DB] Missing migration for version ${v}`)
    }

    // Wrap each migration in a transaction:
    // if anything fails, the whole migration is rolled back cleanly.
    const runInTransaction = db.transaction(() => {
      console.log(`[DB] Running migration ${v}...`)
      migrate(db)

      // Update the stored version number after successful migration
      db.prepare(`
        INSERT INTO meta (key, value) VALUES ('schema_version', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(String(v))
    })

    runInTransaction()
    console.log(`[DB] Migration ${v} complete`)
  }

  console.log(`[DB] All migrations complete`)
}
