# CRYMA Buyer–Seller Chat and Customer Service Audit

Date: 2026-10-21
Scope: Phase 0 audit only. No application code or database changes were made.

## Repository state and preservation

The working tree was already extensively modified before this audit. It includes staged/unstaged tracked edits and many untracked files across the frontend, backend, migrations, and tests. No existing work was reset, reverted, staged, or overwritten. The audit document is the only file added for this phase. Changes in the chat-related files are therefore treated as existing in-progress work, not attributed to this audit.

## Architecture observed

- Frontend: React with React Router (`web/src/App.jsx`), role-specific layouts and pages. Buyer pages, including `/buyer/chat`, are children of `BuyerLayout`. The layout currently mounts the navbar, auth modal, route outlet, and toast layer; there is no persistent floating chat widget/context provider.
- Buyer messaging: `/buyer/chat` renders a full-page inbox in `web/src/buyer/pages/Chat/Chat.jsx`. Product details starts or reuses a seller conversation via `POST /api/buyer/chat/seller-conversations`, then navigates to the full chat page with a conversation query parameter.
- Seller messaging: `/seller/chat` is a separate seller inbox and uses seller-scoped endpoints.
- Admin messaging/support: `/admin/chat` is a separate admin page. It reads and replies to conversations assigned to the logged-in admin. The buyer API creates or assigns a non-seller conversation to an active admin and describes it as Customer Service.
- Customer complaints: `/admin/complaints` is a separate administrator workflow. `Complaint` records support complainant/respondent/order, evidence, status, notes, and resolution time. Admin can search/filter complaints, inspect details, update status, dismiss, or resolve with notes. No buyer-facing complaint creation/list/detail API or route was found in the inspected API/routes and buyer UI; the buyer Account support section currently links to chat instead.
- Backend: Laravel API routes grouped behind Sanctum and active-account middleware, with role middleware for buyer, seller, and admin endpoints. Message reads/sends and conversation fetches are scoped to the authenticated user's buyer/seller/admin foreign key in the relevant controllers.
- Persistence: `conversations` has buyer/admin assignments; the existing untracked migration `2026_10_21_000006_add_seller_conversations.php` adds nullable seller and product references and a unique buyer/seller pair. `messages` persist plain message text, sender, read flag, timestamps, and, in another existing migration, an idempotency request ID. No attachment, order-context, websocket/broadcast, or server delivery-state implementation was found in inspected chat code. Current frontend refreshes/polls conversation data rather than subscribing to a real-time transport.

## Current capabilities

### Buyer–seller chat

- Product contact action requires a signed-in buyer and creates/reuses one conversation per buyer and seller.
- The conversation stores one `product_id`. If the buyer contacts the same seller about another product, the existing conversation is returned without updating its product reference; therefore the displayed product context can become stale.
- Buyer and seller have separate inbox endpoints, message endpoints, and read endpoints. Endpoints verify ownership by scoping lookups to the authenticated buyer/seller. Existing feature tests cover unauthorized access, message validation, idempotent send, unread counts/read state, seller replies, and support assignment behavior.
- Buyer page shows conversation identities, last message, timestamps, unread indicator, product name, message history, and sent/read checkmarks based on the persisted `is_read` field. It has loading, error, empty, and failed send handling. Search, attachments, order context, and persistent draft/widget UI are not present in the inspected page.
- The navbar “Messages” popover separately fetches the same buyer conversation list and opens the full page. It includes a Customer Service shortcut/label. This is a second presentation layer over the same inbox data.

### Customer Service and complaints

