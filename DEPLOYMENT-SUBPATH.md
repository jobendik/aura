# AURA - Deployment til playrift.no/aura

## Oppsett for Subpath Deployment

Dette prosjektet er konfigurert til å kjøre på **www.playrift.no/aura**

## Steg 1: Bygg prosjektet

På lokal maskin (eller på serveren):

```bash
npm install
npm run build
```

Dette bygger:
- Frontend til: `dist/client/` (med base path `/aura/`)
- Backend til: `dist/server/`

## Steg 2: Last opp til VPS

### Alternativ A: Med SCP (fra lokal maskin)

```bash
# Bygg først
npm run build

# Last opp dist-mappen
scp -r dist/* bruker@playrift.no:/var/www/aura/dist/

# Last opp server filer
scp -r server bruker@playrift.no:/var/www/aura/
scp package*.json bruker@playrift.no:/var/www/aura/
scp ecosystem.config.js bruker@playrift.no:/var/www/aura/
scp .env.production bruker@playrift.no:/var/www/aura/.env
```

### Alternativ B: Med Git (på serveren)

```bash
# På VPS
ssh bruker@playrift.no
cd /var/www
git clone https://github.com/DIN_BRUKER/aura.git
cd aura

# Installer og bygg
npm install
npm run build

# Kopier env fil
cp .env.production .env
nano .env  # Rediger med dine verdier
```

## Steg 3: Installer avhengigheter på serveren

```bash
ssh bruker@playrift.no
cd /var/www/aura

# Installer kun produksjonsavhengigheter
npm ci --production

# Eller hvis du bygde lokalt, trenger du bare runtime deps:
npm install --production
```

## Steg 4: Konfigurer Nginx

Legg til følgende i din **eksisterende** Nginx config for playrift.no (vanligvis `/etc/nginx/sites-available/playrift.no`):

```nginx
# Finn din eksisterende server block for playrift.no og legg til disse location blocks:

server {
    listen 443 ssl http2;
    server_name www.playrift.no playrift.no;
    
    # ... dine eksisterende SSL settings ...
    
    # ... dine eksisterende locations for / og /arena ...
    
    # AURA Frontend - statiske filer
    location /aura {
        alias /var/www/aura/dist/client;
        try_files $uri $uri/ /aura/index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # AURA WebSocket proxy
    location /aura/ws {
        proxy_pass http://localhost:3001/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
    
    # AURA API proxy (hvis du legger til API endpoints senere)
    location /aura/api {
        proxy_pass http://localhost:3001/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Test og reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Steg 5: Konfigurer miljøvariabler

```bash
cd /var/www/aura
nano .env
```

Sett verdier:
```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=aura
PORT=3001
NODE_ENV=production
```

## Steg 6: Start backend med PM2

```bash
# Hvis du ikke har PM2:
sudo npm install -g pm2

# Start AURA backend
cd /var/www/aura
pm2 start ecosystem.config.js

# Lagre PM2 konfigurasjon
pm2 save

# Sett opp autostart
pm2 startup
```

## Steg 7: Verifiser

Åpne i nettleseren: **https://www.playrift.no/aura**

## Vedlikehold

### Oppdatere applikasjonen

```bash
cd /var/www/aura

# Pull nyeste kode (hvis git)
git pull origin main

# Eller last opp nye filer med SCP

# Installer dependencies
npm install --production

# Bygg
npm run build

# Restart backend
pm2 restart aura-backend

# Ingen restart av Nginx nødvendig for frontend endringer
```

### Overvåke logs

```bash
# PM2 logs
pm2 logs aura-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Debug

Hvis noe ikke fungerer:

```bash
# Sjekk PM2 status
pm2 status

# Sjekk backend logs
pm2 logs aura-backend --lines 100

# Sjekk Nginx config
sudo nginx -t

# Sjekk om port 3001 er i bruk
sudo netstat -tlnp | grep 3001

# Sjekk WebSocket forbindelse i browser console
```

## Viktige mapper

- **Frontend (statisk):** `/var/www/aura/dist/client/`
- **Backend (Node.js):** `/var/www/aura/dist/server/`
- **Source code:** `/var/www/aura/`
- **Logs:** `/var/www/aura/logs/` (PM2)

## Port oversikt

- **Backend:** 3001 (WebSocket + API server)
- **Nginx:** 443 (HTTPS) - reverse proxy til backend
- **MongoDB:** 27017 (lokal) eller MongoDB Atlas

## Sikkerhet

Backend (port 3001) er **ikke** eksponert direkte - kun via Nginx reverse proxy på `/aura/ws` og `/aura/api`.

## Backup

```bash
# Backup applikasjon
tar -czf /backup/aura-$(date +%Y%m%d).tar.gz /var/www/aura

# Backup MongoDB database
mongodump --db=aura --out=/backup/mongodb/aura-$(date +%Y%m%d)
```
