#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$#" -ne 1 ]]; then
  echo "Usage: $0 PATH_TO_CI_ENV" >&2
  echo "Production and local application secrets must be configured in Vercel, not GitHub." >&2
  exit 1
fi

ENV_FILE="$1"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is required."
  echo "Install it from https://cli.github.com and rerun this script."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Environment file not found: $ENV_FILE"
  exit 1
fi

if [[ ! -s "$ENV_FILE" ]]; then
  echo "Environment file is empty: $ENV_FILE"
  exit 1
fi

if awk -F= '
  /^(DATABASE_URL|ADMIN_PASSWORD|ADMIN_SESSION_SECRET|SUPABASE_.*|REACT_APP_.*|DOPPLER_.*)=/ {
    blocked = 1
  }
  END { exit blocked ? 0 : 1 }
' "$ENV_FILE"; then
  echo "Refusing to upload application, Supabase, Firebase, or Doppler secrets to GitHub." >&2
  echo "CI uses local Supabase and does not need production credentials." >&2
  exit 1
fi

if ! gh auth status --hostname github.com >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated."
  echo "Run: gh auth login --hostname github.com"
  exit 1
fi

cd "$ROOT_DIR"

REMOTE_URL="$(git remote get-url origin)"
REPOSITORY="$(
  printf '%s\n' "$REMOTE_URL" |
    sed -E \
      -e 's#^git@github\.com:##' \
      -e 's#^https://github\.com/##' \
      -e 's#\.git$##'
)"

if [[ "$REPOSITORY" != */* ]]; then
  echo "Could not determine a GitHub repository from origin: $REMOTE_URL"
  exit 1
fi

echo "Uploading environment variables from $ENV_FILE to $REPOSITORY..."
gh secret set \
  --app actions \
  --repo "$REPOSITORY" \
  --env-file "$ENV_FILE"
echo "GitHub Actions secrets updated."
