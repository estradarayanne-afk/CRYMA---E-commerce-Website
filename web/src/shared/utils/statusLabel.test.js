import assert from "node:assert/strict";
import test from "node:test";
import { formatStatusLabel } from "./statusLabel.js";

test("formats status labels in title case and replaces separators", () => {
    assert.equal(formatStatusLabel("active"), "Active");
    assert.equal(formatStatusLabel("pending_admin-review"), "Pending Admin Review");
});

test("uses the fallback for missing or whitespace-only statuses", () => {
    assert.equal(formatStatusLabel(null), "Unknown");
    assert.equal(formatStatusLabel("  "), "Unknown");
    assert.equal(formatStatusLabel("", "Not Set"), "Not Set");
});
