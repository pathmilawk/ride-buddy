#!/usr/bin/env node
/**
 * Database tasks for Ride Buddy.
 *
 *   npm run db:status    what exists in the project right now (needs only the publishable key)
 *   npm run db:push      apply every migration in order (needs SUPABASE_DB_URL)
 *   npm run db:seed      apply the seed data, re-runnable (needs SUPABASE_DB_URL)
 *   npm run db:verify    check the schema really landed - tables, function, trigger, policies
 *   npm run db:reset     drop everything this project created, then push and seed
 *
 * Credentials are read from .env.local and are never printed.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");
const SEED = path.join(ROOT, "supabase", "seed.sql");
const DEMO = path.join(ROOT, "supabase", "demo-data.sql");

function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!existsSync(file)) return {};
  const env = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const DB_URL = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;
const REST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const REST_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const OBJECTS = {
  tables: ["areas", "profiles", "rides", "ride_requests"],
  views: ["public_profiles"],
  functions: ["accept_ride_request", "cascade_cancel_ride_requests", "set_updated_at"],
  triggers: ["rides_cancel_cascade", "profiles_set_updated_at"],
};

/** Project ref from the REST URL: https://<ref>.supabase.co -> <ref>. */
function projectRef() {
  if (!REST_URL) return "your-project-ref";
  try {
    return new URL(REST_URL).hostname.split(".")[0];
  } catch {
    return "your-project-ref";
  }
}

function requireDbUrl() {
  if (DB_URL) return DB_URL;
  console.error(`
Missing SUPABASE_DB_URL.

Applying migrations needs direct database access. The publishable key cannot do it - it maps to
the 'anon' role, which has no rights to create tables, functions, triggers or policies.

Add this line to .env.local (it is gitignored, and nothing prints it):

  SUPABASE_DB_URL=postgresql://postgres:YOUR-DB-PASSWORD@db.${projectRef()}.supabase.co:5432/postgres

Find the password under Supabase -> Project Settings -> Database -> Database password.
If your project uses the pooler, Settings -> Database -> Connection string -> URI works too.

Alternative, if you would rather not store the password: paste
aidlc-docs/construction/build-and-test/complete-schema.sql into the Supabase SQL Editor.
`);
  process.exit(1);
}

function requirePsql() {
  const probe = spawnSync("psql", ["--version"], { encoding: "utf8" });
  if (probe.error) {
    console.error(
      "psql not found. Install the PostgreSQL client (brew install libpq, or brew install postgresql).",
    );
    process.exit(1);
  }
  return probe.stdout.trim();
}

