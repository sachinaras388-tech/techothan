# Techothan - Deployment & Folder Structure

## Plan summary
- Restructure `deployment/` folder into clearer subfolders.
- Add env template files.
- Update `deployment/README.md` and references.

## Steps
- [ ] Inspect current deployment file contents and reference paths
- [ ] Create new folder structure under `deployment/` (config/env/scripts)
- [ ] Move existing deployment files into subfolders (config/nginx templates + compose + dockerfiles)
- [ ] Update paths in docker-compose and nginx configs
- [ ] Add `deployment/env/.env.production.example` and `deployment/env/.env.development.example`
- [ ] Update `deployment/README.md` with new paths + clear structure map
- [ ] Validate by running docker-compose build/start

