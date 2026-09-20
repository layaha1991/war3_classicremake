export function formatTimer(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function formatScores(players: { name: string; score: number }[]): string {
  return players
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((player) => `${player.name} ${player.score}`)
    .join("   ");
}

export function formatShout(name: string): string {
  return `${name}：KaMeHaMe！`;
}

export function waitingCopy(phase: string): string {
  if (phase === "lobby") {
    return "等待第二位玩家…把網址傳給朋友";
  }
  if (phase === "ended") {
    return "比賽結束";
  }
  return "";
}
