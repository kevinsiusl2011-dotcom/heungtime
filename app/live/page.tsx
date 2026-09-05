"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarPlus, Send } from "lucide-react";
import { AutoChatModal } from "@/components/AutoChatModal";
import { DaydreamBadge, PromoBlockInline } from "@/components/DaydreamBadge";
import { EmailPreview } from "@/components/EmailPreview";
import { IcsImport } from "@/components/IcsImport";
import { NightPlanCard } from "@/components/NightPlanCard";
import { Nav } from "@/components/Nav";
import { PrefsPanel } from "@/components/PrefsPanel";
import { RestaurantCard } from "@/components/RestaurantCard";
import { SubscribePanel } from "@/components/SubscribePanel";
import {
  agentReply,
  calendarDescription,
  buildNightPlan,
  recommendRestaurants,
} from "@/lib/agent";
import {
  formatDate,
  formatHk,
  formatTime,
  googleCalendarUrl,
  hkHour,
  hkYmd,
  shiftIsoDays,
  weekDays,
  weekStart,
} from "@/lib/calendar";
import { EVENTS, FEEDS, eventById, venueById } from "@/lib/data";
import { CATEGORY_LABEL } from "@/lib/labels";
import { useStore } from "@/lib/store";
import type { CalendarItem, LocalEvent } from "@/lib/types";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8);
const SUGGESTIONS = ["陳奕迅演唱會之後食飯", "星期六想睇波，趕尾班車", "加入海港城會員夜", "西九展覽之後食麵"];

export default function LivePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <Nav solid />
          <p className="px-5 py-16 text-center text-muted">載入日曆…</p>
        </div>
      }
    >
      <LiveInner />
    </Suspense>
  );
}

