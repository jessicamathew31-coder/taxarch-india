function fmt(n) {
  if (n >= 10000000) return `Rs ${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `Rs ${(n / 100000).toFixed(1)}L`;
  return `Rs ${n.toLocaleString("en-IN")}`;
}

const RISK_COLORS = { low: "var(--emerald)", medium: "var(--gold)", high: "var(--crimson)" };

export default function InvestmentArchitecture({ data }) {
  if (!data) return null;

  const { total_investable, allocations, total_80c_invested, total_80c_remaining, projected_corpus_at_retirement } = data;

  return (
    <div className="animate-in">
      {/* Summary */}
      <div className="grid-3" style={{ marginBottom: "2rem" }}>
        <div className="card-gold">
          <p className="label" style={{ marginBottom: "0.5rem" }}>Projected Corpus at Retirement</p>
          <p className="big-number emerald" style={{ fontSize: "1.75rem" }}>
            {fmt(projected_corpus_at_retirement)}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.35rem" }}>from this year's allocation, compounded</p>
        </div>
        <div className="card">
          <p className="label" style={{ marginBottom: "0.5rem" }}>Total 80C Invested</p>
          <p className="big-number gold" style={{ fontSize: "1.5rem" }}>{fmt(total_80c_invested)}</p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.35rem" }}>of Rs 1.5L ceiling</p>
          <div className="progress-bar" style={{ marginTop: "0.75rem" }}>
            <div className="progress-fill" style={{ width: `${Math.min(100, total_80c_invested / 150000 * 100)}%` }} />
          </div>
        </div>
        <div className="card">
          <p className="label" style={{ marginBottom: "0.5rem" }}>Remaining 80C Capacity</p>
          <p className="big-number" style={{ fontSize: "1.5rem", color: total_80c_remaining > 0 ? "var(--crimson)" : "var(--emerald)" }}>
            {fmt(total_80c_remaining)}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.35rem" }}>
            {total_80c_remaining === 0 ? "Fully utilised" : "unutilised deduction space"}
          </p>
        </div>
      </div>

      {/* Allocation cards */}
      <p className="label" style={{ marginBottom: "1.25rem" }}>Recommended Allocation</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {allocations.map((alloc, i) => (
          <div key={i} className="card" style={{ borderLeft: `3px solid ${RISK_COLORS[alloc.risk_level]}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.5rem" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem" }}>
                    {alloc.instrument}
                  </span>
                  <span className="badge badge-muted">{alloc.section}</span>
                  <span className="badge" style={{ background: `${RISK_COLORS[alloc.risk_level]}20`, color: RISK_COLORS[alloc.risk_level], border: `1px solid ${RISK_COLORS[alloc.risk_level]}50` }}>
                    {alloc.risk_level} risk
                  </span>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>{alloc.rationale}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p className="label" style={{ marginBottom: "0.25rem" }}>Invest annually</p>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.25rem", color: "var(--gold)" }}>
                  {fmt(alloc.amount)}
                </p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                  {(alloc.expected_return * 100).toFixed(1)}% expected return
                </p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)" }}>
                  Lock-in: {alloc.lock_in_years === 0 ? "None" : `${alloc.lock_in_years} years`}
                </p>
                <p className="label" style={{ marginTop: "0.75rem" }}>Corpus at retirement</p>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--emerald)", fontSize: "1.1rem" }}>
                  {fmt(alloc.corpus_at_retirement)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
