FROM node:20-alpine

RUN apk add --no-cache poppler-utils ghostscript graphicsmagick

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src/ ./src/
COPY drizzle/ ./drizzle/

EXPOSE 3001

CMD ["node", "src/index.js"]
