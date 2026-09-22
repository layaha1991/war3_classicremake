import {
  ARENA,
  PLAYABLE_HEIGHT,
  addPlayer,
  blink,
  createMatch,
  dummyInput,
  dummyPassHeading,
  dummyShouldBlink,
  DT,
  passBall,
  playerHitByRay,
  removePlayer,
  restartMatch,
  step,
  type MatchState,
  type PlayerInput,
  type SimEvent,
} from "@war3/shared";
import { sanitizeInput, sanitizeNickname } from "./sanitize-input.js";

const SPAWNS = [
  { x: 240, y: 360 },
  { x: 840, y: 360 },
  { x: 240, y: 1280 },
  { x: 840, y: 1280 },
  { x: 540, y: 240 },
  { x: 540, y: 1400 },
  { x: 180, y: 768 },
  { x: 900, y: 768 },
];

const DUMMY_NAMES = ["Bot 阿武", "Bot 拓海", "Bot 沙治", "Bot 池谷"];

export class DriftDogRuntime {
  sim: MatchState = createMatch({ phase: "lobby" });
  inputs: Record<string, PlayerInput> = {};
  names: Record<string, string> = {};
  events: SimEvent[] = [];
  dummyIds: string[] = [];
  private dummySeq = 0;

  get dummyCount(): number {
    return this.dummyIds.length;
  }

  isDummy(playerId: string): boolean {
    return this.dummyIds.includes(playerId);
  }

  addDummy(): string | undefined {
    if (Object.keys(this.sim.players).length >= 8) {
      return undefined;
    }
    this.dummySeq += 1;
    const id = `dummy-${this.dummySeq}`;
    const name = DUMMY_NAMES[(this.dummySeq - 1) % DUMMY_NAMES.length] ?? `Bot ${this.dummySeq}`;
    this.dummyIds.push(id);
    this.join(id, name);
    return id;
  }

  fillDummies(minPlayers = 3): void {
    while (Object.keys(this.sim.players).length < minPlayers) {
      if (!this.addDummy()) {
        break;
      }
    }
  }

  join(playerId: string, nickname: unknown): void {
    const spawn = SPAWNS[Object.keys(this.sim.players).length] ?? {
      x: ARENA.width / 2,
      y: PLAYABLE_HEIGHT / 2,
    };
    this.names[playerId] = sanitizeNickname(nickname);
    this.sim = addPlayer(this.sim, playerId, spawn);
    this.inputs[playerId] = { up: false, down: false, left: false, right: false };
    this.maybeStart();
  }

  leave(playerId: string): void {
    this.sim = removePlayer(this.sim, playerId);
    delete this.inputs[playerId];
    delete this.names[playerId];
    this.dummyIds = this.dummyIds.filter((id) => id !== playerId);
  }

  handleInput(playerId: string, raw: unknown): void {
    const player = this.sim.players[playerId];
    if (!player?.alive) {
      return;
    }
    this.inputs[playerId] = sanitizeInput(raw);
  }

  handleRematch(playerId: string): void {
    if (this.sim.phase !== "ended" || !this.sim.players[playerId]) {
      return;
    }
    this.sim = restartMatch(this.sim, SPAWNS);
    for (const id of Object.keys(this.inputs)) {
      this.inputs[id] = { up: false, down: false, left: false, right: false };
    }
  }

  handlePass(playerId: string, heading: number): void {
    const player = this.sim.players[playerId];
    if (!player?.alive) {
      return;
    }
    const targetId = playerHitByRay(player, heading, Object.values(this.sim.players), playerId);
    if (!targetId) {
      return;
    }
    this.apply(passBall(this.sim, playerId, targetId));
  }

  handleBlink(playerId: string): void {
    const player = this.sim.players[playerId];
    if (!player?.alive) {
      return;
    }
    this.apply(blink(this.sim, playerId));
  }

  tick(): SimEvent[] {
    if (this.sim.phase !== "playing") {
      return [];
    }
    this.driveDummies();
    const result = step(this.sim, this.inputs, DT);
    this.apply(result);
    return result.events;
  }

  private maybeStart(): void {
    if (this.sim.phase === "lobby" && Object.keys(this.sim.players).length >= 2) {
      this.sim = { ...this.sim, phase: "playing" };
    }
  }

  private driveDummies(): void {
    for (const id of this.dummyIds) {
      this.inputs[id] = dummyInput(this.sim, id);
      const pass = dummyPassHeading(this.sim, id);
      if (pass !== undefined) {
        this.handlePass(id, pass);
      }
      if (dummyShouldBlink(this.sim, id)) {
        this.handleBlink(id);
      }
    }
  }

  private apply(result: { state: MatchState; events: SimEvent[] }): void {
    this.sim = result.state;
    this.events.push(...result.events);
  }
}
