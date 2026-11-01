# SAURA — Solar PV Monitoring & AI Maintenance Intelligence System

SAURA (*Sistem Analisis Unjuk Kerja PLTS Atap dan Asisten Perawatan Berbasis AI*) is an automated solar photovoltaic (PV) operations and performance analytics platform designed for distributed and communal solar rooftop installations.

The platform bridges on-site operators, facility managers, and certified technicians through guided messaging, automated optical character recognition (OCR) of inverter readouts, weather-adjusted physical yield calculations, and human-in-the-loop maintenance cost approval workflows.

---

## Architecture Overview

```
                          +-----------------------------+
                          |   Field Solar PV Operator   |
                          +--------------+--------------+
                                         |
                                         | Inverter display photo / Daily report
                                         v
+---------------------------------------------------------------------------------+
|                                 TELEGRAM BOT                                    |
|   * Guided onboarding & site binding (FSM)                                      |
|   * OCR extraction of E-Today (kWh)                                             |
|   * Safe ground-level troubleshooting questionnaires                            |
+----------------------------------------+----------------------------------------+
                                         |
                                         | Authenticated REST / Webhook
                                         v
+---------------------------------------------------------------------------------+
|                              FASTAPI BACKEND CORE                               |
|                                                                                 |
|   +--------------------------+  +--------------------------+  +---------------+ |
|   | Deterministic Engine     |  | Ticket & Cost Governance |  | Safety Policy | |
|   | * Weather yield modeling |  | * Scoped role security   |  | * Safe checks | |
|   | * PR & Health Index      |  | * Cost change audit      |  | * No roof /   | |
|   | * 3-day recovery track   |  | * Manager cost approval  |  |   high voltage| |
|   +--------------------------+  +--------------------------+  +---------------+ |
|                                                                                 |
|   +--------------------------+  +--------------------------+  +---------------+ |
|   | Simulation Engine        |  | Report Generation        |  | Auth & Models | |
|   | * Deterministic clock    |  | * Weekly PDF (ReportLab) |  | * JWT tokens  | |
|   | * Scenario replay        |  | * CSV Data Export        |  | * SQLAlchemy2 | |
|   +--------------------------+  +--------------------------+  +---------------+ |
+-----------------------+----------------------------------+----------------------+
                        |                                  |
                        v                                  v
         +------------------------------+   +-------------------------------+
         |   SQLite / PostgreSQL 16     |   |   Operations Web Dashboard    |
         |   * 14 relational tables     |   |   * React 18, Vite, Tailwind  |
         |   * Alembic version control  |   |   * Manager & Tech views      |
         |   * Scoped site/ticket data  |   |   * Authenticated downloads   |
         +------------------------------+   +-------------------------------+
```

---

## Core Capabilities

### 1. Deterministic Physical Analysis & Yield Estimation
* **Expected Energy Formulation**: Computes baseline generation using local solar irradiance and performance ratio ($PR$):
  $$E_{expected} = P_{kWp} \times H \times PR$$
* **Operational Classification**: Categorizes site health into `NORMAL` ($\ge 85\%$), `ACTION` ($60\% - 84\%$), `CRITICAL` ($< 60\%$), or `NO_DATA`.
* **Cloudy Day Guard**: Prevents spurious incident tickets on low-irradiance days ($H < 2.5\text{ kWh/m}^2/\text{day}$) by capping severity at `ACTION` and avoiding unnecessary truck rolls.
* **Financial Loss Quantization**: Tracks unrealized revenue based on local energy tariffs:
  $$\text{Loss (IDR)} = (E_{expected} - E_{actual}) \times \text{Tariff}$$

### 2. Guided Messaging & Automated Inverter OCR
* **Automated Inverter OCR**: Extracts daily energy yield ($E_{today}$) directly from inverter display photos with confidence scoring and operator confirmation fallbacks.
* **Ground-Safe Guided Troubleshooting**: Enforces non-hazardous diagnostic checks (grid voltage status, breaker position, display codes). Operators are strictly instructed never to climb roofs, open inverters, or contact high-voltage cabling.

### 3. Role-Scoped Governance & Cost Approvals
* **Scoped Multi-Tenancy**: Facility managers can only view and manage authorized sites; technicians only access explicitly assigned work orders.
* **Strict Cost Invalidation**: Any revision to a technician's cost estimate automatically resets approval status to `AWAITING_APPROVAL`, invalidating prior authorizations and preserving an immutable audit log.
* **3-Day Recovery Verification**: An incident ticket only transitions to `RESOLVED` after three consecutive qualifying days of generation achieving $\ge 90\%$ of expected output following field remediation.

