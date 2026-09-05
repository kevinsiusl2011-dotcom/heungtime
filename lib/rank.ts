import { addMinutes, formatTime } from "./calendar";
import { RESTAURANTS, relatedEvent, venueById } from "./data";
import {
  clockFromMinutes,
  commuteMinutes,
  commuteMinutesFromCoords,
  commuteNote,
  lastTrainCaption,
  lastTrainForStation,
  lastTrainForVenue,
  lastTrainRisk,
  minutesOfDay,
  walkMinutesBetween,
} from "./geo";
import type {
  Booking,
  CalendarItem,
  DiningOccasion,
  EventCategory,
  LocalEvent,
  NightPlan,
  RankedRestaurant,
  Restaurant,
  UserPrefs,
} from "./types";

export type ScenarioKey =
  | "weekend-night"
  | "weekday-lunch"
  | "before-ticket-drop"
  | "post-concert"
  | "post-movie"
  | "post-sports"
  | "mall-afternoon"
  | "pre-workshop"
  | "nightlife-late"
  | "default";

export interface WeightSet {
  walk: number;
  seats: number;
  partyFit: number;
  price: number;
  cuisine: number;
  lastTrain: number;
  sponsored: number;
  conversion: number;
  ambiance: number;
  auction: number;
}

const SCENARIO_WEIGHTS: Record<ScenarioKey, WeightSet> = {
  "weekend-night": {
    walk: 1.4,
    seats: 1.3,
    partyFit: 1.1,
    price: 1.0,
    cuisine: 1.1,
    lastTrain: 2.2,
    sponsored: 1.2,
    conversion: 1.2,
    ambiance: 1.5,
    auction: 1.6,
  },
  "weekday-lunch": {
    walk: 2.0,
    seats: 1.1,
    partyFit: 1.0,
    price: 1.6,
    cuisine: 1.0,
    lastTrain: 0,
    sponsored: 1.0,
    conversion: 1.0,
    ambiance: 0.6,
    auction: 1.0,
  },
  "before-ticket-drop": {
    walk: 1.0,
    seats: 2.6,
    partyFit: 1.2,
    price: 0.8,
    cuisine: 0.7,
    lastTrain: 0.5,
    sponsored: 1.4,
    conversion: 1.8,
    ambiance: 0.4,
    auction: 2.2,
  },
  "post-concert": {
    walk: 1.6,
    seats: 1.4,
    partyFit: 1.1,
    price: 1.1,
    cuisine: 1.2,
    lastTrain: 2.0,
    sponsored: 1.3,
    conversion: 1.4,
    ambiance: 1.3,
    auction: 1.8,
  },
  "post-movie": {
    walk: 1.5,
    seats: 1.2,
    partyFit: 1.0,
    price: 1.3,
    cuisine: 1.4,
    lastTrain: 1.6,
    sponsored: 1.1,
    conversion: 1.2,
    ambiance: 1.8,
    auction: 1.4,
  },
  "post-sports": {
    walk: 1.5,
    seats: 1.4,
    partyFit: 1.3,
    price: 1.2,
    cuisine: 1.0,
    lastTrain: 1.8,
    sponsored: 1.4,
    conversion: 1.5,
    ambiance: 1.0,
    auction: 2.0,
  },
  "mall-afternoon": {
    walk: 1.8,
    seats: 1.0,
    partyFit: 1.0,
    price: 1.3,
    cuisine: 1.3,
    lastTrain: 0.2,
    sponsored: 1.2,
    conversion: 1.0,
    ambiance: 1.3,
    auction: 1.2,
  },
  "pre-workshop": {
    walk: 2.0,
    seats: 1.0,
    partyFit: 1.0,
    price: 1.1,
    cuisine: 1.0,
    lastTrain: 0.3,
    sponsored: 1.0,
    conversion: 1.0,
    ambiance: 1.2,
    auction: 1.0,
  },
  "nightlife-late": {
    walk: 1.1,
    seats: 1.4,
    partyFit: 1.1,
    price: 1.2,
    cuisine: 1.0,
    lastTrain: 2.6,
    sponsored: 1.6,
    conversion: 1.5,
    ambiance: 2.0,
    auction: 2.0,
  },
  default: {
    walk: 1.2,
    seats: 1.1,
    partyFit: 1.0,
    price: 1.0,
    cuisine: 1.0,
    lastTrain: 1.3,
    sponsored: 1.0,
    conversion: 1.0,
    ambiance: 1.0,
    auction: 1.0,
  },
};

