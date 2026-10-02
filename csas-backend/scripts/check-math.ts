// Run with:  npm run check:math
// Verifies the two core primitives — geo-fence distance and TOTP — in isolation,
// no database or server required.

import { distanceMeters, isInsideFence } from "../src/lib/geo";
import { generateTotpSecret, currentToken, verifyToken } from "../src/lib/totp";

function line(label: string, value: unknown) {
  console.log(`  ${label.padEnd(34)} ${value}`);
}

console.log("\n— Geo-fence math (Haversine) —");
line("1° latitude (expect ~111195 m):", distanceMeters(0, 0, 1, 0).toFixed(1));
line("~100 m north:", distanceMeters(5.6037, -0.187, 5.6046, -0.187).toFixed(1));
line("identical point:", distanceMeters(5.6037, -0.187, 5.6037, -0.187).toFixed(1));

const center = { lat: 5.6037, lng: -0.187 };
const near = isInsideFence({ lat: 5.60375, lng: -0.187 }, center, 50);
const far = isInsideFence({ lat: 5.61, lng: -0.187 }, center, 50);
line("point ~5 m away, 50 m fence:", `${near.inside}  (${near.distanceMeters.toFixed(1)} m)`);
line("point ~700 m away, 50 m fence:", `${far.inside} (${far.distanceMeters.toFixed(1)} m)`);

console.log("\n— TOTP (dynamic QR) —");
const secret = generateTotpSecret();
const code = currentToken(secret);
line("generated secret:", secret);
line("current code:", code);
line("verify current code:", verifyToken(code, secret));
line("verify wrong code (000000):", verifyToken("000000", secret));
line("verify against other secret:", verifyToken(code, generateTotpSecret()));

console.log("\nDone.\n");
