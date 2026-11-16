import test from "node:test";
import assert from "node:assert/strict";
import { getRiderChatRefreshState } from "./riderChatRefresh.js";

test("successful chat refresh replaces the conversation and clears stale errors", () => {
    const conversation = { id: 8, messages: [{ id: 2, message: "Updated" }] };
    const result = getRiderChatRefreshState(null, {
        response: { data: { data: conversation } },
    });

    assert.deepEqual(result, { conversation, error: "" });
});

test("failed background refresh preserves the visible conversation and exposes an error", () => {
    const conversation = { id: 8, messages: [{ id: 1, message: "Still visible" }] };
    const result = getRiderChatRefreshState(conversation, {
        requestError: { response: { data: { message: "Refresh unavailable." } } },
    });

    assert.deepEqual(result, { conversation, error: "Refresh unavailable." });
});

test("chat refresh failure uses the existing fallback notification", () => {
    const result = getRiderChatRefreshState({ id: 8 }, { requestError: new Error("offline") });

    assert.equal(result.error, "We couldn't load rider messages.");
    assert.deepEqual(result.conversation, { id: 8 });
});
