import {
  agentReply,
  calendarOverlaps,
  detectIntent,
  interpretQuery,
  lastTrainForEvent,
  publicBookingView,
  publicEventView,
  publicNightPlanView,
  publicRestaurantView,
  replyFromFindings,
  type SearchFilters,
} from "@/lib/agent";
import { eventById, restaurantById, venueById } from "@/lib/data";
import { DISTRICT_COORDS, commuteMinutes, commuteMinutesFromCoords, commuteNote } from "@/lib/geo";
import { walkingMinutes } from "@/lib/maps";
import { buildNightPlan, conflictNote, recommendRestaurants, restaurantCoords } from "@/lib/rank";
import type {
  AgentIntent,
  Booking,
  CalendarItem,
  ChatMessage,
  EventCategory,
  LocalEvent,
  RankedRestaurant,
  UserPrefs,
} from "@/lib/types";

const SYSTEM = `你是「享時 Ease」香港生活日曆助理。用香港粵語／書面語夾雜、短句、可執行。
必須用工具查活動、餐廳、通勤、尾班車、行程衝突與訂座；只根據工具回傳作答，不要發明場地、席位或車次。
回覆要講到步行、尚餘席、尾班車風險與衝突原因（用工具的 reasons／clash）。
C 端免費。不要談內部 CPA、廣告費或電話號碼。
不要代用戶落訂或寫入日曆；叫用戶喺畫面撳加入日曆或 WhatsApp 訂座。
問通勤／趕車必須 call check_commute 或 check_last_train；問撞期 call list_conflicts；問訂咗未 call list_bookings。`;

type ToolCall = { id?: string; function: { name: string; arguments: string } };

type ToolContext = {
  calendar: CalendarItem[];
  prefs: UserPrefs;
  bookings: Booking[];
  inventory?: Record<string, number>;
  coords?: { lat: number; lng: number } | null;
};

type ToolBag = {
  eventIds: string[];
  restaurantIds: string[];
  events: LocalEvent[];
  restaurants: RankedRestaurant[];
  extraLines: string[];
};

