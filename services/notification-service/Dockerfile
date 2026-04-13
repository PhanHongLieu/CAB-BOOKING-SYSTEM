FROM node:18-alpine
WORKDIR /app
RUN npm init -y && npm install --omit=dev axios amqplib prom-client jaeger-client opentracing winston
COPY services/notification-service/package*.json ./services/notification-service/
WORKDIR /app/services/notification-service
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
WORKDIR /app
COPY services/notification-service ./services/notification-service
COPY shared ./shared
COPY shared ./services/shared
COPY shared ./services/notification-service/shared
WORKDIR /app/services/notification-service
RUN mkdir -p logs
EXPOSE 3005
CMD ["node", "server.js"]
