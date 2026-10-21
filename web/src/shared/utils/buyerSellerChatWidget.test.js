import test from "node:test";
import assert from "node:assert/strict";
import {
    canShowBuyerSellerChatWidget,
    getSellerConversations,
    getSellerConversationDraft,
    getSellerMessageUpdates,
    getSellerUnreadCount,
    mergeSellerSentMessage,
    setSellerConversationDraft,
} from "./buyerSellerChatWidget.js";

test("widget is restricted to buyer routes and excluded from both chat destinations", () => {
    assert.equal(canShowBuyerSellerChatWidget("/", true), true);
    assert.equal(canShowBuyerSellerChatWidget("/products/42", true), true);
    assert.equal(canShowBuyerSellerChatWidget("/buyer/chat", true), false);
    assert.equal(canShowBuyerSellerChatWidget("/buyer/chat/thread/1", true), false);
    assert.equal(canShowBuyerSellerChatWidget("/buyer/support", true), false);
    assert.equal(canShowBuyerSellerChatWidget("/buyer/support/ticket/1", true), false);
    assert.equal(canShowBuyerSellerChatWidget("/shop", false), false);
});

test("widget conversations and unread counts include seller threads only", () => {
    const sellerA = { id: 1, seller_id: 8, unread_messages_count: 2 };
    const sellerB = { id: 2, seller_id: 9, unread_messages_count: 1 };
    const support = { id: 3, admin_id: 4, unread_messages_count: 99 };

    assert.deepEqual(getSellerConversations([sellerA, support, sellerB]), [sellerA, sellerB]);
    assert.equal(getSellerUnreadCount([sellerA, support, sellerB]), 3);
});

test("message read updates preserve buyer messages and mark incoming messages read", () => {
    const mine = { id: 1, sender_id: 7, is_read: false };
    const unread = { id: 2, sender_id: 8, is_read: false };
    const result = getSellerMessageUpdates([mine, unread], 7);

    assert.equal(result.hasUnread, true);
    assert.deepEqual(result.readMessages, [mine, { ...unread, is_read: true }]);
});

test("sent message merge avoids duplicate messages after API refresh", () => {
    const previous = [{ id: 1, message: "hi" }];
    const sent = { id: "2", message: "hello" };

    assert.deepEqual(mergeSellerSentMessage(previous, sent), [...previous, sent]);
    assert.deepEqual(mergeSellerSentMessage([...previous, { ...sent, id: 2 }], sent).length, 2);
});

test("conversation drafts remain isolated and available when switching threads", () => {
    const drafts = setSellerConversationDraft({}, 41, "Question about size");
    const switched = setSellerConversationDraft(drafts, 42, "Is this in stock?");

    assert.equal(getSellerConversationDraft(switched, 41), "Question about size");
    assert.equal(getSellerConversationDraft(switched, 42), "Is this in stock?");
    assert.equal(getSellerConversationDraft(switched, null), "");
});
