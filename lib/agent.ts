import { EVENTS, RESTAURANTS, DAYDREAM_REFERRAL_URL, DAYDREAM_BRAND, restaurantById, venueById } from "./data";
import { formatDateTime, formatTime, hkWeekday, hkYmd, shiftIsoDays } from "./calendar";
import {
  lastTrainCaption,
  lastTrainForStation,
  lastTrainForVenue,
  lastTrainRisk,
} from "./geo";
import { CUISINE_OPTIONS, DEFAULT_PREFS, HOME_DISTRICTS } from "./labels";
import { buildNightPlan, postEventSlot, recommendRestaurants } from "./rank";
import type {
  AgentIntent,
  Booking,
  CalendarItem,
  ChatMessage,
  DiningOccasion,
  EventCategory,
  LocalEvent,
  NightPlan,
  RankedRestaurant,
  UserPrefs,
} from "./types";

const CATEGORY_HINTS: Record<EventCategory, string[]> = {
  concert: ["演唱會", "陳奕迅", "張學友", "紅館", "亞博", "睇 show", "eason", "啟德", "音樂"],
  "ticket-drop": ["搶飛", "開售", "cityline", "買飛", "預售", "公開發售", "搶票"],
  sports: ["球賽", "英超", "港超", "nba", "傑志", "阿仙奴", "觀賽", "睇波", "足球", "籃球", "f1"],
  mall: ["商場", "海港城", "k11", "ifc", "時代", "限時", "shopping", "會員夜", "happy hour"],
  exhibition: ["展覽", "m+", "戲曲", "art", "西九", "牡丹亭", "草間", "art week", "art basel"],
  movie: ["電影", "午夜場", "首映", "imax", "沙丘", "吉卜力", "動畫", "戲院", "睇戲"],
  festival: ["美酒佳餚", "嘉年華", "音樂節", "節日", "freaks out", "wine and dine", "festival"],
  workshop: ["工作坊", "烹飪班", "陶藝", "手作", "pmq", "art house", "體驗班", "課程"],
  nightlife: ["蘭桂坊", "lkf", "酒吧", "蒲", "dj", "soho", "蘇豪", "夜店", "clubbing", "酒"],
};

const STOP_TOKENS = new Set([
  "之後",
  "食飯",
  "然後",
  "還是",
  "或者",
  "以及",
  "同埋",
  "幫我",
  "請問",
  "可以",
  "點樣",
  "怎麼",
  "如何",
  "一下",
  "一個",
  "想去",
  "想睇",
  "想食",
  "趕車",
  "宵夜",
  "附近",
  "推薦",
  "生日",
  "慶祝",
  "約會",
  "見家長",
  "傾生意",
]);

export type SearchFilters = {
  weekday?: number;
  weekend?: boolean;
  date?: string;
  category?: EventCategory;
  district?: string;
  cuisine?: string;
  partySize?: number;
  maxPrice?: 1 | 2 | 3 | 4;
  needLastTrain?: boolean;
  occasion?: DiningOccasion;
};

