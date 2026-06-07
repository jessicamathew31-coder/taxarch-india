-- TaxArch India Database Schema
-- All tables support the full lifecycle projection engine and deduction mapper.
-- Designed for PostgreSQL 15+. Run init_db.py to seed initial data after applying this schema.

-- ============================================================
-- TAX SLABS
-- Stores slab rates for both regimes across fiscal years.
-- income_to of NULL means "no upper limit" (highest slab).
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_slabs (
    id              SERIAL PRIMARY KEY,
    regime          TEXT    NOT NULL CHECK (regime IN ('old', 'new')),
    fy              TEXT    NOT NULL,  -- e.g. '2025-26'
    income_from     INTEGER NOT NULL,
    income_to       INTEGER,           -- NULL = unbounded upper slab
    rate            REAL    NOT NULL,  -- fraction, e.g. 0.05 for 5%
    UNIQUE (regime, fy, income_from)
);

-- ============================================================
-- SURCHARGE SLABS
-- Surcharge applies on top of basic tax for high incomes.
-- Separate from main slabs because surcharge thresholds differ
-- between regimes and change independently of slab rates.
-- ============================================================
CREATE TABLE IF NOT EXISTS surcharge_slabs (
    id              SERIAL PRIMARY KEY,
    regime          TEXT    NOT NULL CHECK (regime IN ('old', 'new')),
    fy              TEXT    NOT NULL,
    income_from     INTEGER NOT NULL,
    income_to       INTEGER,
    rate            REAL    NOT NULL,
    UNIQUE (regime, fy, income_from)
);

-- ============================================================
-- DEDUCTIONS
-- Every deduction available under the Income Tax Act.
-- eligible_profiles is a comma-separated list of tags
-- (e.g. 'salaried,self_employed,senior_citizen') so the
-- deduction mapper can filter by user profile at runtime.
-- ============================================================
CREATE TABLE IF NOT EXISTS deductions (
    id                  SERIAL PRIMARY KEY,
    section             TEXT    NOT NULL,   -- e.g. '80C', '24(b)', 'HRA'
    description         TEXT    NOT NULL,
    max_amount          INTEGER NOT NULL,   -- in INR, per annum
    eligible_profiles   TEXT    NOT NULL,   -- comma-separated profile tags
    instruments         TEXT,              -- comma-separated instrument names if applicable
    regime_applicable   TEXT    NOT NULL DEFAULT 'old',  -- 'old' or 'both'
    requires_investment BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================
-- INVESTMENT INSTRUMENTS
-- All 80C and related instruments with return assumptions.
-- Returns are long-run expected averages used for projection.
-- maturity_tax captures how corpus is taxed at withdrawal.
-- ============================================================
CREATE TABLE IF NOT EXISTS instruments (
    id              SERIAL PRIMARY KEY,
    name            TEXT    NOT NULL UNIQUE,
    category        TEXT    NOT NULL,       -- '80C', '80CCD', 'NPS', etc.
    expected_return REAL    NOT NULL,       -- annual rate, e.g. 0.071 for 7.1%
    lock_in_years   INTEGER NOT NULL DEFAULT 0,
    maturity_tax    TEXT    NOT NULL,       -- 'exempt', 'ltcg_12.5', 'taxable', 'partial_exempt'
    risk_level      TEXT    NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    max_annual      INTEGER,               -- annual investment ceiling if any
    section         TEXT                   -- deduction section this maps to
);

-- ============================================================
-- USER PROFILES
-- One row per analysis session. UUIDs used as IDs so the
-- frontend can generate them client-side without a roundtrip.
-- life_events is stored as JSONB to avoid a separate join for
-- the most common query path (single-profile lifecycle run).
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id                  TEXT    PRIMARY KEY,  -- UUID from client
    name                TEXT,
    age                 INTEGER NOT NULL,
    income              INTEGER NOT NULL,     -- annual gross income in INR
    income_growth_rate  REAL    NOT NULL DEFAULT 0.08,
    employment_type     TEXT    NOT NULL CHECK (employment_type IN ('salaried', 'self_employed', 'both')),
    family_status       TEXT    NOT NULL CHECK (family_status IN ('single', 'married', 'married_with_children')),
    has_home_loan       BOOLEAN NOT NULL DEFAULT FALSE,
    home_loan_principal INTEGER NOT NULL DEFAULT 0,
    home_loan_interest  INTEGER NOT NULL DEFAULT 0,
    projection_years    INTEGER NOT NULL DEFAULT 25,
    life_events         JSONB   NOT NULL DEFAULT '[]',  -- array of {event, year, amount}
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SCENARIO RESULTS
-- One row per (profile, regime, projection year).
-- Stores the full financial state at each year so the
-- lifecycle chart can render without recomputing on demand.
-- cumulative_corpus is the compounded wealth from investments
-- made in all prior years, not just the current year.
-- ============================================================
CREATE TABLE IF NOT EXISTS scenario_results (
    id                  SERIAL PRIMARY KEY,
    profile_id          TEXT    NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    regime              TEXT    NOT NULL CHECK (regime IN ('old', 'new')),
    year                INTEGER NOT NULL,   -- projection year index (1 = current year)
    age_at_year         INTEGER NOT NULL,
    gross_income        INTEGER NOT NULL,
    taxable_income      INTEGER NOT NULL,
    tax_liability       INTEGER NOT NULL,
    total_deductions    INTEGER NOT NULL,
    investments_made    INTEGER NOT NULL,   -- amount invested in 80C/80D instruments this year
    annual_corpus_add   INTEGER NOT NULL,   -- corpus contribution added this year
    cumulative_corpus   INTEGER NOT NULL,   -- total compounded wealth through this year
    is_optimal_regime   BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (profile_id, regime, year)
);

-- ============================================================
-- DEDUCTION AUDIT
-- Tracks which deductions are claimed vs unclaimed per profile.
-- annual_saving is the incremental tax reduction from claiming
-- this deduction under the old regime.
-- ============================================================
CREATE TABLE IF NOT EXISTS deduction_audit (
    id              SERIAL PRIMARY KEY,
    profile_id      TEXT    NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    deduction_id    INTEGER NOT NULL REFERENCES deductions(id),
    is_claimed      BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_amount  INTEGER NOT NULL DEFAULT 0,
    annual_saving   INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- INDEXES
-- Projection queries are always filtered by profile_id and
-- regime, so a compound index on those columns is essential.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_scenario_profile_regime ON scenario_results (profile_id, regime);
CREATE INDEX IF NOT EXISTS idx_scenario_profile_year   ON scenario_results (profile_id, year);
CREATE INDEX IF NOT EXISTS idx_deduction_audit_profile ON deduction_audit (profile_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created   ON user_profiles (created_at);
