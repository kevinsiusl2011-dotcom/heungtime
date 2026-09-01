import type { CalendarItem } from "./types";

function unescapeIcs(value: string) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function unfold(ics: string) {
  return ics.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function field(block: string, key: string) {
  const re = new RegExp(`^${key}[^:]*:(.*)$`, "im");
  const m = block.match(re);
  return m ? unescapeIcs(m[1]) : "";
}

const WINDOWS_TZ: Record<string, string> = {
  "china standard time": "Asia/Hong_Kong",
  "taipei standard time": "Asia/Taipei",
  "tokyo standard time": "Asia/Tokyo",
  "korea standard time": "Asia/Seoul",
  "singapore standard time": "Asia/Singapore",
  "se asia standard time": "Asia/Bangkok",
  "india standard time": "Asia/Kolkata",
  "gmt standard time": "Europe/London",
  "greenwich standard time": "Etc/GMT",
  "utc": "UTC",
  "romance standard time": "Europe/Paris",
  "w. europe standard time": "Europe/Berlin",
  "central europe standard time": "Europe/Prague",
  "e. europe standard time": "Europe/Bucharest",
  "russian standard time": "Europe/Moscow",
  "eastern standard time": "America/New_York",
  "us eastern standard time": "America/New_York",
  "central standard time": "America/Chicago",
  "mountain standard time": "America/Denver",
  "pacific standard time": "America/Los_Angeles",
  "alaskan standard time": "America/Anchorage",
  "hawaiian standard time": "Pacific/Honolulu",
  "aus eastern standard time": "Australia/Sydney",
  "aus central standard time": "Australia/Adelaide",
  "new zealand standard time": "Pacific/Auckland",
};

function stripTzid(tzid?: string) {
  return (tzid ?? "").trim().replace(/^["']|["']$/g, "");
}

function resolveTzid(tzid?: string) {
  const zone = stripTzid(tzid);
  if (!zone) return "";
  if (/^(UTC|GMT|Z)$/i.test(zone)) return "UTC";
  const mapped = WINDOWS_TZ[zone.toLowerCase()];
  if (mapped) return mapped;
  const iana = zone.match(/([A-Za-z_+-]+\/[A-Za-z_+-]+)$/);
  return iana?.[1] ?? zone;
}

function isDateOnly(params: string, value: string) {
  if (/VALUE=DATE-TIME/i.test(params)) return false;
  if (/VALUE=DATE/i.test(params)) return true;
  return /^\d{4}-?\d{2}-?\d{2}$/.test(value.trim());
}

function ymdParts(value: string) {
  const compact = value.replace(/-/g, "");
  const m = compact.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return { y: m[1], mo: m[2], d: m[3] };
}

function hktMidnight(y: string, mo: string, d: string) {
  return `${y}-${mo}-${d}T00:00:00+08:00`;
}

function addDaysHkt(y: string, mo: string, d: string, days: number) {
  const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d) + days);
  const dt = new Date(utc);
  const yy = String(dt.getUTCFullYear());
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return hktMidnight(yy, mm, dd);
}

function tzOffsetMs(utcMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcMs));
  const g = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asIfUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second"));
  return asIfUtc - utcMs;
}

function zonedWallToIso(y: string, mo: string, d: string, hh: string, mm: string, ss: string, timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone }).format(new Date());
  } catch {
    return null;
  }
  const utcGuess = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss));
  const offset1 = tzOffsetMs(utcGuess, timeZone);
  const instant = utcGuess - offset1;
  const offset2 = tzOffsetMs(instant, timeZone);
  return new Date(offset1 === offset2 ? instant : utcGuess - offset2).toISOString();
}

export function parseIcsDate(value: string, tzid?: string): string | null {
  if (!value) return null;
  const compact = value.replace(/[-:]/g, "");
  const m = compact.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?/);
  if (!m) return null;
  const [, y, mo, d, hh = "00", mm = "00", ss = "00", z] = m;
  const zone = resolveTzid(tzid);
  if (z || zone === "UTC") {
    return new Date(`${y}-${mo}-${d}T${hh}:${mm}:${ss}Z`).toISOString();
  }
  if (!zone || /^(Asia\/Hong_Kong|HKT|Hongkong)$/i.test(zone)) {
    return new Date(`${y}-${mo}-${d}T${hh}:${mm}:${ss}+08:00`).toISOString();
  }
  return zonedWallToIso(y, mo, d, hh, mm, ss, zone);
}

export function parseIcsDuration(value: string): number | null {
  if (!value) return null;
  const m = value.trim().match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (!m) return null;
  const weeks = Number(m[1] || 0);
  const days = Number(m[2] || 0);
  const hours = Number(m[3] || 0);
  const minutes = Number(m[4] || 0);
  const seconds = Number(m[5] || 0);
  const ms = ((((weeks * 7 + days) * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
  return ms > 0 ? ms : null;
}

function fieldWithParams(block: string, key: string) {
  const re = new RegExp(`^${key}([^:]*):(.*)$`, "im");
  const m = block.match(re);
  if (!m) return { params: "", value: "" };
  return { params: m[1], value: unescapeIcs(m[2]) };
}

export function parseIcs(text: string): CalendarItem[] {
  const body = unfold(text);
  const chunks = body.split(/BEGIN:VEVENT/i).slice(1);
  const items: CalendarItem[] = [];
  chunks.forEach((chunk, i) => {
    const block = chunk.split(/END:VEVENT/i)[0] ?? "";
    const startField = fieldWithParams(block, "DTSTART");
    const endField = fieldWithParams(block, "DTEND");
    const startTzid = startField.params.match(/TZID=([^;]+)/i)?.[1];
    const endTzid = endField.params.match(/TZID=([^;]+)/i)?.[1] ?? startTzid;
    const allDay = isDateOnly(startField.params, startField.value);
    let startAt: string | null;
    let endAt: string | null;
    if (allDay) {
      const startYmd = ymdParts(startField.value);
      if (!startYmd) return;
      startAt = hktMidnight(startYmd.y, startYmd.mo, startYmd.d);
      const endYmd = endField.value ? ymdParts(endField.value) : null;
      const exclusiveEnd = endYmd
        ? hktMidnight(endYmd.y, endYmd.mo, endYmd.d)
        : addDaysHkt(startYmd.y, startYmd.mo, startYmd.d, 1);
      endAt =
        new Date(exclusiveEnd).getTime() <= new Date(startAt).getTime()
          ? addDaysHkt(startYmd.y, startYmd.mo, startYmd.d, 1)
          : exclusiveEnd;
    } else {
      startAt = parseIcsDate(startField.value, startTzid);
      const durationMs = parseIcsDuration(field(block, "DURATION"));
      endAt =
        parseIcsDate(endField.value, endTzid) ??
        (startAt
          ? new Date(new Date(startAt).getTime() + (durationMs ?? 60 * 60_000)).toISOString()
          : null);
    }
    if (!startAt || !endAt) return;
    items.push({
      id: `ics-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      title: field(block, "SUMMARY") || "行程",
      startAt,
      endAt,
      location: field(block, "LOCATION"),
      description: field(block, "DESCRIPTION"),
      source: "user",
      allDay,
    });
  });
  return items;
}
