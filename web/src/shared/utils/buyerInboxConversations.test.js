import test from "node:test";
import assert from "node:assert/strict";
import { getBuyerInboxConversations } from "./buyerInboxConversations.js";

test("seller inbox includes only seller conversations", () => {
    const sellerThread = { id: 1, seller_id: 8 };
    const supportThread = { id: 2, admin_id: 3 };

    assert.deepEqual(
        getBuyerInboxConversations([sellerThread, supportThread]),
        [sellerThread],
    );
});

test("support inbox prefers conversations with history over duplicate empty threads", () => {
    const olderEmpty = { id: 10, admin_id: 3, messages: [] };
    const newerEmpty = { id: 11, admin_id: 3, messages: [] };
    const supportHistory = { id: 12, admin_id: 3, messages: [{ id: 25, message: "Help" }] };
    const olderSupportHistory = { id: 9, admin_id: 3, messages: [{ id: 24, message: "Earlier help" }] };
    const sellerThread = { id: 13, seller_id: 8, messages: [] };

    assert.deepEqual(
        getBuyerInboxConversations([newerEmpty, supportHistory, sellerThread, olderEmpty], true),
        [supportHistory],
    );
    assert.deepEqual(
        getBuyerInboxConversations([newerEmpty, olderSupportHistory, supportHistory, olderEmpty], true),
        [olderSupportHistory, supportHistory],
    );
    assert.deepEqual(
        getBuyerInboxConversations([newerEmpty, sellerThread, olderEmpty], true),
        [olderEmpty],
    );
});
