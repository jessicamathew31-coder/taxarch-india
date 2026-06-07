import { Calendar, TrendingUp, Unlock } from "lucide-react";

function fmt(n) {
  if (n >= 100000) return `Rs ${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `Rs ${(n / 1000).toFixed(0)}K`;
  return `Rs ${n.toLocaleString("en-IN")}`;
}

const EVENT_LABELS = {
  home_purchase:  "Home Purchase",
  marriage:       "Marriage",
  child:          "Child",
  education_loan: "Education Loan",
  parent_health:  "Parent Health Insurance",
  retirement:     "Retirement",
};

const EVENT_COLORS = {
  home_purchase:  "var(--gold)",
  marriage:       "var(--emerald)",
  child:          "var(--sky)",
  education_loan: "var(--sky)",
  parent_health:  "var(--emerald)",
  retirement:     "var(--text-muted)",
};

export default function LifeEventCalculator({ data }) {
  if (!data || data.length === 0) return null;

  // Sort by year_offset ascending so the nearest events appear first
  const sorted = [...data].sort((a, b) => a.year_offset - b.year_offset);

  return (
    <div className="animate-in">
      <div style={{ marginBottom: "1.75rem" }}>
        <p className="label" style={{ marginBottom: "0.35rem" }}>Module 5</p>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.4rem" }}>
          Life Event Tax Impact
        </h3>
        <p style={{ color: "var(--text-muted)", marginTop: "0.35rem" }}>
          How each planned event changes your deduction profile and regime recommendation over time.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {sorted.map((impact, i) => {
          const color = EVENT_COLORS[impact.event] || "var(--gold)";
          const label = EVENT_LABELS[impact.event] || impact.event;
          const hasSaving = impact.annual_tax_saving_old > 0;

          return (
            <div key={i} className="card"
              style={{ borderLeft: `3px solid ${color}` }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>

                {/* Left: event info and narrative */}
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem" }}>
                    <Calendar size={15} style={{ color }} />
                    <span style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "1.05rem",
                      color: "var(--text)"
                    }}>
                      {label}
                    </span>
                    <span className="badge badge-muted">
                      Year {impact.year_offset}
                    </span>
                  </div>

                  {/* Deductions unlocked */}
                  {impact.deductions_unlocked.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                      <Unlock size={12} style={{ color: "var(--text-dim)" }} />
                      <span className="label" style={{ marginRight: "4px" }}>Unlocks:</span>
                      {impact.deductions_unlocked.map((d, di) => (
                        <span key={di} className="badge badge-gold">{d}</span>
                      ))}
                    </div>
                  )}

                  <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.65 }}>
                    {impact.narrative}
                  </p>
                </div>

                {/* Right: numbers */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: 200, alignItems: "flex-end" }}>
                  <div style={{ textAlign: "right" }}>
                    <p className="label" style={{ marginBottom: "0.2rem" }}>Annual saving (old regime)</p>
                    <p style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "1.25rem",
                      color: hasSaving ? "var(--emerald)" : "var(--text-dim)"
                    }}>
                      {hasSaving ? fmt(impact.annual_tax_saving_old) : "No direct saving"}
                    </p>
                  </div>

                  {impact.cumulative_impact > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <p className="label" style={{ marginBottom: "0.2rem" }}>10-year cumulative saving</p>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                        <TrendingUp size={14} style={{ color: "var(--emerald)" }} />
                        <p style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: "1.1rem",
                          color: "var(--emerald)"
                        }}>
                          {fmt(impact.cumulative_impact)}
                        </p>
                      </div>
                    </div>
                  )}

                  {impact.annual_tax_saving_new === 0 && impact.annual_tax_saving_old > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <span className="badge badge-muted" style={{ fontSize: "10px" }}>
                        New regime: no benefit
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      {sorted.length > 1 && (
        <div className="card-inset" style={{ marginTop: "1.5rem", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          <div>
            <p className="label" style={{ marginBottom: "0.25rem" }}>Total annual saving at peak events</p>
            <p style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "1.25rem",
              color: "var(--emerald)"
            }}>
              {fmt(sorted.reduce((sum, e) => sum + e.annual_tax_saving_old, 0))}
            </p>
          </div>
          <div>
            <p className="label" style={{ marginBottom: "0.25rem" }}>Total 10-yr cumulative impact</p>
            <p style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "1.25rem",
              color: "var(--emerald)"
            }}>
              {fmt(sorted.reduce((sum, e) => sum + e.cumulative_impact, 0))}
            </p>
          </div>
          <div>
            <p className="label" style={{ marginBottom: "0.25rem" }}>Events strengthening old regime</p>
            <p style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "1.25rem",
              color: "var(--gold)"
            }}>
              {sorted.filter(e => e.annual_tax_saving_old > 0).length} of {sorted.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
