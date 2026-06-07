import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

const LIFE_EVENT_TYPES = [
  { value: "home_purchase", label: "Home Purchase" },
  { value: "marriage", label: "Marriage" },
  { value: "child", label: "Child" },
  { value: "education_loan", label: "Education Loan" },
  { value: "parent_health", label: "Parent Health Insurance" },
  { value: "retirement", label: "Retirement" },
];

const defaultProfile = {
  age: 28,
  income: 1200000,
  income_growth_rate: 0.08,
  employment_type: "salaried",
  family_status: "single",
  has_home_loan: false,
  home_loan_principal: 0,
  home_loan_interest: 0,
  has_hra: false,
  hra_received: 0,
  basic_salary: 0,
  city_type: "non_metro",
  rent_paid: 0,
  has_education_loan: false,
  education_loan_interest: 0,
  nps_employer_contribution: 0,
  projection_years: 25,
  preferred_risk: "medium",
  life_events: [],
  declared_deductions: []
};

export default function ProfileBuilder({ onSubmit, loading, existingProfile }) {
  const [form, setForm] = useState(existingProfile || defaultProfile);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDeductions, setShowDeductions] = useState(false);

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function addLifeEvent() {
    setForm(f => ({
      ...f,
      life_events: [...f.life_events, { event: "home_purchase", year_offset: 3, amount: null }]
    }));
  }

  function removeLifeEvent(i) {
    setForm(f => ({ ...f, life_events: f.life_events.filter((_, idx) => idx !== i) }));
  }

  function updateLifeEvent(i, key, value) {
    setForm(f => {
      const events = [...f.life_events];
      events[i] = { ...events[i], [key]: value };
      return { ...f, life_events: events };
    });
  }

  function addDeduction(section, amount) {
    setForm(f => {
      const existing = f.declared_deductions.filter(d => d.section !== section);
      return { ...f, declared_deductions: [...existing, { section, claimed_amount: parseInt(amount) || 0 }] };
    });
  }

  function getDeduction(section) {
    return form.declared_deductions.find(d => d.section === section)?.claimed_amount || "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ ...form, id: crypto.randomUUID() });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <div style={{ marginBottom: "2rem" }}>
          <p className="label" style={{ marginBottom: "0.25rem" }}>Step 1</p>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.25rem" }}>
            Your Financial Profile
          </h3>
        </div>

        {/* Core fields */}
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Age</label>
            <input className="form-input" type="number" min={18} max={75}
              value={form.age} onChange={e => set("age", parseInt(e.target.value))} required />
          </div>
          <div className="form-group" style={{ gridColumn: "span 2" }}>
            <label className="form-label">Annual Gross Income (INR)</label>
            <input className="form-input" type="number" min={100000} step={50000}
              value={form.income} onChange={e => set("income", parseInt(e.target.value))} required />
          </div>
        </div>

        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Annual Income Growth Rate</label>
            <div className="toggle-group">
              {[0.06, 0.08, 0.10, 0.12, 0.15].map(r => (
                <button type="button" key={r}
                  className={`toggle-btn ${form.income_growth_rate === r ? "active" : ""}`}
                  onClick={() => set("income_growth_rate", r)}>
                  {(r * 100).toFixed(0)}%
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Employment Type</label>
            <select className="form-select" value={form.employment_type}
              onChange={e => set("employment_type", e.target.value)}>
              <option value="salaried">Salaried</option>
              <option value="self_employed">Self-Employed</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Family Status</label>
            <select className="form-select" value={form.family_status}
              onChange={e => set("family_status", e.target.value)}>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="married_with_children">Married with Children</option>
            </select>
          </div>
        </div>

        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Projection Horizon</label>
            <div className="toggle-group">
              {[15, 20, 25, 30].map(y => (
                <button type="button" key={y}
                  className={`toggle-btn ${form.projection_years === y ? "active" : ""}`}
                  onClick={() => set("projection_years", y)}>
                  {y}yr
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Risk Preference (80C allocation)</label>
            <div className="toggle-group">
              {["low", "medium", "high"].map(r => (
                <button type="button" key={r}
                  className={`toggle-btn ${form.preferred_risk === r ? "active" : ""}`}
                  onClick={() => set("preferred_risk", r)}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Home loan */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <input type="checkbox" checked={form.has_home_loan}
              onChange={e => set("has_home_loan", e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--gold)" }} />
            <span className="form-label" style={{ margin: 0 }}>I have a home loan</span>
          </label>
          {form.has_home_loan && (
            <div className="grid-2" style={{ marginTop: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Annual Principal Repayment (INR)</label>
                <input className="form-input" type="number" min={0}
                  value={form.home_loan_principal}
                  onChange={e => set("home_loan_principal", parseInt(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label">Annual Interest Paid (INR)</label>
                <input className="form-input" type="number" min={0}
                  value={form.home_loan_interest}
                  onChange={e => set("home_loan_interest", parseInt(e.target.value) || 0)} />
              </div>
            </div>
          )}
        </div>

        {/* Advanced fields toggle */}
        <button type="button" className="btn btn-secondary"
          style={{ marginBottom: "1.5rem", fontSize: "12px" }}
          onClick={() => setShowAdvanced(v => !v)}>
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showAdvanced ? "Hide" : "Show"} HRA, NPS, and Education Loan
        </button>

        {showAdvanced && (
          <div className="card-inset" style={{ marginBottom: "1.5rem" }}>
            <div className="grid-3">
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.has_hra}
                    onChange={e => set("has_hra", e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "var(--gold)" }} />
                  <span className="form-label" style={{ margin: 0 }}>I receive HRA</span>
                </label>
              </div>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.has_education_loan}
                    onChange={e => set("has_education_loan", e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "var(--gold)" }} />
                  <span className="form-label" style={{ margin: 0 }}>Education Loan (80E)</span>
                </label>
              </div>
            </div>

            {form.has_hra && (
              <div className="grid-4">
                <div className="form-group">
                  <label className="form-label">HRA Received</label>
                  <input className="form-input" type="number" value={form.hra_received}
                    onChange={e => set("hra_received", parseInt(e.target.value) || 0)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Basic Salary</label>
                  <input className="form-input" type="number" value={form.basic_salary}
                    onChange={e => set("basic_salary", parseInt(e.target.value) || 0)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rent Paid</label>
                  <input className="form-input" type="number" value={form.rent_paid}
                    onChange={e => set("rent_paid", parseInt(e.target.value) || 0)} />
                </div>
                <div className="form-group">
                  <label className="form-label">City Type</label>
                  <select className="form-select" value={form.city_type}
                    onChange={e => set("city_type", e.target.value)}>
                    <option value="metro">Metro (50%)</option>
                    <option value="non_metro">Non-Metro (40%)</option>
                  </select>
                </div>
              </div>
            )}

            {form.has_education_loan && (
              <div className="form-group" style={{ maxWidth: 300 }}>
                <label className="form-label">Annual Education Loan Interest</label>
                <input className="form-input" type="number" value={form.education_loan_interest}
                  onChange={e => set("education_loan_interest", parseInt(e.target.value) || 0)} />
              </div>
            )}

            <div className="form-group" style={{ maxWidth: 300 }}>
              <label className="form-label">Employer NPS Contribution 80CCD(2) (INR/year)</label>
              <input className="form-input" type="number" value={form.nps_employer_contribution}
                onChange={e => set("nps_employer_contribution", parseInt(e.target.value) || 0)} />
            </div>
          </div>
        )}

        {/* Deductions declared */}
        <button type="button" className="btn btn-secondary"
          style={{ marginBottom: "1.5rem", fontSize: "12px" }}
          onClick={() => setShowDeductions(v => !v)}>
          {showDeductions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showDeductions ? "Hide" : "Declare"} Current Investments and Deductions
        </button>

        {showDeductions && (
          <div className="card-inset" style={{ marginBottom: "1.5rem" }}>
            <p className="label" style={{ marginBottom: "1rem" }}>Leave blank if not invested. Enter 0 to declare nil.</p>
            <div className="grid-3">
              {[
                { section: "80C", label: "80C (PPF/ELSS/LIC etc.)", max: 150000 },
                { section: "80CCD(1B)", label: "80CCD(1B) Additional NPS", max: 50000 },
                { section: "80D", label: "80D Health Insurance", max: 100000 },
              ].map(({ section, label, max }) => (
                <div className="form-group" key={section}>
                  <label className="form-label">{label} (max {(max/100000).toFixed(1)}L)</label>
                  <input className="form-input" type="number" min={0} max={max}
                    placeholder="0"
                    value={getDeduction(section)}
                    onChange={e => addDeduction(section, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Life Events */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <p className="label">Planned Life Events (optional)</p>
            <button type="button" className="btn btn-ghost" style={{ padding: "0.35rem 0.875rem", fontSize: "11px" }}
              onClick={addLifeEvent}>
              <Plus size={13} /> Add Event
            </button>
          </div>
          {form.life_events.length === 0 && (
            <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", fontFamily: "var(--font-mono)" }}>
              No life events added. Adding events unlocks tax impact modelling for home purchase, marriage, children, and retirement.
            </p>
          )}
          {form.life_events.map((ev, i) => (
            <div key={i} className="card-inset" style={{ marginBottom: "0.75rem", display: "flex", gap: "1rem", alignItems: "flex-end" }}>
              <div className="form-group" style={{ flex: 2, margin: 0 }}>
                <label className="form-label">Event</label>
                <select className="form-select" value={ev.event}
                  onChange={e => updateLifeEvent(i, "event", e.target.value)}>
                  {LIFE_EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">In year</label>
                <input className="form-input" type="number" min={1} max={40}
                  value={ev.year_offset}
                  onChange={e => updateLifeEvent(i, "year_offset", parseInt(e.target.value))} />
              </div>
              {(ev.event === "home_purchase" || ev.event === "education_loan") && (
                <div className="form-group" style={{ flex: 2, margin: 0 }}>
                  <label className="form-label">
                    {ev.event === "home_purchase" ? "Property Value (INR)" : "Loan Amount (INR)"}
                  </label>
                  <input className="form-input" type="number" min={0}
                    value={ev.amount || ""}
                    onChange={e => updateLifeEvent(i, "amount", parseInt(e.target.value) || null)} />
                </div>
              )}
              <button type="button" onClick={() => removeLifeEvent(i)}
                style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: "0.65rem", marginBottom: "1.5rem" }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}
          style={{ fontSize: "14px", padding: "0.875rem 2.5rem" }}>
          {loading ? (
            <><div className="loading-spinner" style={{ width: 18, height: 18 }} /> Analysing...</>
          ) : (
            "Run Analysis"
          )}
        </button>
      </div>
    </form>
  );
}
