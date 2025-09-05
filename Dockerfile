# Use Node.js 18 Alpine as base image
FROM node:18-alpine

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

# Copy server file
COPY server.js ./

# Remove devDependencies to reduce image size
RUN npm prune --production

# Expose port (Cloud Run will set PORT environment variable)
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
