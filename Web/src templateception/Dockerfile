FROM node:18

WORKDIR /app
COPY app/ /app
COPY .env /app/.env

RUN npm install

EXPOSE 1337
CMD ["node", "index.js"]




