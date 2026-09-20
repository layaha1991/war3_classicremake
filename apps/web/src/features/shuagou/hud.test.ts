import { describe, expect, it } from "vitest";
import { formatScores, formatShout, formatTimer, waitingCopy } from "./hud.js";

describe("shuagou hud", () => {
  it("formats timer, scores, and KaMeHaMe shout", () => {
    expect(formatTimer(183)).toBe("3:03");
    expect(formatTimer(9)).toBe("0:09");
    expect(formatScores([
      { name: "拓海", score: 2 },
      { name: "武", score: 1 },
    ])).toBe("拓海 2   武 1");
    expect(formatShout("拓海")).toBe("拓海：KaMeHaMe！");
  });

  it("tells a lone player to wait", () => {
    expect(waitingCopy("lobby")).toBe("等待第二位玩家…把網址傳給朋友");
    expect(waitingCopy("playing")).toBe("");
    expect(waitingCopy("ended")).toBe("比賽結束");
  });
});
