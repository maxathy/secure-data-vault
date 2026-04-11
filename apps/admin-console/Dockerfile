# ── Stage 1: Builder ──────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Copy workspace root config
COPY package.json yarn.lock .yarnrc.yml tsconfig.base.json ./

# Copy package definitions for dependency resolution
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/crypto-core/package.json packages/crypto-core/
COPY packages/audit-core/package.json packages/audit-core/
COPY apps/admin-console/package.json apps/admin-console/
# vault-api package.json needed for lockfile integrity
COPY apps/vault-api/package.json apps/vault-api/

# Install dependencies
RUN corepack enable && corepack prepare yarn@4.9.1 --activate
RUN yarn install --immutable || yarn install

# Copy source for packages the console depends on
COPY packages/shared-types/ packages/shared-types/
COPY apps/admin-console/ apps/admin-console/

# Build shared-types first, then admin-console
RUN yarn workspace @secure-data-vault/shared-types run build
RUN yarn workspace @secure-data-vault/admin-console run build

# ── Stage 2: Runner (nginx) ──────────────────────────────────────
FROM nginx:alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY apps/admin-console/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Angular app (output is in dist/browser/)
COPY --from=builder /app/apps/admin-console/dist/browser/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
