FROM node:18-alpine
WORKDIR /app
RUN npm init -y && npm install --omit=dev axios amqplib prom-client jaeger-client opentracing winston
COPY api-gateway/package*.json ./api-gateway/
WORKDIR /app/api-gateway
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
WORKDIR /app
COPY api-gateway ./api-gateway
COPY shared ./shared
WORKDIR /app/api-gateway
RUN mkdir -p logs
EXPOSE 8000
CMD ["node", "server.js"]
