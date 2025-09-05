# Use Node.js 18 Alpine as base image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Update browserslist database to avoid warnings
RUN npx update-browserslist-db@latest

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Use nginx to serve the static files
FROM nginx:alpine

# Install bash for the startup script
RUN apk add --no-cache bash

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Start nginx with dynamic port configuration
CMD ["/start.sh"]
