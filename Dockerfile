FROM node:22-slim

RUN apt-get update && apt-get install -y \
    curl \
    wget \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY --chown=node:node . .

RUN mkdir -p /app/logs && chown -R node:node /app

USER node

EXPOSE 1350

CMD ["npx", "tsx", "src/server.ts"]
