#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Isolate every verification run; never remove an existing application database.
VERIFY_DIR="$(mktemp -d "$ROOT_DIR/.verify-XXXXXX")"
trap 'rm -rf "$VERIFY_DIR"' EXIT
export DATABASE_URL="sqlite:///$VERIFY_DIR/saura.db"

echo "=================================================="
echo "SAURA Canonical Verification Suite"
echo "=================================================="

# 1. Backend Linting
echo "[1/6] Running backend linting (Ruff)..."
.venv/bin/ruff check backend pyproject.toml

# 2. Protected Acceptance Contract Tests
echo "[2/6] Running protected acceptance contract tests..."
.venv/bin/pytest -q acceptance/test_engine_contract.py

# 3. Full Backend Unit & Integration Tests
echo "[3/6] Running full backend test suite..."
.venv/bin/pytest -q backend/tests

# 4. Frontend Unit Tests
echo "[4/6] Running frontend tests (Vitest)..."
(cd frontend && npm test)

# 5. Frontend Typecheck & Build
echo "[5/6] Frontend typecheck, static lint (unused locals/parameters), and production build..."
(cd frontend && ./node_modules/.bin/tsc --noEmit --noUnusedLocals --noUnusedParameters)
(cd frontend && npm run build)

# 6. End-to-End Simulation Smoke Check
echo "[6/6] Running end-to-end simulation smoke check..."
PYTHONPATH=backend .venv/bin/python -m app.sim.seed --reset
PYTHONPATH=backend .venv/bin/python -m app.sim.advance --to 2026-10-30
PYTHONPATH=backend .venv/bin/python -c '
from app.db.session import SessionLocal
from app.models import Ticket, Site, DailyReport
import datetime

db = SessionLocal()
ticket = db.query(Ticket).filter(Ticket.code == "SA-024").first()
assert ticket is not None, "Ticket SA-024 not found"
assert ticket.status == "RESOLVED", f"Expected SA-024 status RESOLVED, got {ticket.status}"

huda = db.query(Site).filter(Site.name == "MA Nurul Huda").first()
reports = db.query(DailyReport).filter(
    DailyReport.site_id == huda.id,
    DailyReport.date >= datetime.date(2026, 10, 24),
    DailyReport.date <= datetime.date(2026, 10, 30)
).all()
assert len(reports) == 7, f"Expected 7 daily reports for MA Nurul Huda, got {len(reports)}"
actual_sum = sum(r.kwh for r in reports)
assert actual_sum == 180.0, f"Expected total 180.0 kWh for week, got {actual_sum}"

print("Smoke check PASSED: Ticket SA-024 auto-resolved, 7-day reports verified (180.0 kWh).")
db.close()
'


echo "=================================================="
echo "✅ ALL VERIFICATION CHECKS GREEN"
echo "=================================================="
