# TaxArch India

> **Every tax calculator tells you which regime saves more this year.**
> **TaxArch tells you which one builds more wealth over the next 30 years.**

---

<div align="center">

**[Live Demo](https://jessicamathew31-coder.github.io/taxarch-india/) · [API](https://taxarch-india-api.onrender.com/health) · [Portfolio](https://jessicamathew31-coder.github.io)**

![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?style=flat-square)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square)
![Deployed](https://img.shields.io/badge/Deployed-Render%20%2B%20GitHub%20Pages-success?style=flat-square)

</div>

---

![TaxArch India Home](docs/images/home.png)

---

## The Problem Nobody Is Solving

India has two income tax regimes. Millions of calculators exist to tell you which one saves more tax this year.

None of them ask the deeper question.

The old regime forces you to invest Rs 1.5 lakh annually in PPF, ELSS, and NPS to claim the 80C deduction. Those investments compound over 20 to 30 years. At a blended 9% return, Rs 1.5 lakh per year grows to over Rs 1.4 crore by retirement. The new regime saves perhaps Rs 45,000 in tax today but removes the investment discipline that builds that corpus.

**The optimal regime is not a current-year tax question. It is a lifetime wealth question.**

TaxArch models the full trajectory.

---

## Profile Analyser

![TaxArch India Analyser](docs/images/analyser.png)

---

## 25-Year Lifecycle Projection

![TaxArch India Lifecycle](docs/images/lifecycle.png)

---

## What TaxArch Models

### Lifecycle Projection Engine
Projects income at your growth rate for every year of your horizon. Computes tax under both regimes at each year's income. Compounds the 80C corpus under the old regime. Under the new regime, assumes the tax saving is invested at the same blended return. Shows the wealth gap at retirement.

### Regime Switch Detection
Flags the exact year when one regime overtakes the other in cumulative wealth.

### Deduction Mapper
Maps all 29 deductions in the Income Tax Act to your profile. Shows claimed vs unclaimed amounts and the marginal annual tax saving from claiming each missed deduction. The most commonly missed: **80CCD(1B)** — Rs 50,000 in additional NPS that sits completely outside the Rs 1.5 lakh ceiling.

### Life Event Tax Impact
Home purchase, marriage, children, education loans, senior parent health insurance — each event shifts the regime recommendation. TaxArch models all of them across your projection horizon.

### Investment Architecture Generator
Allocates the 80C budget across PPF, ELSS, NPS, NSC, and other instruments based on your risk preference. Shows corpus projections at retirement for each instrument.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python 3.11) |
| Data models | Pydantic v2 |
| Database | PostgreSQL 15 |
| Frontend | React 18 + Recharts |
| Hosting | Render (backend) + GitHub Pages (frontend) |

---

## Architecture

```
taxarch-india/
  backend/
    main.py                     7 API routes, stateless design
    models/user_profile.py      Full Pydantic schema
    services/
      tax_calculator.py         Progressive slab engine, 87A rebate, surcharge, cess
      lifecycle_projector.py    25-year corpus model for both regimes
      investment_optimizer.py   80C allocation with annuity corpus projections
      deduction_mapper.py       29-deduction audit with marginal saving computation
      life_event_modeler.py     Per-event tax impact and narrative
    data/
      tax_slabs.json            FY 2025-26 rates (sourced from incometaxindia.gov.in)
      deductions.json           29 deductions with eligibility rules
      instruments.json          9 instruments with sourced return assumptions
    database/
      schema.sql                6 tables, 4 indexes
      init_db.py                Schema + seed, safe to re-run
  frontend/
    src/
      components/               ProfileBuilder, RegimeComparison, LifecycleChart,
                                DeductionMapper, InvestmentArchitecture, LifeEventCalculator
      pages/                    Home, Analyser, Lifecycle, Observatory
```

---

## Running Locally

```bash
# Clone
git clone https://github.com/jessicamathew31-coder/taxarch-india.git
cd taxarch-india

# Backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
export DATABASE_URL=postgresql://user:password@localhost/taxarch
python backend/database/init_db.py
uvicorn backend.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173/taxarch-india/

---

## Tax Computation Details

All computations follow the Income Tax Act as amended by Finance Act 2024:

- FY 2025-26 slab rates for both regimes
- Section 87A rebate: Rs 12,500 (old, up to Rs 5L) / Rs 60,000 (new, up to Rs 12L)
- Surcharge with marginal relief
- 4% Health and Education Cess
- HRA: minimum of three criteria
- Section 24(b): Rs 2 lakh cap for self-occupied property
- 80C aggregate ceiling: Rs 1,50,000
- 80CCD(1B): Rs 50,000 independent of 80C ceiling
- Standard deduction: Rs 50,000 (old) / Rs 75,000 (new) from FY 2025-26

---

## Data Sources

| Data | Source |
|------|--------|
| Tax slabs and rates | Income Tax Act, Finance Act 2024 |
| PPF rate (7.1%) | Ministry of Finance, finmin.nic.in |
| NSC rate (7.7%) | India Post, indiapost.gov.in |
| SSY rate (8.2%) | India Post, indiapost.gov.in |
| ELSS return assumption | AMFI India long-run SIP data |
| NPS return assumption | PFRDA historical scheme performance |
| CPI inflation | MOSPI, mospi.gov.in |

---

## Built By

**Jessica Mathew**
MBA Finance and Technology, MIT ADT University, Pune (Class of 2025)

[jessicamathew31-coder.github.io](https://jessicamathew31-coder.github.io) · [github.com/jessicamathew31-coder](https://github.com/jessicamathew31-coder)

---

*Available immediately for full-time roles in fintech, financial product, and data analytics.*
