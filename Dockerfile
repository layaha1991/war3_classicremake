FROM node:22-alpine
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/protocol/package.json packages/protocol/

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build:deploy

ENV NODE_ENV=production
EXPOSE 2567
CMD ["pnpm", "--filter", "@war3/server", "start"]
