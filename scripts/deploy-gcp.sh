#!/usr/bin/env bash
# Clawman — Deploy Control Plane to GCP Cloud Run
# Prerequisites: gcloud CLI authenticated, Docker installed
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${CLAWMAN_SERVICE:-clawman}"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "Building Clawman image..."
docker build -f Dockerfile.clawman -t "${IMAGE}:latest" .

echo "Pushing to GCR..."
docker push "${IMAGE}:latest"

echo "Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}:latest" \
  --region "${REGION}" \
  --platform managed \
  --port 18789 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --execution-environment gen2 \
  --mount type=cloud-storage,source="${SERVICE_NAME}-data",target=/root/.clawman,readonly=false

echo "Deployed: $(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format 'value(status.url)')"
echo ""
echo "Next steps:"
echo "  1. Configure Tailscale sidecar for node connectivity"
echo "  2. Copy clawman.json5 to the persistent volume"
echo "  3. Register Mac Mini as execution node"
