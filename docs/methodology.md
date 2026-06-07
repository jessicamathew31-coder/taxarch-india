# TaxArch India — Projection Methodology

This document describes the mathematical model behind the TaxArch lifecycle projection engine.
All monetary values are in Indian Rupees (INR). All rates are annual fractions unless stated.

---

## 1. Income Projection

Income in year Y is modelled as compound growth from base income I:

```
Income(Y) = floor(I * (1 + g)^(Y-1))
```

where g is the user-specified annual growth rate (default 8%). Year 1 is the current year.
The floor function is applied to maintain integer INR throughout the computation, avoiding
floating-point accumulation over 25 to 30 projection steps.

Growth rate is user-controlled with presets at 6%, 8%, 10%, 12%, and 15% per year. These
correspond approximately to: conservative government/PSU salary growth, typical private sector
increment, mid-career high-performer, startup/tech sector, and aggressive self-employed growth.

---

## 2. Tax Computation

Tax for each year and each regime is computed by `tax_calculator.py` using the five-step model:

**Step 1: Deductions**

Old regime deductions for year 1 are taken directly from the user's declared values. For
projection years 2 onward, deductions are scaled using `_scale_deductions()`:

- Fixed deductions (80C ceiling Rs 1.5L, 80CCD(1B) Rs 50K, Section 24(b)) are held constant
  because they are either legally capped or contractually fixed (home loan EMI).
- Variable deductions (HRA, 80D, professional tax) scale proportionally with income, capped
  at 2x the base year value to avoid unrealistic extrapolation.

New regime deductions are always: standard deduction (Rs 75,000) + employer NPS 80CCD(2).

**Step 2: Slab tax**

Progressive slab structure is applied to taxable income. Each slab taxes only the income slice
within its band. The highest slab has no upper bound (income_to = None).

**Step 3: Section 87A rebate**

Applied to basic tax before surcharge. Old regime: up to Rs 12,500 if taxable income is at or
below Rs 5 lakh. New regime: up to Rs 60,000 if taxable income is at or below Rs 12 lakh
(Finance Act 2024, effective FY 2025-26).

**Step 4: Surcharge**

Surcharge is computed on the post-rebate basic tax. The applicable rate is determined by gross
total income (not taxable income). Marginal relief is applied: where the surcharge would cause
(tax + surcharge) to exceed the incremental income above the surcharge threshold, the surcharge
is capped at that excess. This implements the statutory marginal relief provision.

**Step 5: Cess**

Health and Education Cess at 4% is applied on (basic tax after rebate + surcharge).

---

## 3. Corpus Projection

**Old regime corpus:**

The 80C investment made in each year (up to Rs 1.5 lakh, determined by `compute_80c_investment()`)
is added to the corpus, which then compounds for one additional year:

```
Corpus(Y) = floor(Corpus(Y-1) * (1 + r)) + Investment(Y)
```

where r is the blended portfolio return (see Section 4).

**New regime corpus (fair comparison model):**

The new regime taxpayer is assumed to invest their annual tax saving (old regime tax minus new
regime tax, if positive) at the same blended return r:

```
NewCorpus(Y) = floor(NewCorpus(Y-1) * (1 + r)) + max(0, OldTax(Y) - NewTax(Y))
```

This is the "fair comparison" assumption. It is intentionally generous to the new regime: if the
new regime saves Rs 45,000 in tax, we assume all Rs 45,000 is invested. In practice, a significant
fraction of tax saving is consumed rather than invested. A more pessimistic assumption for the new
regime would make the old regime's wealth advantage even larger.

This modelling choice is documented here so users can evaluate whether the comparison is biased.
We believe assuming full investment of tax saving is the right default for a financial planning tool
because it represents the best-case scenario for the new regime.

---

## 4. Blended Portfolio Return

The blended return r for the 80C portfolio is a weighted average of expected returns of instruments
in the recommended allocation. Weights vary by risk preference:

| Instrument | Return | Low Risk | Medium Risk | High Risk |
|-----------|--------|----------|-------------|-----------|
| PPF | 7.1% | 60% | 40% | 15% |
| NSC | 7.7% | 30% | 10% | 0% |
| NPS | 10.0% | 10% | 20% | 25% |
| ELSS | 12.0% | 0% | 30% | 60% |

Resulting blended returns:
- Low risk: 7.35%
- Medium risk: 9.27%
- High risk: 11.10%

Return assumptions are long-run averages. PPF and NSC rates are government-set and change
quarterly. ELSS return at 12% is a conservative estimate based on Nifty 50 historical SIP CAGR
over 20-year rolling periods. NPS at 10% reflects a moderate E50 allocation.

---

## 5. Life Event Deduction Scaling

Life events add incremental deductions to the old regime calculation from the year they occur:

| Event | Deduction Added |
|-------|----------------|
| Home purchase | Section 24(b) interest (up to Rs 2L) + 80C principal (estimated) |
| Marriage | 80D spouse health insurance (Rs 15,000 estimate) |
| Child | 80C tuition fees (Rs 30,000 estimate) |
| Education loan | 80E interest (estimated from loan amount at 9%) |
| Parent health | 80D senior parent (Rs 50,000) |
| Retirement | No additional deduction (income profile change handled separately) |

For home purchase, if the user has declared home loan details, those figures are used. Otherwise,
80% LTV is assumed on the declared property value at 8.5% annual interest over a 20-year tenure.

---

## 6. Corpus at Retirement (Instrument Level)

Individual instrument corpus projections use the future value of an annuity formula:

```
Corpus = Annual_Investment * ((1+r)^n - 1) / r
```

where n is years to retirement (60 - current age) and r is the instrument's expected return.

This is the standard terminal wealth formula for equal annual contributions. It slightly
overestimates true corpus because it assumes the full annual investment is made at the start
of each year (annuity due assumption), but the overestimation is under 1% for return rates
below 12% and is acceptable for long-horizon projections.

---

## 7. Break-Even Deductions

The break-even deduction level is computed by binary search over the space [0, 4,00,000]:

```
Find D such that:
  OldTax(income, deductions=D) = NewTax(income)
```

The binary search converges to within Rs 1 in 50 iterations. This is the threshold below which
the new regime wins on current-year tax. Users whose actual deductions exceed this threshold save
more tax in the old regime for the current year.

---

## 8. Limitations and Assumptions

1. Slab rates are fixed at FY 2025-26 values for all projection years. Future budget changes
   are not modelled. Users should re-run the projection when tax structures change.

2. Income growth is assumed to be continuous compound. Career interruptions, job changes, or
   plateaus are not modelled. The user can adjust the growth rate to reflect their expectations.

3. The HRA scaling approximation (variable deductions scale with income ratio) introduces a
   small error in projection years. HRA in practice depends on rent paid and employer-provided
   HRA, not just income growth.

4. ELSS returns are pre-LTCG. The 12% assumption is gross. Post-LTCG return at 12.5% on gains
   above Rs 1.25 lakh reduces effective return by approximately 0.3 to 0.5 percentage points on
   a large corpus.

5. Inflation is not applied to nominal corpus figures. All values shown are nominal. For real
   wealth comparisons, users should deflate by cumulative CPI (6% default in inflation.json).

6. Tax regime changes: if the government eliminates one regime, this projection becomes
   hypothetical. The model is a planning tool, not a prediction of future tax law.
