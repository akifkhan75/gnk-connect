FROM node:20-alpine AS builder

RUN apk add --no-cache openssl openssl-dev libc6-compat
WORKDIR /app

RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=@gnk/api --docker

FROM node:20-alpine AS installer
RUN apk add --no-cache openssl openssl-dev libc6-compat
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN npm ci

COPY --from=builder /app/out/full/ .
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma || true
RUN npx turbo run build --filter=@gnk/api

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=installer --chown=nestjs:nodejs /app/apps/api/package.json .
COPY --from=installer --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=installer --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=installer --chown=nestjs:nodejs /app/apps/api/prisma ./prisma || true

EXPOSE 4000

CMD ["node", "dist/apps/api/src/main.js"]
