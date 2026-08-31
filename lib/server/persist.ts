import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { RESTAURANTS } from "@/lib/data";
import { confirmationCode } from "@/lib/whatsapp";
import type { Booking, MerchantLead } from "@/lib/types";

const DIR = process.env.VERCEL
  ? path.join("/tmp", "heungtime-data")
  : path.join(process.cwd(), "data");
const INV = path.join(DIR, "inventory.json");
const LEADS = path.join(DIR, "leads.json");
const BOOKS = path.join(DIR, "bookings.json");

type Inventory = Record<string, number>;

let chain = Promise.resolve();

function locked<T>(fn: () => Promise<T>) {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function ensureDir() {
  await mkdir(DIR, { recursive: true });
}

function defaultInventory(): Inventory {
  return Object.fromEntries(RESTAURANTS.map((r) => [r.id, r.seatsLeft]));
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown) {
  await ensureDir();
  await writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

export async function getInventory(): Promise<Inventory> {
  return locked(async () => {
    const inv = await readJson<Inventory>(INV, defaultInventory());
    return { ...defaultInventory(), ...inv };
  });
}

export async function reserveSeats(restaurantId: string, partySize: number) {
  return locked(async () => {
    const inv = { ...defaultInventory(), ...(await readJson<Inventory>(INV, {})) };
    const left = inv[restaurantId] ?? 0;
    if (partySize < 1 || partySize > 12) return { ok: false as const, error: "人數無效", left };
    if (left < partySize) return { ok: false as const, error: "剩餘席位不足", left };
    inv[restaurantId] = left - partySize;
    await writeJson(INV, inv);
    return { ok: true as const, left: inv[restaurantId] };
  });
}

export async function releaseSeats(restaurantId: string, partySize: number) {
  return locked(async () => {
    const inv = { ...defaultInventory(), ...(await readJson<Inventory>(INV, {})) };
    const cap = RESTAURANTS.find((r) => r.id === restaurantId)?.seatsLeft ?? 0;
    inv[restaurantId] = Math.min(cap, (inv[restaurantId] ?? 0) + partySize);
    await writeJson(INV, inv);
    return { ok: true as const, left: inv[restaurantId] };
  });
}

export async function saveServerBooking(booking: Booking) {
  return locked(async () => {
    const list = await readJson<Booking[]>(BOOKS, []);
    list.push(booking);
    await writeJson(BOOKS, list);
  });
}

export async function cancelServerBooking(confirmationCode: string) {
  return locked(async () => {
    const list = await readJson<Booking[]>(BOOKS, []);
    const idx = list.findIndex((b) => b.confirmationCode === confirmationCode);
    if (idx < 0) return { found: false as const };
    const booking = list[idx];
    if (booking.status === "cancelled") {
      return { found: true as const, booking, released: false as const };
    }
    booking.status = "cancelled";
    list[idx] = booking;
    await writeJson(BOOKS, list);
    return { found: true as const, booking, released: true as const };
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
  return locked(async () => {
    const list = await readJson<MerchantLead[]>(LEADS, []);
    list.push(lead);
    await writeJson(LEADS, list);
  });
}

export { confirmationCode };
