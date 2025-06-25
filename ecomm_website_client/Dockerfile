# ---- Stage 1: Build ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install all dependencies (including devDependencies for the build)
RUN npm install

# Copy the rest of your application code
# (respects .dockerignore)
COPY . .

# Build the application for production
# This uses the "build" script from your package.json (e.g., "vite build")
RUN npm run build
# After this, your static files will be in /app/dist

# ---- Stage 2: Serve ----
FROM nginx:stable-alpine

# Copy the built static files from the 'builder' stage's /app/dist to Nginx's webroot
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy a custom Nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (Nginx default)
EXPOSE 80

# Command to start Nginx
CMD ["nginx", "-g", "daemon off;"]