export function detectIntent(query: string): AgentIntent {
  const q = query.toLowerCase();
  if (/分享|搵朋友|一齊去|傳送|share|invite|打卡/.test(q)) return "share";
  if (/加入|寫入|入曆|加去日曆|\bpin\b/.test(q)) return "pin";
  if (/幫我訂|想訂座|一鍵訂|開\s*whatsapp|whatsapp/.test(q) && !/訂咗未|已經訂|我訂咗/.test(q)) return "book";
  if (/改口味|改人數|偏好設定|我的偏好|帳戶設定|場景|慶祝|約會/.test(q)) return "prefs";
  if (/點用|幫助|\bhelp\b|你可以做/.test(q)) return "help";
  return "search";
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseOccasion(query: string): DiningOccasion | undefined {
  const q = query.toLowerCase();
  if (/約會|拍拖|date|女朋友|男朋友/.test(q)) return "date";
  if (/生日|慶祝|週年|結婚|求婚/.test(q)) return "celebration";
  if (/見客|生意|公司|商務|business|老闆/.test(q)) return "business";
  if (/屋企人|家庭|一家|阿爸阿媽|仔女/.test(q)) return "family";
  if (/隨便|fast food|茶餐廳|quick/.test(q)) return "casual";
  if (/散場|睇完show|賽後|電影散場/.test(q)) return "post-event";
  return undefined;
}

export function parseSearchHints(query: string): SearchFilters {
  const q = query.toLowerCase();
  const filters: SearchFilters = {};

  if (/週末|周末|weekend/.test(q)) filters.weekend = true;
  else if (/星期日|週日|周日|禮拜日|sunday/.test(q)) filters.weekday = 0;
  else if (/星期六|週六|周六|禮拜六|saturday/.test(q)) filters.weekday = 6;
  else if (/星期五|週五|周五|friday/.test(q)) filters.weekday = 5;
  else if (/星期四|週四|周四|thursday/.test(q)) filters.weekday = 4;
  else if (/星期三|週三|周三|wednesday/.test(q)) filters.weekday = 3;
  else if (/星期二|週二|周二|tuesday/.test(q)) filters.weekday = 2;
  else if (/星期一|週一|周一|monday/.test(q)) filters.weekday = 1;

  const iso = query.match(/(\d{4})-(\d{2})-(\d{2})/);
  const cn = query.match(/(\d{1,2})月(\d{1,2})日?/);
  if (iso) filters.date = `${iso[1]}-${iso[2]}-${iso[3]}`;
  else if (cn) {
    filters.date = `${hkYmd(new Date()).slice(0, 4)}-${pad2(Number(cn[1]))}-${pad2(Number(cn[2]))}`;
  } else if (/今日|今天|今晚/.test(q)) {
    filters.date = hkYmd(new Date());
  } else if (/聽日|明天/.test(q)) {
    filters.date = hkYmd(shiftIsoDays(new Date().toISOString(), 1));
  }

  const categoryOrder: EventCategory[] = [
    "ticket-drop",
    "nightlife",
    "movie",
    "festival",
    "workshop",
    "concert",
    "sports",
    "mall",
    "exhibition",
  ];
  for (const category of categoryOrder) {
    if ((CATEGORY_HINTS[category] ?? []).some((hint) => q.includes(hint.toLowerCase()))) {
      filters.category = category;
      break;
    }
  }

  const districts = [...HOME_DISTRICTS, "赤鱲角", "會展", "黃埔", "蘭桂坊", "西九", "Soho", "蘇豪", "PMQ", "啟德"] as const;
  const district = districts.find((name) => query.includes(name));
  if (district) filters.district = district;

  const cuisine = CUISINE_OPTIONS.find((name) => query.includes(name));
  if (cuisine) filters.cuisine = cuisine;

  const party = query.match(/(\d+)\s*人/);
  if (party) {
    const n = Number(party[1]);
    if (n >= 1 && n <= 12) filters.partySize = n;
  }
  if (/尾班車|趕車|末班/.test(q)) filters.needLastTrain = true;
  if (/平啲|便宜|budget|抵食/.test(q)) filters.maxPrice = 2;
  if (/高級|慶祝|米芝蓮|fine dining/.test(q)) filters.maxPrice = 4;

  const occasion = parseOccasion(query);
  if (occasion) filters.occasion = occasion;

  return filters;
}

function applyFilters(events: LocalEvent[], filters: SearchFilters) {
  return events.filter((event) => {
    const venue = venueById(event.venueId);
    if (filters.date && hkYmd(event.startAt) !== filters.date) return false;
    if (filters.weekend) {
      const day = hkWeekday(event.startAt);
      if (day !== 0 && day !== 6) return false;
    } else if (typeof filters.weekday === "number" && hkWeekday(event.startAt) !== filters.weekday) {
      return false;
    }
    if (filters.category && event.category !== filters.category) return false;
    if (filters.district) {
      const blob = `${venue?.district ?? ""} ${venue?.name ?? ""} ${(venue?.tags ?? []).join(" ")} ${event.tags.join(" ")}`;
      if (!blob.includes(filters.district)) return false;
    }
    return true;
  });
}

export function interpretQuery(
  query: string,
  calendar: CalendarItem[],
  prefs: UserPrefs,
  bookings: Booking[],
  inventory?: Record<string, number>,
  extra?: SearchFilters,
) {
  const q = query.toLowerCase();
  const intent = detectIntent(query);
  const hints = { ...parseSearchHints(query), ...extra };
  const nextPrefs: UserPrefs = {
    ...prefs,
    partySize: hints.partySize ?? prefs.partySize,
    maxPrice: hints.maxPrice ?? prefs.maxPrice,
    needLastTrain: hints.needLastTrain ?? prefs.needLastTrain,
    cuisines: hints.cuisine ? [hints.cuisine] : prefs.cuisines,
    occasion: hints.occasion ?? prefs.occasion,
  };

  const tokens = q
    .split(/[\s，。！？、,.!?]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_TOKENS.has(token));

  let matched = EVENTS.filter((event) => {
    const blob = `${event.title} ${event.titleEn} ${event.tags.join(" ")} ${event.description}`.toLowerCase();
    if (q.length >= 2 && blob.includes(q)) return true;
    return (
      tokens.some((token) => blob.includes(token)) ||
      event.tags.some((tag) => q.includes(tag.toLowerCase()))
    );
  });

  if (!matched.length) {
    matched = EVENTS.filter((event) =>
      (CATEGORY_HINTS[event.category] ?? []).some((hint) => q.includes(hint.toLowerCase())),
    );
  }

  matched = applyFilters(matched, hints);

  if (!matched.length && (hints.date || hints.weekday != null || hints.weekend || hints.category || hints.district)) {
    matched = applyFilters(EVENTS, hints);
  }

  if (!matched.length && /食|訂|餐廳|宵夜|酒吧|咖啡/.test(q)) {
    matched = EVENTS.filter((e) => calendar.some((c) => c.eventId === e.id)).slice(0, 3);
  }

  const generic = new Set([
    "演唱會", "搶飛", "球賽", "商場", "展覽", "電影", "嘉年華", "工作坊", "酒吧",
    "concert", "show", "movie", "festival", "workshop",
  ]);
  const scored = matched.map((event) => {
    let score = 0;
    const blob = `${event.title} ${event.titleEn} ${event.tags.join(" ")}`.toLowerCase();
    if (q.length >= 4 && blob.includes(q.slice(0, 4))) score += 3;
    for (const tag of event.tags) {
      if (!q.includes(tag.toLowerCase())) continue;
      score += generic.has(tag.toLowerCase()) ? 1 : Math.min(8, tag.length);
    }
    for (const token of tokens) {
      if (generic.has(token)) continue;
      if (blob.includes(token)) score += 6;
    }
    return { event, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]?.score ?? 0;
  const unique = [
    ...new Map(
      scored
        .filter((row) => best <= 1 || row.score >= Math.max(2, best - 4))
        .map((row) => [row.event.id, row.event]),
    ).values(),
  ].slice(0, 4);

  const namedRestaurant = RESTAURANTS.find(
    (r) => q.includes(r.name.toLowerCase()) || q.includes(r.id),
  );

  const restaurants = unique
    .flatMap((event) => recommendRestaurants(event, nextPrefs, bookings, 2, inventory))
    .concat(
      namedRestaurant
        ? recommendRestaurants(unique[0] ?? EVENTS[0], nextPrefs, bookings, 8, inventory).filter(
            (r) => r.id === namedRestaurant.id,
          )
        : [],
    );

  const uniqueRestaurants = [...new Map(restaurants.map((r) => [r.id, r])).values()].slice(0, 4);

  return { events: unique, restaurants: uniqueRestaurants, intent, prefs: nextPrefs, filters: hints };
}

export function publicEventView(event: LocalEvent, calendar: CalendarItem[]) {
  const venue = venueById(event.venueId);
  return {
    id: event.id,
    title: event.title,
    category: event.category,
    startAt: event.startAt,
    endAt: event.endAt,
    venue: venue?.name,
    district: venue?.district,
    mtr: venue?.mtr,
    lastTrain: venue ? lastTrainCaption(venue) : undefined,
    alreadyInCalendar: calendar.some((c) => c.eventId === event.id),
    relatedEventId: event.relatedEventId,
    ticketType: event.ticketType,
    mood: event.mood,
  };
}

export function publicRestaurantView(restaurant: RankedRestaurant) {
  return {
    id: restaurant.id,
    name: restaurant.name,
    cuisine: restaurant.cuisine,
    district: restaurant.district,
    priceLevel: restaurant.priceLevel,
    walkMinutes: restaurant.walkMinutes,
    lastTrainRisk: restaurant.lastTrainRisk,
    seatsRemaining: restaurant.seatsRemaining,
    availableSlots: restaurant.availableSlots.slice(0, 4),
    partySizes: restaurant.partySizes,
    reasons: restaurant.reasons,
    autoChatReady: restaurant.autoChatReady,
    pitch: restaurant.pitch,
    boostApplied: restaurant.boostApplied,
    badge: restaurant.adCreative?.badgeLabel,
    ambiance: restaurant.ambiance,
  };
}

export function publicNightPlanView(plan: NightPlan, restaurants: RankedRestaurant[] = []) {
  return {
    commuteMin: plan.commuteMin,
    commuteNote: plan.commuteNote,
    diningWindow: plan.diningWindow,
    lastTrain: plan.lastTrain,
    clash: plan.clash,
    luckyHint: plan.luckyHint,
    relatedDrop: plan.relatedDrop
      ? { id: plan.relatedDrop.id, title: plan.relatedDrop.title, startAt: plan.relatedDrop.startAt }
      : undefined,
    restaurants: restaurants.slice(0, 3).map(publicRestaurantView),
  };
}

export function publicBookingView(booking: Booking) {
  return {
    confirmationCode: booking.confirmationCode,
    restaurant: restaurantById(booking.restaurantId)?.name ?? booking.restaurantId,
    eventId: booking.eventId,
    partySize: booking.partySize,
    slot: booking.slot,
    date: booking.date,
    status: booking.status,
    referralToken: booking.referralToken,
  };
}

export function lastTrainForEvent(event: LocalEvent, restaurantId?: string) {
  const venue = venueById(event.venueId);
  const restaurant = restaurantId ? restaurantById(restaurantId) : undefined;
  const walk =
    restaurant && venue
      ? (restaurant.walkMinutesByVenue[event.venueId] ?? 12)
      : 10;
  const train =
    (restaurant ? lastTrainForStation(restaurant.mtrStation) : undefined) ??
    (venue ? lastTrainForVenue(venue) : undefined);
  const risk = lastTrainRisk(event.endAt, walk, train);
  return {
    eventId: event.id,
    restaurantId: restaurant?.id,
    walkMinutes: walk,
    lastTrain: train ?? null,
    lastTrainCaption: venue ? lastTrainCaption(venue) : null,
    risk,
  };
}

export function calendarOverlaps(calendar: CalendarItem[]) {
  const pairs: { a: string; b: string; startAt: string }[] = [];
  const items = [...calendar].sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt)).slice(0, 40);
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i];
      const b = items[j];
      if (+new Date(b.startAt) >= +new Date(a.endAt)) break;
      if (+new Date(a.startAt) < +new Date(b.endAt) && +new Date(b.startAt) < +new Date(a.endAt)) {
        pairs.push({ a: a.title, b: b.title, startAt: a.startAt });
      }
    }
  }
  return pairs.slice(0, 8);
}

