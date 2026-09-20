import {
  ARENA,
  BALL_CARRY_OFFSET,
  BALL_FRICTION,
  BALL_RADIUS,
  BLINK_COOLDOWN,
  BLINK_DISTANCE,
  DEFAULT_MATCH_TIME,
  DEFAULT_SCORE_TO_WIN,
  HIT_SPEED_MIN,
  MAX_SPIN,
  PICKUP_MAX_SPEED,
  PICKUP_RANGE,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  SPIN_PER_RADIAN,
  THROW_IMMUNE,
  THROW_SPEED_BASE,
  THROW_SPEED_PER_SPIN,
} from "./constants.js";
import type { BallState, MatchState, PlayerInput, PlayerState, SimEvent, StepResult } from "./types.js";

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

function angleDelta(from: number, to: number): number {
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
  };
}

function clampEntity(x: number, y: number, radius: number): { x: number; y: number } {
  return {
    x: clamp(x, radius, ARENA.width - radius),
    y: clamp(y, radius, ARENA.height - radius),
  };
}

function ballSpeed(ball: BallState): number {
  return Math.hypot(ball.vx, ball.vy);
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
  return next;
}

export function removePlayer(state: MatchState, id: string): MatchState {
  const next = cloneState(state);
  const player = next.players[id];
  if (player?.hasBall) {
    next.ball.ownerId = null;
    next.ball.spin = 0;
  }
  delete next.players[id];
  return next;
}

function movePlayer(player: PlayerState, input: PlayerInput, dt: number): void {
  const axisX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const axisY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const length = Math.hypot(axisX, axisY);
  player.vx = length > 0 ? (axisX / length) * PLAYER_SPEED : 0;
  player.vy = length > 0 ? (axisY / length) * PLAYER_SPEED : 0;
  const next = clampEntity(player.x + player.vx * dt, player.y + player.vy * dt, player.radius);
  player.x = next.x;
  player.y = next.y;
}

function applyFacing(player: PlayerState, input: PlayerInput, ball: BallState): void {
  const previous = player.heading;
  if (typeof input.facing === "number") {
    player.heading = input.facing;
  } else if (player.vx !== 0 || player.vy !== 0) {
    player.heading = Math.atan2(player.vy, player.vx);
  }
  if (player.hasBall) {
    ball.spin = clamp(ball.spin + Math.abs(angleDelta(previous, player.heading)) * SPIN_PER_RADIAN, 0, MAX_SPIN);
  }
}

function carryOrIntegrateBall(state: MatchState, dt: number): void {
  const { ball } = state;
  if (ball.ownerId) {
    const owner = state.players[ball.ownerId];
    if (!owner) {
      ball.ownerId = null;
      return;
    }
    ball.x = owner.x + Math.cos(owner.heading) * BALL_CARRY_OFFSET;
    ball.y = owner.y + Math.sin(owner.heading) * BALL_CARRY_OFFSET;
    ball.vx = owner.vx;
    ball.vy = owner.vy;
    return;
  }
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.vx *= BALL_FRICTION;
  ball.vy *= BALL_FRICTION;
  const clamped = clampEntity(ball.x, ball.y, ball.radius);
  if (clamped.x !== ball.x) ball.vx *= -0.4;
  if (clamped.y !== ball.y) ball.vy *= -0.4;
  ball.x = clamped.x;
  ball.y = clamped.y;
}

