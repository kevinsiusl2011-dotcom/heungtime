import { EVENTS, RESTAURANTS, eventById, venueById } from "./data";
import { formatDateTime, formatTime } from "./calendar";
import { DEFAULT_PREFS } from "./labels";
import { buildNightPlan, postEventSlot, recommendRestaurants } from "./rank";
import type {
  AgentIntent,
  Booking,
  CalendarItem,
  ChatMessage,
  LocalEvent,
  RankedRestaurant,
  UserPrefs,
} from "./types";

export function calendarDescription(event: LocalEvent, restaurants: RankedRestaurant[]) {
  const venue = venueById(event.venueId);
  const planHint =
    event.venueId === "home" ? "開波前／直播期間" : `這天完結後（約 ${postEventSlot(event)}）`;
  const lines = [
    event.description,
    "",
    "—— 享時夜歸計劃 ——",
    `${formatDateTime(event.startAt)} @ ${venue?.name ?? ""}`,
    venue ? `${venue.mtr} 尾班車 ${venue.lastTrain}` : "",
  ];

  if (restaurants.length) {
    lines.push(`${planHint}，按步行、空位與尾班車排序：`);
    restaurants.forEach((r, i) => {
      const risk =
        r.lastTrainRisk === "safe" ? "趕得切尾班車" : r.lastTrainRisk === "tight" ? "尾班車偏緊" : "或趕唔切";
      lines.push(
        `${i + 1}. ${r.name}・${r.cuisine}（${r.district}）｜步行 ${r.walkMinutes} 分鐘｜${r.availableSlots[0]}｜${risk}`,
      );
      lines.push(`   ${r.pitch}`);
    });
  }

  return lines.filter(Boolean).join("\n");
}

export function emailCopy(event: LocalEvent, restaurants: RankedRestaurant[]) {
  const venue = venueById(event.venueId);
  const recs = restaurants
    .map(
      (r, i) =>
        `${i + 1}. ${r.name}（${r.cuisine}／步行 ${r.walkMinutes} 分鐘）\n   ${r.pitch}\n   空位：${r.availableSlots.join("、")}｜尚餘 ${r.seatsRemaining} 席`,
    )
    .join("\n\n");

  return {
    subject: `享時：${event.title} 已入曆，夜歸食檔已幫你睇過`,
    body: `你剛把「${event.title}」加入日曆。

場地：${venue?.name ?? ""}（${venue?.district ?? ""}）
時間：${formatDateTime(event.startAt)} – ${formatTime(event.endAt)}
${venue ? `尾班車：${venue.mtr} ${venue.lastTrain}` : ""}

附近按步行、空位、尾班車安全排序：

${recs}

一鍵經 WhatsApp 向商戶發送訂座。確認後會寫回你的享時日曆。

— 享時 HeungTime`,
  };
}

export function autoChatScript(
  restaurant: RankedRestaurant | { name: string; district: string },
  event: LocalEvent | undefined,
  partySize: number,
  slot: string,
  guestName = "Kevin",
) {
  const eventLine = event
    ? `我哋 ${formatTime(event.endAt)} 喺${venueById(event.venueId)?.name ?? ""}散場，想訂 ${slot} ${partySize} 位。`
    : `想訂 ${slot} ${partySize} 位。`;

  return [
    { from: "user" as const, text: `你好，經享時訂座。${eventLine} 名下 ${guestName || "客人"}。` },
    {
      from: "merchant" as const,
      text: `收到，${restaurant.name} ${slot} ${partySize} 人位已核對。正在發送 WhatsApp 留位。`,
    },
  ];
}

const CATEGORY_HINTS: Record<string, string[]> = {
  concert: ["演唱會", "陳奕迅", "張學友", "紅館", "亞博", "睇 show", "eason"],
  "ticket-drop": ["搶飛", "開售", "cityline", "買飛"],
  sports: ["球賽", "英超", "港超", "nba", "傑志", "阿仙奴", "觀賽", "睇波"],
  mall: ["商場", "海港城", "k11", "ifc", "時代", "限時", "shopping"],
  exhibition: ["展覽", "m+", "戲曲", "art", "西九", "牡丹亭", "草間"],
};

