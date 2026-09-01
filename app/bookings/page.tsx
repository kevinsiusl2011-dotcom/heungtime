"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { bookingToIcs, downloadText } from "@/lib/bookingIcs";
import { formatDate, formatDateTime } from "@/lib/calendar";
import { eventById, restaurantById } from "@/lib/data";
import { useStore } from "@/lib/store";
import { bookingMessage, whatsappUrl } from "@/lib/whatsapp";

function statusLabel(status: string) {
  if (status === "attended") return "已入座";
  if (status === "confirmed") return "已確認";
  if (status === "cancelled") return "已取消";
  return "待確認";
}

export default function BookingsPage() {
  const { bookings, cancelBooking } = useStore();
  const sorted = [...bookings].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <AppShell>
      <main id="main" className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">我的訂座</p>
        <h1 className="mt-2 display text-4xl">確認編號與狀態</h1>
        <p className="mt-3 text-sm text-muted">
          訂座會扣伺服器席位。取消會還席。WhatsApp 連結只在席位確認後出現。
        </p>
        <div className="mt-8 space-y-4">
          {sorted.length === 0 && (
            <p className="rounded-3xl border border-line px-6 py-12 text-center text-muted">
              尚未有訂座。
              <Link href="/discover" className="ml-1 text-gold">
                去發現活動
              </Link>
            </p>
          )}
          {sorted.map((b) => {
            const restaurant = restaurantById(b.restaurantId);
            const event = b.eventId ? eventById(b.eventId) : undefined;
            const cancelled = b.status === "cancelled";
            const wa =
              restaurant && !cancelled
                ? whatsappUrl(
                    restaurant.whatsapp,
                    bookingMessage({
                      restaurantName: restaurant.name,
                      guestName: b.guestName,
                      guestPhone: b.guestPhone,
                      partySize: b.partySize,
                      slot: b.slot,
                      dateLabel: formatDate(b.date),
                      eventTitle: event?.title,
                      confirmationCode: b.confirmationCode,
                    }),
                  )
                : null;
            return (
              <article key={b.id} className="glass rounded-3xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="display text-xl">
                      {restaurant?.name ?? "餐廳"}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {b.slot} · {b.partySize} 位 · {b.guestName}
                    </p>
                    {event && (
                      <Link href={`/events/${event.id}`} className="mt-1 block text-sm text-mint">
                        {event.title}
                      </Link>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      b.status === "attended"
                        ? "bg-mint/15 text-mint"
                        : b.status === "confirmed"
                          ? "bg-mint/15 text-mint"
                          : cancelled
                            ? "bg-line text-muted"
                            : "bg-gold/15 text-gold"
                    }`}
                  >
                    {statusLabel(b.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm">
                  編號 <span className="text-gold">{b.confirmationCode}</span>
                </p>
                <p className="mt-1 text-xs text-muted">建立於 {formatDateTime(b.createdAt)}</p>
                {!cancelled && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-mint px-4 py-2 text-sm font-black text-bg"
                      >
                        再傳 WhatsApp
                      </a>
                    )}
                    <button
                      onClick={() =>
                        downloadText(`heungtime-${b.confirmationCode}.ics`, bookingToIcs(b))
                      }
                      className="rounded-full border border-line px-4 py-2 text-sm"
                    >
                      下載 ICS
                    </button>
                    <button
                      onClick={() => void cancelBooking(b.confirmationCode)}
                      className="rounded-full border border-line px-4 py-2 text-sm text-muted"
                    >
                      取消訂座
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </main>
    </AppShell>
  );
}
