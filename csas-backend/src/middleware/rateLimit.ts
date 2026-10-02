import rateLimit from "express-rate-limit";

// Slows down credential brute-forcing.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

// Stops anyone hammering the validator with guessed codes.
export const scanLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many scan attempts. Please slow down." },
});
