import {
  ARENA,
  BALL_CARRY_OFFSET,
  BALL_RADIUS,
  DEFAULT_MATCH_TIME,
  DEFAULT_SCORE_TO_WIN,
  DOG_CATCH_RANGE,
  DOG_DRIFT,
  DOG_SPEED,
  DOG_STUN,
  DOG_TURN_RATE,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYER_TURN_RATE,
  RAY_HIT_WIDTH,
  RAY_MAX_DIST,
} from "./constants.js";
import type {
  BallState,
  DogState,
  MatchState,
  PlayerInput,
  PlayerState,
  SimEvent,
  StepResult,
} from "./types.js";

export interface CreateMatchOptions {
  ball?: Partial<Pick<BallState, "x" | "y">>;
  scoreToWin?: number;
  timer?: number;
  phase?: MatchState["phase"];
}

export interface AddPlayerOptions {
  x?: number;
  y?: number;
  heading?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function angleDelta(from: number, to: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function cloneState(state: MatchState): MatchState {
  return {
    ...state,
    players: Object.fromEntries(Object.entries(state.players).map(([id, player]) => [id, { ...player }])),
    ball: { ...state.ball },
    dog: { ...state.dog },
  };
}

function clampEntity(x: number, y: number, radius: number): { x: number; y: number } {
  return {
    x: clamp(x, radius, ARENA.width - radius),
    y: clamp(y, radius, ARENA.height - radius),
  };
}

function giveBall(state: MatchState, playerId: string): void {
  for (const player of Object.values(state.players)) {
    player.hasBall = player.id === playerId;
  }
  const owner = state.players[playerId];
  state.ball.ownerId = playerId;
  state.ball.lastThrowerId = playerId;
  if (owner) {
    state.ball.x = owner.x + Math.cos(owner.heading) * BALL_CARRY_OFFSET;
    state.ball.y = owner.y + Math.sin(owner.heading) * BALL_CARRY_OFFSET;
  }
}

function otherPlayerId(state: MatchState, skipId: string): string | undefined {
  return Object.keys(state.players).find((id) => id !== skipId);
}

export function createMatch(options: CreateMatchOptions = {}): MatchState {
  return {
    phase: options.phase ?? "playing",
    players: {},
    ball: {
      x: options.ball?.x ?? ARENA.width / 2,
      y: options.ball?.y ?? ARENA.height / 2,
      vx: 0,
      vy: 0,
      ownerId: null,
      lastThrowerId: null,
      spin: 0,
      radius: BALL_RADIUS,
      throwImmune: 0,
    },
    dog: {
      x: 80,
      y: ARENA.height - 80,
      vx: 0,
      vy: 0,
      heading: 0,
      stun: 0,
    },
    timer: options.timer ?? DEFAULT_MATCH_TIME,
    scoreToWin: options.scoreToWin ?? DEFAULT_SCORE_TO_WIN,
  };
}

export function addPlayer(state: MatchState, id: string, options: AddPlayerOptions = {}): MatchState {
  const next = cloneState(state);
  const spawn = clampEntity(options.x ?? ARENA.width / 2, options.y ?? ARENA.height / 2, PLAYER_RADIUS);
  next.players[id] = {
    id,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    heading: options.heading ?? 0,
    hasBall: false,
    score: 0,
    blinkCd: 0,
    radius: PLAYER_RADIUS,
  };
  if (!next.ball.ownerId) {
    giveBall(next, id);
  }
  return next;
}

export function removePlayer(state: MatchState, id: string): MatchState {
  const next = cloneState(state);
  const held = next.ball.ownerId === id;
  delete next.players[id];
  if (held) {
    const nextOwner = Object.keys(next.players)[0];
    if (nextOwner) {
      giveBall(next, nextOwner);
    } else {
      next.ball.ownerId = null;
    }
  }
  return next;
}

export function playerHitByRay(
  origin: { x: number; y: number },
  heading: number,
  players: PlayerState[],
  skipId: string,
  maxDist = RAY_MAX_DIST,
): string | undefined {
  const dirX = Math.cos(heading);
  const dirY = Math.sin(heading);
  let bestId: string | undefined;
  let bestT = maxDist;
  for (const player of players) {
    if (player.id === skipId) {
      continue;
    }
    const relX = player.x - origin.x;
    const relY = player.y - origin.y;
    const along = relX * dirX + relY * dirY;
    if (along <= 0 || along >= bestT) {
      continue;
    }
    const perp = Math.abs(relX * dirY - relY * dirX);
    if (perp <= player.radius + RAY_HIT_WIDTH && along < bestT) {
      bestT = along;
      bestId = player.id;
    }
  }
  return bestId;
}

export function passBall(state: MatchState, fromId: string, toId: string): StepResult {
  const next = cloneState(state);
  const events: SimEvent[] = [];
  if (next.phase !== "playing" || next.ball.ownerId !== fromId || !next.players[toId] || fromId === toId) {
    return { state: next, events };
  }
  giveBall(next, toId);
  events.push({ type: "pass", fromId, toId });
  return { state: next, events };
}

function readAxis(input: PlayerInput): { x: number; y: number } {
  if (typeof input.moveX === "number" || typeof input.moveY === "number") {
    const x = clamp(input.moveX ?? 0, -1, 1);
    const y = clamp(input.moveY ?? 0, -1, 1);
    const length = Math.hypot(x, y);
    if (length <= 0.08) {
      return { x: 0, y: 0 };
    }
    return { x: x / Math.max(length, 1), y: y / Math.max(length, 1) };
  }
  const x = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const y = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const length = Math.hypot(x, y);
  return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

function steer(entity: { heading: number; vx: number; vy: number; x: number; y: number }, toward: { x: number; y: number }, speed: number, turnRate: number, drift: number, dt: number, radius: number): void {
  const desired = Math.atan2(toward.y, toward.x);
  const turn = clamp(angleDelta(entity.heading, desired), -turnRate * dt, turnRate * dt);
  entity.heading += turn;
  const targetVx = Math.cos(entity.heading) * speed;
  const targetVy = Math.sin(entity.heading) * speed;
  const blend = 1 - Math.exp(-drift * dt);
  entity.vx += (targetVx - entity.vx) * blend;
  entity.vy += (targetVy - entity.vy) * blend;
  const next = clampEntity(entity.x + entity.vx * dt, entity.y + entity.vy * dt, radius);
  entity.x = next.x;
  entity.y = next.y;
}

function movePlayer(player: PlayerState, input: PlayerInput, dt: number): void {
  const axis = readAxis(input);
  if (axis.x === 0 && axis.y === 0) {
    player.vx *= 0.82;
    player.vy *= 0.82;
    const next = clampEntity(player.x + player.vx * dt, player.y + player.vy * dt, player.radius);
    player.x = next.x;
    player.y = next.y;
    return;
  }
  steer(player, axis, PLAYER_SPEED, PLAYER_TURN_RATE, 8, dt, player.radius);
}

function stickBall(state: MatchState): void {
  const owner = state.ball.ownerId ? state.players[state.ball.ownerId] : undefined;
  if (!owner) {
    const fallback = Object.keys(state.players)[0];
    if (fallback) {
      giveBall(state, fallback);
    }
    return;
  }
  state.ball.x = owner.x + Math.cos(owner.heading) * BALL_CARRY_OFFSET;
  state.ball.y = owner.y + Math.sin(owner.heading) * BALL_CARRY_OFFSET;
  state.ball.vx = owner.vx;
  state.ball.vy = owner.vy;
}

function stepDog(state: MatchState, events: SimEvent[], dt: number): void {
  const holder = state.ball.ownerId ? state.players[state.ball.ownerId] : undefined;
  if (!holder) {
    return;
  }
  const dog: DogState = state.dog;
  dog.stun = Math.max(0, (dog.stun ?? 0) - dt);
  if (dog.stun > 0) {
    dog.vx *= 0.86;
    dog.vy *= 0.86;
    const next = clampEntity(dog.x + dog.vx * dt, dog.y + dog.vy * dt, 20);
    dog.x = next.x;
    dog.y = next.y;
    return;
  }
  steer(
    dog,
    { x: holder.x - dog.x, y: holder.y - dog.y },
    DOG_SPEED,
    DOG_TURN_RATE,
    DOG_DRIFT,
    dt,
    20,
  );
  if (Math.hypot(holder.x - dog.x, holder.y - dog.y) > DOG_CATCH_RANGE) {
    return;
  }
  const nextOwner = otherPlayerId(state, holder.id);
  events.push({ type: "tagged", victimId: holder.id });
  dog.stun = DOG_STUN;
  dog.vx *= -0.35;
  dog.vy *= -0.35;
  if (nextOwner && state.players[nextOwner]) {
    state.players[nextOwner].score += 1;
    events.push({ type: "score", playerId: nextOwner, score: state.players[nextOwner].score });
    giveBall(state, nextOwner);
    if (state.players[nextOwner].score >= state.scoreToWin) {
      state.phase = "ended";
      events.push({ type: "win", playerId: nextOwner });
    }
  }
}

export function step(state: MatchState, inputs: Record<string, PlayerInput>, dt: number): StepResult {
  const next = cloneState(state);
  const events: SimEvent[] = [];
  if (next.phase !== "playing") {
    stickBall(next);
    return { state: next, events };
  }

  for (const player of Object.values(next.players)) {
    const input = inputs[player.id] ?? { up: false, down: false, left: false, right: false };
    movePlayer(player, input, dt);
    player.blinkCd = Math.max(0, player.blinkCd - dt);
  }
  stickBall(next);
  stepDog(next, events, dt);
  stickBall(next);

  next.timer = Math.max(0, next.timer - dt);
  if (next.timer === 0 && next.phase === "playing") {
    const winner = Object.values(next.players).sort((a, b) => b.score - a.score)[0];
    next.phase = "ended";
    if (winner) {
      events.push({ type: "win", playerId: winner.id });
    }
  }

  return { state: next, events };
}

export function throwBall(state: MatchState, playerId: string): StepResult {
  const target = playerHitByRay(
    state.players[playerId] ?? { x: 0, y: 0 },
    state.players[playerId]?.heading ?? 0,
    Object.values(state.players),
    playerId,
  );
  if (!target) {
    return { state: cloneState(state), events: [] };
  }
  return passBall(state, playerId, target);
}

export function blink(state: MatchState, _playerId?: string): StepResult {
  return { state: cloneState(state), events: [] };
}
