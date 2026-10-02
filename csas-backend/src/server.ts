import { config } from "./config";
import { createApp } from "./app";
import { prisma } from "./lib/prisma";

const server = createApp().listen(config.PORT, () => {
  console.log(`CSAS API listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
});

// Graceful shutdown: stop accepting connections, then close the DB pool.
async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
