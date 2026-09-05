"use client";

import { useEffect, useState } from "react";
import { bannersForSlot, DAYDREAM_BRAND, DAYDREAM_REFERRAL_URL } from "@/lib/data";
import type { AdBanner } from "@/lib/types";

const SLOT_QUOTA: Partial<Record<AdBanner["slot"], number>> = {
  "live-header": 1,
  "after-restaurant": 1,
  "booking-confirm": 99,
};
const GLOBAL_DAILY_LIMIT = 3;
const STORAGE_KEY = "heungtime-promo-v1";

type PromoCounter = { d: string; slots: Record<string, number>; total: number };

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function readCounter(): PromoCounter {
  try {
    if (typeof window === "undefined") return { d: todayKey(), slots: {}, total: 0 };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { d: todayKey(), slots: {}, total: 0 };
    const p = JSON.parse(raw) as PromoCounter;
    if (p.d !== todayKey()) return { d: todayKey(), slots: {}, total: 0 };
    return p;
  } catch {
    return { d: todayKey(), slots: {}, total: 0 };
  }
}
function bumpCounter(slot: AdBanner["slot"]): boolean {
  try {
    if (typeof window === "undefined") return true;
    const cur = readCounter();
    const slotQuota = SLOT_QUOTA[slot] ?? 1;
    const used = cur.slots[slot] ?? 0;
    if (used >= slotQuota || cur.total >= GLOBAL_DAILY_LIMIT) return false;
    cur.slots[slot] = used + 1;
    cur.total += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
    return true;
  } catch {
    return true;
  }
}

export function DaydreamBadge({
  slot,
  className = "",
  eventId,
  restaurantId,
  variant = "default",
}: {
  slot: AdBanner["slot"];
  className?: string;
  eventId?: string;
  restaurantId?: string;
  variant?: "default" | "compact" | "muted";
}) {
  const [show, setShow] = useState<boolean | null>(null);
  useEffect(() => {
    setShow(bumpCounter(slot));
  }, [slot]);
  if (show === null) return null;
  if (!show) return null;

  const banners = bannersForSlot(slot);
  if (!banners.length) return null;
  const banner = banners[Math.floor(Date.now() / 86_400_000) % banners.length] ?? banners[0];

  const utm = (() => {
    const base = new URL(banner.url || DAYDREAM_REFERRAL_URL);
    base.searchParams.set("utm_source", "heungtime");
    base.searchParams.set("utm_medium", "banner");
    base.searchParams.set("utm_campaign", `slot-${slot}-${variant}`);
    if (eventId) base.searchParams.set("eid", eventId);
    if (restaurantId) base.searchParams.set("rid", restaurantId);
    base.searchParams.set("ref", banner.id);
    return base.toString();
  })();

  if (variant === "compact") {
    return (
      <a
        href={utm}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-1.5 rounded-full border border-line/60 bg-surface/60 px-3 py-1 text-[11px] font-semibold text-muted hover:border-pink/40 hover:text-pink ${className}`}
      >
        <span className="text-sm">{banner.emoji ?? "🍀"}</span>
        <span className="whitespace-nowrap">{banner.headline?.slice(0, 14) ?? "睇埋今日運勢"} →</span>
      </a>
    );
  }

  if (variant === "muted") {
    return (
      <a
        href={utm}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center gap-2 rounded-xl border border-line/60 bg-surface/40 px-3 py-2 text-xs text-muted hover:border-mint/40 hover:text-mint ${className}`}
      >
        <span>{banner.emoji ?? "🍀"}</span>
        <span className="flex-1 truncate">
          {banner.headline ?? "睇完活動，順便睇今日嘅愛情・事業・偏財運"}
        </span>
      </a>
    );
  }

  return (
    <aside
      className={`group relative overflow-hidden rounded-2xl border border-line/70 bg-surface/60 p-2.5 backdrop-blur-sm dark:bg-surface/40 ${className}`}
    >
      <a
        href={utm}
        target="_blank"
        rel="noreferrer"
        className="relative z-10 flex items-center gap-3 opacity-90 hover:opacity-100"
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-soft/80 text-lg">
          {banner.emoji ?? "🎴"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            {banner.label ?? DAYDREAM_BRAND}
          </p>
          <p className="mt-0.5 text-xs font-medium leading-snug text-ink line-clamp-2">
            {banner.headline ?? "睇完活動，順便問吓今日嘅愛情・事業・偏財運 🍀"}
          </p>
          <p className="mt-0.5 text-[10px] text-mint font-semibold">
            {banner.cta ?? "睇睇 →"}
          </p>
        </div>
      </a>
    </aside>
  );
}

export function PromoBlockInline({
  promoBlock,
  always = false,
  indexHint = 0,
}: {
  promoBlock?: {
    label?: string;
    text?: string;
    url?: string;
    emoji?: string;
  } | null;
  always?: boolean;
  indexHint?: number;
}) {
  const [show, setShow] = useState<boolean | null>(null);
  useEffect(() => {
    if (always) {
      setShow(true);
      return;
    }
    if (indexHint > 0 && indexHint % 3 !== 0) {
      setShow(false);
      return;
    }
    setShow(bumpCounter("after-restaurant"));
  }, [always, indexHint, promoBlock?.url]);

  if (show === null) return null;
  if (!show) return null;
  if (!promoBlock || !promoBlock.url) return null;

  return (
    <a
      href={promoBlock.url}
      target="_blank"
      rel="noreferrer"
      className="mt-2.5 flex items-start gap-2 rounded-xl border border-line/60 bg-surface/40 p-2 text-left text-muted hover:border-gold/50 hover:text-ink"
    >
      <span className="text-base leading-none opacity-80">{promoBlock.emoji ?? "🍀"}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
          {promoBlock.label ?? "小提示"}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug">{promoBlock.text}</p>
      </div>
    </a>
  );
}
