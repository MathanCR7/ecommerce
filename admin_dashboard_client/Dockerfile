# client/Dockerfile (Development)

# Use an official Node.js runtime as a parent image
FROM node:18-alpine AS development

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port Vite runs on (important for development)
EXPOSE 5173

# Command to run the Vite development server
# Ensure "dev": "vite" script exists in client/package.json
CMD [ "npm", "run", "dev" ]

# Important Considerations for Development:
#
# 1.  Volume Mounts (Recommended):  For development, it's much more efficient
#     to use Docker volume mounts to share your client code with the container
#     rather than copying it.  This allows you to edit the code on your host
#     machine and have the changes reflected instantly in the container
#     without rebuilding the image.  Example docker-compose.yml configuration:
#
#     client:
#       build:
#         context: ./client
#         dockerfile: Dockerfile
#       ports:
#         - "5173:5173"
#       volumes:
#         - ./client:/app  # Mount the client directory
#       environment:
#         CHOKIDAR_USEPOLLING: 'true' # Fix file watching issues on some systems
#
# 2.  Hot Reloading: Ensure your Vite configuration is set up for hot reloading
#     within a Docker container. This often involves setting the `host` option
#     to `0.0.0.0` in your `vite.config.js` file.
#
#     export default defineConfig({
#       server: {
#         host: '0.0.0.0',
#       },
#     })
#
# 3.  Environment Variables:  Pass any necessary environment variables
#     to the container using the `environment` section in your
#     `docker-compose.yml` file.
#
# 4.  `CHOKIDAR_USEPOLLING=true`:  This environment variable is crucial if you
#      are running Docker on macOS or Windows and experience file watching issues
#      (e.g., changes to your source code are not being detected by the
#      Vite development server).  Chokidar is a file system watcher library
#      used by Vite.  Setting `CHOKIDAR_USEPOLLING=true` forces Chokidar to use
#      polling, which is a less efficient but more reliable method of file
#      watching in some Docker environments.