export function detectScenario(
  event: LocalEvent,
  prefs: UserPrefs,
): ScenarioKey {
  const start = new Date(event.startAt);
  const dow = start.getDay();
  const hour = start.getHours();
  const isWeekend = dow === 0 || dow === 6;
  const endHour = new Date(event.endAt).getHours();

  if (event.category === "ticket-drop") return "before-ticket-drop";
  if (prefs.occasion === "celebration" || prefs.occasion === "date") {
    return event.category === "movie" ? "post-movie" : "post-concert";
  }
  if (event.category === "sports") return "post-sports";
  if (event.category === "concert") return "post-concert";
  if (event.category === "movie") return "post-movie";
  if (event.category === "mall") return hour <= 17 ? "mall-afternoon" : "weekend-night";
  if (event.category === "workshop") return "pre-workshop";
  if (event.category === "nightlife" || endHour >= 22) return "nightlife-late";
  if (event.category === "festival") return isWeekend ? "weekend-night" : "post-concert";
  if (event.category === "exhibition") return hour <= 17 ? "pre-workshop" : "weekend-night";
  if (isWeekend && hour >= 18) return "weekend-night";
  if (!isWeekend && hour >= 11 && hour <= 14) return "weekday-lunch";
  return "default";
}

const OCCASION_AMBIANCE_MATCH: Partial<Record<DiningOccasion, DiningOccasion[]>> = {
  date: ["date", "celebration", "post-event"],
  celebration: ["celebration", "date", "family"],
  business: ["business", "post-event"],
  family: ["family", "casual"],
  casual: ["casual", "post-event"],
  "post-event": ["post-event", "casual"],
};

