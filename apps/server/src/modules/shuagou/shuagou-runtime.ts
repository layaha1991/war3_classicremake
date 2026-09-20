import {
  ARENA,
  addPlayer,
  createMatch,
  DT,
  passBall,
  playerHitByRay,
  removePlayer,
  step,
  type MatchState,
  type PlayerInput,
  type SimEvent,
} from "@war3/shared";
import { sanitizeInput, sanitizeNickname } from "./sanitize-input.js";

const SPAWNS = [
  { x: 280, y: 400 },
  { x: 920, y: 400 },
  { x: 600, y: 220 },
  { x: 600, y: 580 },
  { x: 360, y: 240 },
  { x: 840, y: 240 },
  { x: 360, y: 560 },
  { x: 840, y: 560 },
];

export class ShuagouRuntime {
  sim: MatchState = createMatch({ phase: "lobby" });
  inputs: Record<string, PlayerInput> = {};
  names: Record<string, string> = {};
  events: SimEvent[] = [];

  join(playerId: string, nickname: unknown): void {
    const spawn = SPAWNS[Object.keys(this.sim.players).length] ?? {
      x: ARENA.width / 2,
      y: ARENA.height / 2,
    };
    this.names[playerId] = sanitizeNickname(nickname);
    this.sim = addPlayer(this.sim, playerId, spawn);
    this.inputs[playerId] = { up: false, down: false, left: false, right: false };
    if (this.sim.phase === "lobby" && Object.keys(this.sim.players).length >= 2) {
      this.sim = { ...this.sim, phase: "playing" };
    }
  }

  leave(playerId: string): void {
    this.sim = removePlayer(this.sim, playerId);
    delete this.inputs[playerId];
    delete this.names[playerId];
  }

  handleInput(playerId: string, raw: unknown): void {
    if (!this.sim.players[playerId]) {
      return;
    }
    this.inputs[playerId] = sanitizeInput(raw);
  }

  handlePass(playerId: string, heading: number): void {
    const player = this.sim.players[playerId];
    if (!player) {
      return;
    }
    const targetId = playerHitByRay(player, heading, Object.values(this.sim.players), playerId);
    if (!targetId) {
      return;
    }
    this.apply(passBall(this.sim, playerId, targetId));
  }

  tick(): SimEvent[] {
    if (this.sim.phase !== "playing") {
      return [];
    }
    const result = step(this.sim, this.inputs, DT);
    this.apply(result);
    return result.events;
  }

  private apply(result: { state: MatchState; events: SimEvent[] }): void {
    this.sim = result.state;
    this.events.push(...result.events);
  }
}
