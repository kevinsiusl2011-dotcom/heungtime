import { readFile } from "fs/promises";
import path from "path";
import { applyCatalog, getCatalog, RESTAURANTS, restaurantById } from "@/lib/data";
import { confirmationCode } from "@/lib/whatsapp";
import type {
  Booking,
  CatalogPayload,
  CpaEntry,
  MerchantLead,
  SyncPayload,
} from "@/lib/types";
import { DATA_DIR, getDb } from "./db";

type Inventory = Record<string, number>;

let chain = Promise.resolve();
let migrated = false;
let catalogLoaded = false;

function locked<T>(fn: () => T | Promise<T>) {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function ensurePersist() {
  await ready();
}

function defaultInventory(): Inventory {
  return Object.fromEntries(RESTAURANTS.map((r) => [r.id, r.seatsLeft]));
}

function rowCount(sql: string) {
  const row = getDb().prepare(sql).get() as { c?: number } | undefined;
  return Number(row?.c ?? 0);
}

function kvGet(key: string) {
  const row = getDb().prepare("SELECT value FROM kv WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

function kvSet(key: string, value: string) {
  getDb()
    .prepare("INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, value);
}

export function loadCatalogOverlay() {
  if (catalogLoaded) return getCatalog();
  catalogLoaded = true;
  const raw = kvGet("catalog");
  if (raw) {
    try {
      applyCatalog(JSON.parse(raw) as CatalogPayload);
    } catch {
      /* keep seed */
    }
  }
  return getCatalog();
}

export async function saveCatalogOverlay(catalog: CatalogPayload) {
  await ready();
  return locked(() => {
    applyCatalog(catalog);
    kvSet("catalog", JSON.stringify(getCatalog()));
    catalogLoaded = true;
    return getCatalog();
  });
}

async function migrateJsonIfNeeded() {
  if (migrated) return;
  migrated = true;
  const db = getDb();
  loadCatalogOverlay();

  if (rowCount("SELECT COUNT(*) AS c FROM inventory") === 0) {
    const inv = defaultInventory();
    try {
      const raw = await readFile(path.join(DATA_DIR, "inventory.json"), "utf8");
      Object.assign(inv, JSON.parse(raw) as Inventory);
    } catch {
      /* seed */
    }
    const stmt = db.prepare(
      "INSERT INTO inventory(restaurant_id, seats) VALUES(?, ?) ON CONFLICT(restaurant_id) DO UPDATE SET seats = excluded.seats",
    );
    for (const [id, seats] of Object.entries(inv)) stmt.run(id, seats);
  }

  if (rowCount("SELECT COUNT(*) AS c FROM bookings") === 0) {
    try {
      const raw = await readFile(path.join(DATA_DIR, "bookings.json"), "utf8");
      const list = JSON.parse(raw) as Booking[];
      const stmt = db.prepare(
        "INSERT INTO bookings(id, confirmation_code, restaurant_id, json, status, created_at) VALUES(?, ?, ?, ?, ?, ?)",
      );
      for (const b of list) {
        stmt.run(b.id, b.confirmationCode, b.restaurantId, JSON.stringify(b), b.status, b.createdAt);
      }
    } catch {
      /* none */
    }
  }

  if (rowCount("SELECT COUNT(*) AS c FROM leads") === 0) {
    try {
      const raw = await readFile(path.join(DATA_DIR, "leads.json"), "utf8");
      const list = JSON.parse(raw) as MerchantLead[];
      const stmt = db.prepare("INSERT INTO leads(id, json, created_at) VALUES(?, ?, ?)");
      for (const lead of list) stmt.run(lead.id, JSON.stringify(lead), lead.createdAt);
    } catch {
      /* none */
    }
  }
}

function ready() {
  return locked(async () => {
    getDb();
    await migrateJsonIfNeeded();
    loadCatalogOverlay();
  });
}

export async function getInventory(): Promise<Inventory> {
  await ready();
  return locked(() => {
    const rows = getDb().prepare("SELECT restaurant_id, seats FROM inventory").all() as {
      restaurant_id: string;
      seats: number;
    }[];
    const inv = defaultInventory();
    for (const row of rows) inv[row.restaurant_id] = Number(row.seats);
    return inv;
  });
}

function writeInventoryRow(restaurantId: string, seats: number) {
  getDb()
    .prepare(
      "INSERT INTO inventory(restaurant_id, seats) VALUES(?, ?) ON CONFLICT(restaurant_id) DO UPDATE SET seats = excluded.seats",
    )
    .run(restaurantId, seats);
}

export async function reserveSeats(restaurantId: string, partySize: number) {
  await ready();
  return locked(async () => {
    const inv = await getInventoryUnlocked();
    const left = inv[restaurantId] ?? 0;
    if (partySize < 1 || partySize > 12) return { ok: false as const, error: "人數無效", left };
    if (left < partySize) return { ok: false as const, error: "剩餘席位不足", left };
    const next = left - partySize;
    writeInventoryRow(restaurantId, next);
    return { ok: true as const, left: next };
  });
}

function getInventoryUnlocked(): Inventory {
  const rows = getDb().prepare("SELECT restaurant_id, seats FROM inventory").all() as {
    restaurant_id: string;
    seats: number;
  }[];
  const inv = defaultInventory();
  for (const row of rows) inv[row.restaurant_id] = Number(row.seats);
  return inv;
}

export async function releaseSeats(restaurantId: string, partySize: number) {
  await ready();
  return locked(() => {
    const inv = getInventoryUnlocked();
    const cap = restaurantById(restaurantId)?.seatsLeft ?? 0;
    const next = Math.min(cap, (inv[restaurantId] ?? 0) + partySize);
    writeInventoryRow(restaurantId, next);
    return { ok: true as const, left: next };
  });
}

export async function saveServerBooking(booking: Booking) {
  await ready();
  return locked(() => {
    getDb()
      .prepare(
        "INSERT INTO bookings(id, confirmation_code, restaurant_id, json, status, created_at) VALUES(?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json, status = excluded.status",
      )
      .run(
        booking.id,
        booking.confirmationCode,
        booking.restaurantId,
        JSON.stringify(booking),
        booking.status,
        booking.createdAt,
      );
  });
}

export async function listBookings(restaurantId?: string) {
  await ready();
  return locked(() => {
    const rows = (
      restaurantId
        ? getDb()
            .prepare("SELECT json FROM bookings WHERE restaurant_id = ? ORDER BY created_at DESC")
            .all(restaurantId)
        : getDb().prepare("SELECT json FROM bookings ORDER BY created_at DESC").all()
    ) as { json: string }[];
    return rows.map((row) => JSON.parse(row.json) as Booking);
  });
}

export async function bookingByCode(confirmationCode: string) {
  await ready();
  return locked(() => {
    const row = getDb()
      .prepare("SELECT json FROM bookings WHERE confirmation_code = ?")
      .get(confirmationCode) as { json: string } | undefined;
    return row ? (JSON.parse(row.json) as Booking) : null;
  });
}

export async function cancelServerBooking(code: string) {
  await ready();
  return locked(() => {
    const row = getDb()
      .prepare("SELECT json FROM bookings WHERE confirmation_code = ?")
      .get(code) as { json: string } | undefined;
    if (!row) return { found: false as const };
    const booking = JSON.parse(row.json) as Booking;
    if (booking.status === "cancelled") {
      return { found: true as const, booking, released: false as const };
    }
    booking.status = "cancelled";
    getDb()
      .prepare("UPDATE bookings SET json = ?, status = ? WHERE confirmation_code = ?")
      .run(JSON.stringify(booking), booking.status, code);
    return { found: true as const, booking, released: true as const };
  });
}

export async function updateBookingStatus(
  code: string,
  status: Booking["status"],
) {
  await ready();
  return locked(() => {
    const row = getDb()
      .prepare("SELECT json FROM bookings WHERE confirmation_code = ?")
      .get(code) as { json: string } | undefined;
    if (!row) return { found: false as const };
    const booking = JSON.parse(row.json) as Booking;
    if (booking.status === "cancelled") {
      return { found: true as const, booking, updated: false as const, reason: "已取消" };
    }
    booking.status = status;
    if (status === "attended") booking.attendedAt = new Date().toISOString();
    getDb()
      .prepare("UPDATE bookings SET json = ?, status = ? WHERE confirmation_code = ?")
      .run(JSON.stringify(booking), booking.status, code);
    if (status === "attended") {
      const restaurant = restaurantById(booking.restaurantId);
      const amount = restaurant?.advertiserCpa ?? 0;
      getDb()
        .prepare(
          "INSERT INTO cpa_ledger(id, booking_id, restaurant_id, amount, status, created_at) VALUES(?, ?, ?, ?, ?, ?) ON CONFLICT(booking_id) DO NOTHING",
        )
        .run(
          `cpa-${booking.id}`,
          booking.id,
          booking.restaurantId,
          amount,
          "billed",
          new Date().toISOString(),
        );
    }
    return { found: true as const, booking, updated: true as const };
  });
}

export async function createBookingRecord(
  input: Omit<Booking, "id" | "via" | "confirmationCode" | "createdAt">,
) {
  const reserved = await reserveSeats(input.restaurantId, input.partySize);
  if (!reserved.ok) return reserved;
  const booking: Booking = {
    ...input,
    id: `bk-${Date.now()}`,
    via: "autochat",
    confirmationCode: confirmationCode(),
    createdAt: new Date().toISOString(),
  };
  await saveServerBooking(booking);
  return { ok: true as const, booking, left: reserved.left };
}

export async function saveLead(lead: MerchantLead) {
  await ready();
  return locked(() => {
    getDb()
      .prepare("INSERT INTO leads(id, json, created_at) VALUES(?, ?, ?)")
      .run(lead.id, JSON.stringify(lead), lead.createdAt);
  });
}

export async function listLeads() {
  await ready();
  return locked(() => {
    const rows = getDb().prepare("SELECT json FROM leads ORDER BY created_at DESC").all() as {
      json: string;
    }[];
    return rows.map((row) => JSON.parse(row.json) as MerchantLead);
  });
}

export async function listCpaLedger(restaurantId?: string) {
  await ready();
  return locked(() => {
    const rows = (
      restaurantId
        ? getDb()
            .prepare("SELECT * FROM cpa_ledger WHERE restaurant_id = ? ORDER BY created_at DESC")
            .all(restaurantId)
        : getDb().prepare("SELECT * FROM cpa_ledger ORDER BY created_at DESC").all()
    ) as {
      id: string;
      booking_id: string;
      restaurant_id: string;
      amount: number;
      status: string;
      created_at: string;
    }[];
    return rows.map(
      (row): CpaEntry => ({
        id: row.id,
        bookingId: row.booking_id,
        restaurantId: row.restaurant_id,
        amount: Number(row.amount),
        status: row.status as CpaEntry["status"],
        createdAt: row.created_at,
      }),
    );
  });
}

export async function saveOAuth(sid: string, tokens: { access: string; refresh?: string; exp: number }) {
  await ready();
  return locked(() => {
    getDb()
      .prepare(
        "INSERT INTO oauth(sid, access, refresh, exp) VALUES(?, ?, ?, ?) ON CONFLICT(sid) DO UPDATE SET access = excluded.access, refresh = COALESCE(excluded.refresh, oauth.refresh), exp = excluded.exp",
      )
      .run(sid, tokens.access, tokens.refresh ?? null, tokens.exp);
  });
}

export async function getOAuth(sid: string) {
  await ready();
  return locked(() => {
    const row = getDb().prepare("SELECT access, refresh, exp FROM oauth WHERE sid = ?").get(sid) as
      | { access: string; refresh: string | null; exp: number }
      | undefined;
    if (!row) return null;
    return { access: row.access, refresh: row.refresh ?? undefined, exp: Number(row.exp) };
  });
}

export async function putSync(syncKey: string, payload: SyncPayload) {
  await ready();
  return locked(() => {
    getDb()
      .prepare(
        "INSERT INTO sync_profiles(sync_key, payload, updated_at) VALUES(?, ?, ?) ON CONFLICT(sync_key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at",
      )
      .run(syncKey, JSON.stringify(payload), new Date().toISOString());
  });
}

export async function getSync(syncKey: string) {
  await ready();
  return locked(() => {
    const row = getDb()
      .prepare("SELECT payload, updated_at FROM sync_profiles WHERE sync_key = ?")
      .get(syncKey) as { payload: string; updated_at: string } | undefined;
    if (!row) return null;
    return { payload: JSON.parse(row.payload) as SyncPayload, updatedAt: row.updated_at };
  });
}

export async function getWalkCache(key: string) {
  await ready();
  return locked(() => {
    const row = getDb()
      .prepare("SELECT minutes, updated_at FROM walk_cache WHERE cache_key = ?")
      .get(key) as { minutes: number; updated_at: string } | undefined;
    if (!row) return null;
    if (Date.now() - +new Date(row.updated_at) > 7 * 24 * 60 * 60_000) return null;
    return Number(row.minutes);
  });
}

export async function setWalkCache(key: string, minutes: number) {
  await ready();
  return locked(() => {
    getDb()
      .prepare(
        "INSERT INTO walk_cache(cache_key, minutes, updated_at) VALUES(?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET minutes = excluded.minutes, updated_at = excluded.updated_at",
      )
      .run(key, minutes, new Date().toISOString());
  });
}

export { confirmationCode };
