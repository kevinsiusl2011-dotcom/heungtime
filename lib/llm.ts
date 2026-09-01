import { agentReply, interpretQuery } from "@/lib/agent";
import { buildNightPlan, recommendRestaurants } from "@/lib/rank";
import { eventById, venueById } from "@/lib/data";
import type { Booking, CalendarItem, ChatMessage, UserPrefs } from "@/lib/types";

const SYSTEM = `你是「享時 Ease」香港生活日曆助理。用香港粵語／書面語夾雜、短句、可執行。
只根據工具回傳的活動與餐廳作答，不要發明場地或席位。
目標：把演唱會／搶飛／球賽／商場／展覽接到日曆，散場後按步行、空位、尾班車推薦餐廳，再經 WhatsApp 訂座。
C 端免費。不要談內部 CPA 金額。`;

type ToolCall = { id?: string; function: { name: string; arguments: string } };

export function llmConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function tools() {
  return [
    {
      type: "function",
      function: {
        name: "search_events",
        description: "用自然語言搜香港活動與可訂餐廳",
        parameters: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "recommend_restaurants",
        description: "為指定活動排序附近餐廳",
        parameters: {
          type: "object",
          properties: { eventId: { type: "string" }, limit: { type: "number" } },
          required: ["eventId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "build_night_plan",
        description: "計算通勤、入座窗、尾班車與行程衝突",
        parameters: {
          type: "object",
          properties: { eventId: { type: "string" } },
          required: ["eventId"],
        },
      },
    },
  ];
}

function runTool(
  name: string,
  argsJson: string,
  calendar: CalendarItem[],
  prefs: UserPrefs,
  bookings: Booking[],
  inventory?: Record<string, number>,
) {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsJson || "{}") as Record<string, unknown>;
  } catch {
    args = {};
  }
  if (name === "search_events") {
    const query = String(args.query ?? "");
    const found = interpretQuery(query, calendar, prefs, bookings, inventory);
    return {
      intent: found.intent,
      events: found.events.map((e) => ({
        id: e.id,
        title: e.title,
        startAt: e.startAt,
        venue: venueById(e.venueId)?.name,
      })),
      restaurants: found.restaurants.map((r) => ({
        id: r.id,
        name: r.name,
        walkMinutes: r.walkMinutes,
        lastTrainRisk: r.lastTrainRisk,
        cuisine: r.cuisine,
      })),
    };
  }
  if (name === "recommend_restaurants") {
    const event = eventById(String(args.eventId ?? ""));
    if (!event) return { error: "找不到活動" };
    return recommendRestaurants(event, prefs, bookings, Number(args.limit) || 3, inventory).map((r) => ({
      id: r.id,
      name: r.name,
      walkMinutes: r.walkMinutes,
      lastTrainRisk: r.lastTrainRisk,
      seatsRemaining: r.seatsRemaining,
      cuisine: r.cuisine,
    }));
  }
  if (name === "build_night_plan") {
    const event = eventById(String(args.eventId ?? ""));
    if (!event) return { error: "找不到活動" };
    return buildNightPlan(event, calendar, prefs);
  }
  return { error: "未知工具" };
}

export async function llmAgentReply(
  query: string,
  calendar: CalendarItem[],
  prefs: UserPrefs,
  bookings: Booking[],
  inventory?: Record<string, number>,
): Promise<ChatMessage> {
  const fallback = agentReply(query, calendar, prefs, bookings, inventory);
  if (!llmConfigured()) return fallback;

  const messages: { role: string; content?: string; tool_calls?: ToolCall[]; tool_call_id?: string }[] = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `用戶：「${query}」\n偏好：${JSON.stringify(prefs)}\n日曆摘要：${calendar
        .slice(0, 8)
        .map((c) => `${c.title} ${c.startAt}`)
        .join("；")}`,
    },
  ];

  try {
    let eventIds = fallback.eventIds ?? [];
    let restaurantIds = fallback.restaurantIds ?? [];
    let intent = fallback.intent;
    let text = "";

    for (let round = 0; round < 3; round++) {
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
      if (!res.ok) return fallback;
      const data = (await res.json()) as {
        choices?: { message?: { content?: string; tool_calls?: ToolCall[] } }[];
      };
      const message = data.choices?.[0]?.message;
      if (!message) return fallback;
      const calls = message.tool_calls ?? [];
      if (!calls.length) {
        text = message.content?.trim() || fallback.text;
        break;
      }
      messages.push({ role: "assistant", content: message.content, tool_calls: calls });
      for (const call of calls) {
        const result = runTool(call.function.name, call.function.arguments, calendar, prefs, bookings, inventory);
        if (call.function.name === "search_events" && result && typeof result === "object" && "events" in result) {
          const found = result as {
            intent?: ChatMessage["intent"];
            events: { id: string }[];
            restaurants: { id: string }[];
          };
          eventIds = found.events.map((e) => e.id);
          restaurantIds = found.restaurants.map((r) => r.id);
          if (found.intent) intent = found.intent;
        }
        if (call.function.name === "recommend_restaurants" && Array.isArray(result)) {
          restaurantIds = (result as { id: string }[]).map((r) => r.id);
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    if (!text) return fallback;
    return {
      id: `m-${Date.now()}`,
      role: "agent",
      intent,
      text,
      eventIds,
      restaurantIds,
    };
  } catch {
    return fallback;
  }
}
