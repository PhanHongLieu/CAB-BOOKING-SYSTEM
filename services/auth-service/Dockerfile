FROM node:18-alpine

WORKDIR /app
RUN npm init -y && npm install --omit=dev axios amqplib prom-client jaeger-client opentracing winston

# Copy package files
COPY services/auth-service/package*.json ./services/auth-service/

# Install dependencies (support repos without lockfile)
WORKDIR /app/services/auth-service
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy application code
WORKDIR /app
COPY services/auth-service ./services/auth-service
COPY shared ./shared
COPY shared ./services/shared
COPY shared ./services/auth-service/shared

# Create logs directory
WORKDIR /app/services/auth-service
RUN mkdir -p logs

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "server.js"]
