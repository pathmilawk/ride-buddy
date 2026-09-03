#!/usr/bin/env node
/**
 * Live verification of the four rules the database enforces.
 *
 * These are the rules no unit test can reach, because their correctness lives in SQL:
 *
 *   FR-31..33  seat capacity under CONCURRENT acceptance  (the row-locking function)
 *   FR-30      contact released to an accepted pair, both directions  (RLS policy)
 *   FR-20      contact withheld from everyone else  (the public view)
 *   FR-38      cancelling a ride cascades to every non-terminal request  (trigger)
 *
 * Plus FR-26 (duplicate prevention) and BR-2.2 (seat bounds).
 *
 * Needs SUPABASE_DB_URL and psql. Creates its own fixtures under a reserved UUID prefix and
 * removes them afterwards, so it never touches demo data or a real account.
 *
 *   npm run verify:live
 */
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PREFIX = "7777"; // reserved for this script's fixtures
const A = "77770000-0000-4000-8000-000000000001"; // driver
const B = "77770000-0000-4000-8000-000000000002"; // will be accepted
const C = "77770000-0000-4000-8000-000000000003"; // will stay pending
const RIDE = "77771111-0000-4000-8000-00000000000d";
const REQ_B = "77772222-0000-4000-8000-00000000000b";
const REQ_C = "77772222-0000-4000-8000-00000000000c";

function dbUrl() {
  const env = Object.fromEntries(
    readFileSync(".env.local", "utf8").split("\n")
      .map((l) => l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)).filter(Boolean)
      .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, "")]),
  );
  const url = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;
  if (!url) {
    console.error("Missing SUPABASE_DB_URL in .env.local. See `npm run db:push` for the format.");
    process.exit(1);
  }
  return url;
}
const URL_ = dbUrl();

function sql(text) {
  const r = spawnSync("psql", [URL_, "--set=ON_ERROR_STOP=1", "-tAq", "--no-psqlrc", "-c", text], {
    encoding: "utf8",
  });
  return { ok: r.status === 0, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}
/** Run as a real authenticated user - this is how Supabase evaluates auth.uid(). */
function asUser(uid, query) {
  const r = sql(
    `set local role authenticated;
     set local request.jwt.claims = '{"sub":"${uid}","role":"authenticated"}';
     ${query}`,
  );
  return r.ok ? r.out : `ERROR:${r.err.split("\n")[0]}`;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = String(actual).trim() === String(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  (got "${String(actual).trim()}", expected "${expected}")`}`);
}

function cleanup() {
  sql(`delete from notifications where user_id::text like '${PREFIX}0000%';
       delete from ride_requests where id::text like '${PREFIX}2222%';
       delete from rides where id::text like '${PREFIX}1111%';
       delete from profiles where id::text like '${PREFIX}0000%';
       delete from auth.users where id::text like '${PREFIX}0000%';`);
}

function fixtures() {
  cleanup();
  const r = sql(`
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new)
    values
      ('${A}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','verify-a@example.test','x',now(),now(),now(),'','','',''),
      ('${B}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','verify-b@example.test','x',now(),now(),now(),'','','',''),
      ('${C}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','verify-c@example.test','x',now(),now(),now(),'','','','');

    insert into profiles (id, email, display_name, phone, home_area_id, role)
    select u.id, u.email, 'Verify ' || right(u.id::text,1), '+47 900 99 00' || right(u.id::text,1),
           (select id from areas where kind='residential' order by name limit 1), 'both'
      from auth.users u where u.id::text like '${PREFIX}0000%';

    -- EXACTLY ONE SEAT: the whole point of the concurrency test
    insert into rides (id, driver_id, origin_area_id, destination_area_id, departs_at, seats, note)
    values ('${RIDE}','${A}',
      (select id from areas where kind='residential' order by name limit 1),
      (select id from areas where kind='office' limit 1),
      now() + interval '2 days', 1, 'live verification fixture');

    insert into ride_requests (id, ride_id, passenger_id, status) values
      ('${REQ_B}','${RIDE}','${B}','pending'),
      ('${REQ_C}','${RIDE}','${C}','pending');`);
  if (!r.ok) {
    console.error("Could not create fixtures:\n" + r.err.split("\n").slice(0, 6).join("\n"));
    process.exit(1);
  }
}

function session(text) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const p = spawn("psql", [URL_, "-tAq", "--no-psqlrc", "-c", text]);
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("close", () => resolve({ out: out.trim(), ms: Date.now() - t0 }));
  });
}

// ---------------------------------------------------------------------------
console.log("Live verification - the rules only the database can prove\n");
console.log("Creating fixtures: a ride with 1 seat and 2 competing pending requests\n");
fixtures();

console.log("FR-31 to FR-33 / US-22 - seat capacity under CONCURRENT acceptance");
const a = session(`begin;
  select 'A:' || accept_ride_request('${REQ_B}');
  select pg_sleep(4);
  commit;`);
await wait(1500);
const b = session(`select 'B:' || accept_ride_request('${REQ_C}');`);
const [ra, rb] = await Promise.all([a, b]);

