import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("OpenAPI contract", () => {
  const spec = parse(readFileSync(resolve(root, "packages/protocol/openapi.yaml"), "utf8")) as {
    paths: Record<string, Record<string, unknown>>;
  };

  it("defines guest auth and room endpoints before any client", () => {
    expect(spec.paths["/api/auth/guest"]?.post).toBeTruthy();
    expect(spec.paths["/api/rooms"]?.post).toBeTruthy();
    expect(spec.paths["/api/rooms/{code}"]?.get).toBeTruthy();
  });
});

describe("docker compose", () => {
  const compose = parse(readFileSync(resolve(root, "docker-compose.yml"), "utf8")) as {
    services: Record<string, unknown>;
  };

  it("separates web, app, and data tiers", () => {
    expect(compose.services.postgres).toBeTruthy();
    expect(compose.services.redis).toBeTruthy();
    expect(compose.services.server).toBeTruthy();
    expect(compose.services.web).toBeTruthy();
  });
});
