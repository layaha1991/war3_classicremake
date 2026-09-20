export interface UserRecord {
  id: string;
  nickname: string;
}

export interface UserStore {
  create(nickname: string): Promise<UserRecord>;
  get(id: string): Promise<UserRecord | undefined>;
}

export interface SessionStore {
  saveRefresh(jti: string, userId: string, ttlSec: number): Promise<void>;
  consumeRefresh(jti: string): Promise<string | undefined>;
}

export interface GuestIdentity {
  id: string;
  nickname: string;
}
