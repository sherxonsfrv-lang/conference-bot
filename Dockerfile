# Stage 1: Build Frontend
FROM node:18-alpine as build-stage
WORKDIR /app/webapp
COPY webapp/package*.json ./
RUN npm install
COPY webapp/ ./
RUN npm run build

# Stage 2: Production
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install backend dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy backend source
COPY src ./src

# Copy built frontend from build-stage
# Path in Express app is ../webapp/dist relative to src/index.js
COPY --from=build-stage /app/webapp/dist ./webapp/dist

EXPOSE 3000
CMD ["node", "src/index.js"]
