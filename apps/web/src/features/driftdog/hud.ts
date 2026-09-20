export function formatHearts(hearts: number, max = 2): string {
  const full = Math.max(0, Math.min(max, Math.floor(hearts)));
  return `${"♥".repeat(full)}${"♡".repeat(max - full)}`;
}

export function formatRoster(players: { name: string; hearts: number }[]): string {
  return players.map((player) => `${player.name} ${formatHearts(player.hearts)}`).join("    ");
}

export function waitingCopy(phase: string): string {
  if (phase === "lobby") {
    return "等待第二位玩家…把網址傳給朋友";
  }
  if (phase === "ended") {
    return "只剩一人";
  }
  return "";
}
