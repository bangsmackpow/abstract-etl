FROM node:24-alpine

RUN apk add --no-cache poppler-utils ghostscript graphicsmagick su-exec \
    && apk upgrade --no-cache

WORKDIR /app

ENV DOCS_DIR=/app/docs

COPY backend/package*.json ./
RUN apk add --no-cache --virtual .build-deps make gcc g++ python3 \
    && npm install --omit=dev \
    && apk del .build-deps \
    && npm cache clean --force

COPY backend/src/ ./src/
COPY backend/drizzle/ ./drizzle/
COPY docs/ ./docs/

RUN addgroup -S -g 10001 appgroup && adduser -S -u 10001 -G appgroup appuser
RUN mkdir -p /app/src/uploads /app/docs /app/data /app/backups && chown -R appuser:appgroup /app/src/uploads /app/docs /app/data /app/backups

COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
