import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify, { type FastifyInstance } from "fastify";
import type { Logger } from "pino";
import type { AppConfig } from "./infra/config.js";
import { createTraceId, runWithTraceId } from "./infra/logging.js";
import { registerGuestRoutes } from "./modules/auth/guest-routes.js";
import { TokenService } from "./modules/auth/token-service.js";
import type { SessionStore, UserStore } from "./modules/auth/types.js";
import { registerRoomRoutes } from "./modules/lobby/room-routes.js";
import { RoomService } from "./modules/lobby/room-service.js";
import type { RoomStore } from "./modules/lobby/types.js";

export interface AppStores {
  users: UserStore;
  sessions: SessionStore;
  rooms: RoomStore;
}

export async function buildApp(options: {
  config: AppConfig;
  logger: Logger;
  stores: AppStores;
}): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: options.logger,
  });

  await app.register(helmet);
  await app.register(cookie);
  await app.register(cors, {
    origin: options.config.publicWebOrigin,
    credentials: true,
  });

  app.addHook("onRequest", (request, _reply, done) => {
    const header = request.headers["x-trace-id"];
    const traceId = typeof header === "string" && header.length > 0 ? header : createTraceId();
    runWithTraceId(traceId, done);
  });

  const tokens = new TokenService({
    secret: options.config.jwtSecret,
    accessTtlSec: options.config.jwtAccessTtlSec,
    refreshTtlSec: options.config.jwtRefreshTtlSec,
  });

  registerGuestRoutes(app, {
    config: options.config,
    users: options.stores.users,
    sessions: options.stores.sessions,
    tokens,
  });
  registerRoomRoutes(app, {
    config: options.config,
    tokens,
    rooms: new RoomService(options.stores.rooms),
  });

  return app;
}
