/**
 * Applies supabase/migrations/*.sql to the database in filename order.
 *   npm run migrate
 * Each file runs once, inside a transaction, and is recorded in
 * public._migrations so re-running only applies new files.
 * Requires DATABASE_URL (+ DATABASE_PASSWORD) in .env.local.
 */
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

config({ path: ".env.local" });

let url = process.env.DATABASE_URL;
const password = process.env.DATABASE_PASSWORD;
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}
if (url.includes("[YOUR-PASSWORD]")) {
  if (!password || password.startsWith("PASTE_")) {
    console.error("Set DATABASE_PASSWORD in .env.local");
    process.exit(1);
  }
  url = url.replace("[YOUR-PASSWORD]", encodeURIComponent(password));
}

const dir = path.join(process.cwd(), "supabase", "migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  await client.query(`create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())`);
  // Internal bookkeeping table: keep it out of the public API.
  await client.query(`alter table public._migrations enable row level security`);
  const { rows } = await client.query(`select name from public._migrations`);
  const applied = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  skip  ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(`insert into public._migrations (name) values ($1)`, [file]);
      await client.query("commit");
      console.log(`  apply ${file}`);
    } catch (err) {
      await client.query("rollback");
      console.error(`\nFailed in ${file}: ${err.message}`);
      process.exit(1);
    }
  }

  // Tell the Data API to pick up new tables and functions immediately.
  await client.query(`notify pgrst, 'reload schema'`);
  console.log("Migrations complete.");
} finally {
  await client.end();
}
