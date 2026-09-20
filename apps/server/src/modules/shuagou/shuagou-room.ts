import { Room, type Client } from "colyseus";
import type { SimEvent } from "@war3/shared";
import { PlayerSchema, ShuagouState } from "./schema.js";
import { sanitizeHeading, sanitizeNickname } from "./sanitize-input.js";
import { ShuagouRuntime } from "./shuagou-runtime.js";

export class ShuagouRoom extends Room<ShuagouState> {
  maxClients = 8;
  private readonly runtime = new ShuagouRuntime();

  onCreate(options: { roomCode?: unknown } = {}): void {
    const roomCode = typeof options.roomCode === "string" ? options.roomCode.toUpperCase() : this.roomId.slice(0, 6).toUpperCase();
    this.setMetadata({ roomCode });
    this.setState(new ShuagouState());
    this.state.roomCode = roomCode;
    this.sync();
    this.setSimulationInterval(() => {
      this.runtime.tick();
      this.sync();
    }, 50);

    this.onMessage("input", (client, message) => {
      this.runtime.handleInput(client.sessionId, message);
    });
    this.onMessage("pass", (client, message) => {
      const heading = sanitizeHeading((message as { heading?: unknown })?.heading);
      if (heading === undefined) {
        return;
      }
      this.runtime.handlePass(client.sessionId, heading);
      this.sync();
    });
  }

  onJoin(client: Client, options: { nickname?: unknown } = {}): void {
    this.runtime.join(client.sessionId, sanitizeNickname(options.nickname));
    this.sync();
  }

  onLeave(client: Client): void {
    this.runtime.leave(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.sync();
  }

  private sync(): void {
    const { sim, names, events } = this.runtime;
    this.state.phase = sim.phase;
    this.state.timer = sim.timer;
    this.state.scoreToWin = sim.scoreToWin;
    this.state.ball.x = sim.ball.x;
    this.state.ball.y = sim.ball.y;
    this.state.ball.vx = sim.ball.vx;
    this.state.ball.vy = sim.ball.vy;
    this.state.ball.ownerId = sim.ball.ownerId ?? "";
    this.state.ball.spin = sim.ball.spin;
    this.state.dog.x = sim.dog.x;
    this.state.dog.y = sim.dog.y;
    this.state.dog.vx = sim.dog.vx;
    this.state.dog.vy = sim.dog.vy;
    this.state.dog.heading = sim.dog.heading;

    for (const event of events) {
      this.broadcast("fx", event);
      if (event.type === "pass") {
        this.state.lastShout = `${names[event.fromId] ?? ""} → ${names[event.toId] ?? ""}`;
      }
      if (event.type === "tagged") {
        this.state.lastShout = `甩到 ${names[event.victimId] ?? ""}`;
      }
    }
    this.runtime.events = [];

    for (const [id, player] of Object.entries(sim.players)) {
      let row = this.state.players.get(id);
      if (!row) {
        row = new PlayerSchema();
        this.state.players.set(id, row);
      }
      row.id = player.id;
      row.name = names[id] ?? "";
      row.x = player.x;
      row.y = player.y;
      row.vx = player.vx;
      row.vy = player.vy;
      row.heading = player.heading;
      row.hasBall = player.hasBall;
      row.score = player.score;
      row.blinkCd = player.blinkCd;
    }

    for (const id of [...this.state.players.keys()]) {
      if (!sim.players[id]) {
        this.state.players.delete(id);
      }
    }
  }
}
