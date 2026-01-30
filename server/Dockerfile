# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install any needed packages
# In a production environment, you might want to use 'npm ci --only=production'
RUN npm install

# Bundle app source
COPY . .

# Fly.io automatically maps HTTP and HTTPS traffic to the first port defined in fly.toml or the Dockerfile.
# We'll expose a common port like 8080 and let Fly handle the rest.
EXPOSE 8080

# It's a good practice to run the app as a non-root user
# but for simplicity in this case, we'll proceed as root.

# Define the command to run your app
CMD [ "node", "server.js" ]
