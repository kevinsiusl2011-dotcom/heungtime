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
});
