import React, { useState } from "react";
import axios from "axios";

const API = "http://localhost:5000";

const TRIGGER_DEFS = [
  {
    type: "RAIN",
    icon: "🌧",
    name: "Heavy Rain",
    desc: "Rainfall >20mm/hr",
    auto: true,
  },
  {
    type: "AQI",
    icon: "🌫",
    name: "High AQI (CPCB)",
    desc: "AQI >300 detected",
    auto: true,
  },
  {
    type: "HEAT",
    icon: "🌡",
    name: "Extreme Heat",
    desc: "Temperature >42°C",
    auto: true,
  },
  {
    type: "OUTAGE",
    icon: "📵",
    name: "Platform Outage",
    desc: "App crash / no assignments",
    auto: true,
  },
  {
    type: "CURFEW",
    icon: "🚧",
    name: "Zone Curfew",
    desc: "Strike or lockdown active",
    auto: true,
  },
  {
    type: "EMERGENCY",
    icon: "🚨",
    name: "Emergency Report",
    desc: "Worker-reported disruption",
    auto: false,
  },
];

const STEPS = [
  "Event detected",
  "Fraud check",
  "ClaimCenter logs",
  "Auto-approved",
  "UPI payout",
];

export default function Triggers({ workerId, onDone }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const fire = async () => {
    if (!selected || !workerId) return;
    setLoading(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const res = await axios.post(`${API}/api/claims/trigger`, {
        workerId,
        trigger: selected,
      });
      setResult(res.data);
    } catch (e) {
      setResult({ status: "ERROR", trigger: selected, payout: 0 });
    }
    setLoading(false);
  };

  const def = TRIGGER_DEFS.find((t) => t.type === selected);

  return (
    <div className="fade-in">
      <div className="page-title">Trigger Events</div>
      <div className="page-sub">
        Simulate a parametric income-loss event to test zero-touch claims
        processing.
      </div>

      <div className="triggers-page-grid">
        {/* Left */}
        <div>
          {result ? (
            <div>
              <div
                className={`result-notification ${result.status === "PAID" ? "success" : "warning"} fade-in`}
              >
                <div className="notif-title">
                  {result.status === "PAID"
                    ? `✅ ${result.trigger} — Claim Auto-Approved!`
                    : `⏳ ${result.trigger} — Under Review`}
                </div>
                <div className="notif-body">
                  {result.status === "PAID"
                    ? `₹${result.payout?.toFixed(0)} income protection has been transferred to your UPI account.`
                    : "Your claim has been flagged for review. Our team will contact you within 2 hours."}
                </div>
                {result.txnId && (
                  <div className="notif-txn">
                    Transaction ID: {result.txnId}
                  </div>
                )}
                {result.status !== "PAID" && result.status !== "ERROR" && (
                  <div className="fraud-detail">
                    🔍 Fraud flag: {result.status}
                  </div>
                )}
                <div className="notif-actions">
                  <button className="btn-ghost-sm" onClick={onDone}>
                    View Dashboard
                  </button>
                  <button
                    className="btn-ghost-sm"
                    onClick={() => {
                      setResult(null);
                      setSelected(null);
                    }}
                  >
                    Trigger Another
                  </button>
                </div>
              </div>

              <div className="zero-touch-steps">
                <h4>Zero-Touch Claims Flow</h4>
                <div className="steps-row">
                  {STEPS.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className="step-item">
                        <div className="step-num">{i + 1}</div>
                        <span>{s}</span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className="step-arrow">→</div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="trigger-cards-grid">
                {TRIGGER_DEFS.map((t) => (
                  <div
                    key={t.type}
                    className={`trigger-card-big${selected === t.type ? " selected" : ""}`}
                    onClick={() => setSelected(t.type)}
                  >
                    <div className="tce">{t.icon}</div>
                    <div className="tcn">{t.name}</div>
                    <div className="tcd">{t.desc}</div>
                    <div className={`tct ${t.auto ? "auto" : "review"}`}>
                      {t.auto ? "Auto-approved" : "Goes to review"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="fire-btn-wrap">
                {loading ? (
                  <div className="detecting-wrap">
                    <div className="pulse-ring" />
                    <span>Detecting disruption conditions...</span>
                  </div>
                ) : (
                  <button
                    className="btn-fire-big"
                    onClick={fire}
                    disabled={!selected || !workerId}
                  >
                    {!workerId
                      ? "Register a worker first"
                      : !selected
                        ? "Select a trigger above"
                        : `Fire: ${def?.name} →`}
                  </button>
                )}
              </div>

              <div className="zero-touch-steps">
                <h4>Zero-Touch Claims Flow</h4>
                <div className="steps-row">
                  {STEPS.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className="step-item">
                        <div className="step-num">{i + 1}</div>
                        <span>{s}</span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className="step-arrow">→</div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: selected trigger detail */}
        <div>
          <div className="chart-card">
            <div className="card-header">
              <div className="card-title">Selected Trigger</div>
            </div>
            {selected && def ? (
              <div className="fade-in">
                <div style={{ textAlign: "center", padding: "1rem 0" }}>
                  <div style={{ fontSize: "40px", marginBottom: "0.5rem" }}>
                    {def.icon}
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      marginBottom: "0.25rem",
                    }}
                  >
                    {def.name}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--muted)",
                      marginBottom: "1rem",
                    }}
                  >
                    {def.desc}
                  </div>
                  <div
                    className={`tct ${def.auto ? "auto" : "review"}`}
                    style={{ display: "inline-block" }}
                  >
                    {def.auto
                      ? "Zero-touch auto-approved"
                      : "Manual review required"}
                  </div>
                </div>
                <div style={{ marginTop: "1rem" }}>
                  <div
                    className="actuarial-row"
                    style={{
                      fontSize: "12px",
                      padding: "0.35rem 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ color: "var(--muted)" }}>
                      Payout trigger
                    </span>
                    <span
                      style={{ fontFamily: "var(--mono)", fontSize: "11px" }}
                    >
                      Income protection × days
                    </span>
                  </div>
                  <div
                    className="actuarial-row"
                    style={{
                      fontSize: "12px",
                      padding: "0.35rem 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ color: "var(--muted)" }}>Fraud check</span>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "11px",
                        color: "var(--green)",
                      }}
                    >
                      Before payment
                    </span>
                  </div>
                  <div
                    className="actuarial-row"
                    style={{ fontSize: "12px", padding: "0.35rem 0" }}
                  >
                    <span style={{ color: "var(--muted)" }}>Settlement</span>
                    <span
                      style={{ fontFamily: "var(--mono)", fontSize: "11px" }}
                    >
                      UPI / IMPS instant
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "2rem 0",
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: "13px",
                }}
              >
                Select a trigger card to preview details
              </div>
            )}
          </div>

          <div className="chart-card">
            <div className="card-header">
              <div className="card-title">Fraud Detection Rules</div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              {[
                "No duplicate claim in 24h window",
                "Location matches registered zone",
                "≤3 claims per week maximum",
                "Platform match validation",
                "Manual triggers → review queue",
              ].map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "12px",
                    color: "var(--muted2)",
                    padding: "0.3rem 0",
                    borderBottom: i < 4 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span style={{ color: "var(--green)", fontSize: "10px" }}>
                    ✓
                  </span>
                  {r}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
