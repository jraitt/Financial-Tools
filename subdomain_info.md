# Financial Tools Subdomain Setup

## ❖ Linux (Server Deployment)

Follow these steps to deploy the application on a Linux server.

**Get the Project Code** \* **To clone the repository for the first time:**

```sh
      git clone https://github.com/jraitt/Financial-Tools.git
```

**To pull the latest updates if the repository already exists:**

```sh
      cd /path/to/financial-tools
      git pull
```

## ❖ Add Subdomain at Your DNS Provider

Example: `finapps.compound-interests.com

## ❖ Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/finapps.conf
```

```nginx
server {
    listen 80;
    server_name finapps.compound-interests.com;  # Update with your actual subdomain
    # This block will be filled/managed by Certbot for HTTPS later

    location / {
        proxy_pass http://127.0.0.1:3050;
        # Headers for Next.js
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;

        # Next.js specific optimizations
        proxy_cache_bypass $http_upgrade;
        proxy_set_header Accept-Encoding "";
    }

    # Handle Next.js static assets
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3050;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## ❖ Enable Site and Add SSL

### Enable the site configuration:

```bash
sudo ln -s /etc/nginx/sites-available/finapps.conf /etc/nginx/sites-enabled/
```

### Test Nginx config and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Run Certbot to get your SSL certificate:

```bash
sudo certbot --nginx -d finapps.compound-interests.com  # Use your actual subdomain
```

## ❖ Configure Environment Variables

**Create the production environment file:**

```bash
nano .env.production
```

**Add the following (update with your actual values):**

```env
# Database
DATABASE_URL=file:/app/data/app.db

# Better Auth
BETTER_AUTH_SECRET=<generate-a-secure-random-string>
BETTER_AUTH_URL=https://finapps.compound-interests.com

# App
NEXT_PUBLIC_APP_URL=https://finapps.compound-interests.com
```

**Generate a secure secret:**

```bash
openssl rand -base64 32
```

## ❖ Build and Start Docker Container

**Navigate to the project directory and execute:**

```sh
docker compose -f docker-compose.prod.yml up -d --build
```

**This will build the image from the latest code and start the container in detached mode. The application will now be live and accessible at `https://finapps.compound-interests.com`**

### Useful Docker Commands:

```bash
# View logs
docker logs financial-tools

# Stop the container
docker compose -f docker-compose.prod.yml down

# Restart the container
docker compose -f docker-compose.prod.yml restart

# View running containers
docker ps
```