/** Run a .sql file. Stops on the first error so a half-applied schema is obvious. */
function runFile(file, label, extraArgs = []) {
  const res = spawnSync(
    "psql",
    [DB_URL, "--set=ON_ERROR_STOP=1", "--quiet", "--no-psqlrc", ...extraArgs, "-f", file],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const ok = res.status === 0;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${label}`);
  if (!ok) {
    const err = (res.stderr || res.stdout || "").trim();
    console.error(err.split("\n").slice(0, 12).join("\n"));
  }
  return ok;
}

/** Run inline SQL and return stdout, or null on failure. */
function query(sql) {
  const res = spawnSync(
    "psql",
    [DB_URL, "--set=ON_ERROR_STOP=1", "-tAq", "--no-psqlrc", "-c", sql],
    { encoding: "utf8" },
  );
  return res.status === 0 ? res.stdout.trim() : null;
}

/**
 * Confirm the database is reachable before applying anything.
 *
 * Without this, a connection failure looked identical to a migration failure and `push` wrongly
 * reported the schema as "partially applied" when nothing had run.
 */
function checkConnection() {
  const res = spawnSync(
    "psql",
    [DB_URL, "--set=ON_ERROR_STOP=1", "-tAq", "--no-psqlrc", "-c", "select 1;"],
    { encoding: "utf8" },
  );
  if (res.status === 0) return true;

  const err = (res.stderr || "").trim();
  console.error("Cannot reach the database.\n");
  console.error(err.split("\n").slice(0, 4).join("\n") + "\n");

  if (/could not translate host name|nodename nor servname|Name or service not known/i.test(err)) {
    console.error(`This is almost certainly the IPv6 issue.

Supabase's DIRECT host (db.<ref>.supabase.co) now publishes only an AAAA record - IPv6 only.
If this machine has no global IPv6 address, it cannot resolve or reach it, whatever the
password is.

Use the POOLER instead. Its hostname and username differ from the direct connection:

  postgresql://postgres.${projectRef()}:PASSWORD@aws-0-<REGION>.pooler.supabase.com:5432/postgres
                        ^^^^^^^^^^^^^^^^^^^^^^^                ^^^^^^^^
                        username is postgres.<ref>             region matters

Copy the exact string from Supabase -> Project Settings -> Database ->
Connection string -> URI, and choose the SESSION pooler (port 5432), not transaction mode
(6543) - transaction mode cannot run all the DDL in these migrations.`);
  } else if (/password authentication failed/i.test(err)) {
    console.error("The password in SUPABASE_DB_URL is wrong, or contains characters that need\nURL-encoding (@ : / ? # [ ] must be percent-encoded inside a connection URI).");
  }
  return false;
}

/**
 * Migration ledger.
 *
 * The first version of `push` re-ran every file every time, so a second run failed with
 * "type already exists" and the schema could never be extended without a full reset. That was
 * a real flaw, not a rough edge - adding a tenth migration is an ordinary thing to do.
 *
 * Each migration is paired with a SENTINEL: a query that returns 1 if that migration's work is
 * already present. On first run the ledger is seeded from those sentinels, so an existing
 * database is recognised rather than re-applied or wiped.
 */
const LEDGER = "_ride_buddy_migrations";

const SENTINELS = {
  "0001_areas.sql": "select count(*) from information_schema.tables where table_name='areas'",
  "0002_profiles.sql": "select count(*) from information_schema.tables where table_name='profiles'",
  "0003_rls_policies.sql": "select count(*) from pg_policies where policyname='profiles_select_own'",
  "0004_rides.sql": "select count(*) from information_schema.tables where table_name='rides'",
  "0005_public_profiles.sql": "select count(*) from information_schema.views where table_name='public_profiles'",
  "0006_ride_requests.sql": "select count(*) from information_schema.tables where table_name='ride_requests'",
  "0007_accept_request_function.sql": "select count(*) from pg_proc where proname='accept_ride_request'",
  "0008_cancel_ride_cascade_trigger.sql": "select count(*) from pg_trigger where tgname='rides_cancel_cascade'",
  "0009_accepted_pair_profile_policy.sql": "select count(*) from pg_policies where policyname='profiles_select_accepted_counterparty'",
  "0010_notifications.sql": "select count(*) from information_schema.tables where table_name='notifications'",
};

function ensureLedger(files) {
  query(`create table if not exists ${LEDGER} (
           filename text primary key,
           applied_at timestamptz not null default now(),
           seeded boolean not null default false
         );`);

  // Seed on first use: anything whose sentinel already reports present was applied before this
  // ledger existed. Recorded with seeded=true so the distinction stays visible.
  const known = (query(`select count(*) from ${LEDGER};`) ?? "0").trim();
  if (known !== "0") return;

  let seeded = 0;
  for (const file of files) {
    const name = path.basename(file);
    const sentinel = SENTINELS[name];
    if (!sentinel) continue;
    if ((query(sentinel) ?? "0").trim() !== "0") {
      query(`insert into ${LEDGER} (filename, seeded) values ('${name}', true)
             on conflict (filename) do nothing;`);
      seeded++;
    }
  }
  if (seeded > 0) {
    console.log(`Ledger created; ${seeded} migration(s) detected as already applied.\n`);
  }
}

function appliedSet() {
  const out = query(`select filename from ${LEDGER};`) ?? "";
  return new Set(out.split("\n").map((s) => s.trim()).filter(Boolean));
}

function recordApplied(name) {
  query(`insert into ${LEDGER} (filename) values ('${name}') on conflict (filename) do nothing;`);
}

function migrationFiles() {
  if (!existsSync(MIGRATIONS)) return [];
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort() // 0001..0009 - lexical order is the intended order
    .map((f) => path.join(MIGRATIONS, f));
}

// ---------------------------------------------------------------------------

async function status() {
  if (!REST_URL || !REST_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY in .env.local.");
    process.exit(1);
  }
  console.log(`Probing project ${projectRef()} via the REST API\n`);
  let missing = 0;
  for (const name of [...OBJECTS.tables, ...OBJECTS.views]) {
    const res = await fetch(`${REST_URL}/rest/v1/${name}?select=*&limit=1`, {
      headers: { apikey: REST_KEY, Authorization: `Bearer ${REST_KEY}` },
    });
    const present = res.status !== 404;
    if (!present) missing++;
    console.log(`  ${present ? "present" : "MISSING"}  ${name}`);
  }
  const rpc = await fetch(`${REST_URL}/rest/v1/rpc/accept_ride_request`, {
    method: "POST",
    headers: {
      apikey: REST_KEY,
      Authorization: `Bearer ${REST_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_request_id: "00000000-0000-0000-0000-000000000000" }),
  });
  const fnPresent = rpc.status !== 404;
  if (!fnPresent) missing++;
  console.log(`  ${fnPresent ? "present" : "MISSING"}  accept_ride_request()`);

  console.log(
    missing === 0
      ? "\nSchema looks applied. Run `npm run db:verify` for the full check."
      : `\n${missing} object(s) missing. Run \`npm run db:push\` (or paste complete-schema.sql).`,
  );
  process.exit(missing === 0 ? 0 : 1);
}

