"""
TaxArch India — Investment Optimizer

Generates an optimal allocation across 80C and related instruments
for a given user profile. The allocation respects the user's declared
risk preference, locks in mandatory instruments first (PPF for stability,
NPS for the additional 80CCD(1B) deduction), then fills the remainder
based on risk appetite.

This module also computes the blended portfolio return used by the
lifecycle projector to compound the 80C corpus over time.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Dict, List, Tuple

from backend.models.user_profile import (
    InvestmentAllocation,
    InvestmentPlan,
    RiskLevel,
    UserProfile,
)

DATA_DIR = Path(__file__).parent.parent / "data"
_INSTRUMENTS = json.loads((DATA_DIR / "instruments.json").read_text())["instruments"]
_INFLATION = json.loads((DATA_DIR / "inflation.json").read_text())


def _get_instrument(name: str) -> Dict:
    """
    Retrieves instrument data by name from the loaded JSON.
    Raises KeyError if the instrument is not found, which surfaces
    as a 500 in the API rather than silently returning zero returns.
    """
    for inst in _INSTRUMENTS:
        if inst["name"] == name:
            return inst
    raise KeyError(f"Instrument '{name}' not found in instruments.json")


def compute_80c_investment(profile: UserProfile, income: int) -> int:
    """
    Returns the amount the user should invest in 80C instruments this year.

    At lower incomes, the user may not have Rs 1.5 lakh available after
    living expenses. We use a rough savings capacity heuristic: 20% of
    income for incomes below Rs 6 lakh, scaling up to 30% above Rs 15 lakh.
    The ceiling is always Rs 1.5 lakh (the 80C deduction limit).

    This is used by the lifecycle projector to estimate investable surplus
    in future years when the user's income has grown.
    """
    if income <= 600000:
        investable = math.floor(income * 0.20)
    elif income <= 1500000:
        investable = math.floor(income * 0.25)
    else:
        investable = math.floor(income * 0.30)

    return min(investable, 150000)


def compute_blended_return(profile: UserProfile) -> float:
    """
    Computes a blended expected return for the user's 80C portfolio.

    The blended return is a weighted average of the expected returns of
    the instruments in the recommended allocation. This is what the
    lifecycle projector uses to compound the corpus year by year.

    Risk level controls the equity/debt split:
    - Low risk: PPF-heavy, low equity
    - Medium risk: balanced PPF + NPS + ELSS
    - High risk: ELSS-heavy for maximum long-run returns
    """
    if profile.preferred_risk == RiskLevel.LOW:
        # 60% PPF, 30% NSC, 10% NPS
        weights = {"PPF": 0.60, "NSC": 0.30, "NPS": 0.10}
    elif profile.preferred_risk == RiskLevel.MEDIUM:
        # 40% PPF, 30% ELSS, 20% NPS, 10% NSC
        weights = {"PPF": 0.40, "ELSS": 0.30, "NPS": 0.20, "NSC": 0.10}
    else:
        # High risk: 60% ELSS, 25% NPS, 15% PPF
        weights = {"ELSS": 0.60, "NPS": 0.25, "PPF": 0.15}

    blended = sum(
        _get_instrument(name)["expected_return"] * weight
        for name, weight in weights.items()
    )
    return round(blended, 4)


def generate_investment_plan(profile: UserProfile) -> InvestmentPlan:
    """
    Generates the recommended 80C allocation for the current year.

    Allocation logic:
    1. Lock in NPS Tier 1 first (up to Rs 50,000 for 80CCD(1B)) if not already
       contributed, because this deduction sits outside the Rs 1.5 lakh ceiling.
    2. Fill 80C ceiling with PPF/ELSS/NSC based on risk preference and
       any existing declared investments.
    3. Compute corpus at retirement by compounding each annual allocation.

    Returns InvestmentPlan with full allocation breakdown and projections.
    """
    years_to_retire = max(1, 60 - profile.age)
    total_80c = 150000  # ceiling

    # --- Already committed allocations from declared deductions ---
    committed: Dict[str, int] = {}
    for d in profile.declared_deductions:
        if d.section in ("80C", "80CCC", "80CCD(1)"):
            committed[d.section] = d.claimed_amount
    total_committed = min(sum(committed.values()), 150000)
    remaining_80c = max(0, total_80c - total_committed)

    allocations: List[InvestmentAllocation] = []

    # --- Step 1: NPS 80CCD(1B) — outside the ceiling, recommend always ---
    existing_nps_1b = next(
        (d.claimed_amount for d in profile.declared_deductions if d.section == "80CCD(1B)"),
        0
    )
    nps_1b_gap = max(0, 50000 - existing_nps_1b)
    if nps_1b_gap > 0:
        nps = _get_instrument("NPS")
        corpus = math.floor(nps_1b_gap * (((1 + nps["expected_return"]) ** years_to_retire - 1) / nps["expected_return"]))
        allocations.append(InvestmentAllocation(
            instrument="NPS (Additional)",
            section="80CCD(1B)",
            amount=nps_1b_gap,
            expected_return=nps["expected_return"],
            lock_in_years=years_to_retire,
            risk_level=RiskLevel.MEDIUM,
            corpus_at_retirement=corpus,
            rationale=(
                f"80CCD(1B) is a deduction of up to Rs 50,000 that sits completely outside "
                f"the Rs 1.5 lakh 80C ceiling. This is the single most commonly missed "
                f"deduction in India. Filling it first saves Rs {round(nps_1b_gap * 0.30):,} "
                f"in tax (at 30% slab) and builds Rs {corpus:,} corpus by retirement."
            )
        ))

    # --- Step 2: Fill 80C bucket based on risk preference ---
    if profile.preferred_risk == RiskLevel.LOW:
        plan = [("PPF", 0.70), ("NSC", 0.20), ("Tax_FD", 0.10)]
    elif profile.preferred_risk == RiskLevel.MEDIUM:
        plan = [("PPF", 0.50), ("ELSS", 0.30), ("NPS", 0.20)]
    else:
        plan = [("ELSS", 0.60), ("NPS", 0.25), ("PPF", 0.15)]

    for inst_name, weight in plan:
        if remaining_80c <= 0:
            break
        invest_amount = min(math.floor(remaining_80c * weight), remaining_80c)
        if invest_amount <= 0:
            continue

        inst = _get_instrument(inst_name)
        r = inst["expected_return"]
        # Future value of an annual annuity
        corpus = math.floor(
            invest_amount * (((1 + r) ** years_to_retire - 1) / r)
        ) if r > 0 else invest_amount * years_to_retire

        rationale_map = {
            "PPF": (
                f"PPF earns {r*100:.1f}% tax-free with government backing. "
                f"Interest is EEE (exempt at contribution, growth, and withdrawal). "
                f"Best anchor for the 80C portfolio."
            ),
            "ELSS": (
                f"ELSS offers the shortest lock-in (3 years) among 80C instruments "
                f"with equity-linked returns of {r*100:.0f}%+ over long horizons. "
                f"LTCG above Rs 1.25 lakh taxed at 12.5%."
            ),
            "NPS": (
                f"NPS at {r*100:.0f}% expected return with partial EEE status. "
                f"60% corpus is tax-free at maturity; 40% mandatorily annuitised."
            ),
            "NSC": (
                f"NSC at {r*100:.1f}% fixed, government-backed. "
                f"Interest is taxable but reinvested interest also qualifies for 80C."
            ),
            "Tax_FD": (
                f"Tax-saving FD at {r*100:.1f}% with bank safety. "
                f"Interest fully taxable — less efficient at higher tax slabs, "
                f"but appropriate for conservative investors wanting certainty."
            )
        }

        allocations.append(InvestmentAllocation(
            instrument=inst_name,
            section="80C",
            amount=invest_amount,
            expected_return=r,
            lock_in_years=inst["lock_in_years"],
            risk_level=RiskLevel(inst["risk_level"]),
            corpus_at_retirement=corpus,
            rationale=rationale_map.get(inst_name, f"Invest Rs {invest_amount:,} in {inst_name}.")
        ))
        remaining_80c -= invest_amount

    total_invested = sum(a.amount for a in allocations)
    total_corpus = sum(a.corpus_at_retirement for a in allocations)

    return InvestmentPlan(
        total_investable=total_80c + 50000,  # 80C ceiling + 80CCD(1B)
        allocations=allocations,
        total_80c_invested=min(total_invested, 150000),
        total_80c_remaining=remaining_80c,
        projected_corpus_at_retirement=total_corpus
    )
