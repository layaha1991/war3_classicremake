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
  BALL_FLY_SPEED,
  DT,
  PARAMS,
  RAY_MAX_DIST,
  STARTING_HEARTS,
  TICK_RATE,
} from "./driftdog/constants.js";
export {
  addPlayer,
  blink,
  createMatch,
  passBall,
  playerHitByRay,
  removePlayer,
  restartMatch,
  step,
  throwBall,
} from "./driftdog/sim.js";
export type {
  BallState,
  DogState,
  MatchPhase,
  MatchState,
  PlayerInput,
  PlayerState,
  SimEvent,
  StepResult,
} from "./driftdog/types.js";