function push() {
  requireDbUrl();
  console.log(`Using ${requirePsql()}\n`);
  const files = migrationFiles();
  if (files.length === 0) {
    console.error("No migrations found in supabase/migrations/");
    process.exit(1);
  }
  if (!checkConnection()) process.exit(1);

  ensureLedger(files);
  const already = appliedSet();
  const pending = files.filter((f) => !already.has(path.basename(f)));

  if (pending.length === 0) {
    console.log(`All ${files.length} migrations are already applied. Nothing to do.`);
    return;
  }

  console.log(
    `${already.size} already applied, ${pending.length} pending:`,
  );
  let applied = 0;
  for (const file of pending) {
    const name = path.basename(file);
    if (!runFile(file, name)) {
      if (applied === 0) {
        console.error("\nFailed on the first pending migration - nothing new was applied.");
      } else {
        console.error(
          `\nStopped after ${applied} of ${pending.length} pending migrations - PARTIALLY applied.`,
        );
        console.error("Fix the cause and re-run push; migrations that succeeded are recorded.");
      }
      process.exit(1);
    }
    recordApplied(name);
    applied++;
  }
  console.log(`\n${applied} migration(s) applied.`);
}

function seed() {
  requireDbUrl();
  requirePsql();
  if (!existsSync(SEED)) {
    console.error("supabase/seed.sql not found");
    process.exit(1);
  }
  if (!checkConnection()) process.exit(1);
  console.log("Applying seed data (re-runnable):");
  if (!runFile(SEED, "seed.sql")) process.exit(1);
  const count = query("select count(*) from areas;");
  console.log(`\nSeeded. areas rows: ${count ?? "unknown"}`);
}

