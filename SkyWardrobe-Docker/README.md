# SkyWardrobe Docker

This directory contains the production-ready Docker container setup for **SkyWardrobe**, allowing you to deploy the full web application on a Linux Ubuntu machine (or any Docker-compatible host) with a single command.

---

## Features

- **Isolated & Standalone**: Packages the Node.js/Express backend, SQLite database, and frontend dashboard into a self-contained Debian Slim container.
- **Automated Database Setup**: Checks on startup and automatically initializes and seeds the SQLite wardrobe database (`wardrobe.db`) if it doesn't already exist.
- **Dynamic Client Configuration**: Rebuilds the frontend configuration (`www/config.js`) on startup using container environment variables (`OPENWEATHER_CITY`, `SKYWARDROBE_API_BASE_URL`).
- **Security-Hardened**: Executes under a non-root `node` user.
- **Built-in Healthchecks**: Probes the native `/health` endpoint to monitor container health.
- **Data Persistence**: Uses a Docker volume (`wardrobe_data`) to persist your SQLite wardrobe database across container restarts.

---

## Quick Start on Ubuntu Linux

### 1. Prerequisites (Ubuntu)

Ensure Docker and Docker Compose (v2) are installed:

```bash
# Update package index
sudo apt update

# Install Docker and the Docker Compose plugin (if not already installed)
sudo apt install -y docker.io docker-compose-v2

# (Optional) Allow running Docker without sudo
sudo usermod -aG docker $USER
newgrp docker
```

---

### 2. Configure Environment Variables

Create your `.env` file from the provided template:

```bash
cp .env.example .env
```

Edit `.env` using your favorite text editor (e.g. `nano .env`) to set your OpenWeatherMap key and default city:

```env
OPENWEATHER_KEY=your_openweather_api_key_here
OPENWEATHER_CITY=Melbourne,AU
PORT=3000
DATABASE_PATH=/app/data/wardrobe.db
```

> **Note**: If `OPENWEATHER_KEY` is not provided, SkyWardrobe automatically runs in **fallback mode**, serving simulated weather data and sample outfit recommendations.

---

### 3. Launch with Docker Compose (Recommended)

From inside the `SkyWardrobe-Docker/` directory, start the container in detached mode:

```bash
docker compose up -d --build
```

Access the dashboard in your browser at:
**`http://localhost:3000`** (or `http://<your-ubuntu-server-ip>:3000`)

---

## Alternative: Using Docker CLI Directly

If you prefer using the standard `docker` CLI instead of Docker Compose:

### 1. Build the Image
```bash
docker build -t skywardrobe:latest .
```

### 2. Run the Container
```bash
# Run with environment variables from .env and persistent named volume
docker run -d \
  --name skywardrobe \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  -v skywardrobe-data:/app/data \
  skywardrobe:latest
```

---

## Useful Commands

| Action | Docker Compose Command | Docker CLI Command |
| :--- | :--- | :--- |
| **View logs** | `docker compose logs -f` | `docker logs -f skywardrobe` |
| **Check health/status** | `docker compose ps` | `docker ps -f name=skywardrobe` |
| **Stop container** | `docker compose down` | `docker stop skywardrobe` |
| **Restart container** | `docker compose restart` | `docker restart skywardrobe` |
| **Rebuild after edits** | `docker compose up -d --build` | `docker build -t skywardrobe:latest . && docker run ...` |
| **Open container shell** | `docker compose exec skywardrobe sh` | `docker exec -it skywardrobe sh` |

---

## Verification & Health Check

Verify that the service is running and healthy:

```bash
# 1. Check HTTP health endpoint
curl -i http://localhost:3000/health
# Returns HTTP 200 OK

# 2. Check weather API endpoint
curl -s http://localhost:3000/weather | head -c 200
```

---

## Project Structure

```
SkyWardrobe-Docker/
├── Dockerfile                  # Production Debian-slim multi-layer Dockerfile
├── docker-compose.yml          # Compose orchestration with volume persistence
├── docker-entrypoint.sh        # Startup script for DB initialization & config compilation
├── .dockerignore               # Build exclusion rules
├── .env.example                # Sample environment configuration
├── db.js                       # SQLite database layer (supports DATABASE_PATH)
├── logic.js                    # Express application and weather aggregation logic
├── package.json                # Project dependencies and script declarations
├── scripts/
│   ├── build-www.js            # Client configuration compiler
│   ├── init-db.js              # Database table initializer
│   └── seed-fashiongen.js      # FashionGen-style wardrobe seeder
├── tests/                      # Automated test suite
└── www/                        # Frontend UI and radar assets
```
