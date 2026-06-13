FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/public ./public
# next.config.mjs uses distDir=node_modules/.cache/omnigroup-next (OneDrive-safe)
RUN mkdir -p node_modules/.cache/omnigroup-next
COPY --from=build /app/node_modules/.cache/omnigroup-next ./node_modules/.cache/omnigroup-next
EXPOSE 3000
CMD ["npm", "run", "start", "--", "-p", "3000"]
