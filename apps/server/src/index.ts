import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import { Redis } from "ioredis";
import { Pool } from "pg";
import { buildApp } from "./app.js";
import { loadConfig } from "./infra/config.js";
import { createLogger } from "./infra/logging.js";
import { migrate } from "./infra/migrate.js";
import { MemorySessionStore } from "./modules/auth/memory-session-store.js";
import { MemoryUserStore } from "./modules/auth/memory-user-store.js";
import { PostgresUserStore } from "./modules/auth/postgres-user-store.js";
import { RedisSessionStore } from "./modules/auth/redis-session-store.js";
import { MemoryRoomStore } from "./modules/lobby/memory-room-store.js";
import { PostgresRoomStore } from "./modules/lobby/postgres-room-store.js";

const logger = createLogger();

async function createStores(config: ReturnType<typeof loadConfig>) {
  if (process.env.STORE_DRIVER === "persist") {
    const pool = new Pool({ connectionString: config.databaseUrl });
    const redis = new Redis(config.redisUrl);
    await migrate(pool);
    return {
      users: new PostgresUserStore(pool),
      sessions: new RedisSessionStore(redis),
      rooms: new PostgresRoomStore(pool),
    };
  }
  logger.warn({ event: "stores.memory" }, "using in-memory stores; set STORE_DRIVER=persist for Redis/Postgres");
  return {
    users: new MemoryUserStore(),
    sessions: new MemorySessionStore(),
    rooms: new MemoryRoomStore(),
  };
}

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp({
    config,
    logger,
    stores: await createStores(config),
  });

  const webRoot = fileURLToPath(new URL("../../web/dist", import.meta.url));
  if (existsSync(webRoot)) {
    await app.register(fastifyStatic, { root: webRoot });
    logger.info({ event: "web.static", webRoot }, "serving web on the same port as Colyseus");
  } else {
    logger.warn({ event: "web.static.missing", webRoot }, "web dist missing; API and Colyseus only");
  }

  await app.ready();
  const { attachGameServer } = await import("./game-server.js");
  attachGameServer(app.server);
  await app.listen({ port: config.port, host: "0.0.0.0" });
  logger.info({ event: "server.listen", port: config.port, realtime: "colyseus" });
}

main().catch((error: unknown) => {
  logger.error({ err: error, event: "server.fatal" }, error instanceof Error ? error.message : "startup failed");
  process.exit(1);
});
