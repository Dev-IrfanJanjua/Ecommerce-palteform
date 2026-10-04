---
name: docker-cicd-deploy
description: Containerize, automate and ship the E-Commerce project, covering Dockerfiles, Docker Compose (frontend, backend, MongoDB, Redis), GitHub Actions pipelines (lint, test, build, Docker build, deploy), Git workflow, deployment to Vercel, Railway/Render, MongoDB Atlas and managed Redis, environment variables, and logging and monitoring with Pino and Sentry. Use this skill whenever the user mentions Docker, container, compose, CI, CD, GitHub Actions, pipeline, deploy, hosting, production, env variables in production, logs, monitoring, Sentry or "put it online".
---

# Docker, CI/CD, deployment and monitoring

## Docker

Use multi-stage builds so production images are small and contain no dev tooling.

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

- Add `.dockerignore` (`node_modules`, `.env`, `.git`, `dist`, `coverage`).
- Copy `package*.json` before the source so dependency layers are cached.
- Run as a non-root user. Never bake secrets into images; pass them at runtime.
- Add a `HEALTHCHECK` or a `/health` endpoint that checks Mongo and Redis connectivity.

## Docker Compose (development)

```yaml
services:
  mongo:
    image: mongo:7
    command: ["--replSet", "rs0", "--bind_ip_all"]   # replica set so transactions work
    ports: ["27017:27017"]
    volumes: [mongo-data:/data/db]
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "try{rs.status().ok}catch(e){rs.initiate().ok}"]
      interval: 10s
      retries: 10
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  backend:
    build: { context: ./backend, target: deps }
    command: npm run dev
    env_file: ./backend/.env
    environment:
      MONGODB_URI: mongodb://mongo:27017/shop?replicaSet=rs0
      REDIS_URL: redis://redis:6379
    ports: ["5000:5000"]
    volumes: ["./backend:/app", "/app/node_modules"]
    depends_on: { mongo: { condition: service_healthy }, redis: { condition: service_started } }
  worker:
    build: { context: ./backend, target: deps }
    command: npm run worker
    env_file: ./backend/.env
    depends_on: [backend]
  frontend:
    build: { context: ./frontend }
    env_file: ./frontend/.env.local
    ports: ["3000:3000"]
volumes:
  mongo-data:
```

Inside Compose, services reach each other by service name (`mongo`, `redis`), not `localhost`. Keep a separate `docker-compose.prod.yml` or deploy images to a platform instead of using the dev file in production.

## Git workflow

`main` is always deployable. Work on `feature/<name>` branches, open a pull request, let CI pass, review, then squash-merge. Conventional commit messages. Protect `main` (required checks, no direct pushes). Track work as GitHub Issues linked from PRs.

## GitHub Actions

Pipeline: push or PR, then lint, test, build, Docker build, deploy (deploy only from `main`).

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push: { branches: [main] }

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: backend } }
    services:
      redis: { image: "redis:7", ports: ["6379:6379"] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: backend/package-lock.json }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build

  frontend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: frontend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: frontend/package-lock.json }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build

  docker:
    needs: [backend, frontend]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t shop-backend ./backend
```

Add an e2e job (Playwright) once the flows exist. Store deploy tokens and API keys in **GitHub Secrets**, never in the workflow file. Pin action versions and use dependency caching to keep runs fast.

## Deployment targets

| Part | Platform | Notes |
| --- | --- | --- |
| Frontend | Vercel | Connect the repo, set root to `frontend`, add `NEXT_PUBLIC_API_URL` |
| Backend + worker | Railway or Render (AWS later) | Two services from one repo: API and worker. Health check on `/health` |
| Database | MongoDB Atlas | Allow-list the backend IPs, dedicated DB user, backups on |
| Redis | Upstash or Redis Cloud | Use TLS URL (`rediss://`) |
| Images | Cloudinary | Folder per environment |

Production checklist: HTTPS only; CORS restricted to the real frontend domain; `NODE_ENV=production`; secrets set in the platform dashboard; separate Stripe keys and webhook endpoint registered for the live domain; separate Atlas database for production; run database indexes on deploy; verify `/health` after each release; know how to roll back to the previous deployment.

## Logging

Use **Pino** (structured JSON) with `pino-http` for request logs.

- Levels: `error` (needs attention), `warn`, `info` (business events like order paid), `debug` (dev only).
- Attach a request id to every log line; include `userId` and `orderId` when relevant.
- Redact secrets: configure `redact: ["req.headers.authorization", "req.headers.cookie", "*.password"]`.
- Log payment failures, webhook rejections, slow queries and queue job failures.

## Monitoring

- **Sentry** on both frontend and backend: initialise before anything else, capture unhandled exceptions and rejected promises, tag releases with the git SHA, upload source maps, set `user.id` (not email) for context. Alert on new issues and on failed-payment spikes.
- Uptime check on `/health`.
- Track request latency and error rate per route; slow endpoints become candidates for indexes or Redis caching.
- Advanced (later): Prometheus metrics endpoint, Grafana dashboards, Loki for log search.
