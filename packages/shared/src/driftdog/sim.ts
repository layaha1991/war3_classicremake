import {
  ARENA,
  BALL_CARRY_OFFSET,
  BALL_CATCH_RANGE,
  BALL_FLY_SPEED,
  BALL_RADIUS,
  BLINK_COOLDOWN,
  BLINK_DISTANCE,
  DOG_ACCEL,
  DOG_CATCH_RANGE,
  DOG_DRIFT,
  DOG_INITIAL_SPEED,
  DOG_MAX_SPEED,
  DOG_RADIUS,
  DOG_STUN,
  DOG_TURN_RATE,
  DT,
  MATCH_MAX_SECONDS,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYABLE_HEIGHT,
  PARAMS,
  RAY_HIT_WIDTH,
  RAY_MAX_DIST,
  STARTING_HEARTS,
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
    y: clamp(y, radius, PLAYABLE_HEIGHT - radius),
  };
}

function livingPlayers(state: MatchState): PlayerState[] {
  return Object.values(state.players).filter((player) => player.alive);
}

function otherLivingId(state: MatchState, skipId: string): string | undefined {
  return livingPlayers(state).find((player) => player.id !== skipId)?.id;
}

function giveBall(state: MatchState, playerId: string): void {
  for (const player of Object.values(state.players)) {
    player.hasBall = player.id === playerId && player.alive;
  }
  const owner = state.players[playerId];
  state.ball.flightToId = null;
  state.ball.vx = 0;
  state.ball.vy = 0;
  if (!owner?.alive) {
    state.ball.ownerId = null;
    return;
  }
  state.ball.ownerId = playerId;
  state.ball.lastThrowerId = playerId;
  state.ball.x = owner.x + Math.cos(owner.heading) * BALL_CARRY_OFFSET;
  state.ball.y = owner.y + Math.sin(owner.heading) * BALL_CARRY_OFFSET;
}

function resetDog(dog: DogState): void {
  dog.x = PARAMS.dog.startX;
  dog.y = PARAMS.dog.startY;
  dog.vx = 0;
  dog.vy = 0;
  dog.heading = 0;
  dog.speed = DOG_INITIAL_SPEED;
  dog.stun = DOG_STUN;
}

export function createMatch(options: CreateMatchOptions = {}): MatchState {
  return {
    phase: options.phase ?? "playing",
    players: {},
    ball: {
      x: options.ball?.x ?? ARENA.width / 2,
      y: options.ball?.y ?? PLAYABLE_HEIGHT / 2,
      vx: 0,
      vy: 0,
      ownerId: null,
      flightToId: null,
      lastThrowerId: null,
      spin: 0,
      radius: BALL_RADIUS,
      throwImmune: 0,
    },
    dog: {
      x: PARAMS.dog.startX,
      y: PARAMS.dog.startY,
      vx: 0,
      vy: 0,
      heading: 0,
      speed: DOG_INITIAL_SPEED,
      stun: 0,
    },
    timer: options.timer ?? 0,
  };
}

export function addPlayer(state: MatchState, id: string, options: AddPlayerOptions = {}): MatchState {
  const next = cloneState(state);
  const spawn = clampEntity(options.x ?? ARENA.width / 2, options.y ?? PLAYABLE_HEIGHT / 2, PLAYER_RADIUS);
  next.players[id] = {
    id,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    heading: options.heading ?? 0,
    hasBall: false,
    hearts: STARTING_HEARTS,
    alive: true,
    score: 0,
    blinkCd: 0,
    radius: PLAYER_RADIUS,
  };
  if (!next.ball.ownerId && !next.ball.flightToId) {
    giveBall(next, id);
  }
  return next;
}

