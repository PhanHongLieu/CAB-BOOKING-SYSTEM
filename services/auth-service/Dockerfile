FROM node:18-alpine

WORKDIR /app

# Copy package files for auth-service
COPY services/auth-service/package*.json ./services/auth-service/

# Copy shared module
COPY shared ./shared

# Install dependencies
WORKDIR /app/services/auth-service
RUN npm ci --only=production

# Copy application code
COPY services/auth-service .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3001

# Fix for shared module dependency resolution
ENV NODE_PATH=/app/services/auth-service/node_modules

# Start application
CMD ["node", "server.js"]
