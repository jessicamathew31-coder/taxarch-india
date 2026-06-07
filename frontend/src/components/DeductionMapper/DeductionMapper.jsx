import { useState } from "react";

function fmt(n) {
  if (n >= 100000) return `Rs ${(n / 100000).toFixed(1)}L`;
  return `Rs ${n.toLocaleString("en-IN")}`;
}

export default function DeductionMapper({ data }) {
  const [filter, setFilter] = useState("all"); // all | unclaimed | claimed

  if (!data) return null;

  const { claimed_total, unclaimed_total, total_potential_saving, items } = data;

  const filtered = items.filter(item => {
    if (!item.is_applicable) return false;
    if (filter === "unclaimed") return item.unclaimed_amount > 0;
    if (filter === "claimed") return item.claimed_amount > 0;
    return true;
  });

  return (
    <div className="animate-in">
      {/* Summary cards */}
      <div className="grid-3" style={{ marginBottom: "2rem" }}>
        <div className="card">
          <p className="label" style={{ marginBottom: "0.5rem" }}>Total Claimed</p>
          <p className="big-number gold" style={{ fontSize: "1.5rem" }}>{fmt(claimed_total)}</p>
        </div>
        <div className="card">
          <p className="label" style={{ marginBottom: "0.5rem" }}>Total Unclaimed</p>
          <p className="big-number crimson" style={{ fontSize: "1.5rem" }}>{fmt(unclaimed_total)}</p>
        </div>
        <div className="card-gold">
          <p className="label" style={{ marginBottom: "0.5rem" }}>Potential Annual Saving</p>
          <p className="big-number emerald" style={{ fontSize: "1.5rem" }}>{fmt(total_potential_saving)}</p>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: "2px", marginBottom: "1.5rem" }}>
        <div className="toggle-group" style={{ maxWidth: 300 }}>
          {["all", "unclaimed", "claimed"].map(f => (
            <button key={f} type="button"
              className={`toggle-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Deduction rows */}
      <div className="card">
        {filtered.length === 0 && (
          <p style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
            No deductions in this filter.
          </p>
        )}
        {filtered.map((item, i) => {
          const pct = item.claimed_amount > 0 && item.max_amount > 0
            ? Math.min(100, (item.claimed_amount / item.max_amount) * 100)
            : 0;
          return (
            <div key={i} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--ink-border)" : "none", padding: "1rem 0" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.5rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.3rem" }}>
                    <span className="badge badge-gold">{item.section}</span>
                    {item.regime_applicable === "both" && (
                      <span className="badge badge-emerald">Both Regimes</span>
                    )}
                  </div>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>{item.description}</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {item.annual_tax_saving > 0 && (
                    <p style={{ fontFamily: "var(--font-mono)", color: "var(--emerald)", fontSize: "13px" }}>
                      +{fmt(item.annual_tax_saving)}/yr
                    </p>
                  )}
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>
                    {fmt(item.claimed_amount)} / {fmt(item.max_amount)}
                  </p>
                </div>
              </div>
              {item.max_amount > 0 && (
                <div className="progress-bar">
                  <div className="progress-fill"
                    style={{
                      width: `${pct}%`,
                      background: pct >= 100 ? "var(--emerald)" : pct > 0 ? "var(--gold)" : "var(--crimson)"
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
