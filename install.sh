#!/usr/bin/env bash
set -e

# ─────────────────────────────────────────────
#  PMS – Linux Installation Script
# ─────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

echo ""
echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}   PMS – Power Metal Steel Setup      ${NC}"
echo -e "${CYAN}======================================${NC}"
echo ""

# ── 1. Check Node.js ─────────────────────────
info "Checking Node.js..."
if ! command -v node &>/dev/null; then
  error "Node.js is not installed. Install it from https://nodejs.org/ (v18 or higher) and re-run this script."
fi

NODE_VER=$(node -e "process.exit(parseInt(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)" 2>/dev/null && echo "ok" || echo "old")
if [ "$NODE_VER" = "old" ]; then
  error "Node.js v18 or higher is required. Current version: $(node -v)"
fi
success "Node.js $(node -v) detected."

# ── 2. Check npm ─────────────────────────────
info "Checking npm..."
if ! command -v npm &>/dev/null; then
  error "npm is not found. It should ship with Node.js – please reinstall Node.js."
fi
success "npm $(npm -v) detected."

# ── 3. Check MySQL / MariaDB ─────────────────
info "Checking MySQL / MariaDB..."
if command -v mysql &>/dev/null; then
  success "MySQL client detected: $(mysql --version | head -1)."
else
  warn "MySQL client not found in PATH. Make sure MySQL or MariaDB is installed and running before continuing."
fi

# ── 4. Install dependencies ──────────────────
info "Installing npm dependencies..."
npm install
success "Dependencies installed."

# ── 5. Environment file ──────────────────────
if [ ! -f ".env" ]; then
  info "Creating .env from .env.example..."
  cp .env.example .env
  success ".env file created."
  echo ""
  warn "ACTION REQUIRED: Open .env and fill in your database credentials and other settings before continuing."
  echo ""
  read -rp "Press ENTER once you have configured .env to continue..."
else
  info ".env already exists – skipping copy."
fi

# ── 6. Database migration ────────────────────
info "Running database migrations..."
npx prisma migrate deploy
success "Migrations applied."

# ── 7. Seed the database ─────────────────────
info "Seeding the database..."
npm run db:seed
success "Database seeded."

# ── 8. Done ──────────────────────────────────
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}   Installation complete!             ${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Start the development server with:"
echo -e "  ${CYAN}npm run dev${NC}"
echo ""
echo -e "Then open ${CYAN}http://localhost:3000${NC} in your browser."
echo ""

read -rp "Start the development server now? [y/N] " START
if [[ "$START" =~ ^[Yy]$ ]]; then
  npm run dev
fi
