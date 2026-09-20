export {
  MAPS,
  getMap,
  isImplementedMap,
  listMaps,
  type MapDefinition,
  type MapId,
} from "./maps/registry.js";
export {
  ARENA,
  BLINK_COOLDOWN,
  BLINK_DISTANCE,
  DEFAULT_MATCH_TIME,
  DEFAULT_SCORE_TO_WIN,
  DT,
  TICK_RATE,
} from "./shuagou/constants.js";
export { addPlayer, blink, createMatch, removePlayer, step, throwBall } from "./shuagou/sim.js";
export type {
  BallState,
  MatchPhase,
  MatchState,
  PlayerInput,
  PlayerState,
  SimEvent,
  StepResult,
} from "./shuagou/types.js";