- Buyer customer service is currently the admin-assigned, non-seller flavor of the same `Conversation`/`Message` records and buyer chat page used for seller communication. The buyer conversation list endpoint automatically creates/assigns this support conversation when an active admin exists; this is implemented in `BuyerChatController::conversations()` and explicitly covered by existing chat feature tests.
- Admin chat lists the same admin-assigned conversations and can send/read messages. Admin API access is role-protected and conversation-scoped to the logged-in admin.
- Complaints are separate records and admin workflow, not part of ordinary chat. Their endpoints are admin-only. Existing complaint model and migration include order ID and support-case status/evidence/resolution fields, but inspected admin relations do not define an order relationship, and the admin detail UI shown in this audit does not surface order details.
- No separate buyer support-request create/list/show endpoint or support conversation history outside the shared chat model was found. The extent of complaint submission support should be rechecked across the full buyer order/review UI in a later phase before claiming the application has no complaint submission route at all; route/API inspection found only the admin complaint endpoints.

## Access and integrity observations

- Buyer and seller endpoints are role-restricted and scope conversation reads/sends/read-marking to their own foreign key; admin support chat is admin-role restricted and scoped to the assigned admin.
- The main leakage risk is workflow confusion rather than seller access: seller endpoints query only `seller_id`, so they do not expose non-seller admin conversations. This separation should be preserved.
- Buyer `conversations()` currently returns all buyer conversations, including seller chats and the admin support conversation. This mixes platform support and commerce communication at the data/API presentation layer despite the distinct purpose.
- Admin chat endpoint accesses only conversations assigned to that admin, not the complaint records. Complaint authorization is admin role only, which is consistent with current routes; no customer-facing complaint ownership API exists to audit.
- `is_read` supports read state but the sent/read checkmarks should not be described as delivery receipts. No independent delivered state was found.
- Attachments are not supported by the inspected messaging model/API. No evidence supports claiming online status or real-time delivery.

## Duplication matrix

| Overlap | Locations | What is duplicated/confusing | Recommended resolution |
|---|---|---|---|
| Buyer support and seller messaging use a shared inbox/records | Buyer `Chat.jsx`, `BuyerChatController::conversations()`, `Conversation`/`Message` | The same page and conversation list present Customer Service as another ordinary conversation; support conversation is auto-created in the seller inbox API response. | Separate buyer-facing support entry/workflow from seller chat. Preserve server authorization and do not expose support records through seller-scoped APIs. Determine whether existing complaint records can support customer follow-up before proposing schema/API work. |
| Messages popover repeats inbox list | `BuyerNavbar.jsx` popover and `/buyer/chat` | Both fetch and display recent conversation data; one is a preview with an “Open Messages” route, not a separate messaging capability. | Keep a compact preview only if useful, clarify it as seller messages, and route the distinct support entry to a support-specific destination. Avoid maintaining two competing inbox UIs. |
| Multiple buyer support links | Navbar account menu (“My Customer Service”), navbar Messages shortcut, Account > Customer service, home page support actions, order detail support affordance | Several labels/entry points converge on `/buyer/chat`, which itself is seller chat plus platform support. This explains much of the apparent redundancy. | Keep context-appropriate entry points but use consistent Support/Customer Service labeling and direct each to one distinct support workflow; seller chat links should be clearly labeled Messages/Contact seller. |
| Admin “Customer Service” chat vs “Complaints” | `AdminLayout.jsx` nav; `/admin/chat` vs `/admin/complaints` | These are separate workflows and data models but both can appear to be general customer-service inboxes. Chat supports direct messages; complaints supports formal status/resolution. | Keep both pending workflow validation; clarify labels and purpose, e.g. Support messages vs Complaints & disputes. Do not merge records or remove either. |
| Buyer account support card vs its destination | `Account.jsx` Support section links to `/buyer/chat` | Dedicated support panel is only a shortcut to the combined messaging page; it offers no request status/history distinct from messages. | Point to a genuinely distinct customer-service experience after establishing which existing support action is supported. Do not represent the complaint workflow as available to buyers until verified. |

## Missing or incomplete behavior relevant to the requested redesign

