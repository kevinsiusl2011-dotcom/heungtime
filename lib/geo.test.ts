import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lastTrainForStation, lastTrainForVenue, lastTrainRisk, parseClock } from "./geo";

describe("港鐵尾班車表", () => {
  it("紅磡站對到 00:32", () => {
    assert.equal(lastTrainForStation("紅磡站"), "00:32");
    assert.equal(lastTrainForVenue({ mtr: "紅磡站", lastTrain: "23:00" }), "00:32");
  });

  it("未知站回退場地時間", () => {
    assert.equal(lastTrainForVenue({ mtr: "未知站", lastTrain: "23:10" }), "23:10");
  });

  it("跨日尾班車仍趕得切", () => {
    assert.equal(parseClock("00:32"), 32);
    assert.equal(lastTrainRisk("2026-09-12T22:30:00+08:00", 5, "00:32"), "safe");
  });

  it("複合站名會取第一個站，而唔係「旺角站」對唔到表", () => {
    assert.equal(lastTrainForStation("旺角站／旺角東站"), "00:46");
    assert.equal(lastTrainForVenue({ mtr: "尖沙咀站／柯士甸站", lastTrain: "00:42" }), "00:52");
    assert.equal(lastTrainForVenue({ mtr: "香港站／中環站", lastTrain: "00:50" }), "01:00");
  });

  it("黃埔／尖東／香港站對到表，而唔係默認 00:30", () => {
    assert.equal(lastTrainForStation("黃埔站"), "00:48");
    assert.equal(lastTrainForStation("尖東站"), "00:40");
    assert.equal(lastTrainForStation("香港站"), "01:00");
    assert.equal(lastTrainForStation("火星站"), undefined);
  });

  it("未知站空尾班車唔好當 00:30", () => {
    assert.equal(lastTrainForVenue({ mtr: "火星站", lastTrain: "" }), undefined);
    assert.equal(parseClock(""), null);
    assert.equal(lastTrainRisk("2026-09-12T22:30:00+08:00", 5, ""), "miss");
    assert.equal(lastTrainRisk("2026-09-12T22:30:00+08:00", 5, undefined), "miss");
  });
});
