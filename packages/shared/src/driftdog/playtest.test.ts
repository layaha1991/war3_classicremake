import { describe, expect, it } from "vitest";
import { addPlayer, createMatch, step } from "./sim.js";
import { ARENA, DOG_RADIUS, DT, PARAMS, PLAYABLE_HEIGHT } from "./constants.js";
import { dummyInput, dummyShouldBlink } from "./dummy.js";
import { dogInCorner, isPlaytestBroken, runPlaytest } from "./playtest.js";

describe("dummy playtest harness", () => {
  it("makes the holder flee the dog and others close in for a catch", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 400, y: 400 });
    state = addPlayer(state, "b", { x: 800, y: 400 });
    state.dog.x = 80;
    state.dog.y = 400;
    const holder = dummyInput(state, "a");
    expect(holder.moveX ?? 0).toBeGreaterThan(0.4);
    const mate = dummyInput(state, "b");
    expect(mate.moveX ?? 0).toBeLessThan(-0.4);
    expect(dummyShouldBlink(state, "a")).toBe(false);
  });

  it("marks the four arena corners and flags corner camping", () => {
    expect(dogInCorner({ x: ARENA.width / 2, y: PLAYABLE_HEIGHT / 2 })).toBe(false);
    expect(dogInCorner({ x: DOG_RADIUS, y: DOG_RADIUS })).toBe(true);
    expect(dogInCorner({ x: ARENA.width - DOG_RADIUS, y: DOG_RADIUS })).toBe(true);
    expect(dogInCorner({ x: DOG_RADIUS, y: PLAYABLE_HEIGHT - DOG_RADIUS })).toBe(true);
    expect(dogInCorner({ x: ARENA.width - DOG_RADIUS, y: PLAYABLE_HEIGHT - DOG_RADIUS })).toBe(true);
    expect(
      isPlaytestBroken({
        seconds: 20,
        cornerTime: 0.4,
        tags: 0,
        timeToFirstTag: null,
        avgDistToHolder: 500,
        ended: false,
      }),
    ).toBe(true);
    expect(
      isPlaytestBroken({
        seconds: 20,
        cornerTime: 0.05,
        tags: 2,
        timeToFirstTag: 4,
        avgDistToHolder: 180,
        ended: false,
      }),
    ).toBe(false);
    expect(PARAMS.dog.radius).toBe(DOG_RADIUS);
  });

  it("runs a timed dummy match and reports chase metrics", () => {
    const report = runPlaytest(4);
    expect(report.seconds).toBeCloseTo(4, 1);
    expect(report.cornerTime).toBeGreaterThanOrEqual(0);
    expect(report.cornerTime).toBeLessThanOrEqual(1);
    expect(report.tags).toBeGreaterThanOrEqual(0);
    expect(report.avgDistToHolder).toBeGreaterThan(0);
    expect(["timeout", "ended"]).toContain(report.reason);
  });

  it("leaves a corner after a high-speed wall slam and can tag a still holder", () => {
    let state = addPlayer(createMatch({ phase: "playing" }), "a", { x: 540, y: 768 });
    state = addPlayer(state, "b", { x: 900, y: 1200 });
    state.dog.x = 280;
    state.dog.y = DOG_RADIUS;
    state.dog.heading = Math.PI;
    state.dog.vx = -PARAMS.dog.maxSpeed;
    state.dog.vy = -200;
    state.dog.speed = PARAMS.dog.maxSpeed;
    state.dog.stun = 0;
    const idle = { up: false, down: false, left: false, right: false };
    let seenCorner = false;
    let leftCorner = false;
    let tagged = false;
    for (let i = 0; i < Math.round(8 / DT); i += 1) {
      const result = step(state, { a: idle, b: idle }, DT);
      state = result.state;
      if (dogInCorner(state.dog)) {
        seenCorner = true;
      } else if (seenCorner) {
        leftCorner = true;
      }
      if (result.events.some((event) => event.type === "tagged" && event.victimId === "a")) {
        tagged = true;
        break;
      }
    }
    expect(seenCorner).toBe(true);
    expect(leftCorner).toBe(true);
    expect(tagged).toBe(true);
  });

  it("keeps dummy matches playable instead of camping the four corners", () => {
    const report = runPlaytest(20);
    expect(isPlaytestBroken(report)).toBe(false);
    expect(report.cornerTime).toBeLessThanOrEqual(0.15);
  });
});
