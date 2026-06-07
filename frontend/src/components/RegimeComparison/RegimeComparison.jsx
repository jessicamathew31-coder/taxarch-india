import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

function fmt(n) {
  if (n >= 10000000) return `Rs ${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `Rs ${(n / 100000).toFixed(1)}L`;
  return `Rs ${n.toLocaleString("en-IN")}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="tooltip-row">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.fill, display: "inline-block" }} />
          <span style={{ color: "var(--text-muted)" }}>{p.name}:</span>
          <span style={{ color: "var(--text)" }}>{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function RegimeComparison({ data, income }) {
  const [sliderDeductions, setSliderDeductions] = useState(data?.break_even_deductions || 150000);

  if (!data) return null;

  const { current_year_tax_old, current_year_tax_new, recommended_regime,
          tax_saving_this_year, break_even_deductions, top_deductions } = data;

  const chartData = [
    { name: "Old Regime", tax: current_year_tax_old, fill: "#c9a84c" },
    { name: "New Regime", tax: current_year_tax_new, fill: "#5b9cf6" },
  ];

  const isOldBetter = recommended_regime === "old";

  return (
    <div className="animate-in">
      {/* Headline cards */}
      <div className="grid-3" style={{ marginBottom: "2rem" }}>
        <div className="card-gold">
          <p className="label" style={{ marginBottom: "0.75rem" }}>Recommended Regime</p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700,
            color: isOldBetter ? "var(--gold)" : "var(--sky)" }}>
            {isOldBetter ? "Old Regime" : "New Regime"}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
            based on your declared deductions
          </p>
        </div>

        <div className="card">
          <p className="label" style={{ marginBottom: "0.75rem" }}>Annual Tax Saving</p>
          <p className="big-number emerald">{fmt(tax_saving_this_year)}</p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
            by choosing {recommended_regime === "old" ? "old" : "new"} regime
          </p>
        </div>

        <div className="card">
          <p className="label" style={{ marginBottom: "0.75rem" }}>Break-even Deductions</p>
          <p className="big-number">{fmt(break_even_deductions)}</p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
            above this, old regime wins
          </p>
        </div>
      </div>

      {/* Tax comparison bar chart */}
      <div className="grid-2" style={{ marginBottom: "2rem" }}>
        <div className="card">
          <p className="label" style={{ marginBottom: "1.25rem" }}>Tax Liability Comparison — FY 2025-26</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={60}>
              <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${(v/100000).toFixed(0)}L`} tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="tax" name="Tax" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <rect key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
            <div>
              <p className="label">Old Regime</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--gold)" }}>
                {fmt(current_year_tax_old)}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p className="label">New Regime</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--sky)" }}>
                {fmt(current_year_tax_new)}
              </p>
            </div>
          </div>
        </div>

        {/* Top missed deductions */}
        <div className="card">
          <p className="label" style={{ marginBottom: "1.25rem" }}>Top Missed Deductions</p>
          {top_deductions && top_deductions.length > 0 ? (
            top_deductions.map((d, i) => (
              <div key={i} className="stat-row">
                <div>
                  <span className="badge badge-gold" style={{ marginRight: "0.5rem" }}>{d.section}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{d.description}</span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--emerald)", fontSize: "13px", whiteSpace: "nowrap" }}>
                  +{fmt(d.annual_saving)}/yr
                </span>
              </div>
            ))
          ) : (
            <p style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
              No missed deductions detected.
            </p>
          )}
        </div>
      </div>

      {/* Effective rates */}
      <div className="card-inset">
        <p className="label" style={{ marginBottom: "1rem" }}>Effective Tax Rate Comparison</p>
        <div className="grid-2">
          {[
            { label: "Old Regime", tax: current_year_tax_old, color: "var(--gold)", fillClass: "" },
            { label: "New Regime", tax: current_year_tax_new, color: "var(--sky)", fillClass: "" },
          ].map(({ label, tax, color }) => {
            const rate = income ? ((tax / income) * 100).toFixed(1) : 0;
            return (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", color, fontSize: "13px" }}>{rate}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(rate, 35) / 35 * 100}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
