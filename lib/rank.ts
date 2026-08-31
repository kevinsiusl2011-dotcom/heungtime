import { addMinutes, formatTime } from "./calendar";
import { RESTAURANTS, relatedEvent, venueById } from "./data";
import {
  clockFromMinutes,
  commuteMinutes,
  commuteMinutesFromCoords,
  commuteNote,
  lastTrainRisk,
  minutesOfDay,
  walkMinutesBetween,
} from "./geo";
import type {
  Booking,
  CalendarItem,
  LocalEvent,
  NightPlan,
  RankedRestaurant,
  Restaurant,
  UserPrefs,
} from "./types";

function restaurantCoords(r: Restaurant) {
  const vid = r.nearVenueIds[0];
  const v = venueById(vid);
  if (!v) return { lat: 22.3, lng: 114.17 };
  const walk = r.walkMinutesByVenue[vid] ?? 8;
  const hash = [...r.id].reduce((s, c) => s + c.charCodeAt(0), 0);
  const bearing = ((hash % 360) * Math.PI) / 180;
  const distKm = (walk * 80) / 1000;
  const dLat = (distKm / 6371) * (180 / Math.PI);
  const dLng =
    ((distKm / 6371) * (180 / Math.PI)) / Math.cos((v.lat * Math.PI) / 180);
  return {
    lat: v.lat + dLat * Math.cos(bearing),
    lng: v.lng + dLng * Math.sin(bearing),
  };
}

export function seatsRemaining(
  restaurantId: string,
  bookings: Booking[],
  inventory?: Record<string, number>,
) {
  const restaurant = RESTAURANTS.find((r) => r.id === restaurantId);
  if (!restaurant) return 0;
  const used = bookings
    .filter((b) => b.restaurantId === restaurantId && b.status !== "cancelled")
    .reduce((sum, b) => sum + b.partySize, 0);
  const local = Math.max(0, restaurant.seatsLeft - used);
  if (inventory && restaurantId in inventory) return Math.min(local, inventory[restaurantId]);
  return local;
}

