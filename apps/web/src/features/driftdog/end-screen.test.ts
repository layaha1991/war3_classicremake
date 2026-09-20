import { describe, expect, it, vi } from "vitest";
import { rosterFromState } from "./end-screen.js";
import { winnerNameFromRoster } from "./hud.js";

describe("end overlay roster", () => {
  it("reads the living winner from room state", () => {
    const state = {
      players: {
        forEach(cb: (player: { name?: string; alive?: boolean }) => void) {
          cb({ name: "拓海", alive: false });
          cb({ name: "武", alive: true });
        },
      },
    };
    expect(winnerNameFromRoster(rosterFromState(state))).toBe("武");
  });

  it("treats missing alive as living", () => {
    const spy = vi.fn();
    rosterFromState({
      players: {
        forEach(cb) {
          cb({ name: "拓海" });
          spy();
        },
      },
    });
    expect(spy).toHaveBeenCalledOnce();
    expect(rosterFromState({}).length).toBe(0);
  });
});
