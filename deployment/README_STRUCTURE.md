# Deployment folder structure

This repo contains a mono-repo:
- `frontend/` (Vite)
- `backend/` (Node/Express)
- `ai-service/` (Python)
- `deployment/` (Docker + Nginx + orchestration)

## Current (recommended) layout under `deployment/`

- `deployment/compose/`
  - `docker-compose.yml` (single entry for all containers)
- `deployment/config/`
  - `nginx.conf` (reverse proxy: /api, /ai, SPA)
  - `nginx.frontend.conf` (SPA fallback + static caching)
- `deployment/env/`
  - `.env.development.example`
  - `.env.production.example`
- `deployment/containers/`
  - `Dockerfile.backend`
  - `Dockerfile.frontend`
  - `Dockerfile.ai`
- `deployment/pm2/`
  - `ecosystem.config.js` (optional: non-Docker deployment)
- `deployment/ssl/`
  - `certificate.crt`
  - `private.key`

## Why this change?
- Clear separation between **orchestration**, **config**, and **environment templates**.
- Easier future maintenance (e.g., adding Redis, workers, multiple domains).

## Note
If you prefer not to move existing files, keep your old structure.
This document describes the target structure after the restructuring step.

