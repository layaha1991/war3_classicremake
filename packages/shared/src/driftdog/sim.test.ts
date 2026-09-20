import { describe, expect, it } from "vitest";
import { addPlayer, angleDelta, blink, createMatch, passBall, playerHitByRay, removePlayer, restartMatch, step } from "./sim.js";
import { ARENA, DT, PARAMS, PLAYABLE_HEIGHT } from "./constants.js";

function stick(moveX = 0, moveY = 0) {
  return { up: false, down: false, left: false, right: false, moveX, moveY };
}

function run(state: ReturnType<typeof createMatch>, frames: number, inputs: Parameters<typeof step>[1]) {
  let current = state;
  const events = [];
  for (let i = 0; i < frames; i += 1) {
    const result = step(current, inputs, DT);
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

describe("driftdog simulation", () => {
  it("uses a portrait 1080 by 1920 arena with the dog in the playable center", () => {
    expect(ARENA).toEqual({ width: 1080, height: 1920 });
    expect(PARAMS.controlBand).toBe(0.2);
    expect(PLAYABLE_HEIGHT).toBe(1536);
    expect(PARAMS.dog.startX).toBe(ARENA.width / 2);
    expect(PARAMS.dog.startY).toBe(PLAYABLE_HEIGHT / 2);
    expect(PARAMS.player.radius).toBeGreaterThanOrEqual(32);
    expect(PARAMS.player.speed).toBe(440);
    expect(PARAMS.player.displayHeight).toBe(192);
    expect(PARAMS.player.displayWidth).toBe(192);
    expect(PARAMS.dog.radius).toBe(140);
    expect(PARAMS.dog.display).toBe(400);
    expect(PARAMS.dog.catchRange).toBe(214);
    expect(PARAMS.dog.turnRate).toBe(0.72);
    expect(PARAMS.dog.drift).toBe(0.84);
    expect(PARAMS.dog.initialSpeed).toBe(30);
    expect(PARAMS.dog.maxSpeed).toBe(420);
    expect(PARAMS.player.blinkDistance).toBe(640);
    expect(PARAMS.player.blinkCooldown).toBe(7);
  });

  it("blinks along heading and then cools down", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 80, y: 400, heading: 0 });
    state.dog.stun = 99;
    const flashed = blink(state, "a");
    expect(flashed.events).toEqual([
      { type: "blink", playerId: "a", fromX: 80, fromY: 400, toX: flashed.state.players.a.x, toY: flashed.state.players.a.y },
    ]);
    expect(flashed.state.players.a.x).toBeCloseTo(80 + PARAMS.player.blinkDistance);
    expect(flashed.state.players.a.y).toBeCloseTo(400);
    expect(flashed.state.players.a.blinkCd).toBe(PARAMS.player.blinkCooldown);
    const blocked = blink(flashed.state, "a");
    expect(blocked.state.players.a.x).toBe(flashed.state.players.a.x);
    expect(blocked.events).toEqual([]);
    const cooled = run(flashed.state, Math.round(PARAMS.player.blinkCooldown / DT), { a: stick() });
    expect(cooled.state.players.a.blinkCd).toBeCloseTo(0);
  });

  it("does not blink when dead or into the control strip", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 200, y: 1480, heading: Math.PI / 2 });
    state.dog.stun = 99;
    const clamped = blink(state, "a");
    expect(clamped.state.players.a.y).toBeLessThanOrEqual(PLAYABLE_HEIGHT - PARAMS.player.radius);
    state.players.a.alive = false;
    const dead = blink(state, "a");
    expect(dead.state.players.a.x).toBe(200);
    expect(dead.events).toEqual([]);
  });

  it("keeps players out of the bottom control strip", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 540, y: 1800 });
    state.dog.stun = 99;
    expect(state.players.a.y).toBeLessThanOrEqual(PLAYABLE_HEIGHT - PARAMS.player.radius);
    const down = run(state, 30, { a: stick(0, 1) });
    expect(down.state.players.a.y).toBeLessThanOrEqual(PLAYABLE_HEIGHT - PARAMS.player.radius);
  });

  it("gives the ball to the first living player and keeps it off the ground when held", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 200, y: 200 });
    expect(state.players.a.hasBall).toBe(true);
    expect(state.ball.ownerId).toBe("a");
    expect(state.players.a.hearts).toBe(PARAMS.lives.hearts);
    state = addPlayer(state, "b", { x: 400, y: 200 });
    ({ state } = run(state, 8, { a: stick(), b: stick() }));
    expect(state.ball.ownerId).toBe("a");
    expect(state.ball.flightToId).toBeNull();
  });

  it("flies the ball toward the receiver instead of snapping", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 200, y: 200, heading: 0 });
    state = addPlayer(state, "b", { x: 700, y: 200 });
    const launched = passBall(state, "a", "b");
    launched.state.dog.stun = 99;
    expect(launched.state.ball.ownerId).toBeNull();
    expect(launched.state.ball.flightToId).toBe("b");
    expect(launched.state.players.a.hasBall).toBe(false);
    const startX = launched.state.ball.x;
    const mid = run(launched.state, 4, { a: stick(), b: stick() });
    expect(mid.state.ball.x).toBeGreaterThan(startX);
    expect(mid.state.ball.ownerId).toBeNull();
    const landed = run(mid.state, 40, { a: stick(), b: stick() });
    expect(landed.state.ball.ownerId).toBe("b");
    expect(landed.state.players.b.hasBall).toBe(true);
    expect(landed.state.ball.flightToId).toBeNull();
  });

  it("steers the player with the stick immediately, without drift or coast", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 200, y: 200 });
    state.dog.stun = 99;
    const right = run(state, 1, { a: stick(1, 0) });
    expect(right.state.players.a.vx).toBeCloseTo(PARAMS.player.speed);
    expect(right.state.players.a.vy).toBeCloseTo(0);
    expect(right.state.players.a.x).toBeGreaterThan(200);
    const reverse = run(right.state, 1, { a: stick(-1, 0) });
    expect(reverse.state.players.a.vx).toBeCloseTo(-PARAMS.player.speed);
    expect(reverse.state.players.a.vy).toBeCloseTo(0);
    const stop = run(reverse.state, 1, { a: stick(0, 0) });
    expect(stop.state.players.a.vx).toBeCloseTo(0);
    expect(stop.state.players.a.vy).toBeCloseTo(0);
  });

  it("starts the dog in the center and accelerates with slip", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 600, y: 80 });
    state = addPlayer(state, "b", { x: 80, y: 720 });
    expect(state.dog.x).toBeCloseTo(ARENA.width / 2);
    expect(state.dog.y).toBeCloseTo(PLAYABLE_HEIGHT / 2);
    expect(state.dog.speed).toBe(PARAMS.dog.initialSpeed);
    const startSpeed = state.dog.speed;
    ({ state } = run(state, 20, { a: stick(), b: stick() }));
    expect(state.dog.speed).toBeGreaterThan(startSpeed);
    const moveHeading = Math.atan2(state.dog.vy, state.dog.vx);
    expect(Math.abs(moveHeading - state.dog.heading)).toBeGreaterThan(0.2);
    const desired = Math.atan2(state.players.a.y - state.dog.y, state.players.a.x - state.dog.x);
    expect(Math.abs(angleDelta(state.dog.heading, desired))).toBeGreaterThan(0.7);
  });

  it("tags when the dog sprite overlaps a still ball holder", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 540, y: 768 });
    state = addPlayer(state, "b", { x: 180, y: 200 });
    const overlap = PARAMS.dog.display / 2 + PARAMS.player.displayHeight / 2 - 20;
    state.dog.x = 540;
    state.dog.y = 768 + overlap;
    state.dog.stun = 0;
    state.dog.speed = 10;
    const after = run(state, 2, { a: stick(), b: stick() });
    expect(after.events.some((event) => event.type === "tagged" && event.victimId === "a")).toBe(true);
  });

  it("only hits living players with the pass ray", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 200, y: 200, heading: 0 });
    state = addPlayer(state, "b", { x: 500, y: 200 });
    state = addPlayer(state, "c", { x: 200, y: 500 });
    state.players.b.alive = false;
    expect(playerHitByRay({ x: 200, y: 200 }, 0, Object.values(state.players), "a")).toBeUndefined();
  });

  it("loses a heart on a tag and leaves a corpse at zero", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 200, y: 200 });
    state = addPlayer(state, "b", { x: 240, y: 200 });
    state = addPlayer(state, "c", { x: 900, y: 600 });
    state.dog.x = 200;
    state.dog.y = 200;
    state.dog.speed = PARAMS.dog.maxSpeed;
    const first = run(state, 6, { a: stick(), b: stick(), c: stick() });
    expect(first.events.some((event) => event.type === "tagged" && event.victimId === "a")).toBe(true);
    expect(first.state.players.a.hearts).toBe(1);
    expect(first.state.players.a.alive).toBe(true);
    expect(first.state.dog.x).toBeCloseTo(ARENA.width / 2);
    first.state.dog.x = first.state.players.a.x;
    first.state.dog.y = first.state.players.a.y;
    first.state.dog.stun = 0;
    first.state.ball.ownerId = "a";
    first.state.players.a.hasBall = true;
    first.state.players.b.hasBall = false;
    const second = run(first.state, 6, { a: stick(), b: stick(), c: stick() });
    expect(second.state.players.a.hearts).toBe(0);
    expect(second.state.players.a.alive).toBe(false);
    expect(second.state.players.a.x).toBeCloseTo(200, 0);
    expect(second.state.ball.ownerId).not.toBe("a");
  });

  it("ends when only one living player remains", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 200, y: 200 });
    state = addPlayer(state, "b", { x: 230, y: 200 });
    state.players.a.hearts = 1;
    state.dog.x = 200;
    state.dog.y = 200;
    state.dog.stun = 0;
    const after = run(state, 8, { a: stick(), b: stick() });
    expect(after.state.players.a.alive).toBe(false);
    expect(after.state.phase).toBe("ended");
    expect(after.events.some((event) => event.type === "win" && event.playerId === "b")).toBe(true);
  });

  it("revives the same players and starts another round from the center", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 200, y: 200 });
    state = addPlayer(state, "b", { x: 230, y: 200 });
    state.phase = "ended";
    state.players.a.hearts = 0;
    state.players.a.alive = false;
    state.dog.x = 200;
    state.dog.y = 200;
    const next = restartMatch(state, [
      { x: 280, y: 400 },
      { x: 920, y: 400 },
    ]);
    expect(next.phase).toBe("playing");
    expect(next.players.a.alive).toBe(true);
    expect(next.players.a.hearts).toBe(PARAMS.lives.hearts);
    expect(next.players.b.hearts).toBe(PARAMS.lives.hearts);
    expect(next.players.a.x).toBe(280);
    expect(next.players.b.x).toBe(920);
    expect(next.dog.x).toBeCloseTo(ARENA.width / 2);
    expect(next.dog.y).toBeCloseTo(PLAYABLE_HEIGHT / 2);
    expect(["a", "b"]).toContain(next.ball.ownerId);
  });

  it("waits in the lobby if a rematch has fewer than two players", () => {
    let state = addPlayer(createMatch({ phase: "ended" }), "a", { x: 200, y: 200 });
    state.phase = "ended";
    state.players.a.hearts = 0;
    state.players.a.alive = false;
    const next = restartMatch(state);
    expect(next.phase).toBe("lobby");
    expect(next.players.a.alive).toBe(true);
    expect(next.players.a.hearts).toBe(PARAMS.lives.hearts);
  });

  it("keeps the ball with a remaining living player when someone leaves", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 200, y: 200 });
    state = addPlayer(state, "b", { x: 400, y: 200 });
    state = removePlayer(state, "a");
    expect(state.ball.ownerId).toBe("b");
    expect(state.players.b.hasBall).toBe(true);
  });
});
