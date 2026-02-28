FROM node:18-alpine

# Keep the same folder layout as local development so relative imports to ../../shared work.
WORKDIR /workspace/services/auth-service

COPY services/auth-service/package*.json ./
RUN npm ci --omit=dev

COPY services/auth-service ./
COPY shared /workspace/shared

RUN mkdir -p logs

EXPOSE 3001

CMD ["node", "server.js"]
