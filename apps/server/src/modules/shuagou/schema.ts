import { MapSchema, Schema, type } from "@colyseus/schema";

export class PlayerSchema extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") vx = 0;
  @type("number") vy = 0;
  @type("number") heading = 0;
  @type("boolean") hasBall = false;
  @type("number") score = 0;
  @type("number") blinkCd = 0;
}

export class BallSchema extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") vx = 0;
  @type("number") vy = 0;
  @type("string") ownerId = "";
  @type("number") spin = 0;
}

export class DogSchema extends Schema {
  @type("number") x = 80;
  @type("number") y = 720;
  @type("number") vx = 0;
  @type("number") vy = 0;
  @type("number") heading = 0;
}

export class ShuagouState extends Schema {
  @type("string") phase = "lobby";
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type(BallSchema) ball = new BallSchema();
  @type(DogSchema) dog = new DogSchema();
  @type("number") timer = 180;
  @type("number") scoreToWin = 5;
  @type("string") lastShout = "";
  @type("string") roomCode = "";
}
