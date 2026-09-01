import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eventById } from "./data";
import { lastTrainRisk, parseClock } from "./geo";
import { parseIcs } from "./icsParse";
import { DEFAULT_PREFS } from "./labels";
import { recommendRestaurants } from "./rank";

describe("紅館散場排序", () => {
  it("太興（有機、步行 5 分）排第一，翠園（合作）第二", () => {
    const event = eventById("eason-fear");
    assert.ok(event);
    const recs = recommendRestaurants(event, DEFAULT_PREFS, [], 8);
    assert.equal(recs[0]?.id, "tai-hing-hung-hom");
    assert.equal(recs[1]?.id, "tsui-garden");
    assert.ok((recs[0]?.score ?? 0) > (recs[1]?.score ?? 0));
  });

  it("合作餐廳只加 1 分，不能買斷頭位", () => {
    const event = eventById("eason-fear")!;
    const recs = recommendRestaurants(event, DEFAULT_PREFS, [], 8);
    const organic = recs.find((r) => r.id === "tai-hing-hung-hom");
    const sponsored = recs.find((r) => r.id === "tsui-garden");
    assert.ok(organic && sponsored);
    assert.equal(organic.sponsored, false);
    assert.equal(sponsored.sponsored, true);
    assert.ok(organic.score > sponsored.score);
  });
});

describe("尾班車跨日", () => {
  it("00:32 當成翌日凌晨，紅館 22:30 散場步行 5 分趕得切", () => {
    assert.equal(parseClock("00:32"), 32);
    assert.equal(lastTrainRisk("2026-09-12T22:30:00+08:00", 5, "00:32"), "safe");
  });

  it("尾班車 23:10 時 22:30 散場 + 長步行會 miss", () => {
    assert.equal(lastTrainRisk("2026-09-12T22:30:00+08:00", 20, "23:10"), "miss");
  });

  it("凌晨散場唔好把尾班車錯加 24 小時當成永遠趕得切", () => {
    assert.equal(lastTrainRisk("2026-09-13T00:15:00+08:00", 5, "00:32"), "miss");
  });

  it("凌晨散場碰上當晚尾班車（未過午夜）已經趕唔到", () => {
    assert.equal(lastTrainRisk("2026-09-13T00:15:00+08:00", 5, "23:10"), "miss");
  });
});

describe("ICS 匯入", () => {
  it("解析 DTSTART／SUMMARY", () => {
    const items = parseIcs(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "DTSTART:20260912T120000",
        "DTEND:20260912T130000",
        "SUMMARY:工作會議",
        "LOCATION:中環",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n"),
    );
    assert.equal(items.length, 1);
    assert.equal(items[0].title, "工作會議");
    assert.equal(items[0].location, "中環");
    assert.ok(items[0].startAt.includes("2026-09-12"));
  });

  it("unfold 續行 DESCRIPTION", () => {
    const items = parseIcs(
      "BEGIN:VEVENT\r\nDTSTART:20260901T100000Z\r\nDTEND:20260901T103000Z\r\nSUMMARY:搶飛\r\nDESCRIPTION:第一行\r\n 第二行\r\nEND:VEVENT\r\n",
    );
    assert.equal(items[0]?.description.includes("第一行"), true);
    assert.equal(items[0]?.description.includes("第二行"), true);
  });

  it("無 DTEND 時用 DURATION", () => {
    const items = parseIcs(
      [
        "BEGIN:VEVENT",
        "DTSTART:20260912T220000",
        "DURATION:PT1H30M",
        "SUMMARY:散場飯",
        "END:VEVENT",
      ].join("\r\n"),
    );
    assert.equal(items.length, 1);
    assert.equal(new Date(items[0].endAt).getTime() - new Date(items[0].startAt).getTime(), 90 * 60_000);
  });

  it("DURATION 支援週（P1W）", () => {
    const items = parseIcs(
      [
        "BEGIN:VEVENT",
        "DTSTART:20260912T100000Z",
        "DURATION:P1W",
        "SUMMARY:一週",
        "END:VEVENT",
      ].join("\r\n"),
    );
    assert.equal(items.length, 1);
    assert.equal(new Date(items[0].endAt).getTime() - new Date(items[0].startAt).getTime(), 7 * 24 * 60 * 60_000);
  });
});

describe("即時庫存", () => {
  it("有 inventory 時售罄唔好再推薦", () => {
    const event = eventById("eason-fear")!;
    const soldOut = recommendRestaurants(event, DEFAULT_PREFS, [], 8, { "tai-hing-hung-hom": 0 });
    assert.equal(soldOut.find((r) => r.id === "tai-hing-hung-hom"), undefined);
  });

  it("inventory 高過目錄容量時顯示真正剩餘", () => {
    const event = eventById("eason-fear")!;
    const recs = recommendRestaurants(event, DEFAULT_PREFS, [], 8, { "tai-hing-hung-hom": 99 });
    assert.equal(recs.find((r) => r.id === "tai-hing-hung-hom")?.seatsRemaining, 99);
  });
});
