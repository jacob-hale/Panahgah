# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Default matches frontend/.env.production so Railway Docker builds still embed the API URL when no build arg is set.
ARG VITE_API_BASE_URL=https://panahgah-backend-production.up.railway.app
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Serve stage
FROM nginx:alpine AS final
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]