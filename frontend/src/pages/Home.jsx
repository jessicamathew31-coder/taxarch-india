import { useNavigate } from "react-router-dom";
import { ArrowRight, TrendingUp, Calendar, Target, BarChart2 } from "lucide-react";

const features = [
  {
    icon: <TrendingUp size={20} />,
    title: "Lifecycle Projection",
    desc: "Model 20-30 years of income growth, regime switches, and compounding corpus — not just this year's tax."
  },
  {
    icon: <Target size={20} />,
    title: "Deduction Mapper",
    desc: "All 30+ applicable deductions mapped to your profile. See the exact tax saving from each one you're missing."
  },
  {
    icon: <Calendar size={20} />,
    title: "Life Event Modelling",
    desc: "Home purchase, marriage, children, retirement — model the full tax impact of every major event."
  },
  {
    icon: <BarChart2 size={20} />,
    title: "Investment Architecture",
    desc: "Optimal 80C instrument allocation with corpus projections at every life stage."
  }
];

const compare = [
  ["Time horizon", "Current year only", "20 to 30 year projection"],
  ["Investment modelling", "None", "Compounding wealth from forced investments"],
  ["Life events", "None", "Home, marriage, children, retirement"],
  ["Deductions covered", "80C and 80D only", "All 30+ applicable sections"],
  ["Output", "Tax saved this year", "Lifetime wealth difference between regimes"],
  ["Regime guidance", "Static one-year", "Dynamic year-by-year optimal recommendation"],
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="page">
      {/* Hero */}
      <section style={{ paddingTop: "4rem", paddingBottom: "5rem" }}>
        <div className="animate-in" style={{ marginBottom: "1rem" }}>
          <span className="badge badge-gold">FY 2025-26 Edition</span>
        </div>
        <h1 className="display-heading animate-in delay-1" style={{ maxWidth: 700, marginBottom: "1.5rem" }}>
          Which regime builds more<br/>
          <span className="accent">wealth over your lifetime?</span>
        </h1>
        <p className="animate-in delay-2" style={{ maxWidth: 560, color: "var(--text-muted)", fontSize: "1.05rem", lineHeight: 1.7, marginBottom: "2.5rem" }}>
          Every tax calculator tells you which regime saves more this year.
          TaxArch tells you which one builds more wealth over the next 30 years —
          accounting for forced investments, compounding, and every major life event.
        </p>
        <div className="animate-in delay-3" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => navigate("/analyzer")}>
            Start Analysis <ArrowRight size={16} />
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/lifecycle")}>
            View Lifecycle Chart
          </button>
        </div>
      </section>

      <div className="divider-gold" />

      {/* Core insight callout */}
      <section style={{ marginBottom: "4rem" }}>
        <div className="card-gold animate-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center" }}>
          <div>
            <p className="label" style={{ marginBottom: "1rem" }}>The core insight</p>
            <h2 className="section-heading" style={{ marginBottom: "1rem" }}>
              Forced savings compound into wealth
            </h2>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.75 }}>
              The old regime forces you to invest Rs 1.5 lakh in PPF, ELSS, and NPS
              to claim deductions. Those investments compound over 20+ years into
              significant wealth. The new regime saves tax today but removes the
              investment discipline that builds long-term wealth.
            </p>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.75, marginTop: "1rem" }}>
              The optimal regime changes as your income grows, as you cross slab
              thresholds, and as life events unlock new deductions. TaxArch models
              the entire trajectory — not just the current year.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="card-inset" style={{ textAlign: "center", padding: "2rem" }}>
              <p className="label" style={{ marginBottom: "0.5rem" }}>Old regime advantage at Rs 15L income</p>
              <p className="big-number gold">Rs 43L</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>additional wealth by age 60 vs new regime</p>
            </div>
            <div className="card-inset" style={{ textAlign: "center", padding: "1.5rem" }}>
              <p className="label" style={{ marginBottom: "0.5rem" }}>Most commonly missed deduction</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 700, color: "var(--gold)" }}>80CCD(1B)</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>Rs 50,000 additional NPS — outside the 80C ceiling</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ marginBottom: "4rem" }}>
        <div className="section-rule">
          <p className="label">What TaxArch models</p>
        </div>
        <div className="grid-2">
          {features.map((f, i) => (
            <div key={i} className={`card animate-in delay-${i + 1}`} style={{ display: "flex", gap: "1rem" }}>
              <div style={{ color: "var(--gold)", marginTop: "2px", flexShrink: 0 }}>{f.icon}</div>
              <div>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: "0.4rem" }}>{f.title}</p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section style={{ marginBottom: "4rem" }}>
        <div className="section-rule">
          <p className="label">TaxArch vs Standard Calculator</p>
        </div>
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", borderBottom: "1px solid var(--ink-border)", width: "35%" }}>Feature</th>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", borderBottom: "1px solid var(--ink-border)" }}>Standard Calculator</th>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", borderBottom: "1px solid var(--ink-border)" }}>TaxArch India</th>
              </tr>
            </thead>
            <tbody>
              {compare.map(([feat, std, ta], i) => (
                <tr key={i} style={{ borderBottom: i < compare.length - 1 ? "1px solid var(--ink-border)" : "none" }}>
                  <td style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>{feat}</td>
                  <td style={{ padding: "0.875rem 1rem", color: "var(--text-dim)", fontSize: "0.9rem" }}>{std}</td>
                  <td style={{ padding: "0.875rem 1rem", color: "var(--text)", fontSize: "0.9rem", fontWeight: 500 }}>{ta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: "center", paddingBottom: "3rem" }}>
        <p className="label" style={{ marginBottom: "1rem" }}>Ready to model your wealth trajectory?</p>
        <button className="btn btn-primary" style={{ fontSize: "14px", padding: "0.875rem 2.5rem" }} onClick={() => navigate("/analyzer")}>
          Begin Analysis <ArrowRight size={16} />
        </button>
        <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginTop: "1rem", fontFamily: "var(--font-mono)" }}>
          Built by Jessica Mathew — MBA Finance and Technology, MIT ADT University
        </p>
      </section>
    </div>
  );
}
