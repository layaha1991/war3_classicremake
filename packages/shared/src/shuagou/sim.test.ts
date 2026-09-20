import { describe, expect, it } from "vitest";
import {
  addPlayer,
  blink,
  createMatch,
  step,
  throwBall,
} from "./sim.js";
import { ARENA, DT } from "./constants.js";

function hold(dir: { left?: boolean; right?: boolean; up?: boolean; down?: boolean }) {
  return { up: false, down: false, left: false, right: false, ...dir };
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
  it("moves a dog in the input direction and keeps them inside the arena", () => {
    let state = addPlayer(createMatch(), "a", { x: 200, y: 200 });
    ({ state } = run(state, 20, { a: hold({ right: true }) }));
    expect(state.players.a.x).toBeGreaterThan(200);
    expect(state.players.a.x).toBeLessThan(ARENA.width);
    expect(state.players.a.y).toBeGreaterThan(0);
  });

  it("picks up a free ball on contact and carries it", () => {
    let state = addPlayer(createMatch({ ball: { x: 220, y: 200 } }), "a", { x: 200, y: 200 });
    ({ state } = run(state, 15, { a: hold({ right: true }) }));
    expect(state.players.a.hasBall).toBe(true);
    expect(state.ball.ownerId).toBe("a");
    expect(Math.hypot(state.ball.x - state.players.a.x, state.ball.y - state.players.a.y)).toBeLessThan(30);
  });

  it("charges spin while the carrier turns, then throws along heading", () => {
    let state = addPlayer(createMatch({ ball: { x: 200, y: 200 } }), "a", { x: 200, y: 200 });
    ({ state } = run(state, 3, { a: hold() }));
    expect(state.players.a.hasBall).toBe(true);

    for (let i = 0; i < 40; i += 1) {
      const heading = (i / 8) * Math.PI;
      ({ state } = step(state, { a: { ...hold(), facing: heading } }, DT));
    }
    expect(state.ball.spin).toBeGreaterThan(0.5);

    const thrown = throwBall(state, "a");
    state = thrown.state;
    expect(thrown.events.some((event) => event.type === "throw")).toBe(true);
    expect(state.players.a.hasBall).toBe(false);
    expect(state.ball.ownerId).toBeNull();
    expect(Math.hypot(state.ball.vx, state.ball.vy)).toBeGreaterThan(200);
  });

  it("scores when a thrown ball hits another dog, not the thrower", () => {
    let state = addPlayer(createMatch({ ball: { x: 200, y: 200 } }), "a", { x: 200, y: 200, heading: 0 });
    state = addPlayer(state, "b", { x: 360, y: 200 });
    ({ state } = run(state, 3, { a: hold(), b: hold() }));

    const thrown = throwBall(state, "a");
    state = thrown.state;
    const after = run(state, 30, { a: hold(), b: hold() });
    expect(after.events.some((event) => event.type === "hit" && event.victimId === "b")).toBe(true);
    expect(after.state.players.a.score).toBe(1);
    expect(after.state.players.b.score).toBe(0);
  });

  it("blinks forward and then ignores blink until cooldown ends", () => {
    let state = addPlayer(createMatch(), "a", { x: 200, y: 200, heading: 0 });
    const first = blink(state, "a");
    expect(first.state.players.a.x).toBeGreaterThan(200);
    expect(first.state.players.a.blinkCd).toBeGreaterThan(0);

    const blocked = blink(first.state, "a");
    expect(blocked.state.players.a.x).toBe(first.state.players.a.x);
    expect(blocked.events).toEqual([]);
  });

  it("ends the match when a player reaches the score limit", () => {
    let state = addPlayer(createMatch({ scoreToWin: 1, ball: { x: 200, y: 200 } }), "a", {
      x: 200,
      y: 200,
      heading: 0,
    });
    state = addPlayer(state, "b", { x: 360, y: 200 });
    ({ state } = run(state, 3, { a: hold(), b: hold() }));
    state = throwBall(state, "a").state;
    const after = run(state, 30, { a: hold(), b: hold() });
    expect(after.state.phase).toBe("ended");
    expect(after.events.some((event) => event.type === "win" && event.playerId === "a")).toBe(true);
  });
});
