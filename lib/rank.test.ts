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
});
