import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rateLimit } from "./rateLimit";

describe("rateLimit", () => {
  it("超過上限會拒絕", () => {
    const key = `test-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      assert.equal(rateLimit(key, { limit: 3, windowMs: 60_000 }).ok, true);
    }
    const blocked = rateLimit(key, { limit: 3, windowMs: 60_000 });
    assert.equal(blocked.ok, false);
    assert.ok(blocked.retryAfter >= 1);
  });
});
