import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  agentReply,
  detectIntent,
  interpretQuery,
  lastTrainForEvent,
  parseSearchHints,
  publicBookingView,
  publicRestaurantView,
} from "./agent";
import { DEFAULT_PREFS } from "./labels";
import { hkWeekday } from "./calendar";

describe("detectIntent", () => {
  it("趕尾班車係搜尋，唔係改偏好", () => {
    assert.equal(detectIntent("星期六想睇波，趕尾班車"), "search");
  });

  it("加入日曆先係 pin", () => {
    assert.equal(detectIntent("幫我加入日曆"), "pin");
  });

  it("訂咗未唔好當落訂", () => {
    assert.equal(detectIntent("我訂咗未"), "search");
    assert.equal(detectIntent("幫我訂座"), "book");
  });
});

describe("parseSearchHints", () => {
  it("解析星期六同演唱會", () => {
    const hints = parseSearchHints("星期六陳奕迅演唱會之後食飯");
    assert.equal(hints.weekday, 6);
    assert.equal(hints.category, "concert");
    assert.equal(hints.needLastTrain, undefined);
  });

  it("解析地區同尾班車", () => {
    const hints = parseSearchHints("紅磡散場趕尾班車");
    assert.equal(hints.district, "紅磡");
    assert.equal(hints.needLastTrain, true);
  });
});

describe("interpretQuery 過濾", () => {
  it("陳奕迅食飯搵到紅館場", () => {
    const found = interpretQuery("陳奕迅演唱會之後食飯", [], DEFAULT_PREFS, []);
    assert.ok(found.events.some((e) => e.id === "eason-fear"));
    assert.equal(found.events.some((e) => e.id === "jacky-60"), false);
    assert.ok(found.restaurants.length > 0);
    assert.equal(found.intent, "search");
  });

  it("星期六過濾只留週六活動", () => {
    const found = interpretQuery("星期六演唱會", [], DEFAULT_PREFS, []);
    assert.ok(found.events.length);
    assert.ok(found.events.every((e) => hkWeekday(e.startAt) === 6));
    assert.ok(found.events.some((e) => e.id === "eason-fear"));
    assert.equal(found.events.some((e) => e.id === "kitchee-eastern"), false);
  });

  it("地區紅磡收窄到紅館一帶", () => {
    const found = interpretQuery("活動", [], DEFAULT_PREFS, [], undefined, { district: "紅磡" });
    assert.ok(found.events.length);
    assert.ok(found.events.every((e) => e.venueId === "coliseum" || e.tags.includes("紅館") || e.tags.includes("紅磡")));
  });

  it("類別 sports 唔好變 prefs", () => {
    const found = interpretQuery("想睇波", [], DEFAULT_PREFS, []);
    assert.equal(found.intent, "search");
    assert.ok(found.events.some((e) => e.category === "sports"));
  });
});

describe("工具公開欄位", () => {
  it("餐廳 view 有 reasons 而無 CPA／電話", () => {
    const found = interpretQuery("陳奕迅演唱會之後食飯", [], DEFAULT_PREFS, []);
    const view = publicRestaurantView(found.restaurants[0]);
    assert.ok(view.reasons.length);
    assert.ok(view.seatsRemaining >= 0);
    assert.equal("advertiserCpa" in view, false);
    assert.equal("whatsapp" in view, false);
  });

  it("訂座 view 無電話", () => {
    const booking: Booking = {
      id: "b1",
      restaurantId: "tai-hing-hung-hom",
      partySize: 2,
      slot: "22:45",
      date: "2026-09-12T20:00:00+08:00",
      status: "confirmed",
      via: "autochat",
      guestName: "Ada",
      guestPhone: "91234567",
      confirmationCode: "HT-ABC234",
      createdAt: "2026-09-12T12:00:00+08:00",
    };
    const view = publicBookingView(booking);
    assert.equal(view.confirmationCode, "HT-ABC234");
    assert.equal("guestPhone" in view, false);
    assert.equal("guestName" in view, false);
  });
});

describe("尾班車工具", () => {
  it("紅館散場行去太興趕得切", () => {
    const event = interpretQuery("陳奕迅", [], DEFAULT_PREFS, []).events.find((e) => e.id === "eason-fear");
    assert.ok(event);
    const result = lastTrainForEvent(event, "tai-hing-hung-hom");
    assert.equal(result.risk, "safe");
    assert.ok(result.lastTrain);
  });
});

describe("agentReply", () => {
  it("推薦句包含尚餘席同理由", () => {
    const msg = agentReply("陳奕迅演唱會之後食飯", [], DEFAULT_PREFS, []);
    assert.match(msg.text, /尚餘 \d+ 席/);
    assert.ok(msg.eventIds?.includes("eason-fear"));
  });

  it("訂咗未會列出訂座", () => {
    const booking: Booking = {
      id: "b1",
      restaurantId: "tai-hing-hung-hom",
      partySize: 2,
      slot: "22:45",
      date: "2026-09-12T20:00:00+08:00",
      status: "confirmed",
      via: "autochat",
      guestName: "Ada",
      guestPhone: "91234567",
      confirmationCode: "HT-ABC234",
      createdAt: "2026-09-12T12:00:00+08:00",
    };
    const msg = agentReply("我訂咗未", [], DEFAULT_PREFS, [booking]);
    assert.match(msg.text, /HT-ABC234/);
    assert.equal(msg.intent, "search");
  });
});
