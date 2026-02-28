FROM node:18-alpine

# Keep the same folder layout as local development so relative imports to ../../shared work.
WORKDIR /workspace/services/driver-service

COPY services/driver-service/package*.json ./
RUN npm ci --omit=dev

COPY services/driver-service ./
COPY shared /workspace/shared

RUN mkdir -p logs

EXPOSE 3003

CMD ["node", "server.js"]
