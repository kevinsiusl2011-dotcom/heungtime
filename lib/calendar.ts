import { FEED_LAST_SYNCED, FEED_REFRESH_HOURS, FEED_REVISION, venueById } from "./data";
import type { CalendarItem, LocalEvent } from "./types";

export function formatHk(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    ...opts,
  }).format(new Date(iso));
}

export function formatDate(iso: string) {
  return formatHk(iso, { month: "numeric", day: "numeric", weekday: "short" });
}

export function formatTime(iso: string) {
  return formatHk(iso, { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

export function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function sameDay(a: string, b: string) {
  const da = formatHk(a, { year: "numeric", month: "2-digit", day: "2-digit" });
  const db = formatHk(b, { year: "numeric", month: "2-digit", day: "2-digit" });
  return da === db;
}

export function weekStart(anchor = "2026-09-07T00:00:00+08:00") {
  const d = new Date(anchor);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function weekDays(start: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function toGoogleDates(startIso: string, endIso: string) {
  const fmt = (iso: string) =>
    new Date(iso)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  return `${fmt(startIso)}/${fmt(endIso)}`;
}

export function googleCalendarUrl(item: {
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  description: string;
}) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: item.title,
    dates: toGoogleDates(item.startAt, item.endAt),
    details: item.description,
    location: item.location,
    ctz: "Asia/Hong_Kong",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function toIcsDate(iso: string) {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function foldIcs(line: string) {
  if (line.length <= 74) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 74));
  let rest = line.slice(74);
  while (rest.length) {
    chunks.push(` ${rest.slice(0, 73)}`);
    rest = rest.slice(73);
  }
  return chunks.join("\r\n");
}

export function buildIcs(events: LocalEvent[], descriptions?: Record<string, string>) {
  const stamp = toIcsDate(FEED_LAST_SYNCED);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HeungTime//HK Lifestyle Agent//ZH-HK",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `REFRESH-INTERVAL;VALUE=DURATION:PT${FEED_REFRESH_HOURS}H`,
    `X-PUBLISHED-TTL:PT${FEED_REFRESH_HOURS}H`,
    "X-WR-CALNAME:享時 HeungTime",
    "X-WR-TIMEZONE:Asia/Hong_Kong",
    "X-WR-CALDESC:香港活動／享樂智能日曆。賽程改期自動刷新；活動描述含散場有位餐廳。C 端免費。",
  ];

  for (const event of events) {
    const venue = venueById(event.venueId);
    const desc = descriptions?.[event.id] ?? event.description;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@heungtime.hk`,
      `DTSTAMP:${stamp}`,
      `LAST-MODIFIED:${stamp}`,
      `SEQUENCE:${FEED_REVISION}`,
      `DTSTART:${toIcsDate(event.startAt)}`,
      `DTEND:${toIcsDate(event.endAt)}`,
      foldIcs(`SUMMARY:${escapeIcs(event.title)}`),
      foldIcs(`LOCATION:${escapeIcs(venue ? `${venue.name}・${venue.address}` : "")}`),
      foldIcs(`DESCRIPTION:${escapeIcs(desc)}`),
      `CATEGORIES:${event.category.toUpperCase()}`,
    );
    if (event.category === "ticket-drop") {
      lines.push(
        "BEGIN:VALARM",
        "TRIGGER:-PT15M",
        "ACTION:DISPLAY",
        foldIcs(`DESCRIPTION:${escapeIcs(`搶飛專注檔：${event.title}。享時唔代出票。`)}`),
        "END:VALARM",
      );
    } else if (event.category === "concert" || event.category === "sports") {
      lines.push(
        "BEGIN:VALARM",
        "TRIGGER:-PT2H",
        "ACTION:DISPLAY",
        foldIcs(`DESCRIPTION:${escapeIcs(`出發去${venue?.name ?? "場館"}。散場後睇日曆描述訂座。`)}`),
        "END:VALARM",
      );
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function icsSubscribeUrl(origin: string, feed: string) {
  return `${origin.replace(/\/$/, "")}/api/ics/${feed}`;
}

export function appleWebcalUrl(httpUrl: string) {
  return httpUrl.replace(/^https?:\/\//, "webcal://");
}

export function itemFromEvent(
  event: LocalEvent,
  description: string,
  restaurantIds: string[],
): CalendarItem {
  const venue = venueById(event.venueId);
  return {
    id: `cal-${event.id}`,
    eventId: event.id,
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    location: venue ? `${venue.name}・${venue.district}` : "",
    description,
    source: "feed",
    restaurantIds,
  };
}

export function seedCalendar(): CalendarItem[] {
  return [
    {
      id: "work-standup",
      title: "產品 Standup",
      startAt: "2026-09-01T09:30:00+08:00",
      endAt: "2026-09-01T10:00:00+08:00",
      location: "Zoom",
      description: "週會",
      source: "user",
    },
    {
      id: "work-client",
      title: "客戶簡報",
      startAt: "2026-09-04T15:00:00+08:00",
      endAt: "2026-09-04T16:30:00+08:00",
      location: "中環",
      description: "會後可接 ifc Happy Hour",
      source: "user",
    },
    {
      id: "work-dinner",
      title: "團隊晚餐（暫定）",
      startAt: "2026-09-11T19:30:00+08:00",
      endAt: "2026-09-11T21:30:00+08:00",
      location: "尖沙咀",
      description: "與海港城會員夜可能重疊。",
      source: "user",
    },
    {
      id: "work-eason-eve",
      title: "中環客戶飯局（或會超時）",
      startAt: "2026-09-12T18:00:00+08:00",
      endAt: "2026-09-12T19:00:00+08:00",
      location: "中環",
      description:
        "紅館 20:00 開場，中環→紅磡約 25 分鐘。Agent 會計通勤，唔似 Timable 只 dump 活動。",
      source: "user",
    },
  ];
}
