import { EVENTS, venueById } from "./data";
import { addMinutes, formatTime } from "./calendar";
import type {
  CalendarItem,
  LocalEvent,
  NightPlan,
  Restaurant,
  UserPrefs,
} from "./types";

const COMMUTE: Record<string, Record<string, number>> = {
  中環: {
    coliseum: 25,
    asiaworld: 28,
    "kai-tak": 32,
    "mk-stadium": 18,
    "harbour-city": 12,
    k11: 14,
    ifc: 6,
    "times-square": 10,
    mplus: 16,
    xiqu: 16,
    hkcec: 10,
    home: 8,
  },
  尖沙咀: {
    coliseum: 12,
    asiaworld: 32,
    "kai-tak": 22,
    "mk-stadium": 14,
    "harbour-city": 8,
    k11: 6,
    ifc: 12,
    "times-square": 14,
    mplus: 10,
    xiqu: 10,
    hkcec: 16,
    home: 10,
  },
  紅磡: {
    coliseum: 8,
    asiaworld: 35,
    "kai-tak": 18,
    "mk-stadium": 12,
    "harbour-city": 14,
    k11: 12,
    ifc: 22,
    "times-square": 18,
    mplus: 16,
    xiqu: 16,
    hkcec: 16,
    home: 15,
  },
};

export function commuteMinutes(homeDistrict: string, venueId: string) {
  return COMMUTE[homeDistrict]?.[venueId] ?? venueById(venueId)?.commuteFromCentralMin ?? 20;
}

export function postEventSlot(event: LocalEvent) {
  if (event.category === "ticket-drop") return "10:15";
  if (event.category === "mall") return formatTime(addMinutes(event.endAt, 10));
  if (event.category === "sports" && event.venueId === "home") return formatTime(event.startAt);
  return formatTime(addMinutes(event.endAt, 15));
}

function parseHm(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesOnClock(isoOrHm: string) {
  if (isoOrHm.includes("T")) {
    const d = new Date(isoOrHm);
    const hk = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Hong_Kong",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
    return parseHm(hmNormalize(hk));
  }
  return parseHm(isoOrHm);
}

function hmNormalize(value: string) {
  return value.replace("24:", "00:").replace(" ", "");
}

function lastTrainMinutes(lastTrain: string) {
  const match = lastTrain.match(/(\d{2}:\d{2})/);
  return match ? parseHm(match[1]) : 24 * 60 + 30;
}

export function lastTrainRiskForSlot(
  event: LocalEvent,
  restaurant: Restaurant,
  slot: string,
): "safe" | "tight" | "miss" {
  const venue = venueById(event.venueId);
  if (!venue || event.category === "ticket-drop") return "safe";
  if (!restaurant.lastTrainSafe) return "miss";

  const last = lastTrainMinutes(venue.lastTrain);
  const slotMin = minutesOnClock(slot);
  const walk = restaurant.walkMinutesByVenue[event.venueId] ?? 15;
  const meal = 40;
  const finish = slotMin + meal + walk;
  const paddedLast = last < 5 * 60 ? last + 24 * 60 : last;
  const paddedFinish = finish < 5 * 60 ? finish : finish;

  if (paddedFinish + 15 < paddedLast) return "safe";
  if (paddedFinish < paddedLast + 5) return "tight";
  return "miss";
}

export function conflictNote(event: LocalEvent, calendar: CalendarItem[], prefs?: UserPrefs) {
  const clash = calendar.find((item) => {
    if (item.eventId === event.id) return false;
    const a1 = +new Date(item.startAt);
    const a2 = +new Date(item.endAt);
    const b1 = +new Date(event.startAt);
    const b2 = +new Date(event.endAt);
    return a1 < b2 && b1 < a2;
  });
  if (clash) {
    return `與「${clash.title}」時間重疊。建議改訂 ${formatTime(addMinutes(event.endAt, 45))} 宵夜，或移動工作檔。`;
  }

  const home = prefs?.homeDistrict ?? "中環";
  const commute = commuteMinutes(home, event.venueId);
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

export function nightPlan(
  event: LocalEvent,
  calendar: CalendarItem[],
  prefs: UserPrefs,
): NightPlan {
  const venue = venueById(event.venueId);
  const commuteMin = commuteMinutes(prefs.homeDistrict, event.venueId);
  const clash = conflictNote(event, calendar, prefs);
  const related = event.relatedEventId ? EVENTS.find((e) => e.id === event.relatedEventId) : undefined;

  let commuteNote = `${prefs.homeDistrict} → ${venue?.district ?? ""} 約 ${commuteMin} 分鐘（${venue?.mtr ?? "港鐵"}）`;
  if (event.category === "ticket-drop") {
    commuteNote = "搶飛檔請留在穩定網絡；票務 App 崩潰唔關我哋事——我哋只清時間。";
  } else if (event.venueId === "home") {
    commuteNote = "可留家或改去酒吧觀賽；一鍵鎖定高腳枱，唔使自己翻 OpenRice。";
  }

  return {
    commuteMin,
    commuteNote,
    diningWindow:
      event.category === "ticket-drop"
        ? "開售後先食，10:15 後先推附近午餐"
        : `散場窗 ${postEventSlot(event)} 起`,
    lastTrain: venue?.lastTrain ?? "按所在綫路",
    clash,
    relatedDrop: related,
  };
}
