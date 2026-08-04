#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.local}"

if [[ "$#" -ne 2 ]]; then
  echo "Usage: $0 KEY VALUE" >&2
  exit 1
fi

KEY="$1"
VALUE="$2"

if [[ ! "$KEY" =~ ^[A-Z][A-Z0-9_]*$ ]]; then
  echo "Invalid environment variable name." >&2
  exit 1
fi

umask 077
TEMP_FILE="$(mktemp "$ROOT_DIR/.env.local.XXXXXX")"

cleanup() {
  rm -f "$TEMP_FILE"
}
trap cleanup EXIT

if [[ -f "$ENV_FILE" ]]; then
  awk -v key="$KEY" '
    index($0, key "=") != 1 { print }
  ' "$ENV_FILE" > "$TEMP_FILE"
fi

printf '%s=%s\n' "$KEY" "$VALUE" >> "$TEMP_FILE"
chmod 600 "$TEMP_FILE"
mv "$TEMP_FILE" "$ENV_FILE"
trap - EXIT
