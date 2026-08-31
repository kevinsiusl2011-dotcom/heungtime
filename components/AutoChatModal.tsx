"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { autoChatScript } from "@/lib/agent";
import { bookingToIcs, downloadText } from "@/lib/bookingIcs";
import { formatDate } from "@/lib/calendar";
import { eventById, restaurantById } from "@/lib/data";
import { recommendRestaurants } from "@/lib/rank";
import { useStore } from "@/lib/store";
import { bookingMessage, whatsappUrl } from "@/lib/whatsapp";
import type { Booking } from "@/lib/types";
import { Modal } from "./Modal";

interface Props {
  restaurantId: string;
  eventId?: string;
  onClose: () => void;
}

export function AutoChatModal({ restaurantId, eventId, onClose }: Props) {
  const restaurant = restaurantById(restaurantId);
  const event = eventId ? eventById(eventId) : undefined;
  const { addBooking, profile, prefs, bookings, inventory } = useStore();
  const ranked = event
    ? recommendRestaurants(event, prefs, bookings, 8, inventory).find((r) => r.id === restaurantId)
    : restaurant
      ? {
          ...restaurant,
          walkMinutes: Object.values(restaurant.walkMinutesByVenue)[0] ?? 10,
          score: 0,
          reasons: [],
          lastTrainRisk: restaurant.lastTrainSafe ? ("safe" as const) : ("tight" as const),
          seatsRemaining: inventory[restaurantId] ?? restaurant.seatsLeft,
        }
      : undefined;

  const [partySize, setPartySize] = useState(
    ranked?.partySizes.includes(prefs.partySize) ? prefs.partySize : ranked?.partySizes[0] ?? 2,
  );
  const [slot, setSlot] = useState(ranked?.availableSlots[0] ?? "22:45");
  const [guestName, setGuestName] = useState(profile.name);
  const [guestPhone, setGuestPhone] = useState(profile.phone);
  const [step, setStep] = useState<"form" | "chat" | "done">("form");
  const [visible, setVisible] = useState(0);
  const [wa, setWa] = useState<string | null>(null);
  const [created, setCreated] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const booked = useRef(false);

  const script = useMemo(() => {
    if (!ranked) return [];
    return autoChatScript(ranked, event, partySize, slot, guestName);
  }, [ranked, event, partySize, slot, guestName]);

  useEffect(() => {
    if (step !== "chat" || !ranked) return;
    setVisible(0);
    setError(null);
    let cancelled = false;
    const timers = script.map((_, i) =>
      window.setTimeout(() => {
        if (!cancelled) setVisible(i + 1);
      }, 450 * (i + 1)),
    );
    const done = window.setTimeout(() => {
      void (async () => {
        if (cancelled || booked.current) return;
        booked.current = true;
        const instant = ranked.autoChatReady;
        const result = await addBooking({
          restaurantId,
          eventId,
          partySize,
          slot,
          date: event?.startAt ?? new Date().toISOString(),
          status: instant ? "confirmed" : "pending",
          guestName: guestName.trim() || "客人",
          guestPhone: guestPhone.trim(),
        });
        if (cancelled) return;
        if (result) {
          setCreated(result);
          const text = bookingMessage({
            restaurantName: ranked.name,
            guestName: result.guestName,
            guestPhone: result.guestPhone,
            partySize,
            slot,
            dateLabel: formatDate(result.date),
            eventTitle: event?.title,
            confirmationCode: result.confirmationCode,
          });
          setWa(whatsappUrl(ranked.whatsapp, text));
        } else {
          setError("席位不足或訂座失敗，尚未發送 WhatsApp。");
          booked.current = false;
        }
        setStep("done");
      })();
    }, 450 * (script.length + 1) + 350);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [
    step,
    script,
    addBooking,
    restaurantId,
    eventId,
    partySize,
    slot,
    event,
    ranked,
    guestName,
    guestPhone,
  ]);

  if (!restaurant || !ranked) return null;

  const canSubmit = guestName.trim().length >= 1 && guestPhone.replace(/\D/g, "").length >= 8;

  return (
    <Modal onClose={onClose} labelledBy="book-title">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-mint">WhatsApp 訂座</p>
          <h3 id="book-title" className="mt-1 font-[family-name:var(--font-serif-tc)] text-lg">
            {restaurant.name}
          </h3>
          <p className="text-sm text-muted">
            {restaurant.cuisine} · {restaurant.district} · 步行 {ranked.walkMinutes} 分鐘 · 尚餘{" "}
            {ranked.seatsRemaining} 席
          </p>
        </div>
        <button onClick={onClose} className="text-muted hover:text-ink" aria-label="關閉">
          ✕
        </button>
      </div>

      {step === "form" && (
        <div className="space-y-4 px-5 py-5">
          <p className="text-sm text-muted">
            {event
              ? `對準「${event.title}」散場時間。${ranked.autoChatReady ? "此商戶已接即時留位，伺服器確認席位後才開 WhatsApp。" : "發送後待商戶回覆確認。"}`
              : "選擇人數與時間，經 WhatsApp 向商戶發送訂座。"}
          </p>
          <label className="block text-sm">
            人數
            <select
              className="mt-1 w-full rounded-xl border border-line bg-field px-3 py-2"
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
            >
              {restaurant.partySizes.map((n) => (
                <option key={n} value={n}>
                  {n} 位
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            時段
            <select
              className="mt-1 w-full rounded-xl border border-line bg-field px-3 py-2"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
            >
              {restaurant.availableSlots.map((s) => (
                <option key={s} value={s}>
                  {s}（有位）
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            稱呼
            <input
              className="mt-1 w-full rounded-xl border border-line bg-field px-3 py-2"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            WhatsApp 電話
            <input
              className="mt-1 w-full rounded-xl border border-line bg-field px-3 py-2"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              inputMode="tel"
              required
            />
          </label>
          <button
            disabled={!canSubmit}
            onClick={() => setStep("chat")}
            className="w-full rounded-full bg-mint py-3 font-medium text-bg disabled:opacity-40"
          >
            預覽並發送訂座
          </button>
        </div>
      )}

      {(step === "chat" || step === "done") && (
        <div className="space-y-3 px-5 py-5">
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {script.slice(0, visible).map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.from === "user" ? "ml-auto bg-gold/20 text-ink" : "bg-gold-soft/50 text-ink"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          {step === "done" && (
            <div
              className={`rounded-2xl border p-3 text-sm ${
                error ? "border-pink/40 bg-pink/10" : "border-mint/30 bg-mint/10"
              }`}
            >
              {error ? (
                <p>{error}</p>
              ) : (
                <>
                  {ranked.autoChatReady ? "即時留位已確認" : "訂座請求已建立，待商戶確認"}。編號{" "}
                  <span className="text-gold">{created?.confirmationCode}</span>
                  ，已寫入你的享時日曆。
                </>
              )}
              {wa && created && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block w-full rounded-full bg-mint py-2 text-center font-medium text-bg"
                >
                  用 WhatsApp 傳送給商戶
                </a>
              )}
              {created && (
                <button
                  onClick={() =>
                    downloadText(`heungtime-${created.confirmationCode}.ics`, bookingToIcs(created))
                  }
                  className="mt-2 block w-full rounded-full border border-line py-2 text-sm"
                >
                  下載訂座 ICS
                </button>
              )}
              <button
                onClick={onClose}
                className="mt-2 block w-full rounded-full bg-gold py-2 font-medium text-bg"
              >
                返回
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
