import { describe, expect, it } from "vitest";
import { addPlayer, createMatch, passBall, playerHitByRay, removePlayer, step } from "./sim.js";
import { ARENA, DT } from "./constants.js";

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

describe("shuagou simulation", () => {
  it("gives the ball to the first player and never drops it on the ground", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 200, y: 200 });
    expect(state.players.a.hasBall).toBe(true);
    expect(state.ball.ownerId).toBe("a");
    state = addPlayer(state, "b", { x: 400, y: 200 });
    expect(state.ball.ownerId).toBe("a");
    ({ state } = run(state, 10, { a: stick(), b: stick() }));
    expect(state.ball.ownerId).toBe("a");
    expect(state.ball.ownerId).not.toBeNull();
  });

  it("passes the ball only to the teammate the aim ray hits", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 200, y: 200, heading: 0 });
    state = addPlayer(state, "b", { x: 500, y: 200 });
    state = addPlayer(state, "c", { x: 200, y: 500 });
    expect(playerHitByRay({ x: 200, y: 200 }, 0, Object.values(state.players), "a")).toBe("b");
    const passed = passBall(state, "a", "b");
    expect(passed.events.some((event) => event.type === "pass" && event.toId === "b")).toBe(true);
    expect(passed.state.players.a.hasBall).toBe(false);
    expect(passed.state.players.b.hasBall).toBe(true);
    expect(passed.state.ball.ownerId).toBe("b");
  });

  it("keeps the ball stuck to a remaining player when the holder leaves", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 200, y: 200 });
    state = addPlayer(state, "b", { x: 400, y: 200 });
    state = removePlayer(state, "a");
    expect(state.ball.ownerId).toBe("b");
    expect(state.players.b.hasBall).toBe(true);
  });

  it("drifts the dog toward the ball holder instead of snapping", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 900, y: 200 });
    state = addPlayer(state, "b", { x: 200, y: 600 });
    const start = { x: state.dog.x, y: state.dog.y, heading: state.dog.heading };
    ({ state } = run(state, 25, { a: stick(), b: stick() }));
    expect(Math.hypot(state.dog.x - 900, state.dog.y - 200)).toBeLessThan(
      Math.hypot(start.x - 900, start.y - 200),
    );
    expect(Math.abs(state.dog.heading - start.heading)).toBeGreaterThan(0.05);
    expect(state.dog.x).toBeGreaterThan(0);
    expect(state.dog.x).toBeLessThan(ARENA.width);
  });

  it("tags the holder when the dog catches them and sticks the ball to someone else", () => {
    let state = addPlayer(createMatch({ phase: "playing", scoreToWin: 3 }), "a", {
      x: 200,
      y: 200,
    });
    state = addPlayer(state, "b", { x: 240, y: 200 });
    state.dog.x = 210;
    state.dog.y = 200;
    const after = run(state, 8, { a: stick(), b: stick() });
    expect(after.events.some((event) => event.type === "tagged" && event.victimId === "a")).toBe(true);
    expect(after.state.ball.ownerId).toBe("b");
    expect(after.state.players.b.score).toBeGreaterThan(0);
  });

  it("does not instantly re-tag after a catch so the new holder can pass", () => {
    let state = addPlayer(createMatch({ phase: "playing", scoreToWin: 9 }), "a", {
      x: 200,
      y: 200,
    });
    state = addPlayer(state, "b", { x: 240, y: 200 });
    state.dog.x = 210;
    state.dog.y = 200;
    const tagged = run(state, 8, { a: stick(), b: stick() });
    expect(tagged.events.some((event) => event.type === "tagged")).toBe(true);
    tagged.state.dog.x = tagged.state.players.b.x;
    tagged.state.dog.y = tagged.state.players.b.y;
    const after = run(tagged.state, 6, { a: stick(), b: stick() });
    expect(after.events.some((event) => event.type === "tagged")).toBe(false);
    expect(after.state.ball.ownerId).toBe("b");
  });
});
