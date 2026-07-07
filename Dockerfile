FROM node:20-alpine AS base
WORKDIR /app

# Backend build
FROM base AS backend-deps
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

FROM base AS backend-build
COPY backend/ ./backend/
RUN cd backend && npm ci && npx tsc

# Frontend build
FROM base AS frontend-build
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Production
FROM base AS production
ENV NODE_ENV=production

COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=frontend-build /app/frontend/.next ./frontend/.next
COPY --from=frontend-build /app/frontend/node_modules ./frontend/node_modules
COPY --from=frontend-build /app/frontend/package.json ./frontend/package.json

COPY package.json ./

EXPOSE 3000 8000

CMD ["npm", "run", "start"]
