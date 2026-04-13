FROM node:18-alpine

WORKDIR /app

COPY services/booking-service/package*.json ./
RUN npm install --omit=dev

COPY shared ./shared
COPY services/booking-service ./services/booking-service

WORKDIR /app/services/booking-service
RUN mkdir -p logs

EXPOSE 3002

CMD ["node", "server.js"]
