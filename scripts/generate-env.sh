#!/usr/bin/env bash
# =============================================================================
# Generate .env file with secure random secrets
# Usage: ./scripts/generate-env.sh
# =============================================================================

set -euo pipefail

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[x]${NC} $1"; }

# Generate a random hex string of N bytes
gen_hex() {
  openssl rand -hex "$1" 2>/dev/null || head -c "$1" /dev/urandom | xxd -p | tr -d '\n'
}

# Generate a random password (alphanumeric)
gen_password() {
  openssl rand -base64 "$1" 2>/dev/null | tr -dc 'a-zA-Z0-9' | head -c "$1"
}

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   OpenClaw — Environment Generator    ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check if .env already exists
if [ -f "$ENV_FILE" ]; then
  warn ".env already exists."
  read -rp "Overwrite? (y/N): " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    err "Aborted."
    exit 0
  fi
  cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%s)"
  log "Backup created: ${ENV_FILE}.backup.*"
fi

# Generate secrets
log "Generating secrets..."

DB_PASSWORD=$(gen_password 24)
JWT_ACCESS_SECRET=$(gen_hex 32)
JWT_REFRESH_SECRET=$(gen_hex 32)
ENCRYPTION_KEY=$(gen_hex 32)
REDIS_PASSWORD=$(gen_password 24)

# Database config
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-openclaw}"
DB_USER="${DB_USER:-openclaw}"

# Write .env
cat > "$ENV_FILE" << EOF
# =============================================================================
# OpenClaw API — Generated on $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# =============================================================================

# --- Database (PostgreSQL) ---------------------------------------------------
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# --- Redis -------------------------------------------------------------------
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# --- Authentication (JWT) ----------------------------------------------------
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# --- Encryption (AES-256-GCM) ------------------------------------------------
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# --- Server -------------------------------------------------------------------
PORT=3000
HOST=0.0.0.0

# --- Frontend -----------------------------------------------------------------
VITE_API_URL=/api
EOF

log "Generated .env with secure secrets"
echo ""
echo -e "  ${CYAN}DB_PASSWORD${NC}      = ${DB_PASSWORD}"
echo -e "  ${CYAN}JWT_ACCESS${NC}       = ${JWT_ACCESS_SECRET:0:16}..."
echo -e "  ${CYAN}JWT_REFRESH${NC}      = ${JWT_REFRESH_SECRET:0:16}..."
echo -e "  ${CYAN}ENCRYPTION_KEY${NC}   = ${ENCRYPTION_KEY:0:16}..."
echo -e "  ${CYAN}REDIS_PASSWORD${NC}   = ${REDIS_PASSWORD}"
echo ""
log "Done! Start with: docker compose up --build"
echo ""