### 4. Operations Web Dashboard
* **Dense Operational UI**: Dark-mode dashboard built with React 18, TypeScript, and Tailwind CSS.
* **7-Day Trend Visualizations**: Displays daily production comparisons (Actual vs. Expected).
* **Authenticated Document Downloads**: Secure client-side blob downloads for official weekly PDF reports and CSV datasets.
* **Replayable Simulation Bar**: Fast-forward simulation clock to test multi-day degradation scenarios and recovery lifecycles.

---

## Repository Layout

```
.
├── acceptance/                    # Protected acceptance contract test suites
│   └── test_engine_contract.py
├── backend/
│   ├── alembic/                   # Database migration scripts
│   ├── alembic.ini
│   ├── app/
│   │   ├── agent/                 # Guided playbook, safety rules, response synthesis
│   │   ├── api/                   # REST endpoints (auth, sites, tickets, reports, sim)
│   │   ├── db/                    # Session management and engine configuration
│   │   ├── engine/                # Core physics, weather, status, recovery math
│   │   ├── models/                # SQLAlchemy entity definitions
│   │   ├── ocr/                   # Inverter display text parsing and confidence scoring
│   │   ├── reports/               # Weekly PDF and CSV export generators
│   │   ├── sim/                   # Deterministic simulation clock, seed, scenario generator
│   │   ├── telegram/              # Bot service, finite state machine, mock harness
│   │   ├── auth.py                # JWT authentication and password hashing
│   │   ├── config.py              # Environment configuration
│   │   ├── main.py                # FastAPI application entrypoint
│   │   └── ticket_policy.py       # Scoped ticket authorization and lifecycle policies
│   └── tests/                     # Unit and integration test suites
├── frontend/
│   ├── src/                       # React components, API transport, and test specs
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── docs/
│   ├── decisions.md               # Technical decisions and architectural constraints
│   └── source/                    # System specifications and domain guidelines
├── scripts/
│   └── verify.sh                  # Canonical verification suite (lint, tests, build, smoke)
├── docker-compose.yml             # Container orchestration (PostgreSQL + API + Web)
├── pyproject.toml                 # Ruff and Pytest tooling configurations
└── .env.example                   # Environment configuration template
```

---

## Getting Started

### Prerequisites
* Python 3.11+
* Node.js 18+ and npm
* Optional: Tesseract OCR (for image extraction)

### Backend Setup
1. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install fastapi uvicorn sqlalchemy alembic pydantic pillow reportlab pytesseract ruff pytest pytest-asyncio
   ```
3. Initialize configuration:
   ```bash
   cp .env.example .env
   ```
4. Run database migrations:
   ```bash
   cd backend && alembic upgrade head && cd ..
   ```
5. Start the backend development server:
   ```bash
   uvicorn app.main:app --app-dir backend --reload --port 8000
   ```

### Frontend Setup
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

## Canonical Verification

The repository includes a comprehensive verification script (`scripts/verify.sh`) that validates code quality, acceptance contracts, backend tests, frontend build, and end-to-end simulation smoke:

```bash
bash scripts/verify.sh
```

### Verification Pipeline Stages:
1. **Ruff Linter**: Enforces code style and import cleanliness across backend modules.
2. **Acceptance Contract Tests**: Verifies core mathematical models against contractual benchmarks.
3. **Backend Test Suite**: Executes 63 unit and integration tests across engine, agent, API, and security policies.
4. **Frontend Unit Tests**: Runs Vitest suites validating authenticated downloads and component behavior.
5. **Static Typecheck & Production Build**: Executes TypeScript checks (`tsc --noUnusedLocals --noUnusedParameters`) and compiles production assets via Vite.
6. **End-to-End Simulation Smoke Check**: Seeds sample solar facilities, advances time, validates ticket resolution, and confirms energy calculations.

---

## Security & Safety Architecture

* **Role-Based Access Control**: Strict principal scoping on all read and write mutations. Technicians cannot approve cost estimates; managers cannot impersonate field technicians.
* **Electrical Safety Policy**: Diagnostic guidance is restricted to safe exterior observation. Hazardous procedures (accessing roofs, opening high-voltage combiner boxes) are strictly forbidden.
* **Deterministic Financial Bounds**: Monetary calculations rely exclusively on verified operational formulas rather than unverified heuristic approximations.

---

## Author

**Muhammad Rifqi Setiawan**  
GitHub: [@Rifqi-Setiawan](https://github.com/Rifqi-Setiawan)  
Email: `149862767+Rifqi-Setiawan@users.noreply.github.com`
