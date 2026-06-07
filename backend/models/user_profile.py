"""
TaxArch India — Pydantic Models

Request and response schemas for all API endpoints. These models are the
contract between the frontend and backend. Keeping them in one place means
a change in financial logic (e.g. new life event type) only touches one file
before propagating through the service layer.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, validator


# ============================================================
# ENUMS
# Using string enums so they serialise cleanly in JSON
# without an extra .value call everywhere in service code.
# ============================================================

class Regime(str, Enum):
    OLD = "old"
    NEW = "new"


class EmploymentType(str, Enum):
    SALARIED = "salaried"
    SELF_EMPLOYED = "self_employed"
    BOTH = "both"


class FamilyStatus(str, Enum):
    SINGLE = "single"
    MARRIED = "married"
    MARRIED_WITH_CHILDREN = "married_with_children"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class LifeEventType(str, Enum):
    HOME_PURCHASE = "home_purchase"
    MARRIAGE = "marriage"
    CHILD = "child"
    RETIREMENT = "retirement"
    EDUCATION_LOAN = "education_loan"
    PARENT_HEALTH = "parent_health"


# ============================================================
# NESTED MODELS
# ============================================================

class LifeEvent(BaseModel):
    """
    A single planned life event that affects tax deductions.

    year_offset is relative to the current year (1 = next year,
    5 = five years from now) rather than absolute year, so the
    profile stays valid across fiscal years without recalculation.
    """
    event: LifeEventType
    year_offset: int = Field(..., ge=1, le=40)
    amount: Optional[int] = Field(None, ge=0, description="Loan amount, property value, or other relevant figure in INR")
    notes: Optional[str] = None


class DeductionInput(BaseModel):
    """
    User-declared deduction for the current year.

    Partial claims are allowed: a user may invest Rs 80,000 in PPF
    even though the 80C limit is Rs 1,50,000. claimed_amount
    captures this so the deduction mapper can show the gap.
    """
    section: str
    claimed_amount: int = Field(..., ge=0)


# ============================================================
# CORE REQUEST MODEL
# ============================================================

class UserProfile(BaseModel):
    """
    Complete profile submitted by the user to trigger analysis.

    All monetary values in INR. income_growth_rate is a decimal
    fraction (0.08 = 8% per year). The id is generated client-side
    so the frontend can track results without an extra roundtrip.
    """
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: Optional[str] = None
    age: int = Field(..., ge=18, le=75)
    income: int = Field(..., ge=100000, description="Annual gross income in INR")
    income_growth_rate: float = Field(0.08, ge=0.0, le=0.30)
    employment_type: EmploymentType = EmploymentType.SALARIED
    family_status: FamilyStatus = FamilyStatus.SINGLE
    has_home_loan: bool = False
    home_loan_principal: int = Field(0, ge=0)
    home_loan_interest: int = Field(0, ge=0)
    has_hra: bool = False
    hra_received: int = Field(0, ge=0)
    basic_salary: int = Field(0, ge=0, description="Basic salary for HRA calculation. Required if has_hra is true.")
    city_type: str = Field("non_metro", description="'metro' or 'non_metro' for HRA calculation")
    rent_paid: int = Field(0, ge=0)
    has_education_loan: bool = False
    education_loan_interest: int = Field(0, ge=0)
    nps_employer_contribution: int = Field(0, ge=0, description="Employer NPS contribution under 80CCD(2)")
    projection_years: int = Field(25, ge=5, le=40)
    life_events: List[LifeEvent] = Field(default_factory=list)
    declared_deductions: List[DeductionInput] = Field(default_factory=list)
    preferred_risk: RiskLevel = RiskLevel.MEDIUM

    @validator("home_loan_interest")
    def interest_requires_loan(cls, v, values):
        """
        Guards against a user entering interest but forgetting to tick has_home_loan.
        The frontend enforces this too, but validation in the model is the source of truth.
        """
        if v > 0 and not values.get("has_home_loan", False):
            raise ValueError("home_loan_interest provided but has_home_loan is False")
        return v


# ============================================================
# RESPONSE MODELS
# ============================================================

class YearlyProjection(BaseModel):
    """
    Financial state for one regime at one projection year.

    optimal is True when this regime produces higher cumulative
    wealth than the other regime at this year. The frontend uses
    this to colour the lifecycle chart line.
    """
    year: int
    age: int
    gross_income: int
    taxable_income: int
    tax_liability: int
    total_deductions: int
    investments_made: int
    cumulative_corpus: int
    effective_tax_rate: float
    is_optimal: bool


class RegimeSummary(BaseModel):
    """
    High-level comparison of both regimes for the current year.

    break_even_deductions is the total deduction amount at which
    old regime tax equals new regime tax. Below this, new regime wins.
    """
    current_year_tax_old: int
    current_year_tax_new: int
    recommended_regime: Regime
    tax_saving_this_year: int
    break_even_deductions: int
    top_deductions: List[dict]


class LifecycleResult(BaseModel):
    """
    Complete lifecycle projection for both regimes.

    wealth_gap_at_retirement is the key number: total corpus difference
    between old and new regime at the user's retirement age. A positive
    value means old regime builds more wealth despite higher annual tax,
    because of forced investment compounding.
    """
    old_regime: List[YearlyProjection]
    new_regime: List[YearlyProjection]
    regime_switch_year: Optional[int]
    wealth_gap_at_retirement: int
    recommended_strategy: str
    summary: RegimeSummary


class InvestmentAllocation(BaseModel):
    """
    Recommended allocation across 80C instruments for a given year.

    amount is the INR figure to invest in this instrument.
    corpus_at_retirement projects how this annual investment grows
    to retirement, compounded at the instrument's expected return.
    """
    instrument: str
    section: str
    amount: int
    expected_return: float
    lock_in_years: int
    risk_level: RiskLevel
    corpus_at_retirement: int
    rationale: str


class InvestmentPlan(BaseModel):
    total_investable: int
    allocations: List[InvestmentAllocation]
    total_80c_invested: int
    total_80c_remaining: int
    projected_corpus_at_retirement: int


class DeductionAuditItem(BaseModel):
    """
    Audit line for one deduction: claimed amount vs maximum eligible
    and the annual tax saving from claiming the full amount.
    """
    section: str
    description: str
    max_amount: int
    claimed_amount: int
    unclaimed_amount: int
    annual_tax_saving: int
    is_applicable: bool
    regime_applicable: str


class DeductionAuditResult(BaseModel):
    claimed_total: int
    unclaimed_total: int
    total_potential_saving: int
    items: List[DeductionAuditItem]


class LifeEventImpact(BaseModel):
    """
    Tax impact of a single life event under both regimes.
    """
    event: LifeEventType
    year_offset: int
    deductions_unlocked: List[str]
    annual_tax_saving_old: int
    annual_tax_saving_new: int
    cumulative_impact: int
    narrative: str
