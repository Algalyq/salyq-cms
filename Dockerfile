FROM node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:8500
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
RUN npm ci --production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
