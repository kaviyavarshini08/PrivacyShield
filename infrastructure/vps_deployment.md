# PrivacyShield VPS Deployment Guide

This guide details how to deploy the PrivacyShield enterprise security stack onto a fresh virtual private server (VPS) running Ubuntu 22.04/24.04 LTS.

---

## 1. Prerequisites Installation

Log in as `root` or a user with `sudo` privileges and run the following command to update packages and install core dependencies:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential python3-pip python3-venv \
                    nginx certbot python3-certbot-nginx redis-server postgresql postgresql-contrib \
                    tesseract-ocr libtesseract-dev
```

---

## 2. PostgreSQL & Redis Database Setup

### PostgreSQL Setup
1. Log in to PostgreSQL:
   ```bash
   sudo -i -u postgres psql
   ```
2. Create the database, user, and grant privileges:
   ```sql
   CREATE DATABASE privacyshield;
   CREATE USER shieldadmin WITH PASSWORD 'SecureShieldPassword2026!';
   GRANT ALL PRIVILEGES ON DATABASE privacyshield TO shieldadmin;
   \c privacyshield;
   CREATE EXTENSION IF NOT EXISTS pgvector;
   \q
   ```

### Redis Setup
Redis should automatically start. Verify the service is running:
```bash
sudo systemctl enable redis-server --now
sudo systemctl status redis-server
```

---

## 3. Clone Repository & Setup Environments

Clone your repository into `/var/www/privacyshield`:
```bash
sudo mkdir -p /var/www/privacyshield
sudo chown -R $USER:$USER /var/www/privacyshield
git clone https://github.com/kaviyavarshini08/PrivacyShield.git /var/www/privacyshield
cd /var/www/privacyshield
```

### Create Python Virtual Environment & Install Dependencies
```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r apps/backend/requirements.txt
pip install -r ai-services/requirements.txt
python -m spacy download en_core_web_sm
```

### Apply Migrations
```bash
export DATABASE_URL="postgresql://shieldadmin:SecureShieldPassword2026!@localhost:5432/privacyshield"
cd apps/backend
alembic upgrade head
cd ../..
```

---

## 4. Systemd Service Unit Configurations

Create standard unit definitions to keep the background workers, FastAPI app, and OCR pipelines running reliably.

### Backend API: `/etc/systemd/system/privacyshield-backend.service`
```ini
[Unit]
Description=PrivacyShield Backend API FastAPI Service
After=network.target postgresql.service redis-server.service

[Service]
User=www-data
WorkingDirectory=/var/www/privacyshield/apps/backend
ExecStart=/var/www/privacyshield/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always
Environment=DATABASE_URL=postgresql://shieldadmin:SecureShieldPassword2026!@localhost:5432/privacyshield
Environment=REDIS_URL=redis://localhost:6379/0
Environment=JWT_SECRET_KEY=GeneratingAStrongRandomHexSecretKeyHere
Environment=ENVIRONMENT=production
Environment=PYTHONPATH=/var/www/privacyshield/apps/backend

[Install]
WantedBy=multi-user.target
```

### AI Inference Service: `/etc/systemd/system/privacyshield-ai.service`
```ini
[Unit]
Description=PrivacyShield AI Inference Microservice
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/privacyshield/ai-services
ExecStart=/var/www/privacyshield/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001
Restart=always
Environment=ENABLE_GPU_INFERENCE=false
Environment=PYTHONPATH=/var/www/privacyshield/ai-services

[Install]
WantedBy=multi-user.target
```

### Celery Background Worker: `/etc/systemd/system/privacyshield-worker.service`
```ini
[Unit]
Description=PrivacyShield Background Celery Tasks Worker
After=network.target redis-server.service

[Service]
User=www-data
WorkingDirectory=/var/www/privacyshield/apps/backend
ExecStart=/var/www/privacyshield/venv/bin/celery -A app.core.celery_app worker --loglevel=info
Restart=always
Environment=DATABASE_URL=postgresql://shieldadmin:SecureShieldPassword2026!@localhost:5432/privacyshield
Environment=REDIS_URL=redis://localhost:6379/0
Environment=PYTHONPATH=/var/www/privacyshield/apps/backend

[Install]
WantedBy=multi-user.target
```

### Start and Enable Services:
```bash
sudo systemctl daemon-reload
sudo systemctl enable privacyshield-backend privacyshield-ai privacyshield-worker --now
```

---

## 5. Web Frontend Compilation

Build the production Vite package:
```bash
cd /var/www/privacyshield/apps/web
npm install
# Set target production API URL
export VITE_API_URL="https://api.yourdomain.com"
npm run build
```
This builds static assets into `/var/www/privacyshield/apps/web/dist`.

---

## 6. Nginx Routing Configuration

Create an Nginx configuration file: `/etc/nginx/sites-available/privacyshield`
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Static UI Files
    location / {
        root /var/www/privacyshield/apps/web/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/privacyshield /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. Certbot SSL Orchestration

Generate Let's Encrypt certificates to run HTTPS:
```bash
sudo certbot --nginx -d yourdomain.com
```
Certbot will auto-renew your certificates and patch the Nginx configuration automatically.
