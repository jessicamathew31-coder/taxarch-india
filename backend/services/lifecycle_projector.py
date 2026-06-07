"""
TaxArch India — Lifecycle Projection Engine

This is the core innovation module. Every tax calculator on the internet
tells you which regime saves more tax this year. This module asks the deeper
question: which regime builds more wealth over your lifetime?

The answer is not obvious. The old regime forces you to invest Rs 1.5 lakh
in 80C instruments to claim the deduction. Those forced investments compound
over 20-30 years into significant wealth. The new regime saves tax today but
removes the investment discipline. At higher incomes, the old regime's forced
corpus often exceeds the new regime's tax savings — even before adding 80D
and home loan interest deductions.

The projection model:
1. Grows income at user-specified rate each year.
2. Computes tax under both regimes at each year's income level.
3. Compounds the investable corpus from 80C instruments under the old regime.
4. Under the new regime, assumes the tax saving (vs old) is invested at the
   same blended return — the "fair comparison" assumption.
5. Outputs cumulative wealth under both regimes at each year.
6. Flags the year where one regime overtakes the other in total wealth.
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional, Tuple

from backend.models.user_profile import (
    Regime,
    UserProfile,
    YearlyProjection,
    LifecycleResult,
    RegimeSummary,
)
from backend.services.tax_calculator import compute_tax, compute_break_even_deductions
from backend.services.investment_optimizer import compute_blended_return, compute_80c_investment


# Blended return for new regime "invested tax saving" scenario.
# We use a moderate equity-debt mix consistent with a medium risk profile.
# This is intentionally conservative to avoid overclaiming old regime advantage.
_DEFAULT_INVESTMENT_RETURN = 0.09


def _grow_income(base_income: int, growth_rate: float, year: int) -> int:
    """
    Projects income at a given year using compound growth.

    Year 1 = current year (no growth yet). Year 2 = one year of growth.
    Integer floor is used throughout to keep all monetary values in INR
    without floating-point accumulation.
    """
    return math.floor(base_income * ((1 + growth_rate) ** (year - 1)))


def _scale_deductions(profile: UserProfile, income: int) -> int:
    """
    Scales old-regime deductions with income growth for projection years.

    The simplification: 80C stays at Rs 1.5 lakh (ceiling, not income-linked),
    80D scales with income (health premiums rise over time), Section 24(b) stays
    fixed (loan interest is contractually fixed on an EMI schedule), HRA scales
    with income. This is a modelling approximation — accurate enough for a
    20-year projection but clearly disclosed in methodology docs.
    """
    from backend.services.tax_calculator import compute_deductions

    # Compute base year deductions
    base_deductions, _ = compute_deductions(profile)

    # Fixed deductions (do not grow with income)
    fixed = (
        150000 +  # 80C ceiling
        50000 +   # 80CCD(1B) ceiling
        profile.nps_employer_contribution +
        min(profile.home_loan_interest, 200000)
    )

    # Variable deductions scale proportionally with income
    variable = max(0, base_deductions - fixed)
    income_ratio = income / profile.income if profile.income > 0 else 1.0
    scaled_variable = math.floor(variable * min(income_ratio, 2.0))  # cap at 2x to be conservative

    return fixed + scaled_variable


def _project_one_year(
    income: int,
    regime: Regime,
    profile: UserProfile,
    prior_corpus: int,
    blended_return: float,
    year: int,
    life_event_deductions: int = 0
) -> Tuple[YearlyProjection, int]:
    """
    Projects financial state for a single year under one regime.

    Returns (YearlyProjection, updated_corpus).

    The corpus update logic differs by regime:
    - Old regime: 80C investments are added to corpus each year, then
      the entire corpus (including prior years) compounds by one year.
    - New regime: tax saving (vs old) is invested and compounds. This
      is the "fair comparison" — we assume the new regime taxpayer
      actually invests their tax saving.

    Note that life_event_deductions are additive on top of scaled
    normal deductions for old regime years.
    """
    result = compute_tax(
        income=income,
        regime=regime,
        custom_deductions=(_scale_deductions(profile, income) + life_event_deductions
                           if regime == Regime.OLD else 0),
        fy="2025-26"
    )

    tax = result["total_tax"]
    deductions = result["total_deductions"]
    taxable = result["taxable_income"]

    if regime == Regime.OLD:
        # Money invested in 80C instruments this year
        annual_investment = min(
            compute_80c_investment(profile, income),
            150000
        )
    else:
        # New regime investor: we assume they invest their tax saving
        # compared to old regime tax. This is the fairest comparison.
        annual_investment = 0  # handled in the caller which computes the delta

    # Compound the existing corpus by one year's return, then add new investment
    new_corpus = math.floor(prior_corpus * (1 + blended_return)) + annual_investment

    projection = YearlyProjection(
        year=year,
        age=profile.age + year - 1,
        gross_income=income,
        taxable_income=taxable,
        tax_liability=tax,
        total_deductions=deductions,
        investments_made=annual_investment,
        cumulative_corpus=new_corpus,
        effective_tax_rate=result["effective_rate"],
        is_optimal=False  # set in the caller after comparing both regimes
    )

    return projection, new_corpus


def _get_life_event_deductions(profile: UserProfile, year: int) -> int:
    """
    Returns additional deductions from life events active in a given projection year.

    A home purchase, for example, unlocks Section 24(b) interest and 80C principal
    repayment. Marriage may unlock dependent deductions. These are layered on top
    of the base deductions computed by the tax calculator.
    """
    from backend.services.life_event_modeler import get_event_deductions
    total = 0
    for event in profile.life_events:
        if event.year_offset <= year:
            total += get_event_deductions(event, profile)
    return total


def run_lifecycle_projection(profile: UserProfile) -> LifecycleResult:
    """
    Runs the full lifecycle projection for both regimes.

    This is the main entry point called by the API. It projects income,
    tax, and corpus year by year for both regimes, then computes the
    wealth gap at the projection horizon (typically retirement).

    The wealth gap is the headline number: the difference in total compounded
    wealth between old and new regime at the end of the projection period.
    A positive gap means old regime builds more wealth despite higher tax.
    """
    blended_return = compute_blended_return(profile)
    years = profile.projection_years

    old_projections: List[YearlyProjection] = []
    new_projections: List[YearlyProjection] = []

    old_corpus = 0
    new_corpus = 0

    regime_switch_year: Optional[int] = None

    for yr in range(1, years + 1):
        income = _grow_income(profile.income, profile.income_growth_rate, yr)
        event_deductions = _get_life_event_deductions(profile, yr)

        # Old regime projection
        old_proj, old_corpus = _project_one_year(
            income=income,
            regime=Regime.OLD,
            profile=profile,
            prior_corpus=old_corpus,
            blended_return=blended_return,
            year=yr,
            life_event_deductions=event_deductions
        )

        # New regime projection
        new_result = compute_tax(income=income, regime=Regime.NEW, fy="2025-26")
        new_tax = new_result["total_tax"]
        old_tax = old_proj.tax_liability

        # Under new regime: invest the tax saving (if any) at the blended return
        # This is the "fair comparison" — the new regime taxpayer is assumed to
        # be disciplined enough to invest what they save in tax.
        new_tax_saving_invested = max(0, old_tax - new_tax)
        new_corpus = math.floor(new_corpus * (1 + blended_return)) + new_tax_saving_invested

        new_proj = YearlyProjection(
            year=yr,
            age=profile.age + yr - 1,
            gross_income=income,
            taxable_income=new_result["taxable_income"],
            tax_liability=new_tax,
            total_deductions=new_result["total_deductions"],
            investments_made=new_tax_saving_invested,
            cumulative_corpus=new_corpus,
            effective_tax_rate=new_result["effective_rate"],
            is_optimal=False
        )

        # Mark the optimal regime at this year by wealth
        if old_corpus >= new_corpus:
            old_proj.is_optimal = True
        else:
            new_proj.is_optimal = True

        # Track the year wealth crosses (regime switch point)
        if len(old_projections) > 0:
            prev_old_lead = old_projections[-1].cumulative_corpus >= new_projections[-1].cumulative_corpus
            curr_old_lead = old_corpus >= new_corpus
            if prev_old_lead != curr_old_lead and regime_switch_year is None:
                regime_switch_year = yr

        old_projections.append(old_proj)
        new_projections.append(new_proj)

    # Wealth gap at the end of projection (retirement proxy)
    final_old = old_projections[-1].cumulative_corpus
    final_new = new_projections[-1].cumulative_corpus
    wealth_gap = final_old - final_new

    # Current year summary for the regime comparison card
    break_even = compute_break_even_deductions(profile.income)
    current_old_tax = old_projections[0].tax_liability
    current_new_tax = new_projections[0].tax_liability
    current_saving = abs(current_old_tax - current_new_tax)
    recommended_now = Regime.OLD if current_old_tax <= current_new_tax else Regime.NEW

    summary = RegimeSummary(
        current_year_tax_old=current_old_tax,
        current_year_tax_new=current_new_tax,
        recommended_regime=recommended_now,
        tax_saving_this_year=current_saving,
        break_even_deductions=break_even,
        top_deductions=[]  # populated by deduction_mapper service
    )

    # Build the strategic recommendation narrative
    if wealth_gap > 0:
        gap_lakhs = round(wealth_gap / 100000, 1)
        strategy = (
            f"The old regime builds Rs {gap_lakhs}L more wealth over {years} years "
            f"because forced 80C investments compound significantly. "
            f"The new regime saves Rs {current_new_tax - current_old_tax:,} in tax this year "
            f"but removes the investment discipline that drives long-term wealth."
            if current_new_tax < current_old_tax else
            f"The old regime builds Rs {gap_lakhs}L more wealth over {years} years "
            f"despite paying similar tax today, purely through disciplined 80C compounding."
        )
    else:
        gap_lakhs = round(abs(wealth_gap) / 100000, 1)
        strategy = (
            f"The new regime builds Rs {gap_lakhs}L more wealth over {years} years. "
            f"At your income level, the tax saving under the new regime outweighs "
            f"the corpus from forced 80C investments. Invest the tax saving actively."
        )

    return LifecycleResult(
        old_regime=old_projections,
        new_regime=new_projections,
        regime_switch_year=regime_switch_year,
        wealth_gap_at_retirement=wealth_gap,
        recommended_strategy=strategy,
        summary=summary
    )
