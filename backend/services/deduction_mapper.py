"""
TaxArch India — Deduction Mapper Service

Maps all 30+ deductions in the Income Tax Act to the user's profile
and shows which are claimed, which are unclaimed, and how much tax
the user could save by claiming each missed deduction.

This module powers Module 6 in the spec (Comprehensive Deduction Mapper)
and also contributes the top_deductions list to the regime summary card.

The annual_tax_saving calculation is marginal: it shows how much
additional tax the user saves by claiming a deduction they are not
currently claiming. This is more useful than showing the full deduction
value because it is directly comparable to the cost of the investment.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import List, Tuple

from backend.models.user_profile import DeductionAuditItem, DeductionAuditResult, UserProfile
from backend.services.tax_calculator import compute_tax
from backend.models.user_profile import Regime

DATA_DIR = Path(__file__).parent.parent / "data"
_DEDUCTIONS_DATA = json.loads((DATA_DIR / "deductions.json").read_text())["deductions"]


def _is_eligible(deduction: dict, profile: UserProfile) -> bool:
    """
    Checks whether a deduction is applicable to the user's profile.

    Uses the eligible_profiles tag list in the deduction record.
    Returns False for deductions that are regime-specific (cooperative,
    corporate) that should never appear for individual taxpayers.
    """
    eligible = deduction["eligible_profiles"].split(",")

    # Non-individual deductions should never appear
    if "cooperative" in eligible and "corporate" in eligible:
        if not any(e in eligible for e in ["salaried", "self_employed", "senior_citizen"]):
            return False

    # Employment type check
    if profile.employment_type.value == "salaried" and "salaried" not in eligible:
        # Allow senior_citizen, self_employed if they're also eligible
        if "self_employed" not in eligible:
            return False

    # Senior citizen-specific deductions
    if "senior_citizen" in eligible and profile.age < 60:
        return False

    # Home loan deductions
    if deduction["section"] in ("Section 24(b)", "80EE", "80EEA"):
        return profile.has_home_loan

    # HRA: only for salaried employees who receive HRA
    if deduction["section"] == "HRA":
        return profile.employment_type.value == "salaried" and profile.has_hra

    # Education loan deduction
    if deduction["section"] == "80E":
        return profile.has_education_loan

    # SSY: only if married with children (proxy for having a daughter)
    if deduction["section"] == "80C" and "SSY" in (deduction.get("instruments") or ""):
        return profile.family_status.value == "married_with_children"

    return True


def _get_claimed_amount(section: str, profile: UserProfile) -> int:
    """
    Returns the amount the user has already declared for a given section.
    Returns 0 if not declared, which triggers the missed-deduction calculation.
    """
    for d in profile.declared_deductions:
        if d.section == section:
            return d.claimed_amount
    return 0


def _compute_marginal_saving(
    profile: UserProfile,
    additional_deduction: int
) -> int:
    """
    Computes incremental tax saving from one additional deduction.

    Runs two tax calculations: one with the user's current deductions
    and one with the additional amount added. The difference is the
    annual saving from claiming this deduction.

    This is the correct way to compute marginal benefit — not just
    (deduction_amount * marginal_rate) because marginal rate changes
    at slab boundaries and some incomes are in a transition zone.
    """
    if additional_deduction <= 0:
        return 0

    from backend.services.tax_calculator import compute_deductions
    base_deductions, _ = compute_deductions(profile)

    tax_before = compute_tax(
        income=profile.income,
        regime=Regime.OLD,
        custom_deductions=base_deductions - 50000  # subtract standard deduction, it's re-added inside
    )["total_tax"]

    tax_after = compute_tax(
        income=profile.income,
        regime=Regime.OLD,
        custom_deductions=base_deductions - 50000 + additional_deduction
    )["total_tax"]

    return max(0, tax_before - tax_after)


def build_deduction_audit(profile: UserProfile) -> DeductionAuditResult:
    """
    Generates a full audit of every deduction for the user's profile.

    For each deduction:
    - is_applicable: whether the user qualifies
    - claimed_amount: what they have declared
    - unclaimed_amount: the gap (max_amount - claimed_amount)
    - annual_tax_saving: how much extra tax they'd save by claiming the gap

    Sorted by annual_tax_saving descending so the most impactful
    unclaimed deductions appear first.
    """
    items: List[DeductionAuditItem] = []

    for d in _DEDUCTIONS_DATA:
        applicable = _is_eligible(d, profile)
        claimed = _get_claimed_amount(d["section"], profile)
        max_amt = d["max_amount"]

        # For deductions with no fixed ceiling (e.g. 80E, HRA), use declared amount
        if max_amt == 0:
            max_amt = claimed  # no gap to show if ceiling is unknown

        unclaimed = max(0, max_amt - claimed)

        # Compute marginal saving only for unclaimed old-regime deductions
        if applicable and unclaimed > 0 and d["regime_applicable"] in ("old", "both"):
            saving = _compute_marginal_saving(profile, unclaimed)
        else:
            saving = 0

        items.append(DeductionAuditItem(
            section=d["section"],
            description=d["description"],
            max_amount=max_amt,
            claimed_amount=claimed,
            unclaimed_amount=unclaimed,
            annual_tax_saving=saving,
            is_applicable=applicable,
            regime_applicable=d["regime_applicable"]
        ))

    # Sort: applicable unclaimed deductions first, by saving descending
    items.sort(key=lambda x: (not x.is_applicable, -x.annual_tax_saving))

    claimed_total = sum(i.claimed_amount for i in items if i.is_applicable)
    unclaimed_total = sum(i.unclaimed_amount for i in items if i.is_applicable)
    total_potential_saving = sum(i.annual_tax_saving for i in items if i.is_applicable)

    return DeductionAuditResult(
        claimed_total=claimed_total,
        unclaimed_total=unclaimed_total,
        total_potential_saving=total_potential_saving,
        items=items
    )


def get_top_deductions(profile: UserProfile, n: int = 5) -> List[dict]:
    """
    Returns the top N missed deductions by annual tax saving.

    Used to populate the top_deductions field in the regime summary card.
    Only returns deductions that are applicable, unclaimed, and available
    under the old regime.
    """
    audit = build_deduction_audit(profile)
    top = [
        {
            "section": item.section,
            "description": item.description[:80],
            "annual_saving": item.annual_tax_saving,
            "unclaimed_amount": item.unclaimed_amount
        }
        for item in audit.items
        if item.is_applicable and item.unclaimed_amount > 0 and item.annual_tax_saving > 0
    ][:n]
    return top
