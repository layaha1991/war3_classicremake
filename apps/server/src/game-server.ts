import { matchMaker, Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import type { Server as HttpServer } from "node:http";
import type { FastifyInstance } from "fastify";
import { DriftDogRoom } from "./modules/driftdog/room.js";

export function registerMatchmakeRoutes(app: FastifyInstance): void {
  app.get("/api/rooms", async () => {
    try {
      const rooms = await matchMaker.query({ name: "driftdog" });
      return {
        rooms: rooms.map((room) => ({
          roomCode: String((room.metadata as { roomCode?: string } | undefined)?.roomCode ?? room.roomId)
            .slice(0, 6)
            .toUpperCase(),
          playerCount: room.clients,
        })),
      };
    } catch {
      return { rooms: [] };
    }
  });

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
  gameServer.define("driftdog", DriftDogRoom).filterBy(["roomCode"]);
  return gameServer;
}
