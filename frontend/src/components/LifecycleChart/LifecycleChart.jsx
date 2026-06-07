import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Area, ComposedChart
} from "recharts";

function fmt(n) {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(0)}L`;
  return n.toLocaleString("en-IN");
}

function fmtFull(n) {
  if (n >= 10000000) return `Rs ${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `Rs ${(n / 100000).toFixed(1)}L`;
  return `Rs ${n.toLocaleString("en-IN")}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="tooltip-label">Year {label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="tooltip-row">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.stroke, display: "inline-block" }} />
          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{p.name}:</span>
          <span style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}>Rs {fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function LifecycleChart({ data, profile }) {
  const [view, setView] = useState("corpus"); // corpus | tax | income

  if (!data) return null;

  const { old_regime, new_regime, regime_switch_year, wealth_gap_at_retirement, recommended_strategy } = data;

  // Merge old and new into one array for recharts
  const chartData = old_regime.map((row, i) => ({
    year: row.year,
    age: row.age,
    old_corpus: row.cumulative_corpus,
    new_corpus: new_regime[i]?.cumulative_corpus,
    old_tax: row.tax_liability,
    new_tax: new_regime[i]?.tax_liability,
    old_income: row.gross_income,
    old_rate: (row.effective_tax_rate * 100).toFixed(1),
    new_rate: (new_regime[i]?.effective_tax_rate * 100).toFixed(1),
  }));

  const finalOld = old_regime[old_regime.length - 1].cumulative_corpus;
  const finalNew = new_regime[new_regime.length - 1].cumulative_corpus;
  const gapSign = wealth_gap_at_retirement >= 0 ? "+" : "";
  const isOldWinner = wealth_gap_at_retirement >= 0;

  const dataKeys = {
    corpus: { old: "old_corpus", new: "new_corpus", label: "Cumulative Corpus" },
    tax:    { old: "old_tax",    new: "new_tax",    label: "Annual Tax Liability" },
    income: { old: "old_income", new: "old_income", label: "Gross Income Trajectory" },
  };

  const { old: oldKey, new: newKey, label: chartLabel } = dataKeys[view];

  return (
    <div className="animate-in">
      {/* Headline stats */}
      <div className="grid-4" style={{ marginBottom: "2rem" }}>
        <div className="card-gold">
          <p className="label" style={{ marginBottom: "0.5rem" }}>Wealth Gap at Retirement</p>
          <p className="big-number" style={{ color: isOldWinner ? "var(--emerald)" : "var(--crimson)", fontSize: "1.75rem" }}>
            {gapSign}{fmtFull(Math.abs(wealth_gap_at_retirement))}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.35rem" }}>
            {isOldWinner ? "old regime builds more wealth" : "new regime builds more wealth"}
          </p>
        </div>
        <div className="card">
          <p className="label" style={{ marginBottom: "0.5rem" }}>Old Regime Corpus</p>
          <p className="big-number gold" style={{ fontSize: "1.5rem" }}>{fmtFull(finalOld)}</p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.35rem" }}>at year {profile.projection_years}</p>
        </div>
        <div className="card">
          <p className="label" style={{ marginBottom: "0.5rem" }}>New Regime Corpus</p>
          <p className="big-number" style={{ color: "var(--sky)", fontSize: "1.5rem" }}>{fmtFull(finalNew)}</p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.35rem" }}>at year {profile.projection_years}</p>
        </div>
        <div className="card">
          <p className="label" style={{ marginBottom: "0.5rem" }}>Regime Switch Year</p>
          {regime_switch_year ? (
            <>
              <p className="big-number" style={{ fontSize: "1.75rem" }}>Year {regime_switch_year}</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.35rem" }}>
                Age {profile.age + regime_switch_year - 1}
              </p>
            </>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
              One regime leads throughout
            </p>
          )}
        </div>
      </div>

      {/* Strategy recommendation */}
      <div className="card" style={{ marginBottom: "2rem", borderLeft: "3px solid var(--gold)" }}>
        <p className="label" style={{ marginBottom: "0.5rem" }}>Strategic Recommendation</p>
        <p style={{ color: "var(--text)", lineHeight: 1.7 }}>{recommended_strategy}</p>
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <p className="label">{chartLabel} — {profile.projection_years} Year Projection</p>
          <div className="toggle-group" style={{ maxWidth: 280 }}>
            {[
              { id: "corpus", label: "Corpus" },
              { id: "tax", label: "Annual Tax" },
              { id: "income", label: "Income" },
            ].map(v => (
              <button key={v.id} type="button"
                className={`toggle-btn ${view === v.id ? "active" : ""}`}
                onClick={() => setView(v.id)}>
                {v.label}
              </button>
            ))}
          </div>
          {/* Legend */}
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: 20, height: 2, background: "var(--gold)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>Old Regime</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: 20, height: 2, background: "var(--sky)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>New Regime</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-border)" />
            <XAxis
              dataKey="year"
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              axisLine={{ stroke: "var(--ink-border)" }}
              tickLine={false}
              label={{ value: "Projection Year", position: "insideBottom", offset: -5, fill: "var(--text-dim)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            />
            <YAxis
              tickFormatter={v => `${fmt(v)}`}
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            {regime_switch_year && (
              <ReferenceLine x={regime_switch_year} stroke="var(--ink-muted)" strokeDasharray="4 4"
                label={{ value: "Switch", position: "top", fill: "var(--text-dim)", fontSize: 10, fontFamily: "var(--font-mono)" }} />
            )}
            {view !== "income" && (
              <Line
                type="monotone"
                dataKey={newKey}
                name="New Regime"
                stroke="var(--sky)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--sky)" }}
              />
            )}
            <Line
              type="monotone"
              dataKey={oldKey}
              name="Old Regime"
              stroke="var(--gold)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "var(--gold)" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Year-by-year table (first 10 years) */}
      <div className="card">
        <p className="label" style={{ marginBottom: "1.25rem" }}>Year-by-Year Detail (first 10 years)</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr>
                {["Year", "Age", "Gross Income", "Old Tax", "New Tax", "Old Corpus", "New Corpus", "Gap"].map(h => (
                  <th key={h} style={{ textAlign: "right", padding: "0.6rem 0.875rem", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", borderBottom: "1px solid var(--ink-border)", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.slice(0, 10).map(row => {
                const gap = row.old_corpus - row.new_corpus;
                return (
                  <tr key={row.year} style={{ borderBottom: "1px solid var(--ink-border)" }}>
                    {[
                      { v: `Yr ${row.year}`, color: "var(--text-muted)" },
                      { v: row.age, color: "var(--text-muted)" },
                      { v: fmtFull(row.old_income), color: "var(--text)" },
                      { v: fmtFull(row.old_tax), color: "var(--gold)" },
                      { v: fmtFull(row.new_tax), color: "var(--sky)" },
                      { v: fmtFull(row.old_corpus), color: "var(--gold)" },
                      { v: fmtFull(row.new_corpus), color: "var(--sky)" },
                      { v: (gap >= 0 ? "+" : "") + fmtFull(gap), color: gap >= 0 ? "var(--emerald)" : "var(--crimson)" },
                    ].map((cell, ci) => (
                      <td key={ci} style={{ textAlign: "right", padding: "0.6rem 0.875rem", fontFamily: "var(--font-mono)", fontSize: "12px", color: cell.color, whiteSpace: "nowrap" }}>
                        {cell.v}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
