"""
TaxArch India — FastAPI Application

All API routes for the TaxArch engine. The frontend calls these endpoints
to power the six analysis modules. Each route is stateless: the full user
profile is sent in the request body and results are computed on the fly.
Results are persisted to PostgreSQL for the Power BI analytics observatory
(Module 7), but the response is always computed from the live request.
"""

from __future__ import annotations

import os
from typing import List

import psycopg2
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from backend.models.user_profile import (
    DeductionAuditResult,
    InvestmentPlan,
    LifecycleResult,
    LifeEventImpact,
    RegimeSummary,
    UserProfile,
)
from backend.services.deduction_mapper import build_deduction_audit, get_top_deductions
from backend.services.investment_optimizer import generate_investment_plan
from backend.services.life_event_modeler import compute_life_event_impacts
from backend.services.lifecycle_projector import run_lifecycle_projection
from backend.services.tax_calculator import compute_tax, compute_break_even_deductions
from backend.models.user_profile import Regime

app = FastAPI(
    title="TaxArch India API",
    description=(
        "Lifecycle tax regime optimiser for Indian individual taxpayers. "
        "Computes 20-30 year wealth trajectories under both the old and new income tax regimes."
    ),
    version="1.0.0",
)

# CORS: allow the GitHub Pages frontend and localhost dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://jessicamathew31-coder.github.io",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_db_conn():
    """
    Opens a PostgreSQL connection for result persistence.

    Only called on endpoints that write to the database. The core
    analysis routes (tax, lifecycle, deductions) do not require a DB
    connection, so they work even if DATABASE_URL is unset (e.g. in CI).
    """
    url = os.getenv("DATABASE_URL")
    if not url:
        return None
    try:
        return psycopg2.connect(url)
    except Exception:
        return None


def _persist_profile(profile: UserProfile, conn) -> None:
    """
    Saves the user profile to PostgreSQL for analytics purposes.

    We store the profile on the /lifecycle endpoint (the richest request)
    rather than on every endpoint to avoid duplicate rows per session.
    Failures are silently swallowed — analytics persistence is best-effort
    and must never block the API response.
    """
    if conn is None:
        return
    try:
        import json
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_profiles
                    (id, name, age, income, income_growth_rate, employment_type,
                     family_status, has_home_loan, home_loan_principal,
                     home_loan_interest, projection_years, life_events)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    profile.id, profile.name, profile.age, profile.income,
                    profile.income_growth_rate, profile.employment_type.value,
                    profile.family_status.value, profile.has_home_loan,
                    profile.home_loan_principal, profile.home_loan_interest,
                    profile.projection_years,
                    json.dumps([e.dict() for e in profile.life_events])
                )
            )
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        conn.close()


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health_check():
    """Liveness probe for Render deployment."""
    return {"status": "ok", "service": "taxarch-india"}


# ============================================================
# MODULE 2: CURRENT YEAR REGIME ANALYSER
# ============================================================

@app.post("/api/regime-summary", response_model=RegimeSummary)
def regime_summary(profile: UserProfile) -> RegimeSummary:
    """
    Computes current-year tax liability under both regimes and returns
    the break-even deduction level and top missed deductions.

    This is the first result the user sees after completing the profile builder.
    """
    old = compute_tax(profile.income, Regime.OLD, profile=profile)
    new = compute_tax(profile.income, Regime.NEW, profile=profile)

    recommended = Regime.OLD if old["total_tax"] <= new["total_tax"] else Regime.NEW
    saving = abs(old["total_tax"] - new["total_tax"])
    break_even = compute_break_even_deductions(profile.income)

    top = get_top_deductions(profile, n=5)

    return RegimeSummary(
        current_year_tax_old=old["total_tax"],
        current_year_tax_new=new["total_tax"],
        recommended_regime=recommended,
        tax_saving_this_year=saving,
        break_even_deductions=break_even,
        top_deductions=top
    )


# ============================================================
# MODULE 3: LIFECYCLE PROJECTION ENGINE
# ============================================================

@app.post("/api/lifecycle", response_model=LifecycleResult)
def lifecycle_projection(profile: UserProfile) -> LifecycleResult:
    """
    Runs the full 20-30 year lifecycle projection for both regimes.

    Persists the profile to PostgreSQL for the analytics observatory.
    Returns year-by-year tax, corpus, and wealth comparison for both regimes,
    plus the lifetime wealth gap and recommended strategy.
    """
    result = run_lifecycle_projection(profile)

    # Enrich summary with top deductions
    top = get_top_deductions(profile, n=5)
    result.summary.top_deductions = top

    # Persist profile asynchronously (best-effort)
    conn = _get_db_conn()
    _persist_profile(profile, conn)

    return result


# ============================================================
# MODULE 4: INVESTMENT ARCHITECTURE GENERATOR
# ============================================================

@app.post("/api/investment-plan", response_model=InvestmentPlan)
def investment_plan(profile: UserProfile) -> InvestmentPlan:
    """
    Generates an optimal 80C instrument allocation for the user's risk profile.

    Returns instrument-level recommendations with corpus projections at retirement.
    The plan is specific to the old regime — new regime users are advised to invest
    their tax saving freely, which the lifecycle projection already models.
    """
    return generate_investment_plan(profile)


# ============================================================
# MODULE 5: LIFE EVENT TAX IMPACT CALCULATOR
# ============================================================

@app.post("/api/life-events", response_model=List[LifeEventImpact])
def life_event_impacts(profile: UserProfile) -> List[LifeEventImpact]:
    """
    Computes the tax impact of each planned life event under both regimes.

    Returns a list of impacts ordered by year_offset (nearest event first).
    """
    if not profile.life_events:
        return []
    return compute_life_event_impacts(profile)


# ============================================================
# MODULE 6: DEDUCTION MAPPER
# ============================================================

@app.post("/api/deductions", response_model=DeductionAuditResult)
def deduction_audit(profile: UserProfile) -> DeductionAuditResult:
    """
    Maps all 30+ deductions to the user profile.

    Shows claimed vs unclaimed deductions and computes the annual
    tax saving for each missed deduction. Sorted by impact descending.
    """
    return build_deduction_audit(profile)


# ============================================================
# UTILITY: RAW TAX CALCULATION
# Useful for the frontend to power the "what-if" slider on
# the regime comparison card without a full profile.
# ============================================================

@app.get("/api/tax")
def raw_tax(income: int, regime: str, deductions: int = 0):
    """
    Computes tax for a given income and deduction amount.
    Regime must be 'old' or 'new'. Used by the break-even slider.
    """
    try:
        r = Regime(regime)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid regime '{regime}'. Must be 'old' or 'new'."
        )
    result = compute_tax(income, r, custom_deductions=deductions)
    return {
        "income": income,
        "regime": regime,
        "deductions": deductions,
        "taxable_income": result["taxable_income"],
        "total_tax": result["total_tax"],
        "effective_rate": result["effective_rate"]
    }
