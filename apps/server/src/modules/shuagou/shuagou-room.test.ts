import { describe, expect, it } from "vitest";
import { ShuagouRuntime } from "./shuagou-runtime.js";

describe("ShuagouRuntime", () => {
  it("starts only after two players join", () => {
    const runtime = new ShuagouRuntime();
    runtime.join("a", "拓海");
    expect(runtime.sim.phase).toBe("lobby");
    runtime.join("b", "武");
    expect(runtime.sim.phase).toBe("playing");
    expect(Object.keys(runtime.sim.players)).toHaveLength(2);
  });

  it("moves from sanitized inputs and ignores client coordinates", () => {
    const runtime = new ShuagouRuntime();
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

  it("passes the ball when the aim heading hits another player", () => {
    const runtime = new ShuagouRuntime();
    runtime.join("a", "拓海");
    runtime.join("b", "武");
    expect(runtime.sim.ball.ownerId).toBe("a");
    runtime.handlePass("a", 0);
    expect(runtime.sim.ball.ownerId).toBe("b");
    expect(runtime.sim.players.b.hasBall).toBe(true);
  });
});
