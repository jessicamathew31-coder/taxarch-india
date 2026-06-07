export default function Dashboard() {
  return (
    <div className="page" style={{ paddingTop: "4rem", textAlign: "center" }}>
      <p className="label" style={{ marginBottom: "1rem" }}>Module 7</p>
      <h1 className="section-heading" style={{ fontSize: "2rem", marginBottom: "1rem" }}>
        Analytics Observatory
      </h1>
      <p style={{ color: "var(--text-muted)", maxWidth: 480, margin: "0 auto 2rem" }}>
        National cohort view: optimal regime distribution by income and age,
        wealth gap visualisation, and deduction utilisation patterns.
        Power BI dashboard embedded here in production.
      </p>
      <div className="card" style={{ maxWidth: 640, margin: "0 auto", padding: "3rem", borderStyle: "dashed" }}>
        <p style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
          Power BI embed — connect taxarch_dashboard.pbix after deploying backend to Render
          and seeding the scenario_results table with cohort data.
        </p>
      </div>
    </div>
  );
}