export function recommendRestaurants(
  event: LocalEvent,
  prefs: UserPrefs,
  bookings: Booking[] = [],
  limit = 3,
  inventory?: Record<string, number>,
): RankedRestaurant[] {
  const venue = venueById(event.venueId);
  const nearby = RESTAURANTS.filter((r) => r.nearVenueIds.includes(event.venueId));

  const ranked: RankedRestaurant[] = nearby.map((r) => {
    const mapped = r.walkMinutesByVenue[event.venueId];
    const walkMinutes =
      venue && mapped == null
        ? walkMinutesBetween({ lat: venue.lat, lng: venue.lng }, restaurantCoords(r))
        : (mapped ?? 15);
    const remaining = seatsRemaining(r.id, bookings, inventory);
    const risk = venue ? lastTrainRisk(event.endAt, walkMinutes, venue.lastTrain) : "safe";
    const reasons: string[] = [];
    let score = 40;

    score += Math.max(0, 18 - walkMinutes);
    reasons.push(`步行 ${walkMinutes} 分鐘`);

    if (remaining >= prefs.partySize) {
      score += 12;
      reasons.push(`尚餘 ${remaining} 席`);
    } else {
      score -= 40;
      reasons.push("席位不足");
    }

    if (r.partySizes.includes(prefs.partySize)) score += 8;
    else score -= 10;

    if (r.priceLevel <= prefs.maxPrice) score += 6;
    else {
      score -= 8;
      reasons.push("超出預算");
    }

    if (prefs.cuisines.length && prefs.cuisines.includes(r.cuisine)) {
      score += 14;
      reasons.push(`符合口味：${r.cuisine}`);
    }

    if (prefs.needLastTrain) {
      if (risk === "safe") {
        score += 16;
        reasons.push("趕得切尾班車");
      } else if (risk === "tight") {
        score += 2;
        reasons.push("尾班車偏緊");
      } else {
        score -= 28;
        reasons.push("可能錯過尾班車");
      }
    }

    if (r.sponsored) score += 1;

    return {
      ...r,
      walkMinutes,
      score,
      reasons,
      lastTrainRisk: risk,
      seatsRemaining: remaining,
    };
  });

  return ranked
    .filter((r) => r.seatsRemaining >= prefs.partySize)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function conflictNote(
  event: LocalEvent,
  calendar: CalendarItem[],
  prefs?: UserPrefs,
  coords?: { lat: number; lng: number } | null,
) {
  const clash = calendar.find((item) => {
    if (item.eventId === event.id) return false;
    const a1 = +new Date(item.startAt);
    const a2 = +new Date(item.endAt);
    const b1 = +new Date(event.startAt);
    const b2 = +new Date(event.endAt);
    return a1 < b2 && b1 < a2;
  });
  if (clash) {
    return `與「${clash.title}」時間重疊。建議改訂 ${formatTime(addMinutes(event.endAt, 45))}，或移動另一個行程。`;
  }

  const home = prefs?.homeDistrict ?? "中環";
  const commute = coords
    ? commuteMinutesFromCoords(coords.lat, coords.lng, event.venueId)
    : commuteMinutes(home, event.venueId);
  const nearby = calendar
    .filter((item) => {
      const gap = +new Date(event.startAt) - +new Date(item.endAt);
      return gap > 0 && gap < 3 * 60 * 60_000;
    })
    .sort((a, b) => +new Date(b.endAt) - +new Date(a.endAt))[0];

  if (nearby) {
    const gapMin = Math.round((+new Date(event.startAt) - +new Date(nearby.endAt)) / 60_000);
    if (gapMin < commute + 15) {
      return `「${nearby.title}」結束後只剩 ${gapMin} 分鐘，去${venueById(event.venueId)?.district ?? "場地"}約 ${commute} 分鐘。建議提早 ${commute + 15 - gapMin} 分鐘離席，否則遲到開場。`;
    }
    if (gapMin < commute + 35) {
      return `${nearby.location || home} → ${venueById(event.venueId)?.district} 約 ${commute} 分鐘。${formatTime(nearby.endAt)} 散會後請立即出發。`;
    }
  }
  return null;
}

export function buildNightPlan(
  event: LocalEvent,
  calendar: CalendarItem[],
  prefs: UserPrefs,
  coords?: { lat: number; lng: number } | null,
): NightPlan {
  const venue = venueById(event.venueId);
  const commuteMin = coords
    ? commuteMinutesFromCoords(coords.lat, coords.lng, event.venueId)
    : commuteMinutes(prefs.homeDistrict, event.venueId);
  const diningStart = clockFromMinutes(minutesOfDay(event.endAt) + 15);
  const diningEnd = clockFromMinutes(minutesOfDay(event.endAt) + 90);
  const drop = relatedEvent(event);
  const relatedDrop = drop?.category === "ticket-drop" ? drop : undefined;

  return {
    commuteMin,
    commuteNote: commuteNote(prefs.homeDistrict, event.venueId, coords),
    diningWindow:
      event.category === "ticket-drop"
        ? "開售前後請留白，不要夾訂座。"
        : event.venueId === "home"
          ? "開波前入座，賽事期間不用換枱。"
          : `散場後 ${diningStart}–${diningEnd} 入座窗`,
    lastTrain: venue ? `${venue.mtr} 尾班車 ${venue.lastTrain}` : "—",
    clash: conflictNote(event, calendar, prefs, coords),
    relatedDrop,
  };
}

export function postEventSlot(event: LocalEvent) {
  if (event.category === "ticket-drop") return "10:15";
  if (event.category === "mall") return formatTime(addMinutes(event.endAt, 10));
  return formatTime(addMinutes(event.endAt, 15));
}