export function restaurantCoords(r: Restaurant) {
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
  if (inventory && restaurantId in inventory) {
    const remaining = Math.floor(Number(inventory[restaurantId]));
    return Number.isFinite(remaining) ? Math.max(0, remaining) : 0;
  }
  const used = bookings
    .filter((b) => b.restaurantId === restaurantId && b.status !== "cancelled")
    .reduce((sum, b) => sum + b.partySize, 0);
  return Math.max(0, restaurant.seatsLeft - used);
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
  const scenario = detectScenario(event, prefs);
  const w = SCENARIO_WEIGHTS[scenario];
  const occasionPref: DiningOccasion = prefs.occasion ?? "post-event";
  const preferredAmbiances = OCCASION_AMBIANCE_MATCH[occasionPref] ?? ["post-event", "casual"];

  const ranked: RankedRestaurant[] = nearby.map((r) => {
    const mapped = r.walkMinutesByVenue[event.venueId];
    const walkMinutes =
      venue && mapped == null
        ? walkMinutesBetween({ lat: venue.lat, lng: venue.lng }, restaurantCoords(r))
        : (mapped ?? 15);
    const remaining = seatsRemaining(r.id, bookings, inventory);
    const risk = lastTrainRisk(
      event.endAt,
      walkMinutes,
      lastTrainForStation(r.mtrStation) ?? (venue ? lastTrainForVenue(venue) : undefined),
    );
    const reasons: string[] = [];
    const weights: Record<string, number> = { ...w };
    let base = 40;
    let boostApplied = 0;

    const walkDelta = Math.max(0, 18 - walkMinutes) * w.walk;
    base += walkDelta;
    reasons.push(`步行 ${walkMinutes} 分鐘`);

    if (remaining >= prefs.partySize) {
      const pts = 12 * w.seats;
      base += pts;
      reasons.push(`尚餘 ${remaining} 席`);
    } else {
      base -= 40;
      reasons.push("席位不足");
    }

    if (r.partySizes.includes(prefs.partySize)) base += 8 * w.partyFit;
    else base -= 10;

    if (r.priceLevel <= prefs.maxPrice) base += 6 * w.price;
    else {
      base -= 8;
      reasons.push("超出預算");
    }

    if (prefs.cuisines.length && prefs.cuisines.includes(r.cuisine)) {
      base += 14 * w.cuisine;
      reasons.push(`符合口味：${r.cuisine}`);
    }

    if (prefs.needLastTrain) {
      if (risk === "safe") {
        base += 16 * w.lastTrain;
        reasons.push("趕得切尾班車");
      } else if (risk === "tight") {
        base += 2 * w.lastTrain;
        reasons.push("尾班車偏緊");
      } else {
        base -= 28;
        reasons.push("可能錯過尾班車");
      }
    }

    if (r.ambiance && r.ambiance.some((a) => preferredAmbiances.includes(a))) {
      const pts = 14 * w.ambiance;
      base += pts;
      const match = r.ambiance.find((a) => preferredAmbiances.includes(a));
      reasons.push(`適合：${ambianceLabel(match)}`);
    }

    const conversion = r.conversionRate30d ?? 0.35;
    const conversionPts = Math.round(22 * conversion * w.conversion);
    base += conversionPts;
    if (conversion >= 0.6) reasons.push("即時確認率高");
    else if (conversion >= 0.45) reasons.push("商戶回覆快");

    let sponsoredPts = 0;
    if (r.sponsored) sponsoredPts += 1;

    if (r.auctionBid) {
      const sameEvent = !r.auctionBid.eventId || r.auctionBid.eventId === event.id;
      const inSlot = isWithinBoostedSlot(event, r.auctionBid.boostedSlotStart, r.auctionBid.boostedSlotEnd);
      if (sameEvent && inSlot && r.auctionBid.bidPerBooking) {
        const bidBoost = Math.min(2, Math.max(0.2, r.auctionBid.bidPerBooking * 0.04));
        sponsoredPts += bidBoost;
        reasons.push(r.adCreative?.headline ?? "商戶熱推");
      }
    }
    base += sponsoredPts;
    if (sponsoredPts > 0) boostApplied = Math.round(sponsoredPts * 10) / 10;

    return {
      ...r,
      walkMinutes,
      score: Math.round(base),
      reasons,
      lastTrainRisk: risk,
      seatsRemaining: remaining,
      boostApplied,
      scenarioWeights: weights,
    };
  });

  return ranked
    .filter((r) => r.seatsRemaining >= prefs.partySize)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function ambianceLabel(amb?: DiningOccasion) {
  switch (amb) {
    case "date":
      return "拍拖約會";
    case "celebration":
      return "慶祝聚會";
    case "business":
      return "商務款待";
    case "family":
      return "家庭聚餐";
    case "casual":
      return "輕鬆隨便食";
    default:
      return "散場宵夜";
  }
}

function isWithinBoostedSlot(
  event: LocalEvent,
  startAt?: string,
  endAt?: string,
) {
  if (!startAt && !endAt) return true;
  const t = +new Date(event.endAt);
  if (startAt && t < +new Date(startAt)) return false;
  if (endAt && t > +new Date(endAt)) return false;
  return true;
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

const LUCKY_LINES = [
  "今晚貴人方位坐西北，入座前先俾左手摸下枱邊。",
  "散場嗰刻如果見到白色車，記得即刻打開手機買飛。",
  "今餐唔好第一啖食雞，留返尾先食，桃花即刻翻三倍。",
  "搭車返屋企揀左邊位，第二日有驚喜收穫。",
  "入餐廳前同朋友講一聲「多謝」，個月偏財運會升。",
];

function luckyHintFor(event: LocalEvent) {
  const idx = Math.abs(
    [...event.id].reduce((s, c) => s + c.charCodeAt(0), 0) % LUCKY_LINES.length,
  );
  return LUCKY_LINES[idx];
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
  const offset = categoryDiningOffset(event.category);
  const duration = categoryDiningDuration(event.category);
  const diningStart = clockFromMinutes(minutesOfDay(event.endAt) + offset);
  const diningEnd = clockFromMinutes(minutesOfDay(event.endAt) + offset + duration);
  const drop = relatedEvent(event);
  const relatedDrop = drop?.category === "ticket-drop" ? drop : undefined;

  return {
    commuteMin,
    commuteNote: commuteNote(prefs.homeDistrict, event.venueId, coords),
    diningWindow: buildDiningWindow(event, diningStart, diningEnd),
    lastTrain: venue ? lastTrainCaption(venue) : "—",
    clash: conflictNote(event, calendar, prefs, coords),
    relatedDrop,
    luckyHint: luckyHintFor(event),
  };
}

function categoryDiningOffset(cat: EventCategory) {
  switch (cat) {
    case "ticket-drop":
      return -30;
    case "mall":
      return 10;
    case "movie":
      return 5;
    case "workshop":
      return -15;
    case "nightlife":
      return 0;
    default:
      return 15;
  }
}

function categoryDiningDuration(cat: EventCategory) {
  switch (cat) {
    case "ticket-drop":
      return 45;
    case "mall":
      return 75;
    case "workshop":
      return 60;
    case "nightlife":
      return 150;
    case "festival":
      return 120;
    default:
      return 90;
  }
}

function buildDiningWindow(event: LocalEvent, start: string, end: string) {
  if (event.category === "ticket-drop") {
    return event.ticketType === "presale"
      ? "會員預售前後請留白，建議預售後 30 分鐘先食。"
      : "公開發售半個鐘前請坐定定，唔好夾訂住。";
  }
  if (event.venueId === "home") return "開波前入座，賽事期間唔使換枱。";
  if (event.category === "movie") return `電影散場後 ${start}–${end} 宵夜時段`;
  if (event.category === "mall") return `掃貨中段 ${start}–${end} 下午茶 / 晚餐`;
  if (event.category === "workshop") return `課程前 ${start}–${end} 輕食窗口`;
  if (event.category === "nightlife") return `蒲點尾段 ${start}–${end} 通宵點心 / 酒吧`;
  if (event.category === "festival") return `節目中段 ${start}–${end} 飲食休息`;
  return `散場後 ${start}–${end} 入座窗`;
}

export function postEventSlot(event: LocalEvent) {
  if (event.category === "ticket-drop") return "10:15";
  if (event.category === "mall") return formatTime(addMinutes(event.endAt, 10));
  if (event.category === "movie") return formatTime(addMinutes(event.endAt, 5));
  if (event.category === "workshop") return formatTime(addMinutes(event.endAt, -15));
  if (event.category === "nightlife") return formatTime(addMinutes(event.endAt, 0));
  return formatTime(addMinutes(event.endAt, 15));
}
