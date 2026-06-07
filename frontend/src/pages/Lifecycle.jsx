import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LifecycleChart from "../components/LifecycleChart/LifecycleChart";
import LifeEventCalculator from "../components/LifeEventCalculator/LifeEventCalculator";
import { ArrowLeft } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Lifecycle({ profile, results }) {
  const navigate = useNavigate();
  const [lifecycleData, setLifecycleData] = useState(null);
  const [lifeEventData, setLifeEventData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!profile) return;
    runLifecycle();
  }, [profile]);

  async function runLifecycle() {
    if (!profile) return;
    setLoading(true);
    setError(null);

    try {
      const [lcRes, evRes] = await Promise.all([
        fetch(`${API}/api/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile)
        }),
        profile.life_events?.length > 0
          ? fetch(`${API}/api/life-events`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(profile)
            })
          : Promise.resolve(null)
      ]);

      if (!lcRes.ok) throw new Error("Lifecycle projection failed.");
      const lc = await lcRes.json();
      setLifecycleData(lc);

      if (evRes) {
        const ev = await evRes.json();
        setLifeEventData(ev);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!profile) {
    return (
      <div className="page" style={{ paddingTop: "5rem", textAlign: "center" }}>
        <p className="label" style={{ marginBottom: "1.5rem" }}>No profile loaded</p>
        <h2 className="section-heading" style={{ marginBottom: "1rem" }}>Build your profile first</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
          The lifecycle projection requires your income, age, and growth assumptions.
        </p>
        <button className="btn btn-primary" onClick={() => navigate("/analyzer")}>
          <ArrowLeft size={16} /> Go to Analyser
        </button>
      </div>
    );
  }

  return (
    <div className="page-wide">
      <div style={{ marginBottom: "2.5rem" }} className="animate-in">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
          <button className="btn btn-secondary" style={{ padding: "0.4rem 0.875rem" }} onClick={() => navigate("/analyzer")}>
            <ArrowLeft size={14} />
          </button>
          <p className="label">Lifecycle Projection Engine</p>
        </div>
        <h1 className="section-heading" style={{ fontSize: "2rem" }}>
          {profile.projection_years || 25}-Year Wealth Trajectory
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Old regime vs New regime — cumulative tax paid, corpus built, and wealth gap at retirement.
        </p>
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "3rem" }}>
          <div className="loading-spinner" />
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
            Running {profile.projection_years || 25}-year projection...
          </p>
        </div>
      )}

      {error && (
        <div className="card animate-in" style={{ borderColor: "var(--crimson)" }}>
          <p style={{ color: "var(--crimson)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>{error}</p>
        </div>
      )}

      {lifecycleData && !loading && (
        <>
          <LifecycleChart data={lifecycleData} profile={profile} />

          {lifeEventData && lifeEventData.length > 0 && (
            <div style={{ marginTop: "3rem" }}>
              <div className="divider" />
              <LifeEventCalculator data={lifeEventData} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
