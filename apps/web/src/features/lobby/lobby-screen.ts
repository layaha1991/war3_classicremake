import { createLobbyApi } from "./api.js";

export function mountLobby(root: HTMLElement, onJoin: (roomCode: string, nickname: string) => Promise<void>): void {
  const params = new URLSearchParams(window.location.search);
  const preset = params.get("room") ?? "";
  root.innerHTML = `
    <main class="shell">
      <section class="card">
        <p class="eyebrow">War3 Classic Remake</p>
        <h1>秋名山甩狗</h1>
        <p class="lede">撿球、轉幾圈、KaMeHaMe 甩出去。開房間把網址丟給朋友。</p>
        <label>暱稱 <input id="nickname" maxlength="16" placeholder="拓海" /></label>
        <label>房間碼 <input id="roomCode" maxlength="6" value="${preset}" placeholder="選填，空白則開新房" /></label>
        <p id="error" class="error" hidden></p>
        <button id="play" type="button">進入競技場</button>
        <p class="hint">WASD 移動、滑鼠瞄準、J / 右鍵丟球、空白鍵閃爍。兩人到齊才開打。</p>
      </section>
    </main>
  `;

  const api = createLobbyApi();
  const error = root.querySelector("#error") as HTMLElement;
  const button = root.querySelector("#play") as HTMLButtonElement;

  button.addEventListener("click", async () => {
    const nickname = (root.querySelector("#nickname") as HTMLInputElement).value.trim();
    const roomInput = (root.querySelector("#roomCode") as HTMLInputElement).value.trim().toUpperCase();
    error.hidden = true;
    button.disabled = true;
    try {
      if (!nickname) {
        throw new Error("先取個暱稱");
      }
      await api.createGuest(nickname);
      let roomCode = roomInput;
      if (roomCode) {
        await api.getRoom(roomCode);
      } else {
        ({ roomCode } = await api.createRoom("shuagou"));
      }
      const url = new URL(window.location.href);
      url.searchParams.set("room", roomCode);
      window.history.replaceState({}, "", url);
      await onJoin(roomCode, nickname);
    } catch (err) {
      error.hidden = false;
      error.textContent = err instanceof Error ? err.message : "進房失敗";
      button.disabled = false;
    }
  });
}
