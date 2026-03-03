FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY services/auth-service/package*.json ./
RUN npm install --omit=dev

# Copy application code
COPY services/auth-service/. ./
# Copy shared folder from root
COPY shared ./shared

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "server.js"]
