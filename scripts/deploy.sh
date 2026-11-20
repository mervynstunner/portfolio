#!/usr/bin/env bash
# Deploys the latest main to the Lightsail server. Run on the server:
#   ~/apps/portfolio/scripts/deploy.sh
set -euo pipefail

APP="$HOME/apps/portfolio"
WEB=/var/www/mervynstunner

source "$HOME/.nvm/nvm.sh" >/dev/null
cd "$APP"
git pull --ff-only origin main

echo "→ API"
cd "$APP/backend"
npm ci --omit=dev --no-audit --no-fund
npm run db:migrate
pm2 describe portfolio-api >/dev/null 2>&1 \
  && pm2 reload portfolio-api --update-env \
  || pm2 start server.js --name portfolio-api --cwd "$APP/backend" --time
pm2 save >/dev/null

echo "→ Site"
cd "$APP/frontend"
npm ci --no-audit --no-fund
npx vite build
sudo mkdir -p "$WEB"
sudo rsync -a --delete dist/ "$WEB/"

echo "→ nginx"
sudo nginx -t && sudo systemctl reload nginx

sleep 2
curl -fsS http://127.0.0.1:3400/health && echo
echo "Deployed $(git -C "$APP" rev-parse --short HEAD)."
