# War3 Classic Remake

瀏覽器重製三張魔獸地圖。第一版只做《秋名山甩狗》（房間名 `driftdog`）。

## 調教參數

全部數字集中在 `packages/shared/src/driftdog/constants.ts` 的 `PARAMS`：

- `ball.flySpeed`：傳球飛行速度（px/s）
- `dog.initialSpeed` / `dog.accel` / `dog.maxSpeed`：狗初速、加速、最高速
- `dog.turnRate` / `dog.drift`：愈低愈甩呔
- `lives.hearts`：每人幾顆心
- 以及玩家速度、光線寬度等

## 本機 / 公網

```bash
pnpm test
pnpm dev
```

給遠端朋友（本機臨時）：

```bash
pnpm start:public
npx cloudflared tunnel --url http://localhost:2567
```

## Railway 部署（推薦）

一個 service 同時提供：**靜態頁 + REST API + Colyseus WebSocket**（同 `pnpm start:public`）。甩狗唔使 Postgres，用記憶體即可。

1. 將 repo push 到 GitHub。
2. 登入 [Railway](https://railway.app) → **New Project** → **Deploy from GitHub** → 選本 repo。
3. **Settings → Networking → Generate Domain**，記下 `https://xxxx.up.railway.app`。
4. **Variables**（必填）：

   | 變數 | 值 |
   |------|-----|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | 長隨機字串（唔好用 example 預設值） |
   | `PUBLIC_WEB_ORIGIN` | 上一步嘅 `https://xxxx.up.railway.app` |

   可選：`NIXPACKS_NODE_VERSION=22`（若 build 報 Node 版本問題再加）。

   **唔好設** `STORE_DRIVER` → 房間／訪客用記憶體（重啟會清，夠朋友局）。

5. **Deploy**：repo 根目錄已有 `railway.toml`  
   - Build：`pnpm install --frozen-lockfile --prod=false && pnpm build:deploy`（build 階段要裝 devDependencies 才有 `vite`）  
   - Start：`pnpm --filter @war3/server start`  
   - Health：`GET /api/rooms`

6. 用 Railway 域名開玩；朋友用同一網址加入房間（`?room=房碼`）。

本機可先試 production 流程：

```bash
export NODE_ENV=production JWT_SECRET="$(openssl rand -hex 32)"
pnpm build:deploy && pnpm --filter @war3/server start
# 開 http://localhost:2567
```