function parsePartySize(query: string): number | null {
  const m = query.match(/(\d+)\s*人/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 12 ? n : null;
}

function detectIntent(query: string): AgentIntent {
  const q = query.toLowerCase();
  if (/加入|寫入|入曆|加去日曆|pin/.test(q)) return "pin";
  if (/訂座|訂咗|幫我訂|whatsapp/.test(q)) return "book";
  if (/口味|人數|尾班車|設定|偏好/.test(q)) return "prefs";
  if (/點用|幫助|help|你可以/.test(q)) return "help";
  return "search";
}

export function interpretQuery(
  query: string,
  calendar: CalendarItem[],
  prefs: UserPrefs,
  bookings: Booking[],
) {
  const q = query.toLowerCase();
  const intent = detectIntent(query);
  const partySize = parsePartySize(query) ?? prefs.partySize;
  const nextPrefs: UserPrefs = { ...prefs, partySize };
  if (/尾班車|趕車|末班/.test(q)) nextPrefs.needLastTrain = true;
  if (/平啲|便宜|budget/.test(q)) nextPrefs.maxPrice = 2;
  if (/高級|慶祝/.test(q)) nextPrefs.maxPrice = 4;

  let matched = EVENTS.filter((event) => {
    const blob = `${event.title} ${event.titleEn} ${event.tags.join(" ")} ${event.description}`.toLowerCase();
    if (q.length >= 2 && blob.includes(q)) return true;
    return event.tags.some((tag) => q.includes(tag.toLowerCase()) || blob.includes(q.slice(0, 2)));
  });

  if (!matched.length) {
    matched = EVENTS.filter((event) =>
      (CATEGORY_HINTS[event.category] ?? []).some((hint) => q.includes(hint.toLowerCase())),
    );
  }

  if (/星期六|周六|saturday/.test(q)) {
    matched = matched.filter((event) => new Date(event.startAt).getDay() === 6);
  }

  if (!matched.length && /食|訂|餐廳|宵夜/.test(q)) {
    matched = EVENTS.filter((e) => calendar.some((c) => c.eventId === e.id)).slice(0, 3);
  }

  const unique = [...new Map(matched.map((e) => [e.id, e])).values()].slice(0, 4);

  const namedRestaurant = RESTAURANTS.find(
    (r) => q.includes(r.name.toLowerCase()) || q.includes(r.id),
  );

  const restaurants = unique
    .flatMap((event) => recommendRestaurants(event, nextPrefs, bookings, 2))
    .concat(
      namedRestaurant
        ? recommendRestaurants(
            unique[0] ?? EVENTS[0],
            nextPrefs,
            bookings,
            8,
          ).filter((r) => r.id === namedRestaurant.id)
        : [],
    );

  const uniqueRestaurants = [...new Map(restaurants.map((r) => [r.id, r])).values()].slice(0, 4);

  return { events: unique, restaurants: uniqueRestaurants, intent, prefs: nextPrefs };
}

export function agentReply(
  query: string,
  calendar: CalendarItem[],
  prefs: UserPrefs = DEFAULT_PREFS,
  bookings: Booking[] = [],
): ChatMessage {
  const { events, restaurants, intent } = interpretQuery(query, calendar, prefs, bookings);
  const id = `m-${Date.now()}`;

  if (intent === "help" || (!events.length && !restaurants.length)) {
    return {
      id,
      role: "agent",
      intent: events.length ? intent : "help",
      text: "我可以幫你：把演唱會／搶飛／港超／商場／展覽寫入日曆，按步行、空位同尾班車排附近餐廳，再用 WhatsApp 一鍵訂座。試下：「陳奕迅演唱會之後食飯」或「星期六想睇波，趕尾班車」。",
    };
  }

  const event = events[0];
  const plan = event ? buildNightPlan(event, calendar, prefs) : null;

  const eventLines = events
    .map((e) => {
      const venue = venueById(e.venueId);
      const inCal = calendar.some((c) => c.eventId === e.id);
      return `• ${e.title}｜${formatDateTime(e.startAt)}｜${venue?.district}${inCal ? "（已在日曆）" : ""}`;
    })
    .join("\n");

  const foodLines = restaurants
    .slice(0, 3)
    .map((r, i) => {
      const risk =
        r.lastTrainRisk === "safe" ? "趕得切" : r.lastTrainRisk === "tight" ? "偏緊" : "或趕唔切";
      return `${i + 1}. ${r.name}・${r.cuisine}｜步行 ${r.walkMinutes} 分鐘｜${r.availableSlots[0]}｜${risk}`;
    })
    .join("\n");

  const lead = event
    ? `揾到「${event.title}」。${plan?.diningWindow ?? ""} ${plan?.lastTrain ?? ""}`
    : "按你日程，附近呢幾間而家有位。";

  const clash = plan?.clash ? `\n注意：${plan.clash}` : "";
  const drop = plan?.relatedDrop
    ? `\n相關搶飛：${plan.relatedDrop.title}（${formatDateTime(plan.relatedDrop.startAt)}）`
    : "";

  return {
    id,
    role: "agent",
    intent,
    text: `${lead}${clash}${drop}\n\n${eventLines}${foodLines ? `\n\n推薦：\n${foodLines}` : ""}\n\n要加入日曆、開 WhatsApp 訂座，或先睇 Email 行程都可以。`,
    eventIds: events.map((e) => e.id),
    restaurantIds: restaurants.map((r) => r.id),
  };
}

export { recommendRestaurants, buildNightPlan, buildNightPlan as nightPlan, conflictNote } from "./rank";
