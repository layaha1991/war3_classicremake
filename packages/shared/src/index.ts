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
  RAY_MAX_DIST,
  TICK_RATE,
} from "./shuagou/constants.js";
export {
  addPlayer,
  blink,
  createMatch,
  passBall,
  playerHitByRay,
  removePlayer,
  step,
  throwBall,
} from "./shuagou/sim.js";
export type {
  BallState,
  DogState,
  MatchPhase,
  MatchState,
  PlayerInput,
  PlayerState,
  SimEvent,
  StepResult,
} from "./shuagou/types.js";
