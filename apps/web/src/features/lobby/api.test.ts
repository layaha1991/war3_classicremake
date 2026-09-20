import { describe, expect, it, vi } from "vitest";
import { createLobbyApi } from "./api.js";

describe("lobby api", () => {
  it("creates a guest session with httpOnly cookies, never storing tokens", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    const api = createLobbyApi(fetchMock as unknown as typeof fetch);
    await api.createGuest("拓海");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/guest", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: "拓海" }),
    });
  });

  it("creates and looks up rooms by code", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ roomCode: "ABC123" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ mapId: "shuagou", status: "lobby", playerCount: 0 }),
      });
    const api = createLobbyApi(fetchMock as unknown as typeof fetch);
    await expect(api.createRoom("shuagou")).resolves.toEqual({ roomCode: "ABC123" });
    await expect(api.getRoom("ABC123")).resolves.toEqual({
      mapId: "shuagou",
      status: "lobby",
      playerCount: 0,
    });
  });
});
