/**
 * Seeds demo accounts so the platform can be evaluated immediately.
 *   npm run seed
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY,
 * and the SQL migrations already applied. Safe to re-run.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

// supabase-js needs a global WebSocket; Node < 22 does not provide one.
globalThis.WebSocket ??= WebSocket;

config({ path: ".env.local" });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// Keep in sync with lib/config.ts
const PRICES = { monthly: 999, yearly: 9999 };
const MONTHS = { monthly: 1, yearly: 12 };
const POOL_PERCENT = 40;

const ADMIN = { email: "admin@goodrounds.test", password: "Admin#2026", full_name: "Avery Admin" };
const PLAYER = { email: "player@goodrounds.test", password: "Player#2026", full_name: "Sam Player" };
const DEMO_NAMES = ["Priya Shah", "Tom Okafor", "Lena Fischer", "Marco Rossi", "Aisha Khan", "Jack Murphy", "Mei Chen", "Oliver Grant", "Zara Ali", "Ethan Brooks"];

async function findUserByEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit;
    if (data.users.length < 1000) return null;
  }
}

async function ensureUser({ email, password, full_name }, charityId, percent = 10) {
  const existing = await findUserByEmail(email);
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, charity_id: charityId, charity_percent: percent },
  });
  if (error) throw error;
  return data.user.id;
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

async function ensureSubscription(userId, plan, { charityId, percent, lapsed = false } = {}) {
  const { data: existing } = await db.from("subscriptions").select("id").eq("user_id", userId).maybeSingle();
  if (existing) return;
  const start = lapsed ? addMonths(new Date(), -2) : new Date(Date.now() - 3 * 86400000);
  const end = addMonths(start, MONTHS[plan]);
  const { data: sub, error } = await db
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan,
      status: lapsed ? "lapsed" : "active",
      amount_cents: PRICES[plan],
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
      provider: "mock",
      provider_ref: "seed",
    })
    .select()
    .single();
  if (error) throw error;
  const amount = PRICES[plan];
  const charity = Math.floor((amount * percent) / 100);
  const pool = Math.floor((amount * POOL_PERCENT) / 100);
  await db.from("payments").insert({
    user_id: userId,
    subscription_id: sub.id,
    kind: "new",
    plan,
    amount_cents: amount,
    charity_id: charityId,
    charity_percent: percent,
    charity_cents: charity,
    prize_pool_cents: pool,
    platform_cents: amount - charity - pool,
    provider_ref: "seed",
    created_at: start.toISOString(),
  });
}

async function ensureScores(userId, count) {
  const { count: have } = await db.from("scores").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (have) return;
  const rows = Array.from({ length: count }, (_, i) => ({
    user_id: userId,
    // Realistic Stableford spread, mostly 25–40.
    score: Math.max(1, Math.min(45, Math.round(32 + (Math.random() - 0.5) * 18))),
    played_on: new Date(Date.now() - (i * 6 + 1) * 86400000).toISOString().slice(0, 10),
  }));
  // Insert oldest first so the rolling window behaves like real usage.
  for (const r of rows.reverse()) {
    const { error } = await db.from("scores").insert(r);
    if (error) console.warn("  score skipped:", error.message);
  }
}

const { data: charities, error: cErr } = await db.from("charities").select("id, name").eq("active", true).order("name");
if (cErr || !charities?.length) {
  console.error("No charities found. Run supabase/migrations/*.sql first.", cErr?.message ?? "");
  process.exit(1);
}
const pick = (i) => charities[i % charities.length].id;

console.log("Creating admin…");
const adminId = await ensureUser(ADMIN, pick(0));
await db.from("profiles").update({ role: "admin" }).eq("id", adminId);

console.log("Creating test subscriber…");
const playerId = await ensureUser(PLAYER, pick(0), 15);
await ensureSubscription(playerId, "monthly", { charityId: pick(0), percent: 15 });
await ensureScores(playerId, 5);

console.log("Creating demo members…");
for (const [i, name] of DEMO_NAMES.entries()) {
  const email = `${name.split(" ")[0].toLowerCase()}@goodrounds.test`;
  const percent = [10, 10, 15, 20, 25][i % 5];
  const id = await ensureUser({ email, password: "Demo#2026", full_name: name }, pick(i + 1), percent);
  await ensureSubscription(id, i % 3 === 0 ? "yearly" : "monthly", { charityId: pick(i + 1), percent, lapsed: i === 9 });
  await ensureScores(id, i === 8 ? 3 : 5); // one member short of 5 scores, to show eligibility rules
}

console.log(`
Done.
  Admin:      ${ADMIN.email} / ${ADMIN.password}
  Subscriber: ${PLAYER.email} / ${PLAYER.password}
  Demo users: <firstname>@goodrounds.test / Demo#2026
`);
