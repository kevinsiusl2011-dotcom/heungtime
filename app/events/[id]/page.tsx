"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AutoChatModal } from "@/components/AutoChatModal";
import { EmailPreview } from "@/components/EmailPreview";
import { NightPlanCard } from "@/components/NightPlanCard";
import { RestaurantCard } from "@/components/RestaurantCard";
import { calendarDescription, buildNightPlan, recommendRestaurants } from "@/lib/agent";
import { formatDateTime, formatTime, googleCalendarUrl } from "@/lib/calendar";
import { EVENTS, eventById, relatedEvent, venueById } from "@/lib/data";
import { CATEGORY_LABEL } from "@/lib/labels";
import { useStore } from "@/lib/store";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const event = eventById(params.id);
  const { pinEvent, calendar, click, prefs, bookings, inventory, coords, catalogRev } = useStore();
  const [booking, setBooking] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);

  const recs = useMemo(
    () => (event ? recommendRestaurants(event, prefs, bookings, 3, inventory) : []),
    [event, prefs, bookings, inventory, catalogRev],
  );
  const plan = event ? buildNightPlan(event, calendar, prefs, coords) : null;
  const venue = event ? venueById(event.venueId) : undefined;
  const related = event ? relatedEvent(event) : undefined;
  const pinned = event ? calendar.some((c) => c.eventId === event.id) : false;

  if (!event) {
    return (
      <AppShell>
        <main id="main" className="mx-auto max-w-3xl px-5 py-20 text-center">
          <h1 className="display text-3xl">找不到此活動</h1>
          <p className="mt-3 text-muted">可能已過檔期，或連結不正確。</p>
          <Link href="/discover" className="mt-6 inline-block rounded-full bg-gold px-5 py-2 text-bg">
            返回發現活動
          </Link>
        </main>
      </AppShell>
    );
  }

  const gcal = googleCalendarUrl({
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    location: venue?.address ?? "",
    description: calendarDescription(event, recs),
  });

  return (
    <AppShell>
      <main id="main" className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-xs text-mint">
          {CATEGORY_LABEL[event.category]} · {venue?.district}
        </p>
        <h1 className="mt-2 display text-4xl">{event.title}</h1>
        <p className="mt-2 text-muted">
          {formatDateTime(event.startAt)} – {formatTime(event.endAt)} · {venue?.name}
        </p>
        <p className="mt-4 max-w-2xl leading-7 text-muted">{event.description}</p>
        {related && (
          <p className="mt-3 text-sm">
            相關：
            <Link href={`/events/${related.id}`} className="ml-1 text-gold">
              {related.title}
            </Link>
          </p>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {plan && <NightPlanCard plan={plan} />}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => pinEvent(event.id)}
                disabled={pinned}
                className="rounded-xl bg-gold px-5 py-2.5 text-sm font-black text-bg disabled:opacity-50"
              >
                {pinned ? "已加入日曆" : "加入日曆"}
              </button>
              <a
                href={gcal}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line px-5 py-2.5 text-sm"
              >
                Google Calendar
              </a>
              <button
                onClick={() => setEmailOpen(true)}
                className="rounded-full border border-line px-5 py-2.5 text-sm"
              >
                電郵行程
              </button>
              <Link
                href={`/live?event=${event.id}`}
                className="rounded-full border border-line px-5 py-2.5 text-sm"
              >
                在日曆開啟
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">附近有位</p>
            {recs.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                onBook={() => {
                  click(r.id);
                  setBooking(r.id);
                }}
              />
            ))}
          </div>
        </div>

        <section className="mt-12">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">同期其他活動</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {EVENTS.filter((e) => e.id !== event.id && e.category === event.category)
              .slice(0, 3)
              .map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="rounded-2xl border border-line p-4 hover:border-gold/40"
                >
                  <p className="font-medium">{e.title}</p>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(e.startAt)}</p>
                </Link>
              ))}
          </div>
        </section>
      </main>
      {booking && (
        <AutoChatModal restaurantId={booking} eventId={event.id} onClose={() => setBooking(null)} />
      )}
      {emailOpen && (
        <EmailPreview event={event} restaurants={recs} onClose={() => setEmailOpen(false)} />
      )}
    </AppShell>
  );
}
