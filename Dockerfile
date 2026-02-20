# Stage 1: Build the Vite frontend
FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production server
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the built frontend and server
COPY --from=build /app/dist ./dist
COPY server.js ./

EXPOSE 8080

CMD ["node", "server.js"]
