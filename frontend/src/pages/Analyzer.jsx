import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileBuilder from "../components/ProfileBuilder/ProfileBuilder";
import RegimeComparison from "../components/RegimeComparison/RegimeComparison";
import DeductionMapper from "../components/DeductionMapper/DeductionMapper";
import InvestmentArchitecture from "../components/InvestmentArchitecture/InvestmentArchitecture";
import { ArrowRight, Loader } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Analyzer({ profile, setProfile, results, setResults }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("regime");
  const navigate = useNavigate();

  async function handleSubmit(profileData) {
    setLoading(true);
    setError(null);
    setProfile(profileData);

    try {
      // Fetch all analysis results in parallel
      const [regimeRes, deductionRes, investRes] = await Promise.all([
        fetch(`${API}/api/regime-summary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileData)
        }),
        fetch(`${API}/api/deductions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileData)
        }),
        fetch(`${API}/api/investment-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileData)
        })
      ]);

      if (!regimeRes.ok || !deductionRes.ok || !investRes.ok) {
        throw new Error("Analysis failed. Check API connection.");
      }

      const [regime, deductions, investment] = await Promise.all([
        regimeRes.json(),
        deductionRes.json(),
        investRes.json()
      ]);

      setResults({ regime, deductions, investment });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { id: "regime", label: "Regime Comparison" },
    { id: "deductions", label: "Deduction Mapper" },
    { id: "investments", label: "Investment Plan" },
  ];

  return (
    <div className="page">
      <div style={{ marginBottom: "2.5rem" }} className="animate-in">
        <p className="label" style={{ marginBottom: "0.5rem" }}>Tax Intelligence Engine</p>
        <h1 className="section-heading" style={{ fontSize: "2rem" }}>Profile Analyser</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Enter your financial details to run the full regime and lifecycle analysis.
        </p>
      </div>

      {/* Profile Builder */}
      <div className="animate-in delay-1">
        <ProfileBuilder onSubmit={handleSubmit} loading={loading} existingProfile={profile} />
      </div>

      {error && (
        <div className="card animate-in" style={{ borderColor: "var(--crimson)", marginTop: "1.5rem" }}>
          <p style={{ color: "var(--crimson)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
            {error}
          </p>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="animate-in" style={{ marginTop: "3rem" }}>
          <div className="divider-gold" />

          {/* Tab navigation */}
          <div style={{ display: "flex", gap: "0", marginBottom: "2rem", borderBottom: "1px solid var(--ink-border)" }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === tab.id ? "2px solid var(--gold)" : "2px solid transparent",
                  color: activeTab === tab.id ? "var(--gold)" : "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "0.75rem 1.5rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  marginBottom: "-1px"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "regime" && <RegimeComparison data={results.regime} income={profile?.income} />}
          {activeTab === "deductions" && <DeductionMapper data={results.deductions} />}
          {activeTab === "investments" && <InvestmentArchitecture data={results.investment} />}

          {/* Lifecycle CTA */}
          <div className="card-gold" style={{ marginTop: "2.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <p className="label" style={{ marginBottom: "0.5rem" }}>Ready for the lifetime view?</p>
              <p style={{ fontSize: "1.1rem", fontFamily: "var(--font-display)", fontWeight: 700 }}>
                Run the 25-year lifecycle projection
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                See exactly when regimes switch and how much wealth each builds by retirement.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate("/lifecycle")}>
              View Lifecycle <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