function resolveHits(state: MatchState, events: SimEvent[]): void {
  const { ball } = state;
  if (ball.ownerId) {
    return;
  }
  const speed = ballSpeed(ball);
  if (speed < HIT_SPEED_MIN && ball.throwImmune <= 0) {
    return;
  }
  for (const player of Object.values(state.players)) {
    if (player.id === ball.lastThrowerId) {
      continue;
    }
    if (Math.hypot(player.x - ball.x, player.y - ball.y) > player.radius + ball.radius) {
      continue;
    }
    const attackerId = ball.lastThrowerId;
    events.push({ type: "hit", attackerId: attackerId ?? "unknown", victimId: player.id });
    if (attackerId && state.players[attackerId]) {
      state.players[attackerId].score += 1;
      events.push({ type: "score", playerId: attackerId, score: state.players[attackerId].score });
      if (state.players[attackerId].score >= state.scoreToWin) {
        state.phase = "ended";
        events.push({ type: "win", playerId: attackerId });
      }
    }
    ball.vx *= 0.15;
    ball.vy *= 0.15;
    ball.lastThrowerId = null;
    ball.throwImmune = 0.15;
    break;
  }
}

function resolvePickups(state: MatchState, events: SimEvent[]): void {
  const { ball } = state;
  if (ball.ownerId || ball.throwImmune > 0 || ballSpeed(ball) > PICKUP_MAX_SPEED) {
    return;
  }
  for (const player of Object.values(state.players)) {
    if (Math.hypot(player.x - ball.x, player.y - ball.y) > PICKUP_RANGE) {
      continue;
    }
    ball.ownerId = player.id;
    ball.lastThrowerId = null;
    ball.spin = 0;
    ball.vx = 0;
    ball.vy = 0;
    player.hasBall = true;
    events.push({ type: "pickup", playerId: player.id });
    break;
  }
}

export function throwBall(state: MatchState, playerId: string): StepResult {
  const next = cloneState(state);
  const events: SimEvent[] = [];
  const player = next.players[playerId];
  if (!player?.hasBall || next.ball.ownerId !== playerId || next.phase !== "playing") {
    return { state: next, events };
  }
  const spin = next.ball.spin;
  const speed = THROW_SPEED_BASE + spin * THROW_SPEED_PER_SPIN;
  next.ball.ownerId = null;
  next.ball.lastThrowerId = playerId;
  next.ball.vx = Math.cos(player.heading) * speed;
  next.ball.vy = Math.sin(player.heading) * speed;
  next.ball.spin = 0;
  next.ball.throwImmune = THROW_IMMUNE;
  player.hasBall = false;
  events.push({ type: "throw", playerId, spin });
  return { state: next, events };
}

export function blink(state: MatchState, playerId: string): StepResult {
  const next = cloneState(state);
  const events: SimEvent[] = [];
  const player = next.players[playerId];
  if (!player || player.blinkCd > 0 || next.phase !== "playing") {
    return { state: next, events };
  }
  const dest = clampEntity(
    player.x + Math.cos(player.heading) * BLINK_DISTANCE,
    player.y + Math.sin(player.heading) * BLINK_DISTANCE,
    player.radius,
  );
  player.x = dest.x;
  player.y = dest.y;
  player.blinkCd = BLINK_COOLDOWN;
  if (player.hasBall) {
    next.ball.x = player.x + Math.cos(player.heading) * BALL_CARRY_OFFSET;
    next.ball.y = player.y + Math.sin(player.heading) * BALL_CARRY_OFFSET;
  }
  events.push({ type: "blink", playerId });
  return { state: next, events };
}

export function step(state: MatchState, inputs: Record<string, PlayerInput>, dt: number): StepResult {
  const next = cloneState(state);
  const events: SimEvent[] = [];
  if (next.phase !== "playing") {
    return { state: next, events };
  }

  for (const player of Object.values(next.players)) {
    const input = inputs[player.id] ?? { up: false, down: false, left: false, right: false };
    movePlayer(player, input, dt);
    applyFacing(player, input, next.ball);
    player.blinkCd = Math.max(0, player.blinkCd - dt);
  }

  carryOrIntegrateBall(next, dt);
  next.ball.throwImmune = Math.max(0, next.ball.throwImmune - dt);
  resolveHits(next, events);
  if (next.phase === "playing") {
    resolvePickups(next, events);
  }

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
