import React, { useState } from "react";
import axios from "axios";

const API = "http://localhost:5000";

const ZONES = [
  "Chennai - Velachery","Chennai - Adyar","Chennai - Tambaram",
  "Mumbai - Dharavi","Delhi - Noida","Delhi - Saket",
  "Bangalore - Koramangala","Hyderabad - Hitech City"
];

function getWorkerTier(activeDays) {
  const d = Number(activeDays);
  if (d >= 25) return { tier: "Tier 1", label: "Diamond", color: "#38bdf8" };
  if (d >= 18) return { tier: "Tier 2", label: "Gold",    color: "#f59e0b" };
  if (d >= 10) return { tier: "Tier 3", label: "Silver",  color: "#94a3b8" };
  return              { tier: "Tier 4", label: "Bronze",  color: "#b45309" };
}

export default function Register({ setWorkerId, setWorkerName, onDone }) {
  const [form, setForm] = useState({
    name:"", zone:"", platform:"Zomato", weeklyIncome:"", activeDays:"22"
  });
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const zoneTier = getWorkerTier(form.activeDays);

  const handleChange = e => setForm({...form, [e.target.name]: e.target.value});

  const submit = async () => {
    if (!form.name || !form.zone || !form.weeklyIncome) {
      setError("Please fill in all required fields."); return;
    }
    setLoading(true); setError("");
    try {
      const res = await axios.post(`${API}/api/workers/register`, {
        ...form,
        weeklyIncome: Number(form.weeklyIncome),
        activeDays:   Number(form.activeDays),
      });
      setData(res.data);
      setWorkerId(res.data.worker.id);
      setWorkerName(res.data.worker.name);
    } catch (e) {
      setError("Server not reachable. Make sure backend is running on port 5000.");
    }
    setLoading(false);
  };

  if (data) {
    const p = data.premium;
    const isStress = p.stressFlag === "SUSPEND_ENROLMENTS" || p.stressBCR > 1.5;
    return (
      <div className="register-wrap fade-in">
        <div className="page-title">Registration Complete</div>
        <div className="page-sub">Your GigShield policy is now active.</div>

        <div className="success-panel">
          <h3>✅ Policy Created — Guidewire PolicyCenter</h3>
          <div className="result-grid">
            <div className="result-item">
              <div className="rk">Policy Number</div>
              <div className="rv mono">{data.policy.policyNumber}</div>
            </div>
            <div className="result-item">
              <div className="rk">Weekly Premium</div>
              <div className="rv">₹{Math.round(data.policy.premium)}</div>
            </div>
            <div className="result-item">
              <div className="rk">Daily Payout</div>
              <div className="rv green">₹{Math.round(data.policy.dailyPayout)}</div>
            </div>
          </div>

          <div className="actuarial-detail">
            <h4>Actuarial Breakdown</h4>
            <div className="actuarial-row">
              <span>Trigger Probability</span>
              <span className="ar-val">{(p.triggerProbability*100).toFixed(1)}%</span>
            </div>
            <div className="actuarial-row">
              <span>Avg Daily Income Loss (80%)</span>
              <span className="ar-val">₹{p.dailyPayout?.toFixed(0)}</span>
            </div>
            <div className="actuarial-row">
              <span>Actuarial Base (prob × loss × 6d)</span>
              <span className="ar-val">₹{p.actuarialBase?.toFixed(1)}</span>
            </div>
            <div className="actuarial-row">
              <span>BCR-Loaded (÷ 0.65)</span>
              <span className="ar-val">₹{p.bcrLoaded?.toFixed(1)}</span>
            </div>
            <div className="actuarial-row">
              <span>Activity Discount ({getWorkerTier(data.worker.activeDays).tier} — {getWorkerTier(data.worker.activeDays).label})</span>
              <span className="ar-val" style={{color:"var(--green)"}}>−₹{p.discount}</span>
            </div>
            <div className="actuarial-row total">
              <span>Final Weekly Premium</span>
              <span className="ar-val">₹{Math.round(data.policy.premium)}</span>
            </div>
          </div>

          <div className={`stress-banner ${isStress?"danger":"ok"}`}>
            <span>{isStress?"⚠️":"✅"}</span>
            <span>
              Stress scenario (14-day monsoon): BCR = {p.stressBCR?.toFixed(2)}
              {isStress ? " — Suspend new enrolments flag raised" : " — Model stable"}
            </span>
          </div>

          <div style={{display:"flex",gap:"0.75rem",marginTop:"1rem"}}>
            <button className="btn-register" onClick={onDone} style={{flex:1}}>
              Go to Dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-wrap fade-in">
      <div className="page-title">Register Delivery Partner</div>
      <div className="page-sub">Onboard a new Zomato/Swiggy rider for GigShield income protection.</div>

      <div className="form-section">
        <div className="form-section-title">Worker Details</div>
        <div className="form-grid2">
          <div className="form-group">
            <label>Full Name *</label>
            <input name="name" placeholder="e.g. Ravi Kumar" onChange={handleChange} value={form.name} />
          </div>
          <div className="form-group">
            <label>Platform *</label>
            <select name="platform" onChange={handleChange} value={form.platform}>
              <option>Zomato</option>
              <option>Swiggy</option>
              <option>Both</option>
            </select>
          </div>
          <div className="form-group">
            <label>Delivery Zone *</label>
            <select name="zone" onChange={handleChange} value={form.zone}>
              <option value="">Select zone</option>
              {ZONES.map(z => <option key={z}>{z}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Weekly Income (₹) *</label>
            <input name="weeklyIncome" placeholder="e.g. 4200" onChange={handleChange} value={form.weeklyIncome} type="number" />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Underwriting Criteria</div>
        <div className="form-grid2">
          <div className="form-group">
            <label>Active Days (Last 30)</label>
            <input name="activeDays" placeholder="e.g. 22" onChange={handleChange} value={form.activeDays} type="number" min="0" max="30" />
            <div className="tier-display">
              <span style={{ color: zoneTier.color }}>●</span>
              <span style={{ fontSize: "12px" }}>{zoneTier.tier} — {zoneTier.label}</span>
            </div>
          </div>
          <div className="form-group">
            <label>Phone / UPI ID</label>
            <input name="phone" placeholder="9876543210 or name@upi" onChange={handleChange} />
          </div>
        </div>
      </div>

      {error && <div className="stress-banner danger" style={{marginBottom:"0.75rem"}}><span>⚠</span><span>{error}</span></div>}

      <button className="btn-register" onClick={submit} disabled={loading}>
        {loading ? "Creating Policy..." : "Activate GigShield Policy →"}
      </button>
    </div>
  );
}