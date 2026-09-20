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

const config = loadConfig();
const logger = createLogger();

async function createStores() {
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

const app = await buildApp({
  config,
  logger,
  stores: await createStores(),
});

const webRoot = fileURLToPath(new URL("../../web/dist", import.meta.url));
if (existsSync(webRoot)) {
  await app.register(fastifyStatic, { root: webRoot });
  logger.info({ event: "web.static", webRoot }, "serving web on the same port as Colyseus");
}

await app.ready();
const { attachGameServer } = await import("./game-server.js");
attachGameServer(app.server);
await app.listen({ port: config.port, host: "0.0.0.0" });
logger.info({ event: "server.listen", port: config.port, realtime: "colyseus" });
