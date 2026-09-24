FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages ./packages
COPY apps ./apps
COPY pages ./pages
COPY components ./components
COPY services ./services
COPY context ./context
COPY public ./public
COPY types ./types
COPY App.tsx index.tsx index.html index.css constants.ts types.ts vite.config.ts tsconfig.json ./

RUN npm install --ignore-scripts
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