function LiveInner() {
  const {
    feeds,
    toggleFeed,
    calendar,
    pinEvent,
    messages,
    pushMessage,
    impression,
    click,
    prefs,
    bookings,
    inventory,
    coords,
    google,
    requestGeo,
    enableDropAlerts,
    catalogRev,
  } = useStore();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("陳奕迅演唱會之後食飯");
  const [selectedEventId, setSelectedEventId] = useState("eason-fear");
  const [booking, setBooking] = useState<{ restaurantId: string; eventId?: string } | null>(
    null,
  );
  const [emailOpen, setEmailOpen] = useState(false);
  const [weekAnchor, setWeekAnchor] = useState("2026-09-07T00:00:00+08:00");
  const [asking, setAsking] = useState(false);
  const deepLinked = useRef(false);

  const selected = useMemo(
    () => eventById(selectedEventId) ?? EVENTS[0],
    [selectedEventId, catalogRev],
  );
  const recs = recommendRestaurants(selected, prefs, bookings, 3, inventory);
  const plan = buildNightPlan(selected, calendar, prefs, coords);
  const alreadyIn = calendar.some((c) => c.eventId === selected.id);
  const days = weekDays(weekStart(weekAnchor));
  const selectedDayKey = hkYmd(selected.startAt);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (deepLinked.current) return;
    const eventId = searchParams.get("event");
    const bookId = searchParams.get("book");
    if (eventId && eventById(eventId)) {
      deepLinked.current = true;
      setSelectedEventId(eventId);
      setWeekAnchor(eventById(eventId)!.startAt);
      if (bookId) setBooking({ restaurantId: bookId, eventId });
    }
  }, [searchParams]);

  const feedEvents = useMemo(
    () => EVENTS.filter((e) => feeds.includes(e.feedId)),
    [feeds, catalogRev],
  );

  function jumpToEvent(event: LocalEvent) {
    setSelectedEventId(event.id);
    setWeekAnchor(event.startAt);
  }

  async function onAsk(e: FormEvent) {
    e.preventDefault();
    const text = query.trim();
    if (!text || asking) return;
    pushMessage({ id: `u-${Date.now()}`, role: "user", text });
    setAsking(true);
    setQuery("");
    let reply = agentReply(text, calendar, prefs, bookings, inventory, coords);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, calendar, prefs, bookings, coords }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: typeof reply };
      if (res.ok && data.message) reply = data.message;
    } catch {
      /* keyword fallback already set */
    }
    pushMessage(reply);
    if (reply.eventIds?.[0]) {
      const ev = eventById(reply.eventIds[0]);
      if (ev) jumpToEvent(ev);
    }
    reply.restaurantIds?.forEach(impression);
    if (reply.intent === "pin" && reply.eventIds?.[0]) {
      pinEvent(reply.eventIds[0]);
    }
    if (reply.intent === "book" && reply.restaurantIds?.[0]) {
      click(reply.restaurantIds[0]);
      setBooking({ restaurantId: reply.restaurantIds[0], eventId: reply.eventIds?.[0] });
    }
    setAsking(false);
  }

  function handlePin(event: LocalEvent) {
    const item = pinEvent(event.id, { withRelated: Boolean(event.relatedEventId) });
    jumpToEvent(event);
    recs.forEach((r) => impression(r.id));
    if (item) {
      pushMessage({
        id: `pin-${Date.now()}`,
        role: "agent",
        text: `已把「${event.title}」寫入日曆。${plan.clash ? plan.clash + " " : ""}${plan.diningWindow} ${plan.lastTrain}。附近 ${recs.length} 間按你的設定排序。`,
        eventIds: [event.id],
        restaurantIds: recs.map((r) => r.id),
      });
    }
  }

  const gcal = googleCalendarUrl({
    title: selected.title,
    startAt: selected.startAt,
    endAt: selected.endAt,
    location: venueById(selected.venueId)?.address ?? "",
    description: calendarDescription(selected, recs),
  });

  return (
    <div className="min-h-screen pb-16">
      <Nav solid />
      <div className="mx-auto max-w-[1400px] px-4 pt-3 flex justify-end">
        <DaydreamBadge slot="live-header" eventId={selected.id} variant="compact" />
      </div>
      <div id="main" className="mx-auto grid max-w-[1400px] gap-5 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="space-y-4">
          <section className="glass rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">訂閱 Feeds</p>
            <p className="mt-2 text-sm text-muted">打開你想自動入曆的類型</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {FEEDS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleFeed(f.id)}
                  className={`rounded-xl border px-2.5 py-2 text-left text-xs leading-5 ${
                    feeds.includes(f.id)
                      ? "border-gold bg-gold-soft text-ink"
                      : "border-line text-muted"
                  }`}
                >
                  <span className="font-medium">{f.name}</span>
                </button>
              ))}
            </div>
            <Link href="/api/ics/all?download=1" className="mt-3 block text-xs text-mint">
              下載靜態 ICS（備援）
            </Link>
            <div className="mt-3">
              <IcsImport compact />
            </div>
          </section>

          <SubscribePanel feed="all" />
          <PrefsPanel />

          <section className="glass rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-mint">通勤與提醒</p>
            <p className="mt-2 text-xs text-muted">
              {coords
                ? `GPS ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`
                : "未開定位，用出發地區估算"}
            </p>
            <button
              onClick={requestGeo}
              className="mt-2 w-full rounded-full border border-line py-2 text-xs"
            >
              用而家位置計通勤
            </button>
            <button
              onClick={() => void enableDropAlerts()}
              className="mt-2 w-full rounded-full border border-line py-2 text-xs"
            >
              開啟搶飛通知
            </button>
            {google.configured ? (
              <a href="/api/google/auth" className="mt-2 block text-center text-xs text-mint">
                {google.connected ? "Google 日曆已連接（加入時會寫入）" : "連接 Google 日曆寫入"}
              </a>
            ) : (
              <p className="mt-2 text-[11px] text-muted">未設 Google OAuth，請用 ICS 訂閱。</p>
            )}
          </section>

          <section className="glass flex h-[460px] flex-col rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-mint">Agent</p>
            <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
              {messages.map((m, idx) => {
                const agentMsgs = messages.filter((x) => x.role === "agent");
                const agentIdx = agentMsgs.indexOf(m);
                const isTicketDrop =
                  m.promoBlock?.label?.includes("搶飛") ||
                  m.promoBlock?.label?.includes("必睇") === true;
                const hasLucky =
                  m.promoBlock?.text?.includes("幸運") ||
                  m.promoBlock?.text?.includes("搶飛運") ||
                  m.promoBlock?.text?.includes("方位");
                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl px-3 py-2 text-sm leading-6 ${
                      m.role === "user" ? "ml-6 bg-gold-soft" : "mr-4 border border-line bg-field"
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-sans">{m.text}</pre>
                    {m.quickReplies && m.quickReplies.length > 0 && m.role === "agent" && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.quickReplies.map((qr, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setQuery(qr.label)}
                            className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] font-semibold text-gold hover:bg-gold/20"
                          >
                            {i + 1}. {qr.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {m.role === "agent" && (
                      <PromoBlockInline
                        promoBlock={m.promoBlock}
                        always={isTicketDrop || !!hasLucky}
                        indexHint={agentIdx < 0 ? idx : agentIdx}
                      />
                    )}
                  </div>
                );
              })}
              <div ref={chatEnd} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setQuery(s);
                  }}
                  className="rounded-full border border-pink/30 bg-pink/5 px-2.5 py-1 text-[11px] font-medium text-muted hover:border-gold hover:text-gold"
                >
                  {s}
                </button>
              ))}
            </div>
            <form onSubmit={onAsk} className="mt-3 flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 rounded-xl border border-line bg-field px-4 py-2 text-sm"
                placeholder="陳奕迅演唱會之後食飯"
                aria-label="問 Agent"
              />
              <button
                type="submit"
                disabled={asking}
                className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-bg disabled:opacity-40"
                aria-label="傳送"
              >
                <Send size={16} />
              </button>
            </form>
          </section>
        </aside>

        <section className="glass overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <p className="text-xs text-muted">
                週曆 · {formatHk(days[0].toISOString(), { month: "numeric", day: "numeric" })}–
                {formatHk(days[6].toISOString(), { day: "numeric" })}
              </p>
              <h2 className="display text-2xl">你的生活流</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-line px-3 py-1 text-xs"
                onClick={() => setWeekAnchor("2026-09-07T00:00:00+08:00")}
              >
                本季
              </button>
              <button
                className="rounded-full border border-line px-3 py-1 text-xs"
                onClick={() => setWeekAnchor((prev) => shiftIsoDays(prev, -7))}
              >
                上一週
              </button>
              <button
                className="rounded-full border border-line px-3 py-1 text-xs"
                onClick={() => setWeekAnchor((prev) => shiftIsoDays(prev, 7))}
              >
                下一週
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-8">
              <div className="border-b border-line p-2 text-xs text-muted" />
              {days.map((d) => {
                const key = hkYmd(d);
                const on = key === selectedDayKey;
                return (
                <div
                  key={d.toISOString()}
                  className={`border-b border-l border-line p-2 text-center ${on ? "bg-gold-soft" : ""}`}
                >
                  <p className="text-xs text-muted">
                    {formatHk(d.toISOString(), { weekday: "short" })}
                  </p>
                  <p className={`font-medium ${on ? "text-gold" : ""}`}>
                    {formatHk(d.toISOString(), { day: "numeric" })}
                  </p>
                </div>
              );
              })}
              <AllDayRow days={days} items={calendar} selectedDayKey={selectedDayKey} />
              {calendar.some((item) => days.some((day) => coversOvernight(item, day))) && (
                <OvernightRow
                  days={days}
                  items={calendar}
                  selectedDayKey={selectedDayKey}
                  onSelectEvent={(id) => {
                    const ev = eventById(id);
                    if (ev) jumpToEvent(ev);
                  }}
                />
              )}
              {HOURS.map((hour) => (
                <HourRow
                  key={hour}
                  hour={hour}
                  days={days}
                  items={calendar}
                  selectedDayKey={selectedDayKey}
                  onSelectEvent={(id) => {
                    const ev = eventById(id);
                    if (ev) jumpToEvent(ev);
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="glass rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-pink">焦點活動</p>
            <h3 className="display mt-2 text-2xl">
              <Link href={`/events/${selected.id}`} className="hover:text-gold">
                {selected.title}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-muted">
              {formatDate(selected.startAt)} {formatTime(selected.startAt)}–
              {formatTime(selected.endAt)} · {venueById(selected.venueId)?.name}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">{selected.description}</p>
            <div className="mt-4">
              <NightPlanCard plan={plan} eventId={selected.id} />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => handlePin(selected)}
                disabled={alreadyIn}
                className="flex items-center justify-center gap-2 rounded-xl bg-gold py-2.5 text-sm font-black text-bg disabled:opacity-50"
              >
                <CalendarPlus size={16} />
                {alreadyIn ? "已在你的日曆" : "加入享時日曆"}
              </button>
              <a
                href={gcal}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line py-2.5 text-center text-sm"
              >
                開啟 Google Calendar
              </a>
              <button
                onClick={() => setEmailOpen(true)}
                className="rounded-full border border-line py-2.5 text-sm"
              >
                電郵行程
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <p className="px-1 text-xs uppercase tracking-[0.2em] text-gold">
              附近有位 · 按你的設定排序
            </p>
            {recs.length === 0 && (
              <p className="rounded-2xl border border-line px-4 py-6 text-sm text-muted">
                此場地暫時沒有符合人數或口味的空位。可在帳戶放寬預算或人數。
              </p>
            )}
            {recs.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                eventId={selected.id}
                onBook={() => {
                  click(r.id);
                  setBooking({ restaurantId: r.id, eventId: selected.id });
                }}
              />
            ))}
          </section>
        </aside>
      </div>

      <section className="mx-auto max-w-[1400px] px-4">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted">訂閱中的活動</p>
        {feedEvents.length === 0 ? (
          <p className="text-sm text-muted">請在左側打開至少一個 Feed。</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            {feedEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => jumpToEvent(event)}
                className={`rounded-2xl border p-4 text-left ${
                  event.id === selected.id ? "border-gold bg-gold/10" : "border-line"
                }`}
              >
                <p className="text-xs text-mint">{CATEGORY_LABEL[event.category]}</p>
                <p className="mt-1 font-medium">{event.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(event.startAt)} {formatTime(event.startAt)}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {booking && (
        <AutoChatModal
          restaurantId={booking.restaurantId}
          eventId={booking.eventId}
          onClose={() => setBooking(null)}
        />
      )}
      {emailOpen && (
        <EmailPreview
          event={selected}
          restaurants={recs}
          onClose={() => setEmailOpen(false)}
        />
      )}
    </div>
  );
}

function coversAllDay(item: CalendarItem, day: Date) {
  if (!item.allDay) return false;
  const key = hkYmd(day);
  const start = hkYmd(item.startAt);
  const end = hkYmd(item.endAt);
  if (end <= start) return key === start;
  return key >= start && key < end;
}

function coversOvernight(item: CalendarItem, day: Date) {
  if (item.allDay) return false;
  return hkYmd(item.startAt) === hkYmd(day) && hkHour(item.startAt) < 8;
}

function AllDayRow({
  days,
  items,
  selectedDayKey,
}: {
  days: Date[];
  items: CalendarItem[];
  selectedDayKey: string;
}) {
  return (
    <>
      <div className="border-b border-line px-2 py-3 text-right text-[11px] text-muted">全日</div>
      {days.map((day) => {
        const hits = items.filter((item) => coversAllDay(item, day));
        const on = hkYmd(day) === selectedDayKey;
        return (
          <div
            key={day.toISOString() + "all-day"}
            className={`min-h-[40px] border-b border-l border-line p-1 ${on ? "bg-gold-soft/50" : "bg-field"}`}
          >
            {hits.map((item) => (
              <div
                key={item.id}
                className="mb-1 w-full truncate rounded-md bg-gold-soft px-1.5 py-1 text-left text-[11px] font-medium text-ink"
              >
                全日 {item.title}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

function OvernightRow({
  days,
  items,
  selectedDayKey,
  onSelectEvent,
}: {
  days: Date[];
  items: CalendarItem[];
  selectedDayKey: string;
  onSelectEvent: (eventId: string) => void;
}) {
  return (
    <>
      <div className="border-b border-line px-2 py-3 text-right text-[11px] text-muted">凌晨</div>
      {days.map((day) => {
        const hits = items.filter((item) => coversOvernight(item, day));
        const on = hkYmd(day) === selectedDayKey;
        return (
          <div
            key={day.toISOString() + "overnight"}
            className={`min-h-[40px] border-b border-l border-line p-1 ${on ? "bg-gold-soft/50" : "bg-field"}`}
          >
            {hits.map((item) => (
              <button
                key={item.id}
                onClick={() => item.eventId && onSelectEvent(item.eventId)}
                className={`mb-1 w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium ${
                  item.source === "agent"
                    ? "bg-mint/15 text-mint"
                    : item.source === "feed"
                      ? "bg-pink/15 text-pink"
                      : "bg-gold-soft text-ink"
                }`}
              >
                {formatTime(item.startAt)} {item.title}
              </button>
            ))}
          </div>
        );
      })}
    </>
  );
}

function HourRow({
  hour,
  days,
  items,
  selectedDayKey,
  onSelectEvent,
}: {
  hour: number;
  days: Date[];
  items: CalendarItem[];
  selectedDayKey: string;
  onSelectEvent: (eventId: string) => void;
}) {
  return (
    <>
      <div className="border-b border-line px-2 py-3 text-right text-[11px] text-muted">
        {String(hour).padStart(2, "0")}:00
      </div>
      {days.map((day) => {
        const hits = items.filter((item) => {
          if (item.allDay) return false;
          return hkYmd(item.startAt) === hkYmd(day) && hkHour(item.startAt) === hour;
        });
        const on = hkYmd(day) === selectedDayKey;
        return (
          <div
            key={day.toISOString() + hour}
            className={`min-h-[56px] border-b border-l border-line p-1 ${on ? "bg-gold-soft/50" : "bg-field"}`}
          >
            {hits.map((item) => (
              <button
                key={item.id}
                onClick={() => item.eventId && onSelectEvent(item.eventId)}
                className={`mb-1 w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium ${
                  item.source === "agent"
                    ? "bg-mint/15 text-mint"
                    : item.source === "feed"
                      ? "bg-pink/15 text-pink"
                      : "bg-gold-soft text-ink"
                }`}
              >
                {formatTime(item.startAt)} {item.title}
              </button>
            ))}
          </div>
        );
      })}
    </>
  );
}
