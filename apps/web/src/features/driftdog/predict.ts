import { addPlayer, createMatch, step, type PlayerInput } from "@war3/shared";

export function predictLocal(
  player: { id: string; x: number; y: number; heading: number },
  input: PlayerInput,
  dt: number,
): { x: number; y: number; heading: number } {
  let state = addPlayer(createMatch({ phase: "playing" }), player.id, {
    x: player.x,
    y: player.y,
    heading: player.heading,
  });
  state = step(state, { [player.id]: input }, dt).state;
  const next = state.players[player.id];
  return { x: next.x, y: next.y, heading: next.heading };
}