- Floating buyer widget, minimize/restore/close lifecycle, portal/stacking behavior, conversation/draft preservation during navigation, responsive full-screen mobile chat, and conversation search are absent.
- Buyer drafts are held in the chat page component state, so they are lost on page unmount/navigation. There is no draft persistence layer.
- Same-seller product context can be stale because reusing a conversation does not update its stored product. No order context exists in the inspected conversation model/API.
- The buyer page currently offers one message pane and a list; no search filter exists. No profile image data is requested by the conversation endpoints inspected.
- Attachments, online state, real-time updates, and delivery state are unsupported by the inspected implementation; these should not be fabricated in the redesign.
- Customer Service support request history/status for buyers, complaint submission, and explicit escalation from a seller conversation are not established in the inspected buyer routes. Validate available order/seller complaint actions before proposing additions.
- Admin complaint workflow has status and resolution notes, but no support assignment or conversation history; the admin chat is a separate assigned-message workflow.
- Existing buyer code presents the support inbox as ordinary chat; the backend currently creates that conversation through the ordinary buyer conversation-list endpoint. This automatic creation and shared data model are principal causes of the conceptual redundancy.

## Risks and constraints

- A floating-widget redesign should use the existing BuyerLayout boundary (public storefront and authenticated buyer routes share it) with an explicit authenticated-buyer guard. Avoid rendering support state to guests or other roles.
- Splitting support from seller chat may require API behavior changes because the buyer conversation-list endpoint currently creates support records and returns both kinds. Preserve existing conversations/data and verify admin workflow before adjusting that behavior.
- Fixing product context semantics needs a product decision: a seller conversation is unique per buyer/seller, while it currently stores a single product. Updating the context on every contact can still misrepresent historical messages; a product-reference-per-message/context-history model would need schema consideration. No schema change should be attempted without approval.
- Customer complaint submission/history appears unsupported in buyer routes. Avoid building a new ticket system or migration until the existing business workflow is confirmed.
- The project has extensive existing modifications, including relevant chat controllers, buyer/seller/admin chat pages, routes, layouts, and new chat migrations/tests. Any later phase must review diffs before editing these areas and preserve unrelated work.

## Proposed phased plan (approval required at each gate)

### Phase 1 — Resolve Customer Service redundancy

1. Keep buyer–seller chat, direct customer support messaging, and formal complaints as distinct purposes in navigation and copy.
2. Trace all actual buyer support links and order-level complaint/support actions, then decide which existing workflow each should reach.
3. Remove the duplicate presentation of the shared inbox only where it is demonstrably redundant; retain a messages preview if it remains useful and clearly seller-focused.
4. Avoid deleting routes/APIs or changing persistence until dependencies and existing records are reviewed. Any schema proposal must be presented for approval before a migration is created/run.
5. Verify with focused existing tests and UI checks after approval.

### Phase 2 — Floating buyer–seller chat

1. Mount chat UI/state at the buyer layout/router boundary after confirming which pages are supported.
2. Implement widget visibility state, active conversation, and in-memory draft preservation separately; do not claim browser-session persistence.
3. Add a searchable conversation switcher, truthful unread/read state, accessible desktop controls, and mobile navigation.
4. Correct product context behavior based on an approved model; show order context only where an existing authorized relationship supports it.
5. Reuse current APIs and message records where safe; do not fabricate attachments, real-time status, or receipts.

### Phase 3 — Polish and verification

1. Align message and support UI components without merging their records, permissions, status rules, or workflows.
2. Inspect and repair only confirmed overlay/stacking/notification defects.
3. Verify role ownership boundaries, failed-send behavior, responsive interaction, and that support requests never appear in seller inboxes.
4. Run the relevant frontend/backend checks after approval and report actual results.

## Phase 0 conclusion

The apparent Customer Service redundancy is caused by (1) the same buyer inbox presenting both seller and admin support conversations, (2) automatic support conversation creation in the buyer conversation-list API, (3) a navbar message preview over the same records, and (4) several buyer support links leading to the same combined `/buyer/chat` page. The admin complaint workflow remains distinct and should be preserved. This phase made no application-code, route, API, or database changes.
