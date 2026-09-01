import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hkHour,
  hkSlotDateTime,
  hkWeekday,
  hkYmd,
  shiftIsoDays,
  toIcsHk,
  weekStart,
} from "./calendar";
import { confirmationCode } from "./whatsapp";
import { parseIcs, parseIcsDate } from "./icsParse";

describe("香港時區日曆", () => {
  it("weekStart 以香港星期一為準，不受執行環境時區影響", () => {
    const start = weekStart("2026-09-09T15:00:00+08:00");
    assert.equal(hkYmd(start), "2026-09-07");
    assert.equal(hkWeekday(start), 1);
  });

  it("星期日回退到上一週星期一", () => {
    const start = weekStart("2026-09-13T10:00:00+08:00");
    assert.equal(hkYmd(start), "2026-09-07");
  });

  it("週六晚活動的 weekday 在 UTC 伺服器仍是 6", () => {
    assert.equal(hkWeekday("2026-09-12T20:00:00+08:00"), 6);
    assert.equal(hkHour("2026-09-12T20:00:00+08:00"), 20);
  });

  it("訂座時段用香港年月日 + slot，而不是瀏覽器 setHours", () => {
    assert.equal(hkSlotDateTime("2026-09-12T20:00:00+08:00", "22:45"), "2026-09-12T22:45:00+08:00");
  });

  it("shiftIsoDays 以 24 小時平移，不經本地 setDate", () => {
    const next = shiftIsoDays("2026-09-07T00:00:00+08:00", 7);
    assert.equal(hkYmd(next), "2026-09-14");
  });

  it("ICS 本地時間寫成香港牆鐘", () => {
    assert.equal(toIcsHk("2026-09-12T20:00:00+08:00"), "20260912T200000");
  });
});

describe("確認編號", () => {
  it("夠長且唔重複", () => {
    const codes = new Set(Array.from({ length: 40 }, () => confirmationCode()));
    assert.equal(codes.size, 40);
    for (const code of codes) {
      assert.match(code, /^HT-[A-Z2-9]{6}$/);
    }
  });
});

describe("ICS TZID", () => {
  it("UTC TZID 唔當香港時間", () => {
    const iso = parseIcsDate("20260912T120000", "UTC");
    assert.ok(iso);
    assert.equal(new Date(iso).toISOString(), "2026-09-12T12:00:00.000Z");
  });

  it("解析 DTSTART;TZID=UTC", () => {
    const items = parseIcs(
      [
        "BEGIN:VEVENT",
        "DTSTART;TZID=UTC:20260912T120000",
        "DTEND;TZID=UTC:20260912T130000",
        "SUMMARY:UTC meeting",
        "END:VEVENT",
      ].join("\r\n"),
    );
    assert.equal(items.length, 1);
    assert.equal(new Date(items[0].startAt).toISOString(), "2026-09-12T12:00:00.000Z");
  });

  it("帶引號嘅 TZID=\"UTC\" 都當 UTC", () => {
    const iso = parseIcsDate("20260912T120000", '"UTC"');
    assert.ok(iso);
    assert.equal(new Date(iso).toISOString(), "2026-09-12T12:00:00.000Z");
  });

  it("America/New_York 唔當香港時間", () => {
    const iso = parseIcsDate("20260912T120000", "America/New_York");
    assert.ok(iso);
    assert.equal(new Date(iso).toISOString(), "2026-09-12T16:00:00.000Z");
  });

  it("未知 TZID 唔好默認香港", () => {
    assert.equal(parseIcsDate("20260912T120000", "Not/AZone"), null);
  });

  it("Outlook China Standard Time 當香港", () => {
    const iso = parseIcsDate("20260912T220000", "China Standard Time");
    assert.ok(iso);
    assert.equal(new Date(iso).toISOString(), "2026-09-12T14:00:00.000Z");
    const items = parseIcs(
      [
        "BEGIN:VEVENT",
        "DTSTART;TZID=China Standard Time:20260912T220000",
        "DTEND;TZID=China Standard Time:20260912T230000",
        "SUMMARY:Outlook 飯局",
        "END:VEVENT",
      ].join("\r\n"),
    );
    assert.equal(items.length, 1);
    assert.equal(items[0].title, "Outlook 飯局");
  });

  it("VALUE=DATE 全日事件唔好當 00:00 定時", () => {
    const items = parseIcs(
      [
        "BEGIN:VEVENT",
        "DTSTART;VALUE=DATE:20260912",
        "DTEND;VALUE=DATE:20260913",
        "SUMMARY:公眾假期",
        "END:VEVENT",
      ].join("\r\n"),
    );
    assert.equal(items.length, 1);
    assert.equal(items[0].allDay, true);
    assert.equal(items[0].startAt, "2026-09-12T00:00:00+08:00");
    assert.equal(items[0].endAt, "2026-09-13T00:00:00+08:00");
  });
});
