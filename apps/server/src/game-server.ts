import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import type { Server as HttpServer } from "node:http";
import { ShuagouRoom } from "./modules/shuagou/shuagou-room.js";

export function attachGameServer(httpServer: HttpServer): Server {
  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
  });
  gameServer.define("shuagou", ShuagouRoom).filterBy(["roomCode"]);
  return gameServer;
}
