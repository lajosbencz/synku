ARG NODE_VERSION=20
ARG USER=synku
ARG UID=1001
ARG GID=1001

FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS runtime
ARG USER
ARG UID
ARG GID
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
RUN addgroup -g ${GID} -S nodejs && \
    adduser -S ${USER} -u ${UID}
RUN chown -R "${USER}:nodejs" /app
USER ${USER}
ENTRYPOINT ["node", "dist/cli/main.js"]
