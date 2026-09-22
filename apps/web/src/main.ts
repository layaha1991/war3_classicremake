import { mountLobby } from "./features/lobby/lobby-screen.js";
import { joinDriftDog } from "./features/driftdog/net.js";
import { bootGame } from "./features/shell/boot-game.js";
import "./features/shell/styles.css";

const app = document.querySelector("#app");
if (!app) {
  throw new Error("#app missing");
}

const root = app as HTMLElement;
let lastNickname = "";

function showLobby(): void {
  mountLobby(root, enterRoom);
  if (!lastNickname) {
    return;
  }
  const input = root.querySelector("#nickname");
  if (input instanceof HTMLInputElement) {
    input.value = lastNickname;
  }
}

async function enterRoom(roomCode: string, nickname: string, options: { fillBots?: boolean } = {}): Promise<void> {
  lastNickname = nickname;
  const room = await joinDriftDog(roomCode, nickname, options);
  root.replaceChildren();
  const gameRoot = document.createElement("div");
  gameRoot.id = "game";
  root.append(gameRoot);
  bootGame(gameRoot, room, {
    onReturnLobby: () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("room");
      window.history.replaceState({}, "", url);
      showLobby();
    },
  });
}

showLobby();