export function calendarDescription(event: LocalEvent, restaurants: RankedRestaurant[]) {
  const venue = venueById(event.venueId);
  const planHint =
    event.venueId === "home" ? "開波前／直播期間" : `這天完結後（約 ${postEventSlot(event)}）`;
  const lines = [
    event.description,
    "",
    "—— 享時夜歸計劃 ——",
    `${formatDateTime(event.startAt)} @ ${venue?.name ?? ""}`,
    venue ? lastTrainCaption(venue) : "",
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

  lines.push("");
  lines.push(`🍀 享時夥伴：${DAYDREAM_BRAND} 香港命理網站`);
  lines.push(`   👉 ${DAYDREAM_REFERRAL_URL}?utm_source=heungtime&utm_campaign=ics-footer`);

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
${venue ? lastTrainCaption(venue) : ""}

附近按步行、空位、尾班車安全排序：

${recs}

一鍵經 WhatsApp 向商戶發送訂座。確認後會寫回你的享時日曆。

🍀 享時夥伴：${DAYDREAM_BRAND} 香港命理網站
👉 ${DAYDREAM_REFERRAL_URL}?utm_source=heungtime&utm_campaign=email

— 享時 Ease`,
  };
}

export function generateConfirmationCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "HT-";
  for (let i = 0; i < 5; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function autoChatScript(
  restaurant: RankedRestaurant | { name: string; district: string },
  event: LocalEvent | undefined,
  partySize: number,
  slot: string,
  guestName = "客人",
  confirmationCode?: string,
  luckyHint?: string,
) {
  const code = confirmationCode ?? generateConfirmationCode();
  const eventLine = event
    ? `我哋 ${formatTime(event.endAt)} 喺${venueById(event.venueId)?.name ?? ""}散場，想訂 ${slot} ${partySize} 位。`
    : `想訂 ${slot} ${partySize} 位。`;

  const riskBadge =
    "lastTrainRisk" in restaurant
      ? restaurant.lastTrainRisk === "safe"
        ? "✅"
        : restaurant.lastTrainRisk === "tight"
          ? "⚠️"
          : "❌"
      : "";
  const riskText =
    "lastTrainRisk" in restaurant
      ? restaurant.lastTrainRisk === "safe"
        ? "尾班車：安全"
        : restaurant.lastTrainRisk === "tight"
          ? "尾班車：偏緊"
          : "尾班車：或趕唔切"
      : "";
  const walkText = "walkMinutes" in restaurant ? `步行 ${restaurant.walkMinutes} 分鐘` : "";

  const structuredMerchant = [
    `[享時確認碼 ${code}]`,
    `📅 ${event ? formatDateTime(event.startAt).slice(0, 10) : "今日"} ${slot}`,
    `🍽️ ${restaurant.name}（${restaurant.district}）${walkText ? "｜" + walkText : ""}`,
    `👥 ${partySize} 人${riskBadge ? "  " + riskBadge + " " + riskText : ""}`,
    `💡 按 1 即確認／2 改時間／3 睇其他餐廳`,
  ].join("\n");

  return {
    structuredHeader: structuredMerchant,
    confirmationCode: code,
    quickReplies: [
      { label: "1 確認", action: "confirm", payload: { code } },
      { label: "2 改時間", action: "reschedule", payload: { code } },
      { label: "3 其他餐廳", action: "alternatives", payload: { code } },
    ],
    lines: [
      { from: "user" as const, text: `你好，經享時訂座（${code}）。${eventLine} 名下 ${guestName || "客人"}。` },
      {
        from: "merchant" as const,
        text: `收到，${restaurant.name} ${slot} ${partySize} 人位已核對。正在發送 WhatsApp 留位。\n\n${structuredMerchant}`,
      },
      {
        from: "promo" as const,
        text: luckyHint
          ? `🍀 小貼士：${luckyHint}\n   享時夥伴 ${DAYDREAM_BRAND} 👉 ${DAYDREAM_REFERRAL_URL}?utm_source=heungtime&utm_campaign=autochat&ref=${code}`
          : `🍀 享時夥伴：${DAYDREAM_BRAND} 香港命理 👉 ${DAYDREAM_REFERRAL_URL}?utm_source=heungtime&utm_campaign=autochat&ref=${code}`,
      },
    ],
  };
}

export function replyFromFindings(input: {
  query: string;
  intent: AgentIntent;
  events: LocalEvent[];
  restaurants: RankedRestaurant[];
  plan?: NightPlan | null;
  extraLines?: string[];
  bookings?: Booking[];
  calendar?: CalendarItem[];
}): ChatMessage {
  const { events, restaurants, intent, plan, extraLines, bookings, calendar = [] } = input;
  const id = `m-${Date.now()}`;

  if (intent === "help" && !events.length && !restaurants.length && !extraLines?.length) {
    return {
      id,
      role: "agent",
      intent: "help",
      text: "我可以幫你：把演唱會／搶飛／港超／電影／商場／展覽／工作坊／酒吧寫入日曆，按步行、空位同尾班車排附近餐廳，再用 WhatsApp 一鍵訂座。試下：「陳奕迅演唱會之後食飯」「星期六想睇波，趕尾班車」「沙丘3午夜場之後宵夜」。",
      quickReplies: [
        { label: "陳奕迅演唱會之後食飯", action: "suggest", payload: "陳奕迅演唱會之後食飯" },
        { label: "沙丘3午夜場之後宵夜", action: "suggest", payload: "沙丘3午夜場之後宵夜" },
        { label: "蘭桂坊 DJ Set 之後直落", action: "suggest", payload: "蘭桂坊 DJ Set 之後直落" },
        { label: "PMQ 烹飪班 + 午餐", action: "suggest", payload: "PMQ 烹飪班 + 午餐" },
      ],
      promoBlock: {
        label: "🍀 享時夥伴",
        text: "睇埋今日運勢：Daydream Pro 香港命理網站。",
        url: `${DAYDREAM_REFERRAL_URL}?utm_source=heungtime&utm_campaign=help-empty`,
        emoji: "🍀",
      },
    };
  }

  if (/訂咗未|我的訂座|確認編號/.test(input.query) && bookings?.length) {
    const lines = bookings
      .filter((b) => b.status !== "cancelled")
      .slice(0, 6)
      .map((b) => {
        const view = publicBookingView(b);
        return `• ${view.confirmationCode}｜${view.restaurant}｜${view.slot}｜${view.status}`;
      });
    if (lines.length) {
      return {
        id,
        role: "agent",
        intent: "search",
        text: `你而家嘅訂座：\n${lines.join("\n")}\n\n要取消或再傳 WhatsApp，去「我的訂座」。`,
        promoBlock: {
          label: "🍀 享時夥伴",
          text: "睇埋今日運勢：Daydream Pro 香港命理網站。",
          url: `${DAYDREAM_REFERRAL_URL}?utm_source=heungtime&utm_campaign=my-bookings`,
          emoji: "🍀",
        },
      };
    }
  }

  const event = events[0];
  const eventLines = events
    .map((e) => {
      const view = publicEventView(e, calendar);
      return `• ${e.title}｜${formatDateTime(e.startAt)}｜${view.district ?? ""}${view.alreadyInCalendar ? "（已在日曆）" : ""}${e.ticketType === "presale" ? " 🔥會員預售" : e.ticketType === "public" ? " 🎫公開發售" : ""}`;
    })
    .join("\n");

  const foodLines = restaurants
    .slice(0, 3)
    .map((r, i) => {
      const risk =
        r.lastTrainRisk === "safe" ? "趕得切" : r.lastTrainRisk === "tight" ? "偏緊" : "或趕唔切";
      const why = r.reasons.slice(0, 2).join("、");
      const badge = r.adCreative?.badgeLabel ? `[${r.adCreative.badgeLabel}] ` : "";
      return `${i + 1}. ${badge}${r.name}・${r.cuisine}｜步行 ${r.walkMinutes} 分鐘｜尚餘 ${r.seatsRemaining} 席｜${risk}${why ? `｜${why}` : ""}`;
    })
    .join("\n");

  const lead = event
    ? `揾到「${event.title}」${event.mood ? `（${event.mood}）` : ""}。${plan?.diningWindow ?? ""} ${plan?.lastTrain ?? ""}`
    : restaurants.length
      ? "按你日程，附近呢幾間而家有位。"
      : "";
  const clash = plan?.clash ? `\n注意：${plan.clash}` : "";
  const drop = plan?.relatedDrop
    ? `\n相關搶飛：${plan.relatedDrop.title}（${formatDateTime(plan.relatedDrop.startAt)}${plan.relatedDrop.ticketType === "presale" ? "・會員預售" : ""}）`
    : "";
  const lucky = plan?.luckyHint ? `\n🍀 命理小貼士：${plan.luckyHint}` : "";
  const extras = extraLines?.length ? `\n${extraLines.join("\n")}` : "";

  if (!lead && !eventLines && !foodLines && !extras) {
    return {
      id,
      role: "agent",
      intent: events.length ? intent : "help",
      text: "我可以幫你：把演唱會／搶飛／港超／電影／商場／展覽／工作坊／酒吧寫入日曆，按步行、空位同尾班車排附近餐廳，再用 WhatsApp 一鍵訂座。試下：「陳奕迅演唱會之後食飯」或「星期六想睇波，趕尾班車」。",
    };
  }

  const baseQuickReplies = [
    event && !calendar.some((c) => c.eventId === event.id)
      ? { label: "加入日曆", action: "pin", payload: event.id }
      : null,
    restaurants[0]
      ? { label: `訂 ${restaurants[0].name.slice(0, 6)}`, action: "book", payload: restaurants[0].id }
      : null,
    restaurants[1]
      ? { label: `睇 ${restaurants[1].name.slice(0, 6)}`, action: "view", payload: restaurants[1].id }
      : null,
    { label: "分享俾朋友", action: "share", payload: event?.id ?? restaurants[0]?.id ?? "" },
  ].filter(Boolean) as { label: string; action: string; payload: string }[];

  const promoBlock: ChatMessage["promoBlock"] = {
    label: "🍀 享時夥伴",
    text: plan?.luckyHint
      ? `${plan.luckyHint} Daydream Pro 香港命理網站。`
      : "睇埋今日運勢：Daydream Pro 香港命理網站。",
    url: `${DAYDREAM_REFERRAL_URL}?utm_source=heungtime&utm_campaign=chat-${intent}${event ? "&eid=" + event.id : ""}${restaurants[0] ? "&rid=" + restaurants[0].id : ""}`,
    emoji: "🍀",
  };

  return {
    id,
    role: "agent",
    intent,
    text: `${lead}${clash}${drop}${lucky}${extras}\n\n${eventLines}${foodLines ? `\n\n推薦：\n${foodLines}` : ""}\n\n要加入日曆、開 WhatsApp 訂座、Email 行程，或分享俾朋友一齊去都可以。`.trim(),
    eventIds: events.map((e) => e.id),
    restaurantIds: restaurants.map((r) => r.id),
    quickReplies: baseQuickReplies,
    promoBlock,
  };
}

export function agentReply(
  query: string,
  calendar: CalendarItem[],
  prefs: UserPrefs = DEFAULT_PREFS,
  bookings: Booking[] = [],
  inventory?: Record<string, number>,
  coords?: { lat: number; lng: number } | null,
): ChatMessage {
  const found = interpretQuery(query, calendar, prefs, bookings, inventory);
  const event = found.events[0];
  const plan = event ? buildNightPlan(event, calendar, found.prefs, coords) : null;
  return replyFromFindings({
    query,
    intent: found.intent,
    events: found.events,
    restaurants: found.restaurants,
    plan,
    bookings,
    calendar,
  });
}

export { recommendRestaurants, buildNightPlan, buildNightPlan as nightPlan, conflictNote } from "./rank";
