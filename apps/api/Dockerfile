FROM node:20-alpine AS builder

RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

# Install dependencies for monorepo
COPY package.json package-lock.json* turbo.json* ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN npm install

# Build shared packages
WORKDIR /app/packages/types
RUN npx tsc -p tsconfig.json

WORKDIR /app/packages/supplier-adapters
RUN npx tsc -p tsconfig.json

# Build API with Prisma Generation and TypeScript Compiler
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npx tsc -p tsconfig.json

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/packages /app/packages
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules /app/node_modules

EXPOSE 4000

CMD ["node", "dist/apps/api/src/main.js"]
