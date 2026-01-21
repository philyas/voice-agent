# Backend Dockerfile
# Node.js Express API with Knex

FROM node:18-alpine

# Install dependencies for node-gyp (needed for some packages)
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (for development, install all including devDependencies)
RUN npm install && \
    npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads/temp

# Set environment variables
ENV NODE_ENV=${NODE_ENV}
ENV PORT=4000

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start command
CMD ["npm", "run", "dev"]