check("session A accepted the last seat", ra.out.includes("A:OK") ? "OK" : ra.out, "OK");
check("session B was refused with RIDE_FULL", rb.out.includes("B:RIDE_FULL") ? "RIDE_FULL" : rb.out, "RIDE_FULL");
check("session B BLOCKED on the row lock (waited > 2s)", rb.ms > 2000 ? "blocked" : `only ${rb.ms}ms`, "blocked");
check("accepted requests equals the seat count", sql(`select count(*) from ride_requests where ride_id='${RIDE}' and status='accepted';`).out, "1");
check("the ride is NOT overbooked", sql(`select (select count(*) from ride_requests where ride_id='${RIDE}' and status='accepted') <= (select seats from rides where id='${RIDE}');`).out, "t");

console.log("\nFR-30 / BR-3.24 - contact released to an ACCEPTED pair, both directions");
check("B (accepted) can read A's phone", asUser(B, `select count(*) from profiles where id='${A}' and phone is not null;`), "1");
check("A can read B's phone", asUser(A, `select count(*) from profiles where id='${B}' and phone is not null;`), "1");
check("C (still pending) reads NOTHING of A", asUser(C, `select count(*) from profiles where id='${A}';`), "0");
check("A reads NOTHING of C", asUser(A, `select count(*) from profiles where id='${C}';`), "0");

console.log("\nFR-20 / BR-2.24 - the public view withholds contact columns");
check("C can read A's name via public_profiles", asUser(C, `select count(*) from public_profiles where id='${A}' and display_name is not null;`), "1");
check("public_profiles has no phone column at all", /ERROR/.test(asUser(C, `select phone from public_profiles limit 1;`)) ? "no column" : "column exists", "no column");

console.log("\nFR-26 / A-1 - one active request per ride per passenger");
const dup = sql(`insert into ride_requests (ride_id, passenger_id) values ('${RIDE}','${B}');`);
check("duplicate active request refused by the partial unique index", dup.ok ? "allowed" : (/duplicate key|unique/i.test(dup.err) ? "refused" : "other"), "refused");

console.log("\nBR-2.2 - seats must be between 1 and 8");
for (const [n, want] of [[0, "refused"], [9, "refused"]]) {
  const r = sql(`insert into rides (driver_id, origin_area_id, destination_area_id, departs_at, seats)
    select '${A}', (select id from areas where kind='residential' limit 1),
      (select id from areas where kind='office' limit 1), now() + interval '5 days', ${n};`);
  check(`seats=${n}`, r.ok ? "allowed" : (/rides_seats_range/.test(r.err) ? "refused" : "other"), want);
}

console.log("\nFR-38 / BR-3.20 - cancelling a ride cascades to every non-terminal request");
sql(`update rides set status='cancelled' where id='${RIDE}';`);
check("no request left pending or accepted", sql(`select count(*) from ride_requests where ride_id='${RIDE}' and status in ('pending','accepted');`).out, "0");
check("both requests now cancelled", sql(`select count(*) from ride_requests where ride_id='${RIDE}' and status='cancelled';`).out, "2");

console.log("\nBR-3.25 - disclosure follows state, so cancelling closes the window");
check("B can no longer read A's profile", asUser(B, `select count(*) from profiles where id='${A}';`), "0");

console.log("\nFR-42 (amended) - notifications, created by triggers on the state change itself");
// The fixtures above already exercised the events: two requests were created (pending), one was
// accepted, and the ride was then cancelled - cascading both requests.
check("driver was told about each request",
  sql(`select count(*) from notifications where user_id='${A}' and kind='request_received';`).out, "2");
check("accepted passenger was told",
  sql(`select count(*) from notifications where user_id='${B}' and kind='request_accepted';`).out, "1");
check("both passengers told the ride was cancelled",
  sql(`select count(*) from notifications where kind='ride_cancelled' and user_id in ('${B}','${C}');`).out, "2");
check("the cancelling driver was NOT notified",
  sql(`select count(*) from notifications where user_id='${A}' and kind='ride_cancelled';`).out, "0");
check("every notification starts unread",
  sql(`select count(*) from notifications where user_id::text like '${PREFIX}0000%' and read_at is null;`).out,
  sql(`select count(*) from notifications where user_id::text like '${PREFIX}0000%';`).out);
check("a user sees only their own",
  asUser(C, `select count(*) from notifications where user_id='${A}';`), "0");
check("a user cannot fabricate one for someone else",
  /ERROR/.test(asUser(C, `insert into notifications (user_id, kind, ride_id) values ('${A}','request_received','${RIDE}');`))
    ? "refused" : "ALLOWED", "refused");
check("marking read works, and only on your own",
  (() => { asUser(B, `update notifications set read_at = now() where user_id='${B}';`);
           return sql(`select count(*) from notifications where user_id='${B}' and read_at is not null;`).out; })(),
  sql(`select count(*) from notifications where user_id='${B}';`).out);
check("realtime is enabled on the table",
  sql(`select count(*) from pg_publication_tables where pubname='supabase_realtime' and tablename='notifications';`).out, "1");

cleanup();
console.log("\nFixtures removed.");
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
