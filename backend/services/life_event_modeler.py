"""
TaxArch India — Life Event Modeler

Models the tax impact of major life events across both regimes.
Each event unlocks (or closes) specific deductions and changes
the optimal regime recommendation for the years following the event.

Supported events and their tax impacts:
- Home purchase: Section 24(b) interest, 80C principal repayment,
  possible 80EEA additional interest deduction
- Marriage: expanded HRA, potential 80D for spouse, 80C for spouse's LIC
- Child: 80C tuition fees (Section 80C via school fees), possible SSY
- Retirement: income drop, NPS 60% tax-free lump sum, annuity taxation
- Education loan: 80E interest deduction for 8 years
- Parent health: 80D expansion for senior parent health insurance
"""

from __future__ import annotations

import math
from typing import Dict, List

from backend.models.user_profile import (
    LifeEvent,
    LifeEventImpact,
    LifeEventType,
    Regime,
    UserProfile,
)
from backend.services.tax_calculator import compute_tax


def get_event_deductions(event: LifeEvent, profile: UserProfile) -> int:
    """
    Returns the additional annual deduction (old regime) unlocked by a life event.

    This is called by the lifecycle projector for every event active in
    a given projection year. The projector adds these to the base deductions
    so the old regime automatically gets credit for life-stage deductions.
    """
    handlers = {
        LifeEventType.HOME_PURCHASE:  _home_purchase_deduction,
        LifeEventType.MARRIAGE:       _marriage_deduction,
        LifeEventType.CHILD:          _child_deduction,
        LifeEventType.EDUCATION_LOAN: _education_loan_deduction,
        LifeEventType.PARENT_HEALTH:  _parent_health_deduction,
        LifeEventType.RETIREMENT:     _retirement_deduction,
    }
    handler = handlers.get(event.event)
    if handler is None:
        return 0
    return handler(event, profile)


def _home_purchase_deduction(event: LifeEvent, profile: UserProfile) -> int:
    """
    Home purchase adds Section 24(b) interest and 80C principal repayment.

    If the user has declared home loan details, those figures are used.
    Otherwise, we estimate based on the property amount in the event
    (standard 80% LTV at 8.5% interest rate).
    """
    if profile.has_home_loan:
        interest = min(profile.home_loan_interest, 200000)
        principal = min(profile.home_loan_principal, 150000)  # capped by 80C ceiling
        return interest + principal
    elif event.amount:
        # Estimate: 80% LTV, 8.5% annual interest, 20-year tenure
        loan_amount = math.floor(event.amount * 0.80)
        annual_interest = math.floor(loan_amount * 0.085)
        annual_principal = math.floor(loan_amount / 20)
        return min(annual_interest, 200000) + min(annual_principal, 150000)
    return 200000  # assume max Section 24(b) if no data


def _marriage_deduction(event: LifeEvent, profile: UserProfile) -> int:
    """
    Marriage expands 80D to include spouse's health insurance premium.
    Typically adds Rs 12,000 to Rs 15,000 in annual health insurance.
    """
    return 15000  # approximate spouse health insurance premium


def _child_deduction(event: LifeEvent, profile: UserProfile) -> int:
    """
    Child adds 80C tuition fees (up to Rs 1.5 lakh cap, shared with other 80C)
    and opens SSY eligibility (for girl child). We return the incremental
    tuition component only since SSY is within 80C ceiling.
    """
    return 30000  # approximate annual school tuition fees qualifying under 80C


def _education_loan_deduction(event: LifeEvent, profile: UserProfile) -> int:
    """
    Education loan interest is deductible under 80E for 8 years.
    No upper limit. Estimate based on loan amount at 9% interest.
    """
    if event.amount:
        return math.floor(event.amount * 0.09)
    return 80000  # approximate annual interest on Rs 10 lakh loan


def _parent_health_deduction(event: LifeEvent, profile: UserProfile) -> int:
    """
    Senior parent health insurance: additional Rs 50,000 under 80D.
    This is beyond the Rs 25,000 for self and family.
    """
    return 50000


def _retirement_deduction(event: LifeEvent, profile: UserProfile) -> int:
    """
    Retirement changes the income profile, not the deduction list.
    The lifecycle projector handles this by projecting reduced income
    post-retirement. No additional deductions returned here.
    """
    return 0


