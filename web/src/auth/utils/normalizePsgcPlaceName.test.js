import test from "node:test";
import assert from "node:assert/strict";
import { normalizePsgcPlaceName } from "./normalizePsgcPlaceName.js";

test("repairs misdecoded lowercase enye in PSGC place labels", () => {
    const malformedEnye = String.fromCharCode(0x00c3, 0x00b1);
    const correctEnye = String.fromCharCode(0x00f1);

    assert.equal(
        normalizePsgcPlaceName("City of Bi" + malformedEnye + "an"),
        "City of Bi" + correctEnye + "an",
    );
    assert.equal(
        normalizePsgcPlaceName("Los Ba" + malformedEnye + "os"),
        "Los Ba" + correctEnye + "os",
    );
});

test("repairs uppercase enye and leaves correct or non-string names unchanged", () => {
    const malformedEnye = String.fromCharCode(0x00c3, 0x2018);
    const correctEnye = String.fromCharCode(0x00d1);

    assert.equal(
        normalizePsgcPlaceName("Pe" + malformedEnye + "ablanca"),
        "Pe" + correctEnye + "ablanca",
    );
    const correctLowercaseEnye = String.fromCharCode(0x00f1);
    assert.equal(
        normalizePsgcPlaceName("Pe" + correctLowercaseEnye + "arrubia"),
        "Pe" + correctLowercaseEnye + "arrubia",
    );
    assert.equal(normalizePsgcPlaceName(null), null);
});