export function llmConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function tools() {
  return [
    {
      type: "function",
      function: {
        name: "search_events",
        description: "搜香港活動與可訂餐廳。可用日期、星期、類別、地區收窄。",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" },
            date: { type: "string", description: "YYYY-MM-DD（香港日）" },
            weekday: { type: "integer", description: "0=日 … 6=六" },
            weekend: { type: "boolean" },
            category: {
              type: "string",
              enum: ["concert", "ticket-drop", "sports", "mall", "exhibition"],
            },
            district: { type: "string" },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "recommend_restaurants",
        description: "為指定活動按步行、空位、口味、尾班車排序附近餐廳",
        parameters: {
          type: "object",
          properties: {
            eventId: { type: "string" },
            limit: { type: "number" },
            partySize: { type: "number" },
            cuisine: { type: "string" },
            maxPrice: { type: "number" },
            needLastTrain: { type: "boolean" },
          },
          required: ["eventId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "build_night_plan",
        description: "計算通勤、入座窗、尾班車與行程衝突，並附附近餐廳短名單",
        parameters: {
          type: "object",
          properties: {
            eventId: { type: "string" },
            homeDistrict: { type: "string" },
          },
          required: ["eventId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "check_commute",
        description: "由而家位置或出發地區計去場地／餐廳幾耐",
        parameters: {
          type: "object",
          properties: {
            eventId: { type: "string" },
            venueId: { type: "string" },
            restaurantId: { type: "string" },
            district: { type: "string", description: "出發地區，無 GPS 時用" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "check_last_train",
        description: "散場後步行去餐廳再趕尾班車的風險",
        parameters: {
          type: "object",
          properties: {
            eventId: { type: "string" },
            restaurantId: { type: "string" },
          },
          required: ["eventId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_conflicts",
        description: "日曆撞期，或指定活動同前後行程的通勤衝突",
        parameters: {
          type: "object",
          properties: { eventId: { type: "string" } },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_bookings",
        description: "列出用戶現有訂座（不含電話）",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["pending", "confirmed", "cancelled", "attended"] },
          },
        },
      },
    },
  ];
}

function asCategory(value: unknown): EventCategory | undefined {
  const allowed: EventCategory[] = ["concert", "ticket-drop", "sports", "mall", "exhibition"];
  return allowed.includes(value as EventCategory) ? (value as EventCategory) : undefined;
}

function mergePrefs(prefs: UserPrefs, args: Record<string, unknown>): UserPrefs {
  const partySize = Number(args.partySize);
  const maxPrice = Number(args.maxPrice);
  return {
    ...prefs,
    partySize: Number.isInteger(partySize) && partySize >= 1 && partySize <= 12 ? partySize : prefs.partySize,
    maxPrice: maxPrice >= 1 && maxPrice <= 4 ? (Math.floor(maxPrice) as 1 | 2 | 3 | 4) : prefs.maxPrice,
    cuisines: typeof args.cuisine === "string" && args.cuisine.trim() ? [args.cuisine.trim()] : prefs.cuisines,
    needLastTrain: typeof args.needLastTrain === "boolean" ? args.needLastTrain : prefs.needLastTrain,
    homeDistrict: typeof args.homeDistrict === "string" && args.homeDistrict.trim() ? args.homeDistrict.trim() : prefs.homeDistrict,
  };
}

function rememberEvent(bag: ToolBag, eventId: string) {
  const event = eventById(eventId);
  if (!event) return;
  bag.eventIds = [event.id, ...bag.eventIds.filter((id) => id !== event.id)];
  bag.events = [event, ...bag.events.filter((item) => item.id !== event.id)];
}

function rememberRestaurants(bag: ToolBag, restaurants: RankedRestaurant[]) {
  bag.restaurants = [...new Map([...restaurants, ...bag.restaurants].map((r) => [r.id, r])).values()];
  bag.restaurantIds = bag.restaurants.map((r) => r.id);
}

async function runTool(name: string, argsJson: string, ctx: ToolContext, bag: ToolBag) {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsJson || "{}") as Record<string, unknown>;
  } catch {
    args = {};
  }

  if (name === "search_events") {
    const extra: SearchFilters = {};
    if (typeof args.date === "string" && args.date.trim()) extra.date = args.date.trim();
    if (args.weekday != null && args.weekday !== "") {
      const weekday = Number(args.weekday);
      if (Number.isInteger(weekday) && weekday >= 0 && weekday <= 6) extra.weekday = weekday;
    }
    if (args.weekend === true) extra.weekend = true;
    if (asCategory(args.category)) extra.category = asCategory(args.category);
    if (typeof args.district === "string" && args.district.trim()) extra.district = args.district.trim();
    const found = interpretQuery(String(args.query ?? ""), ctx.calendar, ctx.prefs, ctx.bookings, ctx.inventory, extra);
    bag.eventIds = found.events.map((e) => e.id);
    bag.events = found.events;
    rememberRestaurants(bag, found.restaurants);
    return {
      intent: found.intent,
      events: found.events.map((e) => publicEventView(e, ctx.calendar)),
      restaurants: found.restaurants.map(publicRestaurantView),
    };
  }

  if (name === "recommend_restaurants") {
    const event = eventById(String(args.eventId ?? ""));
    if (!event) return { error: "找不到活動" };
    rememberEvent(bag, event.id);
    const prefs = mergePrefs(ctx.prefs, args);
    const recs = recommendRestaurants(event, prefs, ctx.bookings, Number(args.limit) || 3, ctx.inventory);
    rememberRestaurants(bag, recs);
    return recs.map(publicRestaurantView);
  }

  if (name === "build_night_plan") {
    const event = eventById(String(args.eventId ?? ""));
    if (!event) return { error: "找不到活動" };
    rememberEvent(bag, event.id);
    const prefs = mergePrefs(ctx.prefs, args);
    const recs = recommendRestaurants(event, prefs, ctx.bookings, 3, ctx.inventory);
    rememberRestaurants(bag, recs);
    const plan = buildNightPlan(event, ctx.calendar, prefs, ctx.coords);
    return publicNightPlanView(plan, recs);
  }

  if (name === "check_commute") {
    const event = args.eventId ? eventById(String(args.eventId)) : undefined;
    const venue = args.venueId ? venueById(String(args.venueId)) : event ? venueById(event.venueId) : undefined;
    const restaurant = args.restaurantId ? restaurantById(String(args.restaurantId)) : undefined;
    const dest = venue
      ? { lat: venue.lat, lng: venue.lng, label: venue.name }
      : restaurant
        ? { ...restaurantCoords(restaurant), label: restaurant.name }
        : undefined;
    if (!dest) return { error: "缺少目的地" };
    if (event) rememberEvent(bag, event.id);
    const district =
      (typeof args.district === "string" && args.district.trim()) || ctx.prefs.homeDistrict;
    const origin = ctx.coords ?? DISTRICT_COORDS[district];
    if (!origin) return { error: "缺少出發位置" };
    const walked = await walkingMinutes(origin, dest);
    const estimated = ctx.coords
      ? commuteMinutesFromCoords(ctx.coords.lat, ctx.coords.lng, venue?.id ?? event?.venueId ?? "home")
      : venue
        ? commuteMinutes(district, venue.id)
        : walked.minutes;
    const minutes = venue ? estimated : walked.minutes;
    const note = venue
      ? commuteNote(district, venue.id, ctx.coords)
      : `去${dest.label}步行約 ${walked.minutes} 分鐘（${walked.source}）`;
    bag.extraLines.push(note);
    return { minutes, walkingMinutes: walked.minutes, source: walked.source, note, destination: dest.label };
  }

  if (name === "check_last_train") {
    const event = eventById(String(args.eventId ?? ""));
    if (!event) return { error: "找不到活動" };
    rememberEvent(bag, event.id);
    const result = lastTrainForEvent(event, typeof args.restaurantId === "string" ? args.restaurantId : undefined);
    const label =
      result.risk === "safe" ? "趕得切尾班車" : result.risk === "tight" ? "尾班車偏緊" : "可能錯過尾班車";
    bag.extraLines.push(
      `${result.lastTrainCaption ?? "尾班車未設定"}；步行 ${result.walkMinutes} 分鐘，${label}`,
    );
    return result;
  }

  if (name === "list_conflicts") {
    const eventId = typeof args.eventId === "string" ? args.eventId : "";
    if (eventId) {
      const event = eventById(eventId);
      if (!event) return { error: "找不到活動" };
      rememberEvent(bag, event.id);
      const clash = conflictNote(event, ctx.calendar, ctx.prefs, ctx.coords);
      if (clash) bag.extraLines.push(clash);
      return { eventId, clash };
    }
    const overlaps = calendarOverlaps(ctx.calendar);
    if (overlaps[0]) bag.extraLines.push(`「${overlaps[0].a}」同「${overlaps[0].b}」時間重疊`);
    return { overlaps };
  }

  if (name === "list_bookings") {
    const status = typeof args.status === "string" ? args.status : undefined;
    const list = ctx.bookings
      .filter((b) => (status ? b.status === status : b.status !== "cancelled"))
      .slice(0, 12)
      .map(publicBookingView);
    return { bookings: list };
  }

  return { error: "未知工具" };
}

function calendarDigest(calendar: CalendarItem[]) {
  return [...calendar]
    .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
    .slice(0, 16)
    .map((c) => `${c.title} ${c.startAt}${c.allDay ? "（全日）" : ""}`)
    .join("；");
}

function bookingDigest(bookings: Booking[]) {
  return bookings
    .filter((b) => b.status !== "cancelled")
    .slice(0, 8)
    .map((b) => {
      const view = publicBookingView(b);
      return `${view.confirmationCode} ${view.restaurant} ${view.slot} ${view.status}`;
    })
    .join("；");
}

function synthesize(
  query: string,
  intent: AgentIntent,
  bag: ToolBag,
  calendar: CalendarItem[],
  bookings: Booking[],
  prefs: UserPrefs,
  coords?: { lat: number; lng: number } | null,
): ChatMessage {
  const event = bag.events[0];
  const plan = event ? buildNightPlan(event, calendar, prefs, coords) : null;
  return replyFromFindings({
    query,
    intent,
    events: bag.events,
    restaurants: bag.restaurants,
    plan,
    extraLines: bag.extraLines,
    bookings,
    calendar,
  });
}

export async function llmAgentReply(
  query: string,
  calendar: CalendarItem[],
  prefs: UserPrefs,
  bookings: Booking[],
  inventory?: Record<string, number>,
  coords?: { lat: number; lng: number } | null,
): Promise<ChatMessage> {
  const safeCalendar = calendar.slice(0, 40);
  const fallback = agentReply(query, safeCalendar, prefs, bookings, inventory, coords);
  if (!llmConfigured()) return fallback;

  const intentFromQuery = detectIntent(query);
  const ctx: ToolContext = { calendar: safeCalendar, prefs, bookings, inventory, coords };
  const bag: ToolBag = { eventIds: fallback.eventIds ?? [], restaurantIds: fallback.restaurantIds ?? [], events: [], restaurants: [], extraLines: [] };
  if (fallback.eventIds?.[0]) {
    const event = eventById(fallback.eventIds[0]);
    if (event) bag.events = [event];
  }

  const messages: { role: string; content?: string; tool_calls?: ToolCall[]; tool_call_id?: string }[] = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `用戶：「${query}」
偏好：${JSON.stringify(prefs)}
定位：${coords ? `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}` : "無 GPS"}
日曆（${safeCalendar.length} 項）：${calendarDigest(safeCalendar) || "空"}
訂座：${bookingDigest(bookings) || "無"}`,
    },
  ];

  try {
    let eventIds = bag.eventIds;
    let restaurantIds = bag.restaurantIds;
    let intent = intentFromQuery === "search" ? fallback.intent : intentFromQuery;
    let text = "";
    let usedTools = false;

    for (let round = 0; round < 4; round++) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.3,
          messages,
          tools: tools(),
        }),
      });
      if (!res.ok) {
        return usedTools ? synthesize(query, intent ?? "search", bag, safeCalendar, bookings, prefs, coords) : fallback;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string; tool_calls?: ToolCall[] } }[];
      };
      const message = data.choices?.[0]?.message;
      if (!message) {
        return usedTools ? synthesize(query, intent ?? "search", bag, safeCalendar, bookings, prefs, coords) : fallback;
      }
      const calls = message.tool_calls ?? [];
      if (!calls.length) {
        text = message.content?.trim() || "";
        break;
      }
      usedTools = true;
      messages.push({ role: "assistant", content: message.content, tool_calls: calls });
      for (const call of calls) {
        const result = await runTool(call.function.name, call.function.arguments, ctx, bag);
        eventIds = bag.eventIds.length ? bag.eventIds : eventIds;
        restaurantIds = bag.restaurantIds.length ? bag.restaurantIds : restaurantIds;
        if (call.function.name === "search_events" && result && typeof result === "object" && "intent" in result) {
          const foundIntent = (result as { intent?: ChatMessage["intent"] }).intent;
          if (intentFromQuery === "search" && foundIntent) intent = foundIntent;
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    if (!text) {
      return synthesize(query, intent ?? "search", bag, safeCalendar, bookings, prefs, coords);
    }
    return {
      id: `m-${Date.now()}`,
      role: "agent",
      intent: intentFromQuery === "search" ? intent : intentFromQuery,
      text,
      eventIds,
      restaurantIds,
    };
  } catch {
    return fallback;
  }
}
