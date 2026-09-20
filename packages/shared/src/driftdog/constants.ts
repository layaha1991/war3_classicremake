/**
 * All match tunables. Change numbers here; do not scatter magic values.
 */
export const PARAMS = {
  tickRate: 20,
  arena: {
    width: 1200,
    height: 800,
  },
  player: {
    speed: 220,
    radius: 18,
    turnRate: 7,
  },
  ball: {
    radius: 10,
    carryOffset: 22,
    /** Pixels per second while a pass is in the air. Higher = quicker flight. */
    flySpeed: 480,
    catchRange: 24,
  },
  dog: {
    radius: 20,
    startX: 600,
    startY: 400,
    /** Speed after spawn / after a tag reset. */
    initialSpeed: 70,
    /** Speed added per second while chasing, up to maxSpeed. */
    accel: 180,
    maxSpeed: 280,
    /** Lower = wider drifting turns. */
    turnRate: 1.05,
    /** Lower = more slip. Velocity lags behind heading. */
    drift: 0.7,
    catchRange: 34,
    stun: 1.4,
  },
  lives: {
    hearts: 2,
  },
  ray: {
    hitWidth: 26,
    maxDist: 900,
  },
} as const;

export const TICK_RATE = PARAMS.tickRate;
export const DT = 1 / TICK_RATE;
export const ARENA = PARAMS.arena;
export const PLAYER_SPEED = PARAMS.player.speed;
export const PLAYER_RADIUS = PARAMS.player.radius;
export const PLAYER_TURN_RATE = PARAMS.player.turnRate;
export const BALL_RADIUS = PARAMS.ball.radius;
export const BALL_CARRY_OFFSET = PARAMS.ball.carryOffset;
export const BALL_FLY_SPEED = PARAMS.ball.flySpeed;
export const BALL_CATCH_RANGE = PARAMS.ball.catchRange;
export const DOG_INITIAL_SPEED = PARAMS.dog.initialSpeed;
export const DOG_ACCEL = PARAMS.dog.accel;
export const DOG_MAX_SPEED = PARAMS.dog.maxSpeed;
export const DOG_TURN_RATE = PARAMS.dog.turnRate;
export const DOG_DRIFT = PARAMS.dog.drift;
export const DOG_CATCH_RANGE = PARAMS.dog.catchRange;
export const DOG_STUN = PARAMS.dog.stun;
export const DOG_RADIUS = PARAMS.dog.radius;
export const RAY_HIT_WIDTH = PARAMS.ray.hitWidth;
export const RAY_MAX_DIST = PARAMS.ray.maxDist;
export const STARTING_HEARTS = PARAMS.lives.hearts;
