import { describe, expect, it } from "vitest";
import { hasRoomState, waitForRoomState } from "./net.js";

describe("room state readiness", () => {
  it("rejects an empty Colyseus state before the first snapshot", () => {
    expect(hasRoomState(undefined)).toBe(false);
    expect(hasRoomState({})).toBe(false);
    expect(hasRoomState({ phase: "lobby" })).toBe(false);
    expect(hasRoomState({ players: {}, ball: { x: 1, y: 2 } })).toBe(true);
  });

  it("waits for onStateChange when the snapshot is still missing", async () => {
    const listeners: Array<() => void> = [];
    const room = {
      state: {},
      onStateChange: {
        once(callback: () => void) {
          listeners.push(callback);
        },
      },
    };
    const pending = waitForRoomState(room);
    room.state = { players: {}, ball: { x: 10, y: 20 } };
    listeners[0]?.();
    await expect(pending).resolves.toBeUndefined();
  });
});