def compute_life_event_impacts(profile: UserProfile) -> List[LifeEventImpact]:
    """
    Computes the full tax impact narrative for each planned life event.

    For each event, shows:
    - Which deductions it unlocks
    - Annual tax saving under old and new regime
    - Cumulative impact over the remaining projection period
    - A plain-English narrative explaining the impact

    This powers Module 5 (Life Event Tax Impact Calculator) in the spec.
    """
    impacts: List[LifeEventImpact] = []

    for event in profile.life_events:
        additional_deduction = get_event_deductions(event, profile)
        deductions_unlocked = _get_unlocked_sections(event.event)

        # Project income at the event year
        projected_income = math.floor(
            profile.income * ((1 + profile.income_growth_rate) ** (event.year_offset - 1))
        )

        # Tax without the life event deduction
        old_tax_before = compute_tax(projected_income, Regime.OLD)["total_tax"]
        new_tax_base = compute_tax(projected_income, Regime.NEW)["total_tax"]

        # Tax with the additional life event deduction (old regime only)
        old_tax_after = compute_tax(
            projected_income,
            Regime.OLD,
            custom_deductions=additional_deduction
        )["total_tax"]

        saving_old = max(0, old_tax_before - old_tax_after)
        # New regime does not benefit from most life event deductions
        saving_new = 0

        # Cumulative impact: assume saving persists for 10 years (conservative)
        remaining_years = min(10, profile.projection_years - event.year_offset + 1)
        cumulative = saving_old * remaining_years

        narrative = _build_narrative(event, saving_old, saving_new, cumulative, deductions_unlocked)

        impacts.append(LifeEventImpact(
            event=event.event,
            year_offset=event.year_offset,
            deductions_unlocked=deductions_unlocked,
            annual_tax_saving_old=saving_old,
            annual_tax_saving_new=saving_new,
            cumulative_impact=cumulative,
            narrative=narrative
        ))

    return impacts


def _get_unlocked_sections(event_type: LifeEventType) -> List[str]:
    """
    Returns the list of tax sections unlocked by each life event.
    """
    mapping = {
        LifeEventType.HOME_PURCHASE:  ["Section 24(b)", "80C (Principal)"],
        LifeEventType.MARRIAGE:       ["80D (Spouse)"],
        LifeEventType.CHILD:          ["80C (Tuition)", "SSY"],
        LifeEventType.EDUCATION_LOAN: ["80E"],
        LifeEventType.PARENT_HEALTH:  ["80D (Senior Parent)"],
        LifeEventType.RETIREMENT:     ["80TTB (Senior Citizen Interest)"],
    }
    return mapping.get(event_type, [])


def _build_narrative(
    event: LifeEvent,
    saving_old: int,
    saving_new: int,
    cumulative: int,
    deductions_unlocked: List[str]
) -> str:
    """
    Builds a plain-English narrative for a life event's tax impact.

    Narratives are kept factual and specific rather than generic.
    The cumulative figure is the headline that makes the impact tangible.
    """
    sections = ", ".join(deductions_unlocked) if deductions_unlocked else "none"
    label_map = {
        LifeEventType.HOME_PURCHASE:  "Buying a home",
        LifeEventType.MARRIAGE:       "Getting married",
        LifeEventType.CHILD:          "Having a child",
        LifeEventType.EDUCATION_LOAN: "Taking an education loan",
        LifeEventType.PARENT_HEALTH:  "Covering parent health insurance",
        LifeEventType.RETIREMENT:     "Retiring",
    }
    label = label_map.get(event.event, "This event")
    return (
        f"{label} (Year {event.year_offset}) unlocks {sections}. "
        f"Under the old regime, this saves Rs {saving_old:,} per year in tax. "
        f"Over the next 10 years, the cumulative tax saving is Rs {cumulative:,}. "
        f"This deduction is not available under the new regime, which strengthens "
        f"the case for the old regime after this life event."
        if saving_old > 0 else
        f"{label} (Year {event.year_offset}) has minimal direct tax impact "
        f"but may affect your income profile in future years."
    )
