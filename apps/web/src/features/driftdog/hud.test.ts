import { describe, expect, it } from "vitest";
import { endMatchTitle, formatHearts, formatRoster, waitingCopy, winnerNameFromRoster } from "./hud.js";

describe("driftdog hud", () => {
  it("shows two hearts, then one red and one gray after a hit", () => {
    expect(formatHearts(2)).toBe("♥♥");
    expect(formatHearts(1)).toBe("♥♡");
    expect(formatHearts(0)).toBe("♡♡");
    expect(formatRoster([
      { name: "拓海", hearts: 2 },
      { name: "武", hearts: 1 },
    ])).toBe("拓海 ♥♥\n武 ♥♡");
  });

  it("tells a lone player to wait and names the last survivor", () => {
    expect(waitingCopy("lobby")).toBe("等待第二位玩家…把網址傳給朋友");
    expect(waitingCopy("playing")).toBe("");
    expect(waitingCopy("ended")).toBe("");
    expect(endMatchTitle("拓海")).toBe("拓海 贏了！");
    expect(winnerNameFromRoster([
      { name: "拓海", alive: false },
      { name: "武", alive: true },
    ])).toBe("武");
  });
});
