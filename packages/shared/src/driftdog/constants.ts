/**
 * All match tunables. Change numbers here; do not scatter magic values.
 */
export const PARAMS = {
  tickRate: 20,
  arena: {
    width: 1080,
    height: 1920,
  },
  /** Bottom fraction reserved for touch controls. */
  controlBand: 0.2,
  player: {
    /** Instant analog speed at stick rim. Players have no drift. */
    speed: 440,
    radius: 36,
    displayWidth: 192,
    /** Twice the original 96px size, kept square so the sprite is not stretched. */
    displayHeight: 192,
    /** Five body lengths (uses the taller visual height). */
    blinkDistance: 960,
    blinkCooldown: 7,
  },
  ball: {
    radius: 16,
    carryOffset: 80,
    /** Pixels per second while a pass is in the air. Higher = quicker flight. */
    flySpeed: 480,
    catchRange: 36,
  },
  dog: {
    radius: 168,
    startX: 540,
    startY: 768,
    /** Speed after spawn / after a tag reset. */
    initialSpeed: 70,
    /** Speed added per second while chasing, up to maxSpeed. */
    accel: 180,
    maxSpeed: 280,
    /** Lower = wider drifting turns. */
    turnRate: 1.05,
    /** Lower = more slip. Velocity lags behind heading. */
    drift: 0.7,
    display: 480,
    catchRange: 256,
    stun: 1.4,
  },
  lives: {
    hearts: 2,
  },
  ray: {
    hitWidth: 26,
    maxDist: 2200,
  },
} as const;

export const TICK_RATE = PARAMS.tickRate;
export const DT = 1 / TICK_RATE;
export const ARENA = PARAMS.arena;
export const CONTROL_BAND = PARAMS.controlBand;
export const PLAYABLE_HEIGHT = ARENA.height * (1 - CONTROL_BAND);
export const PLAYER_SPEED = PARAMS.player.speed;
export const PLAYER_RADIUS = PARAMS.player.radius;
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
export const BLINK_DISTANCE = PARAMS.player.blinkDistance;
export const BLINK_COOLDOWN = PARAMS.player.blinkCooldown;
