export function formatHearts(hearts: number, max = 2): string {
  const full = Math.max(0, Math.min(max, Math.floor(hearts)));
  return `${"♥".repeat(full)}${"♡".repeat(max - full)}`;
}

export function formatRoster(players: { name: string; hearts: number }[]): string {
  return players.map((player) => `${player.name} ${formatHearts(player.hearts)}`).join("\n");
}

export function waitingCopy(phase: string): string {
  if (phase === "lobby") {
    return "等待第二位玩家…或按加 Bot 代玩";
  }
  return "";
}

export function endMatchTitle(winnerName: string): string {
  return `${winnerName || "玩家"} 贏了！`;
}

export function winnerNameFromRoster(players: { name: string; alive: boolean }[]): string {
  return players.find((player) => player.alive)?.name || "玩家";
}