export function restartMatch(state: MatchState, spawns: { x: number; y: number }[] = []): MatchState {
  const next = cloneState(state);
  const ids = Object.keys(next.players);
  ids.forEach((id, index) => {
    const player = next.players[id];
    const spawn = spawns[index];
    player.hearts = STARTING_HEARTS;
    player.alive = true;
    player.vx = 0;
    player.vy = 0;
    player.hasBall = false;
    player.blinkCd = 0;
    player.score = 0;
    if (spawn) {
      const pos = clampEntity(spawn.x, spawn.y, player.radius);
      player.x = pos.x;
      player.y = pos.y;
    }
  });
  resetDog(next.dog);
  next.timer = 0;
  next.ball.flightToId = null;
  next.ball.vx = 0;
  next.ball.vy = 0;
  next.ball.throwImmune = 0;
  next.phase = ids.length >= 2 ? "playing" : "lobby";
  if (ids[0]) {
    giveBall(next, ids[0]);
  } else {
    next.ball.ownerId = null;
  }
  return next;
}

export function removePlayer(state: MatchState, id: string): MatchState {
  const next = cloneState(state);
  const held = next.ball.ownerId === id || next.ball.flightToId === id;
  delete next.players[id];
  if (held) {
    const nextOwner = livingPlayers(next)[0]?.id;
    if (nextOwner) {
      giveBall(next, nextOwner);
    } else {
      next.ball.ownerId = null;
      next.ball.flightToId = null;
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
    if (player.id === skipId || !player.alive) {
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
  const from = next.players[fromId];
  const to = next.players[toId];
  if (next.phase !== "playing" || next.ball.ownerId !== fromId || !from?.alive || !to?.alive || fromId === toId) {
    return { state: next, events: [] };
  }
  for (const player of Object.values(next.players)) {
    player.hasBall = false;
  }
  next.ball.ownerId = null;
  next.ball.flightToId = toId;
  next.ball.lastThrowerId = fromId;
  const dx = to.x - next.ball.x;
  const dy = to.y - next.ball.y;
  const dist = Math.hypot(dx, dy) || 1;
  next.ball.vx = (dx / dist) * BALL_FLY_SPEED;
  next.ball.vy = (dy / dist) * BALL_FLY_SPEED;
  return { state: next, events: [{ type: "pass", fromId, toId }] };
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

function steer(
  entity: { heading: number; vx: number; vy: number; x: number; y: number },
  toward: { x: number; y: number },
  speed: number,
  turnRate: number,
  drift: number,
  dt: number,
  radius: number,
): void {
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
  if (!player.alive) {
    player.vx = 0;
    player.vy = 0;
    return;
  }
  const axis = readAxis(input);
  player.vx = axis.x * PLAYER_SPEED;
  player.vy = axis.y * PLAYER_SPEED;
  const next = clampEntity(player.x + player.vx * dt, player.y + player.vy * dt, player.radius);
  player.x = next.x;
  player.y = next.y;
  if (typeof input.facing === "number") {
    player.heading = input.facing;
  } else if (axis.x !== 0 || axis.y !== 0) {
    player.heading = Math.atan2(axis.y, axis.x);
  }
}

function flyBall(state: MatchState): void {
  const targetId = state.ball.flightToId;
  if (!targetId) {
    return;
  }
  const target = state.players[targetId];
  if (!target?.alive) {
    const fallback = livingPlayers(state)[0]?.id;
    if (fallback) {
      giveBall(state, fallback);
    } else {
      state.ball.flightToId = null;
    }
    return;
  }
  const dx = target.x - state.ball.x;
  const dy = target.y - state.ball.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= BALL_CATCH_RANGE) {
    giveBall(state, targetId);
    return;
  }
  state.ball.vx = (dx / dist) * BALL_FLY_SPEED;
  state.ball.vy = (dy / dist) * BALL_FLY_SPEED;
  state.ball.x += state.ball.vx * DT;
  state.ball.y += state.ball.vy * DT;
}

function stickBall(state: MatchState): void {
  if (state.ball.flightToId) {
    return;
  }
  const owner = state.ball.ownerId ? state.players[state.ball.ownerId] : undefined;
  if (!owner?.alive) {
    const fallback = livingPlayers(state)[0]?.id;
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

export function dogCatchRange(): number {
  return Math.max(DOG_CATCH_RANGE, PARAMS.dog.display / 2 + PARAMS.player.displayHeight / 2);
}

function pointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const length2 = dx * dx + dy * dy;
  if (length2 <= 0) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / length2, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

function chaseTarget(state: MatchState): { x: number; y: number } | undefined {
  const holder = state.ball.ownerId ? state.players[state.ball.ownerId] : undefined;
  if (holder?.alive) {
    return holder;
  }
  const incoming = state.ball.flightToId ? state.players[state.ball.flightToId] : undefined;
  if (incoming?.alive) {
    return incoming;
  }
  return livingPlayers(state)[0];
}

function stepDog(state: MatchState, events: SimEvent[], dt: number): void {
  const target = chaseTarget(state);
  if (!target) {
    return;
  }
  const dog: DogState = state.dog;
  dog.stun = Math.max(0, (dog.stun ?? 0) - dt);
  if (dog.stun > 0) {
    dog.vx *= 0.9;
    dog.vy *= 0.9;
    const next = clampEntity(dog.x + dog.vx * dt, dog.y + dog.vy * dt, DOG_RADIUS);
    dog.x = next.x;
    dog.y = next.y;
    return;
  }
  dog.speed = Math.min(DOG_MAX_SPEED, dog.speed + DOG_ACCEL * dt);
  const range = dogCatchRange();
  const from = { x: dog.x, y: dog.y };
  const dist = Math.hypot(target.x - dog.x, target.y - dog.y);
  const turnRate = dist < range * 2 ? Math.max(DOG_TURN_RATE, 6) : DOG_TURN_RATE;
  steer(dog, { x: target.x - dog.x, y: target.y - dog.y }, dog.speed, turnRate, DOG_DRIFT, dt, DOG_RADIUS);
  if (state.ball.flightToId || state.ball.ownerId !== target.id) {
    return;
  }
  if (pointToSegment(target.x, target.y, from.x, from.y, dog.x, dog.y) > range) {
    return;
  }
  target.hearts = Math.max(0, target.hearts - 1);
  events.push({ type: "tagged", victimId: target.id });
  if (target.hearts <= 0) {
    target.alive = false;
    target.hasBall = false;
    target.vx = 0;
    target.vy = 0;
    events.push({ type: "downed", victimId: target.id });
  }
  const alive = livingPlayers(state);
  if (alive.length <= 1) {
    const winner = alive[0];
    state.phase = "ended";
    if (winner) {
      events.push({ type: "win", playerId: winner.id });
      giveBall(state, winner.id);
    }
    return;
  }
  const nextOwner = otherLivingId(state, target.id);
  resetDog(dog);
  if (nextOwner) {
    giveBall(state, nextOwner);
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
  flyBall(next);
  stickBall(next);
  stepDog(next, events, dt);
  stickBall(next);
  next.timer += dt;
  if (next.phase === "playing" && next.timer >= MATCH_MAX_SECONDS) {
    next.phase = "ended";
    const alive = livingPlayers(next);
    const best = Math.max(0, ...alive.map((player) => player.hearts));
    const tied = alive.filter((player) => player.hearts === best);
    const winner = tied.find((player) => player.id === next.ball.ownerId) ?? tied[0];
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

export function blink(state: MatchState, playerId?: string): StepResult {
  const next = cloneState(state);
  const player = playerId ? next.players[playerId] : undefined;
  if (next.phase !== "playing" || !player?.alive || player.blinkCd > 0) {
    return { state: next, events: [] };
  }
  const fromX = player.x;
  const fromY = player.y;
  const dest = clampEntity(
    player.x + Math.cos(player.heading) * BLINK_DISTANCE,
    player.y + Math.sin(player.heading) * BLINK_DISTANCE,
    player.radius,
  );
  player.x = dest.x;
  player.y = dest.y;
  player.blinkCd = BLINK_COOLDOWN;
  if (next.ball.ownerId === player.id && !next.ball.flightToId) {
    stickBall(next);
  }
  return {
    state: next,
    events: [{ type: "blink", playerId: player.id, fromX, fromY, toX: dest.x, toY: dest.y }],
  };
}
