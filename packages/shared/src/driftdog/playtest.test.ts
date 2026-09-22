import { describe, expect, it } from "vitest";
import { addPlayer, createMatch } from "./sim.js";
import { ARENA, DOG_RADIUS, PARAMS, PLAYABLE_HEIGHT } from "./constants.js";
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
});
