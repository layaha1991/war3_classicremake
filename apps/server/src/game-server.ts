import { matchMaker, Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import type { Server as HttpServer } from "node:http";
import type { FastifyInstance } from "fastify";
import { ShuagouRoom } from "./modules/shuagou/shuagou-room.js";

export function registerMatchmakeRoutes(app: FastifyInstance): void {
  app.post("/matchmake/:method/:roomName", async (request, reply) => {
    const { method, roomName } = request.params as { method: string; roomName: string };
    try {
      return await matchMaker.controller.invokeMethod(method, roomName, request.body);
    } catch (error) {
      request.log.error({ err: error, event: "matchmake.fail" });
      return reply.code(400).send({ error: error instanceof Error ? error.message : "matchmake failed" });
    }
  });
}

export function attachGameServer(httpServer: HttpServer): Server {
  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
  });
  gameServer.define("shuagou", ShuagouRoom).filterBy(["roomCode"]);
  return gameServer;
}
