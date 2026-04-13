FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY . .

# Create logs directory used by shared logger
RUN mkdir -p logs

# Expose port
EXPOSE 3007

# Start application
CMD ["node", "server.js"]
