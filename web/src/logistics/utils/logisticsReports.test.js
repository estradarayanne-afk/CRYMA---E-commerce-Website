import test from "node:test";
import assert from "node:assert/strict";
import { logisticsExportKey, logisticsReportParams, unwrapLogisticsReport } from "./logisticsReports.js";

test("logistics report parameters include custom bounds only for a custom period", () => {
    assert.deepEqual(logisticsReportParams("last_7_days", "2026-11-01", "2026-11-04"), { period: "last_7_days" });
    assert.deepEqual(logisticsReportParams("custom", "2026-11-01", "2026-11-04"), { period: "custom", from: "2026-11-01", to: "2026-11-04" });
});

test("report sections map only to supported export datasets", () => {
    assert.equal(logisticsExportKey("current_delivery_records_by_hub"), "hubs");
    assert.equal(logisticsExportKey("transfers_created_by_route_and_status"), "transfers");
    assert.throws(() => logisticsExportKey("customer_data"), /Unsupported logistics report/);
});

test("report response validation rejects incomplete payloads", () => {
    const data = { reports: {}, period: { period: "all" } };
    assert.equal(unwrapLogisticsReport({ data: { success: true, data } }), data);
    assert.throws(() => unwrapLogisticsReport({ data: { success: true, data: {} } }), /invalid/);
});
