#!/bin/bash
set -e

QA_ENV_FILE=".env.qa.local"

if [ ! -f "$QA_ENV_FILE" ]; then
  echo "Error: $QA_ENV_FILE not found."
  exit 1
fi

export $(grep -v '^#' "$QA_ENV_FILE" | xargs -0) 2>/dev/null || true
source "$QA_ENV_FILE" 2>/dev/null || true

if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = "" ]; then
  echo "Error: DATABASE_URL is empty in $QA_ENV_FILE."
  exit 1
fi

echo "[STEP 1/4] Applying Prisma migrations to QA cloud database..."
DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy

echo "[STEP 2/4] Seeding verified QA accounts (Super Admin, Campaign Admin, Political Agent)..."
DATABASE_URL="$DATABASE_URL" node scripts/seed-dev-passwords.js

echo "[STEP 3/4] Updating Vercel project environment variables securely..."
npx vercel env rm DATABASE_URL production --project political-manager --yes 2>/dev/null || true
npx vercel env add DATABASE_URL production --project political-manager --value "$DATABASE_URL"

SECRET_VAL=$(openssl rand -hex 32)
npx vercel env rm SESSION_SECRET production --project political-manager --yes 2>/dev/null || true
npx vercel env add SESSION_SECRET production --project political-manager --value "$SECRET_VAL"

npx vercel env rm NEXT_PUBLIC_APP_URL production --project political-manager --yes 2>/dev/null || true
npx vercel env add NEXT_PUBLIC_APP_URL production --project political-manager --value "https://political-manager.vercel.app"

echo "[STEP 4/4] Deploying updated build to Vercel production..."
npx vercel deploy --prod --yes

echo "✅ QA Cloud Deployment successfully completed!"
