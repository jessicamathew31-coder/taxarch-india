# TaxArch India — System Architecture

---

## API Design

All endpoints accept `UserProfile` as a POST body. The frontend builds one profile object
and sends it to multiple endpoints in parallel. Stateless design: no session tokens, no
authentication. Results are computed fresh on every request.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Liveness probe for Render |
| POST | /api/regime-summary | Current-year regime comparison |
| POST | /api/lifecycle | Full 25-year projection (persists profile) |
| POST | /api/investment-plan | 80C instrument allocation |
| POST | /api/life-events | Life event tax impact list |
| POST | /api/deductions | Full deduction audit |
| GET | /api/tax?income=&regime=&deductions= | Raw tax calculation (slider utility) |

### Request Flow

The Analyzer page fires three parallel requests on form submission:
`/api/regime-summary`, `/api/deductions`, `/api/investment-plan`

The Lifecycle page fires two requests:
`/api/lifecycle`, `/api/life-events` (if life events exist)

---

## Service Layer

```
tax_calculator.py
  compute_tax()              -- slab engine for any income + regime
  compute_deductions()       -- all old-regime deductions for a profile
  compute_break_even_deductions()  -- binary search on deduction threshold

lifecycle_projector.py
  run_lifecycle_projection() -- 25-year corpus model for both regimes
    calls: compute_tax() per year per regime
    calls: compute_80c_investment() per year
    calls: get_event_deductions() per year
    calls: compute_break_even_deductions() for summary

investment_optimizer.py
  compute_blended_return()   -- weighted average portfolio return
  compute_80c_investment()   -- investable amount heuristic by income
  generate_investment_plan() -- full allocation with corpus projections

deduction_mapper.py
  build_deduction_audit()    -- maps all 29 deductions to profile
  get_top_deductions()       -- top N by annual saving (used in regime summary)

life_event_modeler.py
  compute_life_event_impacts() -- narrative + numbers for each event
  get_event_deductions()       -- additional deduction per event (called by projector)
```

---

## Database Schema

```
user_profiles         -- one row per analysis session (UUID PK from client)
  tax_slabs           -- FY 2025-26 rates for both regimes
  surcharge_slabs     -- surcharge rates by regime and income
  deductions          -- 29 deduction records with eligibility rules
  instruments         -- 9 investment instruments with return assumptions
  scenario_results    -- per (profile, regime, year) results for analytics
  deduction_audit     -- per (profile, deduction) claimed/unclaimed records
```

PostgreSQL is only required for:
1. Profile persistence (lifecycle endpoint)
2. Analytics observatory (Module 7)

All analysis endpoints work without a database connection. The lifecycle projector is
entirely in-memory and produces results in under 100ms for a 25-year projection.

---

## Frontend State Management

Global profile and results state lives in `App.jsx` and is passed as props to pages.
This means:
- User fills profile once on Analyzer
- Lifecycle page uses the same profile without re-entry
- Both pages show results from the same analysis session

React Router is used for navigation. No external state management library.

---

## Deployment Architecture

```
GitHub (source of truth)
  frontend branch: main
  backend branch: main

Frontend: GitHub Pages
  Build: npm run build (Vite outputs to dist/)
  Host: jessicamathew31-coder.github.io/taxarch-india
  Environment: VITE_API_URL = Render backend URL

Backend: Render Web Service
  Build: pip install -r backend/requirements.txt
  Start: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
  DB: Render PostgreSQL (free tier)
  Environment: DATABASE_URL (Render auto-sets for linked DB)
```

CORS is configured to allow the GitHub Pages origin and localhost for development.
