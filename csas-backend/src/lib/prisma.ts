import { PrismaClient } from "@prisma/client";

// A single shared Prisma client for the whole app.
export const prisma = new PrismaClient();
