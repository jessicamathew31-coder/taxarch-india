# TaxArch India

**Lifecycle Tax Regime Optimiser for Indian Individual Taxpayers**

Every tax calculator in India answers the same question: which regime saves more tax this year?
TaxArch answers the deeper question: which regime builds more wealth over the next 30 years?

The answer is not obvious. The old regime forces Rs 1.5 lakh in annual 80C investments as a
condition of the deduction. Those investments compound over two to three decades into significant
wealth. The new regime saves tax today but removes the investment discipline that drives long-term
wealth accumulation. At higher incomes, the old regime's forced corpus often exceeds the new
regime's cumulative tax savings, even before accounting for 80D and home loan interest deductions.

TaxArch models the full lifecycle trajectory, not just the current year.

---

## Live Demo

Frontend: [jessicamathew31-coder.github.io/taxarch-india](https://jessicamathew31-coder.github.io/taxarch-india)

Backend API: Render deployment (see Environment Setup below)

---

## Core Innovation

The regime comparison problem in India has a hidden dimension that no existing tool models.

When you claim Section 80C, you are forced to invest Rs 1.5 lakh annually in instruments like PPF
(7.1% EEE), ELSS (12% with 3-year lock-in), or NPS (10% with partial EEE). Over a 25-year horizon,
Rs 1.5 lakh per year at 9% blended return grows to approximately Rs 1.4 crore. The new regime
saves perhaps Rs 45,000 to Rs 75,000 in tax per year at a Rs 15 lakh income level, but if that
saving is not invested (which is the realistic scenario for most taxpayers), the regime comparison
is not just about tax: it is about forced savings discipline vs spending freedom.

TaxArch makes this comparison honest by modelling both sides: the old regime corpus (from mandated
investments) and the new regime corpus (assuming the tax saving is invested at the same blended
return). Even on this fair-comparison basis, the old regime often wins at incomes above Rs 10 lakh
because of the additive effect of 80CCD(1B) (Rs 50,000 outside the ceiling), Section 24(b)
(Rs 2 lakh for home loan interest), and 80D (Rs 25,000 to Rs 1 lakh for health insurance).

---

## Technical Architecture

```
taxarch-india/
  backend/
    main.py                    FastAPI application, all routes
    models/
      user_profile.py          Pydantic request and response models
    services/
      tax_calculator.py        Core slab engine (both regimes, FY 2025-26)
      lifecycle_projector.py   25-year corpus projection
      investment_optimizer.py  80C instrument allocation generator
      deduction_mapper.py      30+ deduction audit with marginal saving
      life_event_modeler.py    Life event tax impact calculator
    data/
      tax_slabs.json           FY 2025-26 slab rates, 87A rebate, cess
      deductions.json          29 deduction records with eligibility rules
      instruments.json         9 investment instruments with return assumptions
      inflation.json           CPI assumptions and income growth presets
    database/
      schema.sql               PostgreSQL schema, 6 tables, 4 indexes
      init_db.py               Schema apply + reference data seed
    requirements.txt

  frontend/
    src/
      App.jsx                  Router and global profile state
      index.css                Design system (ink-black + gold, Playfair + DM Mono)
      pages/
        Home.jsx               Landing page
        Analyzer.jsx           Profile builder + tabbed results
        Lifecycle.jsx          25-year projection page
        Dashboard.jsx          Power BI observatory (Module 7)
      components/
        ProfileBuilder/        Full income and deduction input form
        RegimeComparison/      Current-year tax comparison + break-even
        LifecycleChart/        25-year corpus chart with view modes
        DeductionMapper/       30+ deduction audit with claimed/unclaimed filter
        InvestmentArchitecture/ 80C allocation with corpus projections
        LifeEventCalculator/   Per-event tax impact narrative cards
    vite.config.js
    index.html
    package.json
```

### Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | FastAPI (Python 3.11) |
| Data models | Pydantic v2 |
| Database | PostgreSQL 15 (Render) |
| Frontend framework | React 18 |
| Charting | Recharts 2.12 |
| Icons | Lucide React |
| Build tool | Vite 5 |
| Frontend hosting | GitHub Pages |
| Backend hosting | Render |

---

## Modules

### Module 1: Profile Builder

Collects age, income, employment type, family status, growth rate, life events, and declared
deductions. The form is intentionally sparse: essential fields visible, advanced fields (HRA,
NPS employer contribution, education loan) behind a disclosure toggle.

### Module 2: Current Year Regime Analyser

Computes FY 2025-26 tax liability under both regimes using the progressive slab structure,
Section 87A rebate (Rs 60,000 under new regime for incomes up to Rs 12 lakh), surcharge with
marginal relief, and 4% cess. Shows the break-even deduction level: below this, new regime wins.

### Module 3: Lifecycle Projection Engine

The core module. Projects income at the user-specified growth rate for each year of the
projection horizon. Computes tax under both regimes at each income level. For the old regime,
80C investments are added to corpus and compounded. For the new regime, the tax saving (if any)
vs old regime is assumed to be invested at the same blended return. The gap in cumulative wealth
at the projection horizon is the headline output.

### Module 4: Investment Architecture Generator

Allocates the Rs 1.5 lakh 80C budget across instruments based on risk preference. PPF-heavy for
low risk, balanced PPF/ELSS/NPS for medium risk, ELSS-heavy for high risk. NPS 80CCD(1B) is
always recommended first because it sits outside the Rs 1.5 lakh ceiling and is the single most
commonly missed deduction in India. Each allocation shows the expected corpus at retirement via
annuity formula.

### Module 5: Life Event Tax Impact Calculator

Quantifies the tax impact of planned life events: home purchase (Section 24(b) + 80C principal),
marriage (expanded 80D), children (80C tuition, SSY), education loan (80E), senior parent health
insurance (additional 80D), and retirement (income profile change). Events are modelled from the
year they occur and their deduction impact accumulates over the remaining projection period.

### Module 6: Comprehensive Deduction Mapper

Maps all 29 deductions in the Income Tax Act to the user's profile. Each deduction shows:
claimed amount, maximum eligible amount, unclaimed gap, and the marginal annual tax saving from
claiming the full amount. The marginal saving is computed by running two tax calculations (before
and after the unclaimed gap) rather than multiplying by marginal rate, which correctly handles
slab boundary effects.

### Module 7: Analytics Observatory

Power BI dashboard showing cohort-level patterns from the scenario_results table. Regime
distribution by income band, age group, and life stage. Planned for Render deployment with
the PostgreSQL backend.

---

## Environment Setup

### Backend

```bash
cd backend
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=postgresql://user:password@host:5432/taxarch

# Initialise database (applies schema + seeds reference data)
python database/init_db.py

# Start development server
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # Development server at localhost:5173

# Set API URL for production
echo "VITE_API_URL=https://your-render-app.onrender.com" > .env
npm run build        # Outputs to dist/
```

### Deployment

**Backend (Render):**

1. Create a new Web Service on Render from this repository.
2. Set build command: `pip install -r backend/requirements.txt`
3. Set start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Add `DATABASE_URL` environment variable pointing to a Render PostgreSQL instance.
5. Run `python backend/database/init_db.py` once from the Render shell.

**Frontend (GitHub Pages):**

```bash
cd frontend
npm run build
# Copy dist/ contents to the gh-pages branch, or use GitHub Actions
```

A GitHub Actions workflow for automated deployment is in `.github/workflows/deploy.yml`.

---

## Tax Computation Details

All computations follow the Income Tax Act as amended by Finance Act 2024. Key rules implemented:

- FY 2025-26 slab rates for both regimes
- Section 87A rebate: Rs 12,500 (old, income up to Rs 5 lakh) / Rs 60,000 (new, income up to Rs 12 lakh)
- Surcharge with marginal relief for incomes above Rs 50 lakh
- Health and Education Cess at 4%
- HRA exemption: minimum of three criteria (actual HRA, 50%/40% of basic, rent minus 10% of basic)
- Section 24(b): Rs 2 lakh cap for self-occupied property
- 80C ceiling: Rs 1,50,000 aggregate for 80C + 80CCC + 80CCD(1)
- 80CCD(1B): Rs 50,000 additional NPS, independent of 80C ceiling
- Standard deduction: Rs 50,000 (old) / Rs 75,000 (new) from FY 2025-26

See `docs/tax-rules-reference.md` for the complete rule set with statutory citations.

---

## Data Sources

| Data | Source |
|------|--------|
| Tax slabs and rates | Income Tax Act, Finance Act 2024, incometaxindia.gov.in |
| PPF interest rate | Ministry of Finance quarterly notification, finmin.nic.in |
| NSC interest rate | India Post, indiapost.gov.in |
| SSY interest rate | India Post, indiapost.gov.in |
| ELSS return assumption | AMFI India long-run SIP data, amfiindia.com |
| NPS return assumption | PFRDA historical scheme performance, pfrda.org.in |
| CPI inflation | MOSPI, mospi.gov.in |

---

## Project Author

**Jessica Mathew**
MBA Finance and Technology, MIT ADT University, Pune (Class of 2025)

Portfolio: [jessicamathew31-coder.github.io](https://jessicamathew31-coder.github.io)
GitHub: [github.com/jessicamathew31-coder](https://github.com/jessicamathew31-coder)

Available immediately for full-time roles in fintech data analytics, financial product management,
and data-driven financial services.
