import { toIcsDate } from "./calendar";
import type { Booking } from "./types";
import { restaurantById } from "./data";

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function bookingToIcs(booking: Booking) {
  const restaurant = restaurantById(booking.restaurantId);
  const date = new Date(booking.date);
  const [hh, mm] = booking.slot.split(":");
  const start = new Date(date);
  start.setHours(Number(hh), Number(mm), 0, 0);
  const end = new Date(start.getTime() + 90 * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HeungTime//Booking//ZH-HK",
    "BEGIN:VEVENT",
    `UID:${booking.confirmationCode}@heungtime.hk`,
    `DTSTAMP:${toIcsDate(booking.createdAt)}`,
    `DTSTART:${toIcsDate(start.toISOString())}`,
    `DTEND:${toIcsDate(end.toISOString())}`,
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
