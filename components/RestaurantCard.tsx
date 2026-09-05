"use client";

import type { RankedRestaurant } from "@/lib/types";
import { PRICE_LABEL } from "@/lib/labels";
import { ShareCard } from "./ShareCard";

export function RestaurantCard({
  restaurant,
  onBook,
  compact = false,
  eventId,
}: {
  restaurant: RankedRestaurant;
  onBook: () => void;
  compact?: boolean;
  eventId?: string;
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
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-bold text-mint">
              {restaurant.sponsored
                ? restaurant.adCreative?.badgeLabel
                  ? restaurant.adCreative.badgeLabel
                  : "合作標籤 · 唔買排名"
                : "有機空位"}
              {" · "}步行 {restaurant.walkMinutes} 分鐘
            </p>
          </div>
          <h4 className="display mt-1 text-lg">
            {restaurant.name}
            {restaurant.adCreative?.headline && restaurant.sponsored && (
              <span className="ml-2 text-xs font-medium text-pink">
                · {restaurant.adCreative.headline}
              </span>
            )}
          </h4>
          <p className="text-sm text-muted">
            {restaurant.cuisine} · {restaurant.district} · {PRICE_LABEL[restaurant.priceLevel]}
          </p>
        </div>
        <span className="rounded-full border border-line px-2 py-1 text-xs text-muted shrink-0">
          {restaurant.availableSlots[0]}
        </span>
      </div>
      {!compact && <p className="mt-2 text-sm text-muted">{restaurant.pitch}</p>}
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
        <span className={riskClass}>{riskLabel}</span>
        <span>尚餘 {restaurant.seatsRemaining} 席</span>
        {restaurant.ambiance && (
          <span className="rounded-full bg-mint/10 px-2 text-mint">
            {restaurant.ambiance}
          </span>
        )}
        {restaurant.reasons.slice(0, 2).map((r) => (
          <span key={r}>{r}</span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onBook}
          className="flex-1 rounded-xl bg-pink px-3 py-2.5 text-sm font-black text-white hover:brightness-110"
        >
          WhatsApp 訂座
        </button>
        <ShareCard eventId={eventId} restaurantId={restaurant.id} title={`${restaurant.name} 訂座`} />
      </div>
    </article>
  );
}