function verify() {
  requireDbUrl();
  requirePsql();
  if (!checkConnection()) process.exit(1);
  let failures = 0;
  const check = (label, actual, expected) => {
    const ok = String(actual) === String(expected);
    if (!ok) failures++;
    console.log(`  ${ok ? "OK  " : "FAIL"} ${label} (${actual}, expected ${expected})`);
  };

  console.log("Tables");
  for (const t of OBJECTS.tables) {
    check(
      t,
      query(`select count(*) from information_schema.tables where table_name='${t}';`),
      1,
    );
  }
  console.log("Views");
  for (const v of OBJECTS.views) {
    check(v, query(`select count(*) from information_schema.views where table_name='${v}';`), 1);
  }
  console.log("Functions");
  for (const f of OBJECTS.functions) {
    check(f, query(`select count(*) from pg_proc where proname='${f}';`), 1);
  }
  console.log("Triggers");
  for (const t of OBJECTS.triggers) {
    check(t, query(`select count(*) from pg_trigger where tgname='${t}';`), 1);
  }

  console.log("Row level security enabled");
  for (const t of OBJECTS.tables) {
    check(t, query(`select relrowsecurity from pg_class where relname='${t}';`), "t");
  }

  console.log("Policies (count per table)");
  const expectedPolicies = { areas: 1, profiles: 4, rides: 4, ride_requests: 4 };
  for (const [t, n] of Object.entries(expectedPolicies)) {
    check(t, query(`select count(*) from pg_policies where tablename='${t}';`), n);
  }

  console.log("Constraints that carry rules");
  check(
    "one active request per ride/passenger",
    query(`select count(*) from pg_indexes where indexname='ride_requests_one_active_per_ride';`),
    1,
  );
  check(
    "seats between 1 and 8",
    query(`select count(*) from pg_constraint where conname='rides_seats_range';`),
    1,
  );

  console.log("Seed data");
  check("areas seeded", query("select count(*) > 0 from areas;"), "t");
  check("an office area exists", query("select count(*) from areas where kind='office';"), 1);

  console.log(
    failures === 0
      ? "\nSchema verified. Every object, policy and constraint is present."
      : `\n${failures} check(s) failed.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

/**
 * Demo fixtures - employees, rides and requests covering every state the UI can show.
 *
 * Separate from `seed`, which loads the reference data the app needs to function. This is
 * optional and re-runnable: every row has a fixed UUID and the script deletes exactly those
 * before reinserting, so it never touches an account registered through the app.
 */
function demo() {
  requireDbUrl();
  requirePsql();
  if (!checkConnection()) process.exit(1);
  if (!existsSync(DEMO)) {
    console.error("supabase/demo-data.sql not found");
    process.exit(1);
  }
  // Departure times are anchored to clock times in this timezone, so a "07:30 commute" renders
  // as 07:30 in the browser instead of drifting with whenever the script ran.
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  console.log(`Applying demo data (re-runnable), times anchored to ${tz}:`);
  if (!runFile(DEMO, "demo-data.sql", [`-v`, `demo_tz=${tz}`])) process.exit(1);

  const rows = (sql) => query(sql) ?? "?";
  console.log("\nCreated:");
  console.log(`  employees      ${rows("select count(*) from profiles where id::text like '99999999-%';")}`);
  console.log(`  rides          ${rows("select count(*) from rides where id::text like '11111111-%';")}`);
  console.log(`  requests       ${rows("select count(*) from ride_requests where id::text like '22222222-%';")}`);

  console.log("\nRequest statuses in the data:");
  const statuses = query(
    `select '  ' || status || ' x' || count(*) from ride_requests
      where id::text like '22222222-%' group by status order by status;`,
  );
  console.log(statuses || "  (none)");
  console.log("  (a pending request on a departed ride also renders as EXPIRED - derived, not stored)");

  console.log("\nSign in as any of these. Password for all: RideBuddy123!");
  const people = query(
    `select '  ' || rpad(p.email, 22) || rpad(coalesce(p.display_name,'(no name)'), 20)
            || coalesce(a.name, 'NO HOME AREA')
       from profiles p left join areas a on a.id = p.home_area_id
      where p.id::text like '99999999-%' order by p.email;`,
  );
  console.log(people || "  (none)");
  console.log("\n  noor@solwr.com has no phone or home area on purpose - sign in as her and try");
  console.log("  to offer or request a ride to see the completeness gate refuse and redirect.");
}

function reset() {
  requireDbUrl();
  requirePsql();
  console.log("Dropping every object this project created...\n");
  // Reverse dependency order. Triggers and policies go with their tables.
  const drops = [
    "drop trigger if exists rides_cancel_cascade on rides;",
    "drop function if exists cascade_cancel_ride_requests();",
    "drop function if exists accept_ride_request(uuid);",
    "drop view if exists public_profiles;",
    "drop table if exists ride_requests;",
    "drop table if exists rides;",
    "drop trigger if exists profiles_set_updated_at on profiles;",
    "drop table if exists profiles;",
    "drop function if exists set_updated_at();",
    "drop table if exists areas;",
    `drop table if exists ${LEDGER};`,
    "drop type if exists request_status;",
    "drop type if exists ride_status;",
    "drop type if exists user_role;",
    "drop type if exists area_kind;",
  ];
  const res = spawnSync(
    "psql",
    [DB_URL, "--quiet", "--no-psqlrc", "-c", drops.join(" ")],
    { encoding: "utf8" },
  );
  if (res.status !== 0) {
    console.error((res.stderr || "").trim());
    process.exit(1);
  }
  console.log("  OK   dropped\n");
  push();
  seed();
  demo();
}

const [, , command] = process.argv;
const commands = { status, push, seed, demo, verify, reset };
if (!commands[command]) {
  console.error(`Usage: node scripts/db.mjs <${Object.keys(commands).join("|")}>`);
  process.exit(1);
}
await commands[command]();
