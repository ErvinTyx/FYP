# ─────────────────────────────────────────────
#  PMS – Windows Installation Script (PowerShell)
#  Run with: powershell -ExecutionPolicy Bypass -File install.ps1
# ─────────────────────────────────────────────

$ErrorActionPreference = "Stop"

function Write-Info    { param($msg) Write-Host "[INFO]  $msg"  -ForegroundColor Cyan   }
function Write-Ok      { param($msg) Write-Host "[OK]    $msg"  -ForegroundColor Green  }
function Write-Warn    { param($msg) Write-Host "[WARN]  $msg"  -ForegroundColor Yellow }
function Write-Err     { param($msg) Write-Host "[ERROR] $msg"  -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   PMS - Power Metal Steel Setup      " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Check Node.js ─────────────────────────
Write-Info "Checking Node.js..."
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
    $major = [int]($nodeVersion -replace 'v(\d+)\..*','$1')
    if ($major -lt 18) {
        Write-Err "Node.js v18 or higher is required. Current version: $nodeVersion. Install from https://nodejs.org/"
    }
    Write-Ok "Node.js $nodeVersion detected."
} catch {
    Write-Err "Node.js is not installed. Install it from https://nodejs.org/ (v18 or higher) and re-run this script."
}

# ── 2. Check npm ─────────────────────────────
Write-Info "Checking npm..."
try {
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Ok "npm $npmVersion detected."
} catch {
    Write-Err "npm not found. It should ship with Node.js - please reinstall Node.js."
}

# ── 3. Check MySQL / MariaDB ─────────────────
Write-Info "Checking MySQL / MariaDB..."
try {
    $mysqlOut = mysql --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "MySQL detected: $($mysqlOut | Select-Object -First 1)"
    } else { throw }
} catch {
    Write-Warn "MySQL client not found in PATH. Make sure MySQL or MariaDB is installed and running before continuing."
}

# ── 4. Install dependencies ──────────────────
Write-Info "Installing npm dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { Write-Err "npm install failed." }
Write-Ok "Dependencies installed."

# ── 5. Environment file ──────────────────────
if (-Not (Test-Path ".env")) {
    Write-Info "Creating .env from .env.example..."
    Copy-Item ".env.example" ".env"
    Write-Ok ".env file created."
    Write-Host ""
    Write-Warn "ACTION REQUIRED: Open .env and fill in your database credentials and other settings before continuing."
    Write-Host ""
    Read-Host "Press ENTER once you have configured .env to continue"
} else {
    Write-Info ".env already exists - skipping copy."
}

# ── 6. Database migration ────────────────────
Write-Info "Running database migrations..."
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { Write-Err "Prisma migration failed. Check your .env database settings." }
Write-Ok "Migrations applied."

# ── 7. Seed the database ─────────────────────
Write-Info "Seeding the database..."
npm run db:seed
if ($LASTEXITCODE -ne 0) { Write-Err "Database seeding failed." }
Write-Ok "Database seeded."

# ── 8. Done ──────────────────────────────────
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "   Installation complete!             " -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Start the development server with:" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Then open http://localhost:3000 in your browser." -ForegroundColor White
Write-Host ""

$start = Read-Host "Start the development server now? [y/N]"
if ($start -match '^[Yy]$') {
    npm run dev
}
