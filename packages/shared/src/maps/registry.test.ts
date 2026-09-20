import { describe, expect, it } from "vitest";
import { getMap, isImplementedMap, listMaps } from "./registry.js";

describe("map registry", () => {
  it("lists the three remake maps", () => {
    const ids = listMaps().map((map) => map.id);
    expect(ids).toEqual(
      expect.arrayContaining(["shuagou", "haoren-td", "element-td"]),
    );
  });

  it("marks only shuagou as implemented", () => {
    expect(getMap("shuagou")?.implemented).toBe(true);
    expect(getMap("haoren-td")?.implemented).toBe(false);
    expect(getMap("element-td")?.implemented).toBe(false);
    expect(isImplementedMap("shuagou")).toBe(true);
    expect(isImplementedMap("haoren-td")).toBe(false);
  });

  it("returns undefined for unknown map ids", () => {
    expect(getMap("unknown")).toBeUndefined();
    expect(isImplementedMap("unknown")).toBe(false);
  });

  it("caps shuagou at 8 players for the mvp", () => {
    expect(getMap("shuagou")?.minPlayers).toBe(2);
    expect(getMap("shuagou")?.maxPlayers).toBe(8);
  });
});
