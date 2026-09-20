import { describe, expect, it } from "vitest";
import { ARENA } from "@war3/shared";
import { stickHome, TOUCH } from "./layout.js";

describe("portrait touch layout", () => {
  it("parks both sticks above the bottom edge of a 1080 by 1920 phone", () => {
    expect(ARENA).toEqual({ width: 1080, height: 1920 });
    expect(stickHome("move")).toEqual({ x: TOUCH.stickMarginX, y: ARENA.height - TOUCH.stickMarginY });
    expect(stickHome("aim")).toEqual({
      x: ARENA.width - TOUCH.stickMarginX,
      y: ARENA.height - TOUCH.stickMarginY,
    });
    expect(stickHome("move").y).toBeGreaterThan(ARENA.height * 0.8);
  });
});
