# War3 Classic Remake

瀏覽器重製三張魔獸地圖。第一版只做《秋名山甩狗》，讓朋友開網址就能玩。

## 本機

```bash
cp .env.example .env
pnpm install
pnpm test
pnpm dev
```

- Web：http://localhost:5173
- API / Colyseus：http://localhost:2567

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Rollback：改回上一版 image 再 `docker compose up -d`。

## 架構備註

- 模組化單體：Fastify + Colyseus 同一 process。
- Session 放 Redis，帳號／房間索引放 Postgres。
- 對戰 tick 留在 Colyseus room memory（延遲需求，不能每幀走 Redis）。
- Token 只走 httpOnly cookie。
