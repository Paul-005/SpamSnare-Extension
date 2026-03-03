# Use the official lightweight Node.js image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the rest of your application code
COPY . .

# Expose the port your app runs on (adjust if you use a different port)
EXPOSE 3000


# Start the application
CMD ["npm", "start"]