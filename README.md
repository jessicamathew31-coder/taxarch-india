<div align="center">

# 🏛️ TaxArch India
### Lifecycle Tax Regime Optimiser for Indian Taxpayers

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20App-c9a84c?style=for-the-badge)](https://jessicamathew31-coder.github.io/taxarch-india/)
[![API](https://img.shields.io/badge/API-taxarch--india--api.onrender.com-2ecc8a?style=for-the-badge)](https://taxarch-india-api.onrender.com/health)
[![GitHub](https://img.shields.io/badge/GitHub-jessicamathew31--coder-black?style=for-the-badge&logo=github)](https://github.com/jessicamathew31-coder/taxarch-india)

[![Python](https://img.shields.io/badge/Python_3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_15-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Render](https://img.shields.io/badge/Deployed_on_Render-46E3B7?style=flat-square&logo=render&logoColor=black)](https://render.com)

*Every tax calculator tells you which regime saves more this year.*
***TaxArch tells you which one builds more wealth over the next 30 years.***

[**Live App →**](https://jessicamathew31-coder.github.io/taxarch-india/) &nbsp;·&nbsp; [**API Health →**](https://taxarch-india-api.onrender.com/health) &nbsp;·&nbsp; [**Portfolio →**](https://jessicamathew31-coder.github.io)

</div>

---

## 📸 Screenshots

### Home
![TaxArch India Home](docs/images/home.png)

### Profile Analyser
![TaxArch India Analyser](docs/images/analyser.png)

### 25-Year Lifecycle Projection
![TaxArch India Lifecycle](docs/images/lifecycle.png)

---

## 🎯 The Problem Nobody Was Solving

India has two income tax regimes. Crores of Indians switch between them every year guided by one type of tool — a calculator that answers: **which regime saves more tax this year?**

That is the wrong question.

When you claim Section 80C, you are **forced** to invest Rs 1.5 lakh annually in PPF, ELSS, and NPS. Those investments compound. At a blended 9% return over 25 years, Rs 1.5 lakh per year becomes **Rs 1.4 crore**. The new regime might save you Rs 45,000 in tax today — but if you spend that saving instead of investing it, you have traded a crore of compounded wealth for short-term cash flow.

The regime decision is not a tax question. **It is a lifetime wealth question.**

TaxArch models the full 25-year trajectory.

---

## 🔬 What TaxArch Models

### 📈 Lifecycle Projection Engine
Projects income at your growth rate year by year. Computes tax under both regimes. Compounds two portfolios simultaneously — old regime 80C corpus vs new regime tax-saving corpus. The gap at retirement is your headline number.

### 🗺️ Deduction Mapper
All 29 deductions in the Income Tax Act mapped to your profile. Section 24(b), 80E, 80EEA, HRA, 80TTA — every applicable section with the **marginal annual tax saving** from claiming each one you are missing.

Most commonly missed deduction in India: **80CCD(1B)** — Rs 50,000 in additional NPS sitting completely outside the Rs 1.5 lakh ceiling.

### 🏠 Life Event Tax Impact
Home purchase, marriage, children, education loan, senior parent health insurance — each event unlocks new deductions and shifts the regime recommendation. Modelled across your full projection horizon.

### 💼 Investment Architecture Generator
Allocates your 80C budget across PPF, ELSS, NPS, NSC based on risk preference. Every allocation shows corpus at retirement via the annuity formula. NPS 80CCD(1B) always recommended first.

---

## 🏗️ Architecture

```
taxarch-india/
  backend/
    main.py                      7 stateless API routes
    models/user_profile.py       Pydantic v2 request and response schema
    services/
      tax_calculator.py          Progressive slab engine, 87A rebate, surcharge, cess
      lifecycle_projector.py     25-year corpus model — fair comparison for both regimes
      investment_optimizer.py    80C allocation with annuity corpus projections
      deduction_mapper.py        29-deduction audit with marginal saving computation
      life_event_modeler.py      Per-event deduction unlocking and tax impact narrative
    data/
      tax_slabs.json             FY 2025-26 slab rates (incometaxindia.gov.in)
      deductions.json            29 deductions with eligibility rules
      instruments.json           9 instruments with sourced return assumptions
    database/
      schema.sql                 6 tables, 4 indexes — PostgreSQL 15
      init_db.py                 Schema + seed, safe to re-run
  frontend/
    src/
      components/                ProfileBuilder, RegimeComparison, LifecycleChart,
                                 DeductionMapper, InvestmentArchitecture, LifeEventCalculator
      pages/                     Home, Analyser, Lifecycle, Observatory
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + Python 3.11 |
| Data Models | Pydantic v2 |
| Database | PostgreSQL 15 |
| Frontend | React 18 + Recharts |
| Design | Playfair Display + DM Mono — dark editorial |
| Backend Hosting | Render (free tier) |
| Frontend Hosting | GitHub Pages |

---

## 📊 Tax Computation Details

All computations follow the Income Tax Act as amended by Finance Act 2024.

| Rule | Old Regime | New Regime |
|------|-----------|-----------|
| Standard deduction | Rs 50,000 | Rs 75,000 (FY 2025-26) |
| 87A rebate | Rs 12,500 (up to Rs 5L income) | Rs 60,000 (up to Rs 12L income) |
| 80C ceiling | Rs 1,50,000 | Not available |
| 80CCD(1B) | Rs 50,000 (outside ceiling) | Not available |
| Section 24(b) | Rs 2,00,000 (self-occupied) | Not available |
| Surcharge cap | 37% (above Rs 5Cr) | 25% (above Rs 2Cr) |
| Cess | 4% on (tax + surcharge) | 4% on (tax + surcharge) |

---

## 📚 Data Sources

| Data | Source |
|------|--------|
| Tax slab rates | Finance Act 2024, incometaxindia.gov.in |
| PPF interest (7.1%) | Ministry of Finance quarterly notification |
| NSC interest (7.7%) | India Post, indiapost.gov.in |
| SSY interest (8.2%) | India Post, indiapost.gov.in |
| ELSS return (12%) | AMFI India 20-year rolling SIP CAGR |
| NPS return (10%) | PFRDA scheme E historical performance |
| CPI inflation (6%) | MOSPI, mospi.gov.in |

---

## 🚀 Run Locally

```bash
# Clone
git clone https://github.com/jessicamathew31-coder/taxarch-india.git
cd taxarch-india

# Backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
export DATABASE_URL=postgresql://user:password@localhost/taxarch
python backend/database/init_db.py
uvicorn backend.main:app --reload --port 8000

# Frontend — open a new terminal tab
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173/taxarch-india/**

---

<div align="center">

## 👩‍💼 Built by Jessica Mathew

**MBA Finance and Technology · MIT ADT University, Pune · Class of 2025**

*Financial modelling meets production engineering.*

*Available immediately for full-time roles in fintech, financial product, and data analytics.*

**[Portfolio](https://jessicamathew31-coder.github.io) · [GitHub](https://github.com/jessicamathew31-coder)**

</div>
