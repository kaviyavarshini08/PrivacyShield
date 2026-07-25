# Step 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /workspace

# Copy root monorepo config files
COPY package*.json tsconfig.json ./

# Copy package dependencies and app source
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY apps/web ./apps/web

# Install all workspace dependencies
RUN npm ci

# Set Vite build-time environment variable to route API requests relatively
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Build workspace dependencies
RUN npm run build -w packages/shared
RUN npm run build -w packages/ui

# Build the web application
RUN npm run web:build

# Step 2: Production Nginx stage
FROM nginx:1.25-alpine

# Copy built assets to Nginx default html directory
COPY --from=builder /workspace/apps/web/dist /usr/share/nginx/html

# Copy our custom Nginx config
COPY infrastructure/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
