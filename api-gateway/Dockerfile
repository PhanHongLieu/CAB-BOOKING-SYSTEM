FROM node:18-alpine
WORKDIR /app
COPY api-gateway/package*.json ./
RUN npm install --omit=dev
COPY shared ./shared
COPY api-gateway ./api-gateway
WORKDIR /app/api-gateway
RUN mkdir -p logs
EXPOSE 8000
CMD ["node", "server.js"]
