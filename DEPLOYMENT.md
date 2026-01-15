# AURA - VPS Deployment Guide

## Forutsetninger

- En VPS server (Ubuntu 20.04/22.04 anbefales)
- SSH tilgang til serveren
- Et domenenavn (valgfritt, men anbefalt)
- MongoDB database (lokal eller MongoDB Atlas)

## Metode 1: Automatisk deployment (Anbefalt)

### Steg 1: Forbered repository

```bash
# På lokal maskin - push til GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/aura.git
git push -u origin main
```

### Steg 2: Koble til VPS

```bash
ssh root@your-server-ip
# eller
ssh your-username@your-server-ip
```

### Steg 3: Last ned og kjør deployment script

```bash
# Last ned prosjektet
git clone https://github.com/YOUR_USERNAME/aura.git
cd aura

# Gjør scriptet kjørbart
chmod +x deploy.sh

# Rediger variabler i deploy.sh først
nano deploy.sh
# Endre REPO_URL og DOMAIN

# Kjør deployment
./deploy.sh
```

## Metode 2: Manuell deployment

### Steg 1: Installer Node.js

```bash
# Installer Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifiser
node --version
npm --version
```

### Steg 2: Installer MongoDB

**Alternativ A: Lokal MongoDB**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Alternativ B: MongoDB Atlas**
1. Gå til https://www.mongodb.com/cloud/atlas
2. Opprett gratis cluster
3. Få connection string
4. Legg til i `.env` filen

### Steg 3: Last opp prosjektet

```bash
# På VPS
sudo mkdir -p /var/www/aura
sudo chown -R $USER:$USER /var/www/aura

# Fra lokal maskin
scp -r * your-username@your-server-ip:/var/www/aura/

# Eller bruk Git
cd /var/www/aura
git clone https://github.com/YOUR_USERNAME/aura.git .
```

### Steg 4: Installer avhengigheter og bygg

```bash
cd /var/www/aura
npm install
npm run build
```

### Steg 5: Konfigurer miljøvariabler

```bash
cp .env.production .env
nano .env
```

Rediger `.env` med dine verdier:
```
MONGODB_URI=mongodb://localhost:27017  # eller MongoDB Atlas URI
MONGODB_DB=aura
PORT=3001
NODE_ENV=production
```

### Steg 6: Installer PM2

```bash
sudo npm install -g pm2

# Start applikasjonen
pm2 start ecosystem.config.js

# Sett opp autostart
pm2 startup
pm2 save
```

### Steg 7: Installer og konfigurer Nginx

```bash
# Installer Nginx
sudo apt install -y nginx

# Kopier config
sudo cp nginx.conf /etc/nginx/sites-available/aura

# Rediger domenenavn
sudo nano /etc/nginx/sites-available/aura
# Endre 'your-domain.com' til ditt faktiske domene

# Aktiver site
sudo ln -s /etc/nginx/sites-available/aura /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Steg 8: Sett opp SSL (HTTPS)

```bash
# Installer Certbot
sudo apt install -y certbot python3-certbot-nginx

# Få SSL sertifikat
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot vil automatisk fornye sertifikater
```

## Oppdatering av applikasjonen

```bash
cd /var/www/aura

# Pull nyeste kode
git pull origin main

# Installer nye avhengigheter
npm install

# Bygg på nytt
npm run build

# Restart app
pm2 restart all
```

## Nyttige kommandoer

```bash
# PM2
pm2 status              # Se status
pm2 logs                # Se logger
pm2 logs --lines 100    # Se siste 100 linjer
pm2 monit               # Sanntids monitoring
pm2 restart all         # Restart app
pm2 stop all            # Stopp app
pm2 delete all          # Fjern app fra PM2

# Nginx
sudo systemctl status nginx    # Status
sudo systemctl restart nginx   # Restart
sudo systemctl reload nginx    # Reload config
sudo nginx -t                  # Test config

# MongoDB
sudo systemctl status mongod   # Status
sudo systemctl restart mongod  # Restart
mongosh                        # Koble til database

# Firewall (hvis brukt)
sudo ufw allow 22         # SSH
sudo ufw allow 80         # HTTP
sudo ufw allow 443        # HTTPS
sudo ufw enable
```

## Feilsøking

### App starter ikke
```bash
# Sjekk PM2 logs
pm2 logs

# Sjekk MongoDB
sudo systemctl status mongod
mongosh
```

### Nginx feil
```bash
# Sjekk config
sudo nginx -t

# Sjekk error logs
sudo tail -f /var/log/nginx/error.log
```

### WebSocket problemer
Sjekk at Nginx WebSocket proxy er riktig konfigurert i `nginx.conf`:
```nginx
location /ws {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## Sikkerhet

1. **Brannmur**: Aktiver UFW og åpne bare nødvendige porter
2. **SSH**: Deaktiver root login og bruk SSH nøkler
3. **MongoDB**: Bruk autentisering og begrens tilgang
4. **Oppdateringer**: Hold systemet oppdatert
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

## Backup

```bash
# Backup MongoDB
mongodump --db=aura --out=/backup/mongodb/$(date +%Y%m%d)

# Backup applikasjon
tar -czf /backup/aura-$(date +%Y%m%d).tar.gz /var/www/aura
```

## Monitoring

```bash
# Installer monitoring verktøy
npm install -g pm2-logrotate
pm2 install pm2-logrotate

# Konfiger log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```
