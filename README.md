# War3 Classic Remake

瀏覽器重製三張魔獸地圖。第一版只做《秋名山甩狗》，讓朋友開網址就能玩。

## Colyseus 能不能像 Photon 一樣走公網？

可以。Colyseus 跟 Photon 一樣是 **WebSocket**（HTTPS 頁面會自動用 `wss://`），不是區網廣播。朋友在不同地方只要連同一個公開網址即可，不需要 LAN。

不用資料庫：房間列表來自 Colyseus 記憶體裡的 `matchMaker.query`，重開伺服器房間會清空。

## 本機開發

```bash
cp .env.example .env
pnpm install
pnpm test
pnpm dev
```

- Web：http://localhost:5173
- API / Colyseus：http://localhost:2567

大廳可「建立房間」或從列表加入。左擳桿移動，右擳桿瞄光線，放開打中人就傳球。球永遠貼人，狗會漂移追持球者。

## 給遠端朋友（一個公開網址）

先建前端再讓 Fastify 跟 Colyseus 同 port 提供網頁：

```bash
pnpm start:public
```

然後把 `2567` 打到公網，例如：

```bash
npx cloudflared tunnel --url http://localhost:2567
```

把 `https://….trycloudflare.com` 傳給朋友。頁面跟 WebSocket 走同一個 host，不用再開第二條 tunnel。

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Rollback：改回上一版 image 再 `docker compose up -d`。

## 架構備註

- 模組化單體：Fastify + Colyseus 同一 process。
- 對戰 tick 與房間列表都在 process memory（不用 DB）。
- 可選 Redis / Postgres：設 `STORE_DRIVER=persist`。
