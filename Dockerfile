# Stage 1: Install dependencies and build
FROM oven/bun:1.3.10 AS builder
WORKDIR /app

# Only copy dependency files first for better caching
COPY package.json bun.lock ./
COPY src/prisma ./src/prisma/

# Install dependencies
RUN bun install --frozen-lockfile

# Generate Prisma Client
RUN bun x prisma generate

# Copy source code and build
COPY src ./src
COPY tsconfig.json ./

RUN bun run build

# Stage 2: Production image
FROM oven/bun:1.3.10-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Only copy production build artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src/prisma ./src/prisma

# Use a non-root user for security (bun image supports this)
USER bun

EXPOSE 3030

# Use exec form for CMD
CMD ["bun", "dist/index.js"]
