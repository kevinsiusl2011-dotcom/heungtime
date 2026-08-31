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

export function parseIcsDate(value: string): string | null {
  if (!value) return null;
  const compact = value.replace(/[-:]/g, "");
  const m = compact.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?/);
  if (!m) return null;
  const [, y, mo, d, hh = "00", mm = "00", ss = "00", z] = m;
  if (z) return new Date(`${y}-${mo}-${d}T${hh}:${mm}:${ss}Z`).toISOString();
  return new Date(`${y}-${mo}-${d}T${hh}:${mm}:${ss}+08:00`).toISOString();
}

export function parseIcs(text: string): CalendarItem[] {
  const body = unfold(text);
  const chunks = body.split(/BEGIN:VEVENT/i).slice(1);
  const items: CalendarItem[] = [];
  chunks.forEach((chunk, i) => {
    const block = chunk.split(/END:VEVENT/i)[0] ?? "";
    const startAt = parseIcsDate(field(block, "DTSTART"));
    const endAt = parseIcsDate(field(block, "DTEND")) ?? startAt;
    if (!startAt || !endAt) return;
    items.push({
      id: `ics-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      title: field(block, "SUMMARY") || "行程",
      startAt,
      endAt,
      location: field(block, "LOCATION"),
      description: field(block, "DESCRIPTION"),
      source: "user",
    });
  });
  return items;
}
