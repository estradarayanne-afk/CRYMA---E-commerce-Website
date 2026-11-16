import test from "node:test";
import assert from "node:assert/strict";

import { getSelectedRegionName } from "./philippineAddressOptions.js";

test("pickup region selection returns the active shipping-zone label", () => {
    const regions = [{ code: "0400000000", name: "Region IV-A (CALABARZON)" }];

    assert.equal(
        getSelectedRegionName(regions, ["CALABARZON"], "0400000000"),
        "CALABARZON",
    );
});
