import { endMatchTitle, winnerNameFromRoster } from "./hud.js";

export interface EndOverlayActions {
  winnerName: string;
  onRematch: () => void;
  onLobby: () => void;
}

export function rosterFromState(state: {
  players?: { forEach?: (cb: (player: { name?: string; alive?: boolean }) => void) => void };
}): { name: string; alive: boolean }[] {
  const roster: { name: string; alive: boolean }[] = [];
  state.players?.forEach?.((player) => {
    roster.push({ name: String(player.name ?? ""), alive: player.alive !== false });
  });
  return roster;
}

export function mountEndOverlay(root: HTMLElement, actions: EndOverlayActions): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "end-overlay";
  const card = document.createElement("div");
  card.className = "end-card";
  const title = document.createElement("p");
  title.className = "end-title";
  title.textContent = endMatchTitle(actions.winnerName);
  const buttons = document.createElement("div");
  buttons.className = "actions end-actions";
  const rematch = document.createElement("button");
  rematch.type = "button";
  rematch.textContent = "再來一次";
  rematch.addEventListener("click", actions.onRematch);
  const lobby = document.createElement("button");
  lobby.type = "button";
  lobby.className = "ghost";
  lobby.textContent = "回大廳";
  lobby.addEventListener("click", actions.onLobby);
  buttons.append(rematch, lobby);
  card.append(title, buttons);
  overlay.append(card);
  root.append(overlay);
  return overlay;
}

export function wireEndOverlay(
  host: HTMLElement,
  room: {
    state: {
      phase?: string;
      players?: { forEach?: (cb: (player: { name?: string; alive?: boolean }) => void) => void };
    };
    onStateChange: (callback: () => void) => void;
  },
  actions: { onRematch: () => void; onLobby: () => void },
): void {
  const root = document.createElement("div");
  host.append(root);
  let current: HTMLElement | undefined;

  const render = () => {
    if (String(room.state.phase ?? "") !== "ended") {
      current?.remove();
      current = undefined;
      return;
    }
    if (current) {
      return;
    }
    current = mountEndOverlay(root, {
      winnerName: winnerNameFromRoster(rosterFromState(room.state)),
      onRematch: actions.onRematch,
      onLobby: actions.onLobby,
    });
  };

  room.onStateChange(render);
  render();
}
