import { createLobbyApi } from "./api.js";
import { newRoomCode } from "../driftdog/net.js";

export function mountLobby(root: HTMLElement, onJoin: (roomCode: string, nickname: string) => Promise<void>): void {
  const params = new URLSearchParams(window.location.search);
  const preset = params.get("room") ?? "";
  root.innerHTML = `
    <main class="shell">
      <section class="card">
        <p class="eyebrow">War3 Classic Remake</p>
        <h1>秋名山甩狗</h1>
        <p class="lede">Colyseus 跟 Photon 一樣走 WebSocket，朋友不在區網也能連。建立房間或從列表加入。</p>
        <label>暱稱 <input id="nickname" maxlength="16" placeholder="拓海" /></label>
        <div class="actions">
          <button id="host" type="button">建立房間</button>
          <button id="refresh" type="button" class="ghost">刷新列表</button>
        </div>
        <ul id="rooms" class="rooms"></ul>
        <p id="error" class="error" hidden></p>
        <p class="hint">左擳桿移動，右擳桿瞄光線，放開就傳球。每人兩顆心，狗從中間甩呔追持球者。</p>
      </section>
    </main>
  `;

  const api = createLobbyApi();
  const error = root.querySelector("#error") as HTMLElement;
  const list = root.querySelector("#rooms") as HTMLUListElement;
  const nicknameInput = root.querySelector("#nickname") as HTMLInputElement;
  const hostButton = root.querySelector("#host") as HTMLButtonElement;

  const nickname = () => nicknameInput.value.trim();

  const fail = (err: unknown, button?: HTMLButtonElement) => {
    error.hidden = false;
    error.textContent = err instanceof Error ? err.message : "連線失敗";
    if (button) {
      button.disabled = false;
    }
  };

  const enter = async (roomCode: string, button?: HTMLButtonElement) => {
    error.hidden = true;
    if (button) {
      button.disabled = true;
    }
    try {
      if (!nickname()) {
        throw new Error("先取個暱稱");
      }
      const url = new URL(window.location.href);
      url.searchParams.set("room", roomCode);
      window.history.replaceState({}, "", url);
      await onJoin(roomCode, nickname());
    } catch (err) {
      fail(err, button);
    }
  };

  const renderRooms = async () => {
    try {
      const { rooms } = await api.listRooms();
      if (rooms.length === 0) {
        list.innerHTML = `<li class="empty">現在沒有房間，按「建立房間」當房主。</li>`;
        return;
      }
      list.innerHTML = rooms
        .map(
          (room) => `
            <li>
              <span>${room.roomCode} · ${room.playerCount} 人</span>
              <button type="button" data-join="${room.roomCode}">加入</button>
            </li>
          `,
        )
        .join("");
    } catch {
      list.innerHTML = `<li class="empty">讀不到房間列表，檢查伺服器連線。</li>`;
    }
  };

  hostButton.addEventListener("click", () => enter(newRoomCode(), hostButton));
  root.querySelector("#refresh")?.addEventListener("click", () => {
    void renderRooms();
  });
  list.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest("button[data-join]");
    if (button instanceof HTMLButtonElement) {
      void enter(button.dataset.join ?? "", button);
    }
  });

  void renderRooms();
  if (preset) {
    nicknameInput.placeholder = `加入 ${preset}`;
  }
}
