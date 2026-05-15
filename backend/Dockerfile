FROM node:20-alpine

RUN apk add --no-cache poppler-utils ghostscript graphicsmagick

WORKDIR /app

ENV DOCS_DIR=/app/docs

COPY backend/package*.json ./
RUN npm install && npm cache clean --force

COPY backend/src/ ./src/
COPY backend/drizzle/ ./drizzle/
COPY docs/ ./docs/

EXPOSE 3001

CMD ["node", "src/index.js"]
