import { ARENA, DOG_RADIUS, DT, PLAYABLE_HEIGHT } from "./constants.js";
import { dummyInput, dummyPassHeading, dummyShouldBlink } from "./dummy.js";
import { addPlayer, blink, createMatch, passBall, playerHitByRay, step } from "./sim.js";

export interface PlaytestReport {
  seconds: number;
  cornerTime: number;
  tags: number;
  timeToFirstTag: number | null;
  avgDistToHolder: number;
  ended: boolean;
  reason: "timeout" | "ended";
}

const CORNER_PAD = 40;

export function dogInCorner(dog: { x: number; y: number }, pad = CORNER_PAD): boolean {
  const reach = DOG_RADIUS + pad;
  const corners = [
    { x: DOG_RADIUS, y: DOG_RADIUS },
    { x: ARENA.width - DOG_RADIUS, y: DOG_RADIUS },
    { x: DOG_RADIUS, y: PLAYABLE_HEIGHT - DOG_RADIUS },
    { x: ARENA.width - DOG_RADIUS, y: PLAYABLE_HEIGHT - DOG_RADIUS },
  ];
  return corners.some((corner) => Math.hypot(dog.x - corner.x, dog.y - corner.y) <= reach);
}

export function isPlaytestBroken(
  report: Pick<PlaytestReport, "seconds" | "cornerTime" | "tags" | "avgDistToHolder">,
): boolean {
  if (report.cornerTime > 0.15) {
    return true;
  }
  return report.seconds >= 20 && report.tags === 0 && report.avgDistToHolder > 400;
}

export function runPlaytest(seconds = 20): PlaytestReport {
  let state = addPlayer(createMatch({ phase: "playing" }), "bot-a", { x: 280, y: 400 });
  state = addPlayer(state, "bot-b", { x: 800, y: 1100 });
  state = addPlayer(state, "bot-c", { x: 540, y: 240 });
  const frames = Math.max(1, Math.round(seconds / DT));
  let cornerFrames = 0;
  let tags = 0;
  let timeToFirstTag: number | null = null;
  let distSum = 0;
  let distSamples = 0;

  for (let i = 0; i < frames; i += 1) {
    const inputs = Object.fromEntries(Object.keys(state.players).map((id) => [id, dummyInput(state, id)]));
    for (const id of Object.keys(state.players)) {
      const pass = dummyPassHeading(state, id);
      if (pass !== undefined) {
        const toId = playerHitByRay(state.players[id] ?? { x: 0, y: 0 }, pass, Object.values(state.players), id);
        if (toId) {
          state = passBall(state, id, toId).state;
        }
      }
      if (dummyShouldBlink(state, id)) {
        state = blink(state, id).state;
      }
    }
    const result = step(state, inputs, DT);
    state = result.state;
    for (const event of result.events) {
      if (event.type === "tagged") {
        tags += 1;
        timeToFirstTag ??= state.timer;
      }
    }
    if (dogInCorner(state.dog)) {
      cornerFrames += 1;
    }
    const holder = state.ball.ownerId ? state.players[state.ball.ownerId] : undefined;
    if (holder?.alive) {
      distSum += Math.hypot(holder.x - state.dog.x, holder.y - state.dog.y);
      distSamples += 1;
    }
    if (state.phase === "ended") {
      return {
        seconds: state.timer,
        cornerTime: cornerFrames / (i + 1),
        tags,
        timeToFirstTag,
        avgDistToHolder: distSamples ? distSum / distSamples : 0,
        ended: true,
        reason: "ended",
      };
    }
  }

  return {
    seconds: state.timer,
    cornerTime: cornerFrames / frames,
    tags,
    timeToFirstTag,
    avgDistToHolder: distSamples ? distSum / distSamples : 0,
    ended: state.phase === "ended",
    reason: "timeout",
  };
}
