# Deployment Guide

## Current folder structure (clear)
See: `deployment/README_STRUCTURE.md`

## Quick Start with Docker


### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum

### Production Deployment

#### 1. Clone and Configure
```bash
# Clone the repository
git clone <repository-url>
cd fraud-detection

# Copy production environment
cp deployment/.env.production .env
```

#### 2. Update Environment Variables
Edit `.env` with:
- Strong JWT secrets
- MongoDB credentials
- Redis password
- SMTP credentials
- Your domain for CORS

#### 3. Start Services
```bash
# Build and start all services
docker-compose -f deployment/docker-compose.yml up -d

# Check status
docker-compose -f deployment/docker-compose.yml ps
```

#### 4. Verify Deployment
```bash
# Backend health
curl http://localhost:5000/health

# AI service health
curl http://localhost:8000/health
```

---

## Deployment Options

### Option 1: Docker (Recommended for Production)
```bash
docker-compose -f deployment/docker-compose.yml up -d --build
```

### Option 2: PM2 (Node.js only)
```bash
# Install PM2
npm install -g pm2

# Start with ecosystem config
pm2 start deployment/ecosystem.config.js

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

### Option 3: Manual Deployment
```bash
# Backend
cd backend
npm install --production
pm2 start server.js --name fraud-api

# AI Service
cd ai-service
pip install -r requirements.txt
pm2 start main.py --name fraud-ai
```

---

## Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Nginx (Port 80/443)                  │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌──────────────┬──────────────┬────────────────┐
            │              │              │                │
    ┌───────▼────────┐  ┌──▼──────┐  ┌──────▼────────┐
    │   Frontend    │  │Backend  │  │ AI Service    │
    │   (Port 3000) │  │(Port 5000)│  │ (Port 8000)   │
    └───────────────┘  └──────────┘  └───────────────┘
            │              │
    ┌───────┴───────┐      │
    │               │      │
┌───▼───┐      ┌──▼────┐  │
│MongoDB│      │Redis │  │
│ 27017│      │6379  │  │
└──────┘      └──────┘  │
                       │
```

---

## SSL/TLS Configuration

### Generate SSL Certificates
```bash
# Create ssl directory
mkdir -p deployment/ssl

# Using Let's Encrypt (requires domain)
certbot certonly --webroot -w /var/www/static -d yourdomain.com

# Or generate self-signed for testing
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout deployment/ssl/private.key \
  -out deployment/ssl/certificate.crt
```

### Update Nginx Config for HTTPS
Add HTTPS server block in `deployment/nginx.conf`:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/certificate.crt;
    ssl_certificate_key /etc/nginx/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # ... rest of config
}
```

---

## Monitoring & Logging

### View Logs
```bash
# All services
docker-compose -f deployment/docker-compose.yml logs -f

# Specific service
docker-compose -f deployment/docker-compose.yml logs -f backend
docker-compose -f deployment/docker-compose.yml logs -f ai-service
```

### Health Checks
```bash
# Check service health
curl http://localhost:5000/health
curl http://localhost:8000/health
curl http://localhost/health
```

### Resource Usage
```bash
docker stats
```

---

## Scaling

### Scale Backend
```bash
# Increase backend instances
docker-compose -f deployment/docker-compose.yml up -d --scale backend=3
```

### Load Balancing
Nginx is configured for least_conn load balancing between instances.

---

## Backup & Recovery

### Backup MongoDB
```bash
docker exec fraud-detection-mongo mongodump --archive=/backup/dump.gz --gzip
```

### Restore MongoDB
```bash
docker exec fraud-detection-mongo mongorestore --archive=/backup/dump.gz --gzip
```

---

## Security Checklist

- [ ] Change default passwords
- [ ] Generate strong JWT secrets
- [ ] Configure SSL certificates
- [ ] Enable firewall rules
- [ ] Setup log rotation
- [ ] Configure backup schedule
- [ ] Enable security headers in nginx

---

## Clear folder structure (current)

- `deployment/compose/docker-compose.yml`
- `deployment/config/nginx.conf`
- `deployment/config/nginx.frontend.conf`
- `deployment/env/.env.development.example`, `deployment/env/.env.production.example`
- `deployment/containers/Dockerfile.backend`, `Dockerfile.frontend`, `Dockerfile.ai`
- `deployment/pm2/ecosystem.config.js`
- `deployment/ssl/` (certs for nginx)

> Note: If you still see old files like `deployment/docker-compose.yml`, that means the move step was not completed yet. Use the paths shown above for the new structure.


---

## Troubleshooting

### Service won't start
```bash
# Check logs
docker-compose logs backend

# Check ports
netstat -tlnp | grep -E "5000|8000|27017|6379"
```

### Database connection issues
```bash
# Check MongoDB
docker exec fraud-detection-mongo mongosh

# Check Redis
docker exec fraud-detection-redis redis-cli ping
```

### Performance issues
```bash
# Resource usage
docker stats

# Increase instances
docker-compose up -d --scale backend=2
```

---

For more help, see docs/SETUP.md
