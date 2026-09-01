import { hkSlotDateTime, toIcsDate, toIcsHk } from "./calendar";
import type { Booking } from "./types";
import { restaurantById } from "./data";

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function bookingToIcs(booking: Booking) {
  const restaurant = restaurantById(booking.restaurantId);
  const startIso = hkSlotDateTime(booking.date, booking.slot);
  const endIso = new Date(new Date(startIso).getTime() + 90 * 60_000).toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ease//Booking//ZH-HK",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Hong_Kong",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0800",
    "TZOFFSETTO:+0800",
    "TZNAME:HKT",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${booking.confirmationCode}@heungtime.hk`,
    `DTSTAMP:${toIcsDate(booking.createdAt)}`,
    `DTSTART;TZID=Asia/Hong_Kong:${toIcsHk(startIso)}`,
    `DTEND;TZID=Asia/Hong_Kong:${toIcsHk(endIso)}`,
    `SUMMARY:${escapeIcs(`訂座：${restaurant?.name ?? "餐廳"}`)}`,
    `LOCATION:${escapeIcs(restaurant ? `${restaurant.name}・${restaurant.address}` : "")}`,
    `DESCRIPTION:${escapeIcs(`${booking.confirmationCode}｜${booking.partySize} 位｜${booking.guestName}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadText(filename: string, text: string, type = "text/calendar") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
