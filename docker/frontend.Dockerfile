# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-slim AS build

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Copy source and build
COPY . .

# Run build
RUN npm run build

# ── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:stable-alpine AS serve

# Remove default nginx static assets and config
RUN rm -rf /usr/share/nginx/html/* && \
    rm -rf /etc/nginx/conf.d/default.conf

# Copy production nginx config
# Note: Context is ./frontend in docker-compose, so nginx.conf is at the root
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check to verify index.html exists
RUN [ -f /usr/share/nginx/html/index.html ] || exit 1

CMD ["nginx", "-g", "daemon off;"]
