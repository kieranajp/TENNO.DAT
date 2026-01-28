#!/usr/bin/env bash
set -euo pipefail

# Get image tag from argument or default to current git short SHA
TAG="${1:-$(git rev-parse --short HEAD)}"
NAMESPACE="${NAMESPACE:-apps}"

echo "Deploying tenno with tag: sha-$TAG to namespace: $NAMESPACE"

# Deploy with Helm
# Secrets should be provided via environment variables
helm upgrade tenno ./charts/TENNO.DAT \
  --install \
  --namespace "$NAMESPACE" \
  --set api.image.tag="sha-$TAG" \
  --set web.image.tag="sha-$TAG" \
  --set secrets.DB_USER="${DB_USER:?DB_USER must be set}" \
  --set secrets.DB_PASS="${DB_PASS:?DB_PASS must be set}" \
  --set secrets.DB_NAME="${DB_NAME:?DB_NAME must be set}" \
  --set secrets.DB_HOST="${DB_HOST:-tenno-postgresql}" \
  --set secrets.DB_PORT="${DB_PORT:-5432}" \
  --set secrets.BASE_URL="${BASE_URL:?BASE_URL must be set}" \
  --set secrets.FRONTEND_URL="${FRONTEND_URL:?FRONTEND_URL must be set}" \
  --set secrets.CORS_ORIGIN="${CORS_ORIGIN:?CORS_ORIGIN must be set}" \
  --set secrets.STEAM_API_KEY="${STEAM_API_KEY:-}" \
  --set secrets.VITE_API_URL="${VITE_API_URL:?VITE_API_URL must be set}"

echo "✅ Deployment complete"
echo "Run: kubectl get pods -n $NAMESPACE"
