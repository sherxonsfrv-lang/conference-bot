# Stage 1: Build Frontend
FROM node:18-alpine AS build-stage
WORKDIR /app/webapp
COPY webapp/package*.json ./
RUN npm ci
COPY webapp/ ./
RUN npm run build

# Stage 2: Production
FROM node:18-alpine
ENV NODE_ENV=production

WORKDIR /app
RUN chown node:node /app

# Copy package files with correct ownership
COPY --chown=node:node package*.json ./

# Switch to non-root user
USER node

# Install production dependencies and clean cache
RUN npm ci --omit=dev && npm cache clean --force

# Copy backend source
COPY --chown=node:node src ./src

# Copy built frontend from build-stage
# Path in Express app is ../webapp/dist relative to src/index.js
COPY --chown=node:node --from=build-stage /app/webapp/dist ./webapp/dist

EXPOSE 3000
CMD ["node", "src/index.js"]
