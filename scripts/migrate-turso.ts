/**
 * Applies Prisma migration SQL files to a Turso/libsql database.
 * Used instead of `prisma migrate deploy` which doesn't support the libsql protocol.
 */
import "dotenv/config";
import { createClient } from "@libsql/client";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function runMigrations() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id         TEXT     NOT NULL PRIMARY KEY,
      checksum   TEXT     NOT NULL,
      finished_at DATETIME,
      migration_name TEXT NOT NULL,
      logs       TEXT,
      rolled_back_at DATETIME,
      started_at DATETIME NOT NULL DEFAULT current_timestamp,
      applied_steps_count INTEGER NOT NULL DEFAULT 0
    )
  `);

  const migrationsDir = join(process.cwd(), "prisma/migrations");
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const migrationFolders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  for (const folder of migrationFolders) {
    const existing = await client.execute({
      sql: "SELECT id FROM _prisma_migrations WHERE migration_name = ?",
      args: [folder],
    });

    if (existing.rows.length > 0) {
      console.log(`  ✓ Already applied: ${folder}`);
      continue;
    }

    const sqlPath = join(migrationsDir, folder, "migration.sql");
    const sql = await readFile(sqlPath, "utf-8");

    console.log(`  Applying: ${folder}`);
    await client.executeMultiple(sql);

    await client.execute({
      sql: `INSERT INTO _prisma_migrations
              (id, checksum, migration_name, finished_at, applied_steps_count)
            VALUES (?, ?, ?, datetime('now'), 1)`,
      args: [crypto.randomUUID(), folder, folder],
    });

    console.log(`  ✓ Done: ${folder}`);
  }

  console.log("All migrations applied.");
  await client.close();
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
