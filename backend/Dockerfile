FROM node:20-alpine

RUN apk add --no-cache poppler-utils ghostscript graphicsmagick

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/src/ ./src/
COPY backend/drizzle/ ./drizzle/
COPY docs/ ./docs/

EXPOSE 3001

CMD ["node", "src/index.js"]
