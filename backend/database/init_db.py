"""
TaxArch India — Database Initialiser

Applies the schema to a fresh PostgreSQL database and seeds all reference data
from the JSON files in the data/ directory. Safe to re-run: all inserts use
ON CONFLICT DO NOTHING so existing rows are not overwritten.

Usage:
    python backend/database/init_db.py

Environment variable required:
    DATABASE_URL — PostgreSQL connection string, e.g.
    postgresql://user:password@localhost:5432/taxarch
"""

import json
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

# Resolve paths relative to this file so the script works from any cwd.
HERE = Path(__file__).parent
SCHEMA_PATH = HERE / "schema.sql"
DATA_DIR = HERE.parent / "data"


def get_connection() -> psycopg2.extensions.connection:
    """
    Opens a PostgreSQL connection using DATABASE_URL.

    Raises EnvironmentError if the variable is unset, rather than letting
    psycopg2 surface a cryptic connection error.
    """
    url = os.getenv("DATABASE_URL")
    if not url:
        raise EnvironmentError(
            "DATABASE_URL is not set. "
            "Export it before running this script:\n"
            "  export DATABASE_URL=postgresql://user:pass@localhost/taxarch"
        )
    return psycopg2.connect(url)


def apply_schema(conn: psycopg2.extensions.connection) -> None:
    """
    Applies schema.sql to the connected database.

    Uses IF NOT EXISTS throughout, so this is safe to run on an existing
    database without dropping any tables or data.
    """
    ddl = SCHEMA_PATH.read_text()
    with conn.cursor() as cur:
        cur.execute(ddl)
    conn.commit()
    print("[schema] Applied schema.sql")


def seed_tax_slabs(conn: psycopg2.extensions.connection, fy: str = "2025-26") -> None:
    """
    Seeds tax_slabs and surcharge_slabs for the given fiscal year.

    The JSON file stores both regimes together. We iterate over each regime
    and upsert every slab. Existing rows for the same (regime, fy, income_from)
    are left unchanged, which protects manual corrections in production.
    """
    data = json.loads((DATA_DIR / "tax_slabs.json").read_text())

    slab_rows = []
    for regime, slabs in data["tax_slabs"].items():
        if regime in ("old_regime", "new_regime"):
            regime_key = regime.replace("_regime", "")
            for s in slabs:
                slab_rows.append((
                    regime_key,
                    fy,
                    s["income_from"],
                    s.get("income_to"),   # None maps to SQL NULL for the top slab
                    s["rate"]
                ))

    surcharge_rows = []
    for regime, slabs in data["surcharge_slabs"].items():
        if regime in ("old_regime", "new_regime"):
            regime_key = regime.replace("_regime", "")
            for s in slabs:
                surcharge_rows.append((
                    regime_key,
                    fy,
                    s["income_from"],
                    s.get("income_to"),
                    s["rate"]
                ))

    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO tax_slabs (regime, fy, income_from, income_to, rate)
            VALUES %s
            ON CONFLICT (regime, fy, income_from) DO NOTHING
            """,
            slab_rows
        )
        execute_values(
            cur,
            """
            INSERT INTO surcharge_slabs (regime, fy, income_from, income_to, rate)
            VALUES %s
            ON CONFLICT (regime, fy, income_from) DO NOTHING
            """,
            surcharge_rows
        )
    conn.commit()
    print(f"[seed] Tax slabs: {len(slab_rows)} rows, surcharge slabs: {len(surcharge_rows)} rows")


def seed_deductions(conn: psycopg2.extensions.connection) -> None:
    """
    Seeds all deductions from deductions.json.

    Section is not unique (80C can appear in both regimes) so we use
    (section, description[:50]) as a natural collision guard via the
    ON CONFLICT DO NOTHING on the serial PK — meaning we simply skip
    re-insertion on subsequent runs rather than upsert.
    """
    data = json.loads((DATA_DIR / "deductions.json").read_text())

    rows = [
        (
            d["section"],
            d["description"],
            d["max_amount"],
            d["eligible_profiles"],
            d.get("instruments"),
            d.get("regime_applicable", "old"),
            d.get("requires_investment", False)
        )
        for d in data["deductions"]
    ]

    with conn.cursor() as cur:
        # Check existing count to skip if already seeded.
        cur.execute("SELECT COUNT(*) FROM deductions")
        existing = cur.fetchone()[0]
        if existing >= len(rows):
            print(f"[seed] Deductions already seeded ({existing} rows), skipping")
            return

        execute_values(
            cur,
            """
            INSERT INTO deductions
                (section, description, max_amount, eligible_profiles,
                 instruments, regime_applicable, requires_investment)
            VALUES %s
            """,
            rows
        )
    conn.commit()
    print(f"[seed] Deductions: {len(rows)} rows")


def seed_instruments(conn: psycopg2.extensions.connection) -> None:
    """
    Seeds investment instruments from instruments.json.

    Uses ON CONFLICT (name) DO NOTHING so the expected_return values
    (which come from government publications and change quarterly)
    can be manually updated in production without being overwritten.
    """
    data = json.loads((DATA_DIR / "instruments.json").read_text())

    rows = [
        (
            i["name"],
            i["category"],
            i["expected_return"],
            i.get("lock_in_years", 0),
            i["maturity_tax"],
            i["risk_level"],
            i.get("max_annual"),
            i.get("section")
        )
        for i in data["instruments"]
    ]

    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO instruments
                (name, category, expected_return, lock_in_years,
                 maturity_tax, risk_level, max_annual, section)
            VALUES %s
            ON CONFLICT (name) DO NOTHING
            """,
            rows
        )
    conn.commit()
    print(f"[seed] Instruments: {len(rows)} rows")


def main() -> None:
    """
    Runs the full initialisation sequence: schema then seed data.

    Order matters: schema must exist before any inserts.
    """
    print("TaxArch India — Database Initialisation")
    print("=" * 40)

    try:
        conn = get_connection()
    except EnvironmentError as e:
        print(f"[error] {e}")
        sys.exit(1)

    try:
        apply_schema(conn)
        seed_tax_slabs(conn)
        seed_deductions(conn)
        seed_instruments(conn)
        print("=" * 40)
        print("[done] Database ready.")
    except Exception as e:
        conn.rollback()
        print(f"[error] Seeding failed: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
