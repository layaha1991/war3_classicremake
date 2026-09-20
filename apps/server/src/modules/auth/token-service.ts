import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { SessionStore } from "./types.js";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AccessClaims {
  sub: string;
  nickname: string;
}

export class TokenService {
  constructor(
    private readonly options: {
      secret: string;
      accessTtlSec: number;
      refreshTtlSec: number;
    },
  ) {}

  private key(): Uint8Array {
    return new TextEncoder().encode(this.options.secret);
  }

  async issue(payload: AccessClaims, sessions: SessionStore): Promise<TokenPair> {
    const jti = randomUUID();
    const accessToken = await new SignJWT({ nickname: payload.nickname })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(`${this.options.accessTtlSec}s`)
      .sign(this.key());
    const refreshToken = await new SignJWT({ nickname: payload.nickname })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setJti(jti)
      .setIssuedAt()
      .setExpirationTime(`${this.options.refreshTtlSec}s`)
      .sign(this.key());
    await sessions.saveRefresh(jti, payload.sub, this.options.refreshTtlSec);
    return { accessToken, refreshToken };
  }

  async verifyAccess(token: string): Promise<AccessClaims> {
    const { payload } = await jwtVerify(token, this.key());
    if (!payload.sub || typeof payload.nickname !== "string") {
      throw new Error("invalid access token");
    }
    return { sub: payload.sub, nickname: payload.nickname };
  }

  async rotateRefresh(refreshToken: string, sessions: SessionStore): Promise<TokenPair> {
    let payload;
    try {
      ({ payload } = await jwtVerify(refreshToken, this.key()));
    } catch {
      throw new Error("invalid refresh token");
    }
    if (!payload.jti || !payload.sub || typeof payload.nickname !== "string") {
      throw new Error("invalid refresh token");
    }
    const userId = await sessions.consumeRefresh(payload.jti);
    if (!userId || userId !== payload.sub) {
      throw new Error("refresh token reused or unknown");
    }
    return this.issue({ sub: payload.sub, nickname: payload.nickname }, sessions);
  }
}
