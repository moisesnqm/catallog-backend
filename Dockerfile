# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER nodejs

EXPOSE 3001

CMD ["node", "dist/server.js"]
