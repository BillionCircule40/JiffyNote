# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies needed for the production build
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production server
FROM node:18-alpine

WORKDIR /app

# Install nginx for serving the static files
RUN apk add --no-cache nginx

# Copy built assets from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy the site configuration into Alpine Nginx's HTTP config directory
COPY nginx.conf /etc/nginx/http.d/default.conf
RUN nginx -t

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
