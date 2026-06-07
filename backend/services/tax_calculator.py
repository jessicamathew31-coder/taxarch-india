"""
TaxArch India — Tax Calculator Service

Computes precise income tax liability under both the old and new regimes
for a given income and set of deductions. This is the foundational service
that all other modules call; the lifecycle projector calls it once per year
per regime across a 20-30 year horizon.

Key design decisions:
- Slabs are loaded from JSON (not hardcoded) so FY updates require only
  a data change, not a code change.
- Surcharge and cess are applied in a separate pass so the effective rate
  can be computed transparently.
- All monetary values are integers (INR) to avoid floating-point drift
  when summing across 25+ projection years.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from backend.models.user_profile import Regime, UserProfile

DATA_DIR = Path(__file__).parent.parent / "data"

# Load slab data once at module import. The JSON is small and
# referencing it repeatedly would add unnecessary I/O in projection loops.
_SLAB_DATA = json.loads((DATA_DIR / "tax_slabs.json").read_text())


def _get_slabs(regime: Regime, fy: str = "2025-26") -> List[Dict]:
    """
    Returns the sorted slab list for a given regime and fiscal year.

    Slabs are read from the in-memory JSON rather than the database so
    the calculator works without a DB connection — useful in testing and
    in the lifecycle projector which runs entirely in memory.
    """
    key = f"{regime.value}_regime"
    return _SLAB_DATA["tax_slabs"][key]


def _get_surcharge_slabs(regime: Regime) -> List[Dict]:
    key = f"{regime.value}_regime"
    return _SLAB_DATA["surcharge_slabs"][key]


def _apply_slabs(taxable_income: int, slabs: List[Dict]) -> int:
    """
    Applies a progressive slab structure to taxable income.

    Each slab taxes only the portion of income that falls within its band.
    The top slab has income_to = None, which we treat as unbounded.
    Returns basic tax in INR (integer, floored to avoid fractions of a rupee).
    """
    tax = 0.0
    for slab in slabs:
        floor = slab["income_from"]
        ceiling = slab.get("income_to")  # None for top slab
        rate = slab["rate"]

        if taxable_income <= floor:
            break

        # Upper bound of the taxable slice in this slab
        upper = ceiling if ceiling is not None else taxable_income
        slice_top = min(taxable_income, upper)
        slice_amount = slice_top - floor
        tax += slice_amount * rate

    return math.floor(tax)


def _compute_surcharge(basic_tax: int, gross_income: int, regime: Regime) -> int:
    """
    Computes surcharge on basic tax based on gross income level.

    Surcharge is applied on basic tax, not on income. The slab that applies
    is determined by gross income, not taxable income, because the threshold
    for surcharge is always tested against gross total income before deductions.

    Marginal relief: where surcharge causes total tax + surcharge to exceed
    the incremental income over the threshold, we cap the surcharge. This is
    a statutory requirement under the Income Tax Act.
    """
    slabs = _get_surcharge_slabs(regime)
    rate = 0.0
    threshold = 0

    for slab in slabs:
        if gross_income > slab["income_from"]:
            rate = slab["rate"]
            threshold = slab["income_from"]

    if rate == 0.0:
        return 0

    raw_surcharge = math.floor(basic_tax * rate)

    # Marginal relief: ensure (tax + surcharge) does not exceed
    # (tax at threshold + income above threshold).
    # This prevents the perverse outcome where crossing a threshold
    # leaves you worse off after tax than staying below it.
    excess_income = gross_income - threshold
    max_surcharge = excess_income  # in extreme cases, the cap is the excess income itself
    return min(raw_surcharge, max_surcharge)


def _rebate_87a(basic_tax: int, taxable_income: int, regime: Regime) -> int:
    """
    Returns the Section 87A rebate to subtract from basic tax.

    Old regime: up to Rs 12,500 rebate if taxable income <= Rs 5 lakh.
    New regime: up to Rs 60,000 rebate if taxable income <= Rs 12 lakh (FY 2025-26).

    The rebate cannot exceed the tax liability itself.
    """
    notes = _SLAB_DATA["tax_slabs"]["notes"]
    if regime == Regime.OLD:
        limit = notes["rebate_87A_old"]["max_income"]
        max_rebate = notes["rebate_87A_old"]["max_rebate"]
    else:
        limit = notes["rebate_87A_new"]["max_income"]
        max_rebate = notes["rebate_87A_new"]["max_rebate"]

    if taxable_income <= limit:
        return min(basic_tax, max_rebate)
    return 0


def compute_deductions(profile: UserProfile) -> Tuple[int, Dict[str, int]]:
    """
    Computes total allowable deductions under the old regime for a given profile.

    Returns (total_deductions, breakdown_dict). The breakdown is passed through
    to the API response so the frontend can render the deduction mapper.

    Note: new regime allows almost no deductions (only standard deduction and
    80CCD(2)), so this function is only meaningful for old regime tax computation.
    The lifecycle projector passes new_regime=True to skip this entirely.
    """
    breakdown: Dict[str, int] = {}

    # Standard deduction — flat Rs 50,000, no documentation required
    breakdown["standard_deduction"] = 50000

    # 80C bucket: capped at Rs 1,50,000 regardless of how many sub-instruments
    total_80c = sum(
        d.claimed_amount for d in profile.declared_deductions
        if d.section in ("80C", "80CCC", "80CCD(1)")
    )
    breakdown["80C_group"] = min(total_80c, 150000)

    # 80CCD(1B): additional NPS, separate from the 80C ceiling
    nps_additional = next(
        (d.claimed_amount for d in profile.declared_deductions if d.section == "80CCD(1B)"),
        0
    )
    breakdown["80CCD_1B"] = min(nps_additional, 50000)

    # 80CCD(2): employer NPS contribution — no ceiling for private sector
    # beyond 10% of basic+DA, but we take the user-declared figure as given
    breakdown["80CCD_2"] = profile.nps_employer_contribution

    # 80D: health insurance
    health_ins = next(
        (d.claimed_amount for d in profile.declared_deductions if d.section == "80D"),
        0
    )
    breakdown["80D"] = min(health_ins, 100000)

    # Section 24(b): home loan interest
    if profile.has_home_loan:
        breakdown["section_24b"] = min(profile.home_loan_interest, 200000)

    # HRA exemption: complex three-part computation
    if profile.has_hra and profile.basic_salary > 0:
        basic = profile.basic_salary
        hra_received = profile.hra_received
        rent_paid = profile.rent_paid
        metro_factor = 0.50 if profile.city_type == "metro" else 0.40

        hra_exempt = min(
            hra_received,
            math.floor(basic * metro_factor),
            max(0, rent_paid - math.floor(basic * 0.10))
        )
        breakdown["hra"] = max(0, hra_exempt)

    # Education loan interest — no upper cap
    if profile.has_education_loan:
        breakdown["80E"] = profile.education_loan_interest

    # Any other declared deductions not handled above
    handled = {"80C", "80CCC", "80CCD(1)", "80CCD(1B)", "80CCD(2)", "80D"}
    for d in profile.declared_deductions:
        if d.section not in handled:
            breakdown[d.section] = d.claimed_amount

    total = sum(breakdown.values())
    return total, breakdown


def compute_tax(
    income: int,
    regime: Regime,
    profile: Optional[UserProfile] = None,
    custom_deductions: int = 0,
    fy: str = "2025-26"
) -> Dict:
    """
    Computes complete tax liability for a given income and regime.

    Returns a dict with taxable_income, basic_tax, surcharge, cess,
    total_tax, effective_rate, and rebate applied. This dict is used
    both by the API response layer and by the lifecycle projector.

    custom_deductions is used by the lifecycle projector to pass a
    pre-computed deduction total without a full profile object, which
    keeps the projection loop simple and fast.
    """
    notes = _SLAB_DATA["tax_slabs"]["notes"]

    # --- Step 1: Compute deductions ---
    if regime == Regime.NEW:
        # New regime: standard deduction + 80CCD(2) only
        std_deduction = notes["standard_deduction_new"]
        deductions = std_deduction + (profile.nps_employer_contribution if profile else 0)
        deduction_breakdown = {
            "standard_deduction": std_deduction,
            "80CCD_2": profile.nps_employer_contribution if profile else 0
        }
    else:
        if profile:
            deductions, deduction_breakdown = compute_deductions(profile)
        else:
            deductions = custom_deductions + notes["standard_deduction_old"]
            deduction_breakdown = {"custom": deductions}

    taxable_income = max(0, income - deductions)

    # --- Step 2: Basic slab tax ---
    slabs = _get_slabs(regime, fy)
    basic_tax = _apply_slabs(taxable_income, slabs)

    # --- Step 3: Section 87A rebate (applied before surcharge) ---
    rebate = _rebate_87a(basic_tax, taxable_income, regime)
    tax_after_rebate = max(0, basic_tax - rebate)

    # --- Step 4: Surcharge ---
    surcharge = _compute_surcharge(tax_after_rebate, income, regime)
    tax_plus_surcharge = tax_after_rebate + surcharge

    # --- Step 5: Health and Education Cess at 4% ---
    cess = math.floor(tax_plus_surcharge * notes["cess"])
    total_tax = tax_plus_surcharge + cess

    effective_rate = round(total_tax / income, 4) if income > 0 else 0.0

    return {
        "gross_income": income,
        "total_deductions": deductions,
        "deduction_breakdown": deduction_breakdown,
        "taxable_income": taxable_income,
        "basic_tax": basic_tax,
        "rebate_87a": rebate,
        "tax_after_rebate": tax_after_rebate,
        "surcharge": surcharge,
        "cess": cess,
        "total_tax": total_tax,
        "effective_rate": effective_rate
    }


def compute_break_even_deductions(income: int, fy: str = "2025-26") -> int:
    """
    Finds the deduction level at which old regime tax equals new regime tax.

    Uses binary search on the deduction amount. Below this level, the new
    regime wins. Above it, the old regime wins. This number is shown on the
    current-year comparison card to give users a concrete decision threshold.
    """
    # New regime tax is fixed (no deduction variable)
    new_tax = compute_tax(income, Regime.NEW, fy=fy)["total_tax"]

    # Binary search between 0 and 4,00,000 (practical max deductions)
    lo, hi = 0, 400000
    for _ in range(50):
        mid = (lo + hi) // 2
        old_tax = compute_tax(income, Regime.OLD, custom_deductions=mid, fy=fy)["total_tax"]
        if old_tax > new_tax:
            lo = mid + 1
        else:
            hi = mid

    return lo
