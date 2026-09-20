export interface RoomSummary {
  mapId: string;
  status: string;
  playerCount: number;
}

export function createLobbyApi(fetchImpl: typeof fetch = fetch) {
  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetchImpl(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });
    if (!response.ok) {
      throw new Error(`request failed: ${response.status}`);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  return {
    createGuest(nickname: string) {
      return request<void>("/api/auth/guest", {
        method: "POST",
        body: JSON.stringify({ nickname }),
      });
    },
    createRoom(mapId: string) {
      return request<{ roomCode: string }>("/api/rooms", {
        method: "POST",
        body: JSON.stringify({ mapId }),
      });
    },
    getRoom(code: string) {
      return request<RoomSummary>(`/api/rooms/${code}`);
    },
    listRooms() {
      return request<{ rooms: { roomCode: string; playerCount: number }[] }>("/api/rooms");
    },
  };
}
