FROM node:20-alpine

WORKDIR /app

# Install a simple static server to serve the 'build' or 'dist' folder
RUN npm install -g serve

COPY package*.json ./
RUN npm ci

COPY . .
RUN chmod -R 755 node_modules/.bin
# Build the project
RUN npm run build

# Expose the port defined in your docker-compose
EXPOSE 3000

# Serve the production build on port 3000
# If your build folder is named 'dist' (Vite), change 'build' to 'dist'
CMD ["serve", "-s", "dist", "-l", "3000"]
