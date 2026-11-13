import assert from "node:assert/strict";
import test from "node:test";
import {
    beginApiRequest,
    getActiveApiRequestCount,
    subscribeToApiActivity,
} from "./apiActivity.js";

test("tracks concurrent API requests until each request completes", () => {
    const snapshots = [];
    const unsubscribe = subscribeToApiActivity(() => snapshots.push(getActiveApiRequestCount()));
    const finishFirst = beginApiRequest();
    const finishSecond = beginApiRequest();

    assert.equal(getActiveApiRequestCount(), 2);
    finishFirst();
    assert.equal(getActiveApiRequestCount(), 1);
    finishSecond();
    assert.equal(getActiveApiRequestCount(), 0);
    unsubscribe();
    assert.deepEqual(snapshots, [1, 2, 1, 0]);
});

test("completing an API request more than once does not underflow the counter", () => {
    const finish = beginApiRequest();
    finish();
    finish();

    assert.equal(getActiveApiRequestCount(), 0);
});
