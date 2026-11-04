import test from "node:test";
import assert from "node:assert/strict";
import { hasRoleAccess } from "./roleAccess.js";

test("workspace role access requires an exact role match", () => {
    assert.equal(hasRoleAccess({ role: "hub_staff" }, ["hub_staff"]), true);
    for (const role of ["buyer", "seller", "admin", "logistics", "rider", "Hub_Staff", null]) {
        assert.equal(hasRoleAccess({ role }, ["hub_staff"]), false, `${role} must not access Hub Staff routes`);
    }
    assert.equal(hasRoleAccess(null, ["hub_staff"]), false);
});
