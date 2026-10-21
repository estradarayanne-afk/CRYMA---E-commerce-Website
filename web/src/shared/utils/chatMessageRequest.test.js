import test from "node:test";
import assert from "node:assert/strict";
import { getChatMessageRequestId } from "./chatMessageRequest.js";

test("reuses the request ID when retrying the same chat draft", () => {
    const pending = { message: "Hello seller", scope: "conversation-1", id: "request-1" };
    let created = false;

    const requestId = getChatMessageRequestId(pending, "Hello seller", "conversation-1", () => {
        created = true;
        return "request-2";
    });

    assert.equal(requestId, "request-1");
    assert.equal(created, false);
});

test("creates a new request ID when the chat draft changes", () => {
    const requestId = getChatMessageRequestId(
        { message: "First draft", scope: "conversation-1", id: "request-1" },
        "Updated draft",
        "conversation-1",
        () => "request-2"
    );

    assert.equal(requestId, "request-2");
});

test("does not reuse a failed request ID in a different conversation", () => {
    const requestId = getChatMessageRequestId(
        { message: "Hello", scope: "conversation-1", id: "request-1" },
        "Hello",
        "conversation-2",
        () => "request-2"
    );

    assert.equal(requestId, "request-2");
});
