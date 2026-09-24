FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN npm install -g turbo

COPY . .
RUN turbo prune --scope=@gnk/admin --docker

FROM node:20-alpine AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN npm ci

COPY --from=builder /app/out/full/ .
RUN npx turbo run build --filter=@gnk/admin

FROM nginx:alpine AS runner
COPY --from=installer /app/apps/admin/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
