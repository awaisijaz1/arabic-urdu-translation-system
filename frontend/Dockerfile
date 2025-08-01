FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Verify Node.js and npm are available
RUN node --version && npm --version

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with verbose output
RUN npm ci --verbose

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built app to nginx
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 