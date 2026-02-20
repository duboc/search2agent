#!/usr/bin/env bash
set -euo pipefail

#───────────────────────────────────────────────────────
# deploy.sh — Deploy search2agent to Cloud Run (from source)
#───────────────────────────────────────────────────────

# ── Configuration ─────────────────────────────────────
SERVICE_NAME="search2agent"
REGION="us-central1"

# Auto-detect project from gcloud config (override with GOOGLE_CLOUD_PROJECT env var)
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"

# Model configuration (defaults match .env.example)
LOCATION_TEXT="${GOOGLE_CLOUD_LOCATION_TEXT:-global}"
LOCATION_VOICE="${GOOGLE_CLOUD_LOCATION_VOICE:-us-central1}"
MODEL_TEXT="${GEMINI_MODEL_ID_TEXT:-gemini-3-flash-preview}"
MODEL_VOICE="${GEMINI_MODEL_ID_VOICE:-gemini-live-2.5-flash-native-audio}"

# ── Validation ────────────────────────────────────────
if [[ -z "${PROJECT_ID}" ]]; then
  echo "❌ Error: No project ID found."
  echo "   Set GOOGLE_CLOUD_PROJECT or run: gcloud config set project <PROJECT_ID>"
  exit 1
fi

echo "🚀 Deploying ${SERVICE_NAME} to Cloud Run"
echo "   Project:  ${PROJECT_ID}"
echo "   Region:   ${REGION}"
echo "   Models:   text=${MODEL_TEXT}, voice=${MODEL_VOICE}"
echo ""

# ── Deploy from source ───────────────────────────────
gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --allow-unauthenticated \
  --set-env-vars "\
NODE_ENV=production,\
GOOGLE_CLOUD_PROJECT=${PROJECT_ID},\
GOOGLE_CLOUD_LOCATION_TEXT=${LOCATION_TEXT},\
GOOGLE_CLOUD_LOCATION_VOICE=${LOCATION_VOICE},\
GEMINI_MODEL_ID_TEXT=${MODEL_TEXT},\
GEMINI_MODEL_ID_VOICE=${MODEL_VOICE}" \
  --session-affinity \
  --min-instances 0 \
  --max-instances 5 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600

echo ""
echo "✅ Deployment complete!"
echo "   URL: $(gcloud run services describe ${SERVICE_NAME} --project ${PROJECT_ID} --region ${REGION} --format 'value(status.url)')"
