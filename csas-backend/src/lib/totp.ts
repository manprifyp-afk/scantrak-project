// ---------------------------------------------------------------------------
//  Dynamic QR codes via TOTP (Time-based One-Time Password)
//
//  Each ClassSession stores a `totpSecret`. From that secret we derive a fresh
//  6-digit code every 30 seconds. The lecturer's screen shows the current code
//  as a QR; a student's scan must carry a code that is still inside its time
//  window. A screenshot shared with an absent friend is useless seconds later.
// ---------------------------------------------------------------------------

import { authenticator } from "otplib";
import { config } from "../config";

// step   = how long each code is valid (seconds)
// window = how many neighbouring steps to also accept, absorbing small clock
//          differences and the second or two between display and scan.
authenticator.options = { step: config.TOTP_STEP_SECONDS, window: 1 };

/** Create a new random secret to store on a ClassSession. */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/** The code valid right now for a given secret. */
export function currentToken(secret: string): string {
  return authenticator.generate(secret);
}

/** Whether `token` is valid for `secret` within the allowed time window. */
export function verifyToken(token: string, secret: string): boolean {
  return authenticator.check(token, secret);
}

/** Seconds left before the current code rotates (for a countdown in the UI). */
export function secondsUntilRotation(): number {
  return authenticator.timeRemaining();
}
