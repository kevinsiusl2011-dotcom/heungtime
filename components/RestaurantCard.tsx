"use client";

import type { RankedRestaurant } from "@/lib/types";
import { PRICE_LABEL } from "@/lib/labels";

export function RestaurantCard({
  restaurant,
  onBook,
  compact = false,
}: {
  restaurant: RankedRestaurant;
  onBook: () => void;
  compact?: boolean;
}) {
  const riskLabel =
    restaurant.lastTrainRisk === "safe"
      ? "趕得切尾班車"
      : restaurant.lastTrainRisk === "tight"
        ? "尾班車偏緊"
        : "或趕唔切";
  const riskClass =
    restaurant.lastTrainRisk === "safe"
      ? "text-mint"
      : restaurant.lastTrainRisk === "tight"
        ? "text-gold"
        : "text-pink";

  return (
    <article
      className={`card-pop rounded-2xl border border-line bg-surface p-4 ${
        restaurant.sponsored ? "neon-ring" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-mint">
            {restaurant.sponsored ? "合作標籤 · 唔買排名" : "有機空位"} · 步行 {restaurant.walkMinutes} 分鐘
          </p>
          <h4 className="display mt-1 text-lg">{restaurant.name}</h4>
          <p className="text-sm text-muted">
            {restaurant.cuisine} · {restaurant.district} · {PRICE_LABEL[restaurant.priceLevel]}
          </p>
        </div>
        <span className="rounded-full border border-line px-2 py-1 text-xs text-muted">
          {restaurant.availableSlots[0]}
        </span>
      </div>
      {!compact && <p className="mt-2 text-sm text-muted">{restaurant.pitch}</p>}
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
        <span className={riskClass}>{riskLabel}</span>
        <span>尚餘 {restaurant.seatsRemaining} 席</span>
        {restaurant.reasons.slice(0, 2).map((r) => (
          <span key={r}>{r}</span>
        ))}
      </div>
      <button
        onClick={onBook}
        className="mt-3 w-full rounded-xl bg-pink px-3 py-2.5 text-sm font-black text-white hover:brightness-110"
      >
        WhatsApp 訂座
      </button>
    </article>
  );
}
