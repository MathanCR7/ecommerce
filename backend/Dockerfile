# 1. Base Image
FROM node:20-alpine

# 2. Set Working Directory
WORKDIR /app

# 3. Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# 4. Install Production Dependencies
# 'npm ci' is generally preferred if you have a package-lock.json and want exact reproducible installs
# Use --only=production or NODE_ENV=production before install for smaller images
RUN npm install --only=production
# If using npm ci (recommended if you have a package-lock.json):
# RUN npm ci --only=production

# 5. Copy the rest of your application code
# (respects .dockerignore, so local .env won't be copied)
COPY . .

# 6. Expose the port your backend runs on (e.g., 5000)
# This is documentation; the actual port mapping happens in docker-compose.yml
EXPOSE 5000

# 7. Command to run your application
# Replace 'server.js' with your actual entry point file if different
# If your package.json has a "start" script like "node server.js", you can use: CMD ["npm", "start"]
CMD ["node", "server.js"]