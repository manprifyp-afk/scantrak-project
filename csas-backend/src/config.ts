import "dotenv/config";
import { z } from "zod";

// Validate the environment once, at startup. A bad/missing value fails fast
// with a clear message instead of surfacing as a confusing runtime error later.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 characters"),
  PORT: z.coerce.number().int().positive().default(4000),
  TOTP_STEP_SECONDS: z.coerce.number().int().positive().default(30),
  LATE_GRACE_MINUTES: z.coerce.number().int().nonnegative().default(10),
  CORS_ORIGIN: z.string().default("*"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\nInvalid environment configuration:");
  for (const [key, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
    console.error(`  - ${key}: ${msgs?.join(", ")}`);
  }
  console.error("\nCheck your .env file against .env.example.\n");
  process.exit(1);
}

export const config = parsed.data;
