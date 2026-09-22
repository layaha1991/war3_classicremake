import { Room, type Client } from "colyseus";
import { PlayerSchema, DriftDogState } from "./schema.js";
import { sanitizeHeading, sanitizeNickname } from "./sanitize-input.js";
import { DriftDogRuntime } from "./runtime.js";

export class DriftDogRoom extends Room<DriftDogState> {
  maxClients = 8;
  private readonly runtime = new DriftDogRuntime();

  onCreate(options: { roomCode?: unknown } = {}): void {
    const roomCode = typeof options.roomCode === "string" ? options.roomCode.toUpperCase() : this.roomId.slice(0, 6).toUpperCase();
    this.setMetadata({ roomCode });
    this.setState(new DriftDogState());
    this.state.roomCode = roomCode;
    this.sync();
    this.setSimulationInterval(() => {
      this.runtime.tick();
      this.sync();
    }, 50);

    this.onMessage("input", (client, message) => {
      this.runtime.handleInput(client.sessionId, message);
    });
    this.onMessage("rematch", (client) => {
      this.runtime.handleRematch(client.sessionId);
      this.sync();
    });
    this.onMessage("pass", (client, message) => {
      const heading = sanitizeHeading((message as { heading?: unknown })?.heading);
      if (heading === undefined) {
        return;
      }
      this.runtime.handlePass(client.sessionId, heading);
      this.sync();
    });
    this.onMessage("blink", (client) => {
      this.runtime.handleBlink(client.sessionId);
      this.sync();
    });
    this.onMessage("addBot", () => {
      this.runtime.addDummy();
      this.sync();
    });
  }

  onJoin(client: Client, options: { nickname?: unknown; fillBots?: unknown } = {}): void {
    this.runtime.join(client.sessionId, sanitizeNickname(options.nickname));
    if (this.clients.length === 1 && options.fillBots !== false) {
      this.runtime.fillDummies();
    }
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
    this.state.ball.x = sim.ball.x;
    this.state.ball.y = sim.ball.y;
    this.state.ball.vx = sim.ball.vx;
    this.state.ball.vy = sim.ball.vy;
    this.state.ball.ownerId = sim.ball.ownerId ?? "";
    this.state.ball.flightToId = sim.ball.flightToId ?? "";
    this.state.dog.x = sim.dog.x;
    this.state.dog.y = sim.dog.y;
    this.state.dog.vx = sim.dog.vx;
    this.state.dog.vy = sim.dog.vy;
    this.state.dog.heading = sim.dog.heading;
    this.state.dog.speed = sim.dog.speed;

    for (const event of events) {
      this.broadcast("fx", event);
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
      row.hearts = player.hearts;
      row.alive = player.alive;
      row.blinkCd = player.blinkCd;
    }

    for (const id of [...this.state.players.keys()]) {
      if (!sim.players[id]) {
        this.state.players.delete(id);
      }
    }
  }
}
