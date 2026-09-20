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

給遠端朋友：

```bash
pnpm start:public
npx cloudflared tunnel --url http://localhost:2567
```
