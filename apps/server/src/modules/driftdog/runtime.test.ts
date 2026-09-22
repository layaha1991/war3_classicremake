import { describe, expect, it } from "vitest";
import { PARAMS } from "@war3/shared";
import { DriftDogRuntime } from "./runtime.js";

describe("DriftDogRuntime", () => {
  it("starts only after two players join", () => {
    const runtime = new DriftDogRuntime();
    runtime.join("a", "拓海");
    expect(runtime.sim.phase).toBe("lobby");
    runtime.join("b", "武");
    expect(runtime.sim.phase).toBe("playing");
    expect(Object.keys(runtime.sim.players)).toHaveLength(2);
  });

  it("moves from sanitized inputs and ignores client coordinates", () => {
    const runtime = new DriftDogRuntime();
    runtime.join("a", "拓海");
    runtime.join("b", "武");
    const startX = runtime.sim.players.a.x;

    runtime.handleInput("a", { right: true, x: 12, y: 12 });
    for (let i = 0; i < 8; i += 1) {
      runtime.tick();
    }

    expect(runtime.sim.players.a.x).toBeGreaterThan(startX);
    expect(runtime.sim.players.a.x).not.toBe(12);
    expect(runtime.sim.players.a.y).not.toBe(12);
  });

  it("lets anyone rematch the same room after the match ends", () => {
    const runtime = new DriftDogRuntime();
    runtime.join("a", "拓海");
    runtime.join("b", "武");
    runtime.sim.phase = "ended";
    runtime.sim.players.a.alive = false;
    runtime.sim.players.a.hearts = 0;
    runtime.handleRematch("a");
    expect(runtime.sim.phase).toBe("playing");
    expect(runtime.sim.players.a.alive).toBe(true);
    expect(runtime.sim.players.a.hearts).toBe(2);
  });

  it("ignores rematch before the match ends", () => {
    const runtime = new DriftDogRuntime();
    runtime.join("a", "拓海");
    runtime.join("b", "武");
    runtime.sim.players.a.x = 111;
    runtime.handleRematch("a");
    expect(runtime.sim.phase).toBe("playing");
    expect(runtime.sim.players.a.x).toBe(111);
  });

  it("passes the ball when the aim heading hits another player", () => {
    const runtime = new DriftDogRuntime();
    runtime.join("a", "拓海");
    runtime.join("b", "武");
    expect(runtime.sim.ball.ownerId).toBe("a");
    runtime.handlePass("a", 0);
    expect(runtime.sim.ball.flightToId).toBe("b");
    expect(runtime.sim.ball.ownerId).toBeNull();
  });

  it("blinks a living player along their heading and ignores cooldown repeats", () => {
    const runtime = new DriftDogRuntime();
    runtime.join("a", "拓海");
    runtime.join("b", "武");
    runtime.sim.players.a.x = 80;
    runtime.sim.players.a.y = 400;
    runtime.sim.players.a.heading = 0;
    runtime.handleBlink("a");
    expect(runtime.sim.players.a.x).toBeCloseTo(80 + PARAMS.player.blinkDistance);
    expect(runtime.events.some((event) => event.type === "blink" && event.playerId === "a")).toBe(true);
    runtime.handleBlink("a");
    expect(runtime.sim.players.a.x).toBeCloseTo(80 + PARAMS.player.blinkDistance);
  });

  it("fills dummy players so a lone host can start watching them play", () => {
    const runtime = new DriftDogRuntime();
    runtime.join("a", "拓海");
    expect(runtime.sim.phase).toBe("lobby");
    runtime.fillDummies();
    expect(runtime.sim.phase).toBe("playing");
    expect(runtime.dummyIds.length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(runtime.sim.players)).toHaveLength(1 + runtime.dummyIds.length);
    expect(runtime.names[runtime.dummyIds[0] ?? ""]).toMatch(/^Bot /);
    expect(runtime.isDummy(runtime.dummyIds[0] ?? "")).toBe(true);
    expect(runtime.isDummy("a")).toBe(false);
  });

  it("ticks dummy players with the shared playtest brain", () => {
    const runtime = new DriftDogRuntime();
    runtime.join("holder", "拓海");
    runtime.fillDummies(2);
    const dummyId = runtime.dummyIds[0];
    expect(dummyId).toBeTruthy();
    runtime.sim.dog.stun = 99;
    runtime.sim.dog.x = 1000;
    runtime.sim.dog.y = 1000;
    const startX = runtime.sim.players[dummyId ?? ""]?.x ?? 0;
    for (let i = 0; i < 8; i += 1) {
      runtime.tick();
    }
    expect(runtime.sim.players[dummyId ?? ""]?.x ?? startX).toBeLessThan(startX);
  });

  it("keeps dummies after rematch and drops them only when asked", () => {
    const runtime = new DriftDogRuntime();
    runtime.join("a", "拓海");
    runtime.fillDummies();
    const dummyId = runtime.dummyIds[0] ?? "";
    runtime.sim.phase = "ended";
    runtime.handleRematch("a");
    expect(runtime.sim.phase).toBe("playing");
    expect(runtime.dummyIds).toContain(dummyId);
    expect(runtime.sim.players[dummyId]?.alive).toBe(true);
    runtime.leave(dummyId);
    expect(runtime.dummyIds).not.toContain(dummyId);
    expect(runtime.sim.players[dummyId]).toBeUndefined();
  });
});
