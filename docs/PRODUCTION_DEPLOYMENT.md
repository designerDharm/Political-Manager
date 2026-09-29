# PRODUCTION DEPLOYMENT & OPERATIONS RUNBOOK
# CAMPAIGNOPS AI PRODUCTION ROLLOUT GUIDE

## 1. Prerequisites & Host Specifications
- **Operating System**: Linux (Ubuntu 22.04 LTS or Debian 12 recommended)
- **Node.js**: v20.10.0+ LTS
- **PostgreSQL**: PostgreSQL 16 (Managed AWS RDS, Supabase, or dedicated instance)
- **System Packages**:
  ```bash
  apt update && apt install -y poppler-utils postgresql-client tesseract-ocr
  ```

---

## 2. Environment Configuration
Create `/opt/campaignops/.env` with strict permissions (`chmod 600 .env`):
```ini
NODE_ENV=production
DATABASE_URL=postgresql://campaignops_user:STRONG_SECURE_PASSWORD@postgres-host:5432/campaignops_prod?schema=public&sslmode=require
NEXTAUTH_SECRET=GENERATED_64_CHAR_RANDOM_SECRET_HEX
SESSION_SECRET=GENERATED_64_CHAR_RANDOM_SECRET_HEX
NEXT_PUBLIC_APP_URL=https://campaign.yourdomain.com
PDF_STORAGE_PATH=/var/data/campaignops/uploads
BACKUP_STORAGE_PATH=/var/data/campaignops/backups
PORT=3000
```

---

## 3. Database Initialization & Migration
Execute migrations from deployment root:
```bash
# 1. Apply existing verified migration history
npx prisma migrate deploy

# 2. Seed initial Super Admin account (first-time deployment only)
node scripts/seed_production_superadmin.js
```

---

## 4. Production Application Build & Launch
```bash
# Install production dependencies
npm ci --omit=dev

# Build Next.js optimized production bundle
npm run build

# Start production server daemon using PM2 or systemd
pm2 start npm --name "campaignops-app" -- start -- -p 3000
```

---

## 5. Nginx Reverse Proxy & SSL Configuration
Configure Nginx with SSE buffering disabled for realtime field updates:
```nginx
server {
    listen 443 ssl http2;
    server_name campaign.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/campaign.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/campaign.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    # Realtime Server-Sent Events (SSE) streaming endpoint
    location /api/v1/realtime {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering for live event streaming
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # All standard application traffic
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. Disaster Recovery & Backup Verification
To verify backup functionality:
1. Ensure `pg_dump` is installed: `pg_dump --version`.
2. Authenticate as Super Admin and execute `POST /api/v1/backups`.
3. Verify output in `/var/data/campaignops/backups/`.
