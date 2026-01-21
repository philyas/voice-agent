# Frontend Dockerfile
# Next.js Application

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "run", "dev"]
