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
  @type("number") hearts = 2;
  @type("boolean") alive = true;
}

export class BallSchema extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") vx = 0;
  @type("number") vy = 0;
  @type("string") ownerId = "";
  @type("string") flightToId = "";
}

export class DogSchema extends Schema {
  @type("number") x = 600;
  @type("number") y = 400;
  @type("number") vx = 0;
  @type("number") vy = 0;
  @type("number") heading = 0;
  @type("number") speed = 70;
}

export class DriftDogState extends Schema {
  @type("string") phase = "lobby";
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type(BallSchema) ball = new BallSchema();
  @type(DogSchema) dog = new DogSchema();
  @type("number") timer = 0;
  @type("string") roomCode = "";
}
