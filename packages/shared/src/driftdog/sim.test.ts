import { describe, expect, it } from "vitest";
import { addPlayer, createMatch, passBall, playerHitByRay, removePlayer, step } from "./sim.js";
import { ARENA, DT, PARAMS } from "./constants.js";

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

  it("starts the dog in the center and accelerates with slip", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 600, y: 80 });
    state = addPlayer(state, "b", { x: 80, y: 720 });
    expect(state.dog.x).toBeCloseTo(ARENA.width / 2);
    expect(state.dog.y).toBeCloseTo(ARENA.height / 2);
    expect(state.dog.speed).toBe(PARAMS.dog.initialSpeed);
    const startSpeed = state.dog.speed;
    ({ state } = run(state, 20, { a: stick(), b: stick() }));
    expect(state.dog.speed).toBeGreaterThan(startSpeed);
    const moveHeading = Math.atan2(state.dog.vy, state.dog.vx);
    expect(Math.abs(moveHeading - state.dog.heading)).toBeGreaterThan(0.2);
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

  it("keeps the ball with a remaining living player when someone leaves", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 200, y: 200 });
    state = addPlayer(state, "b", { x: 400, y: 200 });
    state = removePlayer(state, "a");
    expect(state.ball.ownerId).toBe("b");
    expect(state.players.b.hasBall).toBe(true);
  });
});
