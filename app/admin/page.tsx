"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import type { Booking, CatalogPayload, CpaEntry, LocalEvent, MerchantLead, Restaurant } from "@/lib/types";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"events" | "restaurants" | "bookings">("events");
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [seats, setSeats] = useState<Record<string, number>>({});
  const [venues, setVenues] = useState<CatalogPayload["venues"]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ledger, setLedger] = useState<CpaEntry[]>([]);
  const [leads, setLeads] = useState<MerchantLead[]>([]);
  const [note, setNote] = useState("");

  async function loadCatalog() {
    const [catRes, invRes] = await Promise.all([fetch("/api/catalog"), fetch("/api/inventory")]);
    const data = (await catRes.json()) as { catalog?: CatalogPayload };
    const inv = (await invRes.json()) as { seats?: Record<string, number> };
    setEvents(data.catalog?.events ?? []);
    setRestaurants(data.catalog?.restaurants ?? []);
    setSeats(inv.seats ?? {});
    setVenues(data.catalog?.venues ?? []);
  }

  async function loadOverview() {
    const res = await fetch("/api/admin/overview");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = (await res.json()) as {
      ok?: boolean;
      bookings?: Booking[];
      ledger?: CpaEntry[];
      leads?: MerchantLead[];
    };
    if (data.ok) {
      setAuthed(true);
      setBookings(data.bookings ?? []);
      setLedger(data.ledger ?? []);
      setLeads(data.leads ?? []);
    }
  }

  useEffect(() => {
    void loadCatalog();
    void loadOverview();
  }, []);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setError(data.error ?? "登入失敗");
      return;
    }
    setAuthed(true);
    await Promise.all([loadCatalog(), loadOverview()]);
  }

  async function saveCatalog(which: "events" | "restaurants") {
    const body =
      which === "events"
        ? { events, venues }
        : { restaurants, venues, inventory: seats };
    const res = await fetch("/api/admin/catalog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; skipped?: string[] };
    if (!data.ok) {
      setNote(data.error ?? "儲存失敗");
      return;
    }
    setNote(
      data.skipped?.length
        ? `目錄已儲存，但略過未完整的餐廳：${data.skipped.join("、")}`
        : "目錄已儲存",
    );
    await loadCatalog();
  }

  async function mark(code: string, status: "confirmed" | "attended") {
    const res = await fetch("/api/book/attend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmationCode: code, status }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setNote(data.error ?? "更新狀態失敗");
      return;
    }
    setNote(`${code} 已標為 ${status === "attended" ? "已入座" : "已確認"}`);
    await loadOverview();
  }

  if (!authed) {
    return (
      <AppShell>
        <main id="main" className="mx-auto max-w-md px-5 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">內部</p>
          <h1 className="mt-2 display text-4xl">活動 CMS</h1>
          <p className="mt-3 text-sm text-muted">請輸入 ADMIN_PASSWORD。未設定環境變數時無法登入。</p>
          <form onSubmit={onLogin} className="mt-6 space-y-3">
            <input
              type="password"
              className="w-full rounded-xl border border-line bg-field px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="管理密碼"
            />
            {error && <p className="text-sm text-pink">{error}</p>}
            <button className="w-full rounded-xl bg-gold py-3 font-black text-bg">進入</button>
          </form>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main id="main" className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Admin</p>
            <h1 className="mt-2 display text-4xl">目錄與核銷</h1>
          </div>
          <button
            className="rounded-full border border-line px-4 py-2 text-sm"
            onClick={() => void fetch("/api/admin/login", { method: "DELETE" }).then(() => setAuthed(false))}
          >
            登出
          </button>
        </div>
        {note && <p className="mt-4 text-sm text-mint">{note}</p>}
        <div className="mt-6 flex gap-2">
          {(["events", "restaurants", "bookings"] as const).map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-full px-4 py-2 text-sm ${tab === id ? "bg-gold text-bg" : "border border-line"}`}
            >
              {id === "events" ? "活動" : id === "restaurants" ? "餐廳" : "訂座／CPA"}
            </button>
          ))}
        </div>

        {tab === "events" && (
          <section className="mt-6 space-y-4">
            {events.map((event, i) => (
              <article key={event.id} className="glass rounded-2xl p-4">
                <input
                  className="w-full rounded-xl border border-line bg-field px-3 py-2 font-bold"
                  value={event.title}
                  onChange={(e) =>
                    setEvents((prev) => prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                  }
                />
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <input
                    className="rounded-xl border border-line bg-field px-3 py-2 text-sm"
                    value={event.startAt}
                    onChange={(e) =>
                      setEvents((prev) => prev.map((x, j) => (j === i ? { ...x, startAt: e.target.value } : x)))
                    }
                  />
                  <input
                    className="rounded-xl border border-line bg-field px-3 py-2 text-sm"
                    value={event.endAt}
                    onChange={(e) =>
                      setEvents((prev) => prev.map((x, j) => (j === i ? { ...x, endAt: e.target.value } : x)))
                    }
                  />
                </div>
                <textarea
                  className="mt-2 w-full rounded-xl border border-line bg-field px-3 py-2 text-sm"
                  rows={2}
                  value={event.description}
                  onChange={(e) =>
                    setEvents((prev) => prev.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))
                  }
                />
              </article>
            ))}
            <button onClick={() => void saveCatalog("events")} className="rounded-xl bg-gold px-5 py-3 font-black text-bg">
              儲存活動目錄
            </button>
          </section>
        )}

        {tab === "restaurants" && (
          <section className="mt-6 space-y-4">
            {restaurants.map((r, i) => (
              <article key={r.id} className="glass grid gap-2 rounded-2xl p-4 md:grid-cols-4">
                <p className="font-bold md:col-span-2">{r.name}</p>
                <label className="text-sm">
                  剩餘席（即時庫存）
                  <input
                    type="number"
                    className="mt-1 w-full rounded-xl border border-line bg-field px-3 py-2"
                    value={seats[r.id] ?? r.seatsLeft}
                    onChange={(e) =>
                      setSeats((prev) => ({ ...prev, [r.id]: Number(e.target.value) }))
                    }
                  />
                </label>
                <label className="text-sm">
                  CPA
                  <input
                    type="number"
                    className="mt-1 w-full rounded-xl border border-line bg-field px-3 py-2"
                    value={r.advertiserCpa}
                    onChange={(e) =>
                      setRestaurants((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, advertiserCpa: Number(e.target.value) } : x)),
                      )
                    }
                  />
                </label>
                <label className="text-sm md:col-span-2">
                  WhatsApp
                  <input
                    className="mt-1 w-full rounded-xl border border-line bg-field px-3 py-2"
                    value={r.whatsapp}
                    onChange={(e) =>
                      setRestaurants((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, whatsapp: e.target.value } : x)),
                      )
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={r.autoChatReady}
                    onChange={(e) =>
                      setRestaurants((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, autoChatReady: e.target.checked } : x)),
                      )
                    }
                  />
                  即時留位
                </label>
              </article>
            ))}
            <button onClick={() => void saveCatalog("restaurants")} className="rounded-xl bg-gold px-5 py-3 font-black text-bg">
              儲存餐廳目錄
            </button>
          </section>
        )}

        {tab === "bookings" && (
          <section className="mt-6 space-y-6">
            <div className="overflow-x-auto rounded-3xl border border-line">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-gold-soft">
                  <tr>
                    <th className="px-4 py-3">編號</th>
                    <th className="px-4 py-3">餐廳</th>
                    <th className="px-4 py-3">客人</th>
                    <th className="px-4 py-3">狀態</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t border-line">
                      <td className="px-4 py-3 text-gold">{b.confirmationCode}</td>
                      <td className="px-4 py-3">{b.restaurantId}</td>
                      <td className="px-4 py-3">
                        {b.guestName} · {b.partySize} 位
                      </td>
                      <td className="px-4 py-3">{b.status}</td>
                      <td className="px-4 py-3">
                        {b.status !== "cancelled" && b.status !== "attended" && (
                          <div className="flex gap-2">
                            {b.status === "pending" && (
                              <button
                                className="rounded-full border border-line px-3 py-1"
                                onClick={() => void mark(b.confirmationCode, "confirmed")}
                              >
                                確認
                              </button>
                            )}
                            <button
                              className="rounded-full bg-mint px-3 py-1 text-bg"
                              onClick={() => void mark(b.confirmationCode, "attended")}
                            >
                              入座
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <article className="glass rounded-3xl p-5">
              <h2 className="display text-xl">CPA 帳冊</h2>
              <p className="mt-2 text-sm text-muted">
                合計 HK${ledger.reduce((s, x) => s + x.amount, 0).toLocaleString()} · {ledger.length} 筆入座
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {ledger.map((row) => (
                  <li key={row.id}>
                    {row.createdAt.slice(0, 16)} · {row.restaurantId} · HK${row.amount}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-3xl border border-line p-5">
              <h2 className="display text-xl">合作申請</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {leads.map((lead) => (
                  <li key={lead.id}>
                    {lead.name} · {lead.restaurant} · {lead.phone}
                  </li>
                ))}
              </ul>
            </article>
          </section>
        )}
      </main>
    </AppShell>
  );
}
