# Use a light version of Node.js
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your app code
COPY . .

# expose the port your app runs on (usually 3000 or 8080)
EXPOSE 3000

# The command to start your app
CMD ["npm", "start"]
