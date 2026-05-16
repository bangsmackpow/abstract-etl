FROM node:20-alpine

RUN apk add --no-cache poppler-utils ghostscript graphicsmagick

WORKDIR /app

ENV DOCS_DIR=/app/docs

COPY backend/package*.json ./
RUN npm install && npm cache clean --force

COPY backend/src/ ./src/
COPY backend/drizzle/ ./drizzle/
COPY docs/ ./docs/

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /app/src/uploads /app/docs /app/data && chown -R appuser:appgroup /app/src/uploads /app/docs /app/data
USER appuser

EXPOSE 3001

CMD ["node", "src/index.js"]
