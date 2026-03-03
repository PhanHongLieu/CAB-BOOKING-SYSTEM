FROM node:18-alpine

WORKDIR /app

COPY services/auth-service/package*.json ./
RUN npm install --omit=dev

COPY shared ./shared
COPY services/auth-service ./services/auth-service

# Create logs directory
WORKDIR /app/services/auth-service
RUN mkdir -p logs

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "server.js"]
