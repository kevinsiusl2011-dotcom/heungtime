"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AutoChatModal } from "@/components/AutoChatModal";
import { RestaurantCard } from "@/components/RestaurantCard";
import { recommendRestaurants } from "@/lib/agent";
import { formatDateTime } from "@/lib/calendar";
import { EVENTS, FEEDS, venueById } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { EventCategory } from "@/lib/types";

const FILTERS: { id: EventCategory | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "concert", label: "演唱會" },
  { id: "ticket-drop", label: "搶飛日子" },
  { id: "sports", label: "球賽" },
  { id: "mall", label: "商場限時" },
  { id: "exhibition", label: "演藝展覽" },
];

export default function DiscoverPage() {
  const { pinEvent, calendar, click, prefs, bookings, inventory } = useStore();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [booking, setBooking] = useState<{ restaurantId: string; eventId: string } | null>(
    null,
  );

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return EVENTS.filter((e) => (filter === "all" ? true : e.category === filter))
      .filter((e) => {
        if (!needle) return true;
        const venue = venueById(e.venueId);
        const blob = `${e.title} ${e.titleEn} ${e.tags.join(" ")} ${e.description} ${venue?.name ?? ""} ${venue?.district ?? ""}`.toLowerCase();
        return blob.includes(needle);
      })
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
  }, [filter, q]);

  return (
    <AppShell>
      <main id="main" className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">香港活動發現</p>
        <h1 className="display mt-2 text-4xl">
          把想去的日子，變成可執行的行程
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          演唱會、搶飛、港超、商場限時、西九檔期。加入日曆後，會在同一條時間線上接餐廳空位與尾班車。
        </p>
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋歌手、場地、商場、賽事…"
            className="w-full rounded-full border border-line bg-field px-5 py-2.5 text-sm md:max-w-sm"
            aria-label="搜尋活動"
          />
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-4 py-2 text-sm ${
                  filter === f.id ? "bg-gold text-bg" : "border border-line text-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {list.length === 0 && (
            <p className="rounded-3xl border border-line px-6 py-12 text-center text-muted">
              沒有符合「{q || FILTERS.find((f) => f.id === filter)?.label}」的活動。試試其他關鍵字或篩選。
            </p>
          )}
          {list.map((event) => {
            const venue = venueById(event.venueId);
            const recs = recommendRestaurants(event, prefs, bookings, 3, inventory);
            const pinned = calendar.some((c) => c.eventId === event.id);
            const feed = FEEDS.find((f) => f.id === event.feedId);
            return (
              <article key={event.id} className="glass rounded-3xl p-6 md:flex md:gap-8">
                <div className="md:flex-1">
                  <p className="text-xs text-mint">
                    {feed?.name} · {venue?.district}
                  </p>
                  <h2 className="mt-1 font-[family-name:var(--font-serif-tc)] text-2xl">
                    <Link href={`/events/${event.id}`} className="hover:text-gold">
                      {event.title}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {formatDateTime(event.startAt)} · {venue?.name}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted">{event.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => pinEvent(event.id)}
                      disabled={pinned}
                      className="rounded-xl bg-gold px-4 py-2 text-sm font-black text-bg disabled:opacity-50"
                    >
                      {pinned ? "已加入日曆" : "加入日曆並推薦附近餐廳"}
                    </button>
                    <Link
                      href={`/events/${event.id}`}
                      className="rounded-full border border-line px-4 py-2 text-sm"
                    >
                      夜歸詳情
                    </Link>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:mt-0 md:w-[300px]">
                  {recs.slice(0, 2).map((r) => (
                    <RestaurantCard
                      key={r.id}
                      compact
                      restaurant={r}
                      onBook={() => {
                        click(r.id);
                        setBooking({ restaurantId: r.id, eventId: event.id });
                      }}
                    />
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </main>
      {booking && (
        <AutoChatModal
          restaurantId={booking.restaurantId}
          eventId={booking.eventId}
          onClose={() => setBooking(null)}
        />
      )}
    </AppShell>
  );
}
