# ---------- build stage ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Fallbacks when .env.production is missing from context (Next inlines NEXT_PUBLIC_* at build).
ARG NEXT_PUBLIC_FACTORY_PHASE=M4
ARG NEXT_PUBLIC_FACTORY_PHASE_AUTO=false
ARG NEXT_PUBLIC_PROD_MODE=full
ARG NEXT_PUBLIC_MONTHLY_BUDGET_EUR=550
ARG NEXT_PUBLIC_SITE_URL=https://omnigrouptech.com
ARG NEXT_PUBLIC_ATINA_API_BASE=https://api.omnigrouptech.com
ARG NEXT_PUBLIC_FOUNDING_CLIENT_PROMO=false
ARG NEXT_PUBLIC_FOUNDING_CLIENT_DISCOUNT_PCT=15
ARG NEXT_PUBLIC_FOUNDING_CLIENT_MAX_SLOTS=50
ARG NEXT_PUBLIC_FOUNDING_CLIENT_LOCK_MONTHS=12
ARG NEXT_PUBLIC_REGISTRATION_ENABLED=false
ENV NEXT_PUBLIC_FACTORY_PHASE=$NEXT_PUBLIC_FACTORY_PHASE \
    NEXT_PUBLIC_FACTORY_PHASE_AUTO=$NEXT_PUBLIC_FACTORY_PHASE_AUTO \
    NEXT_PUBLIC_PROD_MODE=$NEXT_PUBLIC_PROD_MODE \
    NEXT_PUBLIC_MONTHLY_BUDGET_EUR=$NEXT_PUBLIC_MONTHLY_BUDGET_EUR \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_ATINA_API_BASE=$NEXT_PUBLIC_ATINA_API_BASE \
    NEXT_PUBLIC_FOUNDING_CLIENT_PROMO=$NEXT_PUBLIC_FOUNDING_CLIENT_PROMO \
    NEXT_PUBLIC_FOUNDING_CLIENT_DISCOUNT_PCT=$NEXT_PUBLIC_FOUNDING_CLIENT_DISCOUNT_PCT \
    NEXT_PUBLIC_FOUNDING_CLIENT_MAX_SLOTS=$NEXT_PUBLIC_FOUNDING_CLIENT_MAX_SLOTS \
    NEXT_PUBLIC_FOUNDING_CLIENT_LOCK_MONTHS=$NEXT_PUBLIC_FOUNDING_CLIENT_LOCK_MONTHS \
    NEXT_PUBLIC_REGISTRATION_ENABLED=$NEXT_PUBLIC_REGISTRATION_ENABLED
# Inside this Linux build there is no OneDrive, so use the standard `.next`
# distDir (instead of the OneDrive-safe node_modules/.cache path) and enable
# standalone output. Both are read by next.config.mjs and only take effect here.
ENV NEXT_DIST_DIR=.next
ENV NEXT_OUTPUT_STANDALONE=true
RUN npm run build

# ---------- runtime stage ----------
# Standalone output = a minimal server.js + only the node_modules the app traced.
# Cold boot reads a tiny fraction of the files that `next start` + full
# node_modules did, which is the main cold-start fix (20-46s -> low single digits).
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Cap the V8 heap so the container has a predictable footprint and plays nicely
# with the compose mem_limit (a light marketing/BFF app needs far less than the
# default heap). Compose can still override NODE_OPTIONS if needed.
ENV NODE_OPTIONS=--max-old-space-size=512

# server.js + traced node_modules + serialized config live in .next/standalone.
COPY --from=build /app/.next/standalone ./
# Static assets and public/ are intentionally NOT part of the standalone bundle.
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000
# Boots the tiny standalone server directly — no `next start`, no full node_modules.
CMD ["node", "server.js"]
