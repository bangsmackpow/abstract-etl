FROM node:20-alpine

RUN apk add --no-cache poppler-utils ghostscript

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src/ ./src/

EXPOSE 3001

CMD ["node", "src/index.js"]
