FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=@gnk/api --docker

FROM node:20-alpine AS installer
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN npm ci
COPY --from=builder /app/out/full/ .
# Builds @gnk/types, @gnk/validation and @gnk/suppliers (CommonJS dist), generates Prisma, compiles the API.
RUN npm run build -w @gnk/api

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs \
  && mkdir -p /app/uploads && chown nestjs:nodejs /app/uploads

ENV NODE_ENV=production PORT=4000

COPY --from=installer --chown=nestjs:nodejs /app/node_modules ./node_modules
# node_modules/@gnk/* are workspace symlinks to ../../packages/*, which run from their dist/ builds.
COPY --from=installer --chown=nestjs:nodejs /app/packages ./packages
COPY --from=installer --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=installer --chown=nestjs:nodejs /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=installer --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=installer --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma

USER nestjs
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/apps/api/src/main.js"]
