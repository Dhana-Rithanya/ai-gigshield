import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

const API = "http://localhost:5000";

const ZONE_CONDITIONS = {
  "Chennai - Velachery": {
    workability: 62,
    rainfall: 78,
    aqi: 42,
    traffic: 55,
  },
  "Chennai - Adyar": { workability: 70, rainfall: 65, aqi: 38, traffic: 60 },
  "Mumbai - Dharavi": { workability: 18, rainfall: 95, aqi: 75, traffic: 88 },
  "Delhi - Noida": { workability: 25, rainfall: 20, aqi: 92, traffic: 70 },
  "Bangalore - Koramangala": {
    workability: 85,
    rainfall: 12,
    aqi: 18,
    traffic: 35,
  },
};

function getWorkerTier(activeDays) {
  if (activeDays >= 25) return { tier: "Tier 1", label: "Diamond", color: "#38bdf8" };
  if (activeDays >= 18) return { tier: "Tier 2", label: "Gold",    color: "#f59e0b" };
  if (activeDays >= 10) return { tier: "Tier 3", label: "Silver",  color: "#94a3b8" };
  return                       { tier: "Tier 4", label: "Bronze",  color: "#b45309" };
}

const PARAMETRIC_TRIGGERS = [
  {
    type: "RAIN",
    icon: "🌧",
    name: "Rainfall",
    detail: "82mm · Threshold >80mm",
    status: "active",
  },
  {
    type: "DAI",
    icon: "📊",
    name: "DAI Index",
    detail: "0.18 · Threshold <0.40",
    status: "active",
  },
  {
    type: "AQI",
    icon: "🌫",
    name: "AQI Level",
    detail: "163 · Threshold >300",
    status: "inactive",
  },
  {
    type: "TRAFFIC",
    icon: "🚗",
    name: "Traffic Index",
    detail: "38 · Threshold <25",
    status: "warning",
  },
];

function MiniChart({ zone }) {
  const canvasRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const data = {
    "Chennai - Velachery":     [0.55,0.52,0.48,0.50,0.44,0.42,0.38,0.40,0.44,0.48,0.44,0.40],
    "Mumbai - Dharavi":        [0.70,0.72,0.75,0.80,0.83,0.88,0.90,0.85,0.83,0.80,0.83,0.85],
    "Delhi - Noida":           [0.40,0.38,0.35,0.30,0.28,0.25,0.28,0.30,0.28,0.25,0.28,0.28],
    "Bangalore - Koramangala": [0.82,0.80,0.78,0.80,0.79,0.82,0.80,0.79,0.78,0.80,0.79,0.79],
    "Chennai - Adyar":         [0.55,0.53,0.52,0.50,0.51,0.53,0.50,0.52,0.51,0.50,0.51,0.51],
  };
  const hours = ["04:00","06:00","08:00","10:00","12:00","14:00","16:00","18:00","20:00","22:00","00:00","02:00"];
  const pts = data[zone] || data["Bangalore - Koramangala"];
  const currentVal = pts[pts.length - 1];
  const isHealthy = currentVal >= 0.65;
  const lineColor = isHealthy ? "#22c55e" : currentVal >= 0.40 ? "#f59e0b" : "#ef4444";
  const glowColor = isHealthy ? "rgba(34,197,94," : currentVal >= 0.40 ? "rgba(245,158,11," : "rgba(239,68,68,";

  const draw = (hovIdx) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const pad = { top: 18, right: 16, bottom: 28, left: 36 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    const px = (i) => pad.left + (cw / (pts.length - 1)) * i;
    const py = (v) => pad.top + ch - v * ch;

    // Threshold band (0.55–0.75 safe zone)
    const bandTop = py(0.75), bandBot = py(0.55);
    ctx.fillStyle = "rgba(34,197,94,0.04)";
    ctx.fillRect(pad.left, bandTop, cw, bandBot - bandTop);

    // Threshold line at 0.65
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(34,197,94,0.25)";
    ctx.lineWidth = 1;
    ctx.moveTo(pad.left, py(0.65));
    ctx.lineTo(pad.left + cw, py(0.65));
    ctx.stroke();
    ctx.setLineDash([]);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (ch / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    }

    // Y axis labels
    ctx.fillStyle = "#475569";
    ctx.font = "9px IBM Plex Mono";
    ctx.textAlign = "right";
    [1.0, 0.75, 0.5, 0.25, 0.0].forEach((v, i) => {
      ctx.fillText(v.toFixed(2), pad.left - 6, pad.top + (ch / 4) * i + 3);
    });

    // X axis labels
    ctx.textAlign = "center";
    ctx.fillStyle = "#475569";
    pts.forEach((_, i) => {
      if (i % 3 === 0) ctx.fillText(hours[i], px(i), H - 6);
    });

    // Gradient area fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    grad.addColorStop(0, glowColor + "0.18)");
    grad.addColorStop(1, glowColor + "0.0)");
    ctx.beginPath();
    pts.forEach((v, i) => { i === 0 ? ctx.moveTo(px(i), py(v)) : ctx.lineTo(px(i), py(v)); });
    ctx.lineTo(px(pts.length - 1), pad.top + ch);
    ctx.lineTo(px(0), pad.top + ch);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Glow shadow for line
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 8;

    // Main line
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    pts.forEach((v, i) => { i === 0 ? ctx.moveTo(px(i), py(v)) : ctx.lineTo(px(i), py(v)); });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dots on each point
    pts.forEach((v, i) => {
      const isLast = i === pts.length - 1;
      const isHov = i === hovIdx;
      if (isLast || isHov) {
        ctx.beginPath();
        ctx.arc(px(i), py(v), isLast ? 5 : 4, 0, Math.PI * 2);
        ctx.fillStyle = lineColor;
        ctx.shadowColor = lineColor;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        // White inner dot
        ctx.beginPath();
        ctx.arc(px(i), py(v), isLast ? 2.5 : 2, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
      }
    });

    // Hover tooltip
    if (hovIdx !== null && hovIdx >= 0) {
      const x = px(hovIdx), y = py(pts[hovIdx]);
      const label = `${hours[hovIdx]}  DAI: ${pts[hovIdx].toFixed(2)}`;
      ctx.font = "11px IBM Plex Mono";
      const tw = ctx.measureText(label).width;
      const tx = Math.min(x - tw / 2 - 8, W - tw - 20);
      const ty = y - 28;
      ctx.fillStyle = "rgba(15,23,42,0.92)";
      ctx.beginPath();
      ctx.roundRect(Math.max(tx, pad.left), ty, tw + 16, 20, 4);
      ctx.fill();
      ctx.fillStyle = "#e2e8f0";
      ctx.textAlign = "left";
      ctx.fillText(label, Math.max(tx, pad.left) + 8, ty + 14);
    }
  };

  useEffect(() => { draw(hoverIdx); }, [zone, hoverIdx]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    const pad = { left: 36, right: 16 };
    const cw = canvas.width - pad.left - pad.right;
    const idx = Math.round(((mx - pad.left) / cw) * (pts.length - 1));
    setHoverIdx(idx >= 0 && idx < pts.length ? idx : null);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "12px" }}>
          <span style={{ width: 24, height: 2.5, background: lineColor, display: "inline-block", borderRadius: 2, boxShadow: `0 0 6px ${lineColor}` }} />
          <span style={{ color: "#94a3b8" }}>DAI Actual</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "12px" }}>
          <span style={{ width: 24, height: 1.5, background: "rgba(34,197,94,0.4)", display: "inline-block", borderRadius: 2, borderTop: "1px dashed rgba(34,197,94,0.4)" }} />
          <span style={{ color: "#94a3b8" }}>Threshold 0.65</span>
        </div>
        <div style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: "13px", fontWeight: 600, color: lineColor }}>
          {currentVal.toFixed(2)}
          <span style={{ fontSize: "10px", color: "#64748b", marginLeft: 4 }}>current</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={580}
        height={160}
        style={{ width: "100%", height: "160px", display: "block", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      />
    </div>
  );
}

export default function Dashboard({
  workerId,
  zones,
  selectedZone,
  setSelectedZone,
  onRegister,
  onTrigger,
}) {
  const [claims, setClaims] = useState([]);
  const [bcrData, setBcrData] = useState(null);
  const [worker, setWorker] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);

  useEffect(() => {
    if (!workerId) return;
    axios
      .get(`${API}/api/workers/${workerId}`)
      .then((r) => setWorker(r.data))
      .catch(() => {});
    axios
      .get(`${API}/api/claims/${workerId}`)
      .then((r) => setClaims(r.data || []))
      .catch(() => {});
    axios
      .get(`${API}/api/bcr`)
      .then((r) => setBcrData(r.data))
      .catch(() => {});
  }, [workerId]);

  useEffect(() => {
    if (!workerId) return;
    const interval = setInterval(() => {
      axios.get(`${API}/api/claims/${workerId}`).then((r) => setClaims(r.data || [])).catch(() => {});
      axios.get(`${API}/api/bcr`).then((r) => setBcrData(r.data)).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [workerId]);

  const cond =
    ZONE_CONDITIONS[selectedZone] || ZONE_CONDITIONS["Bangalore - Koramangala"];
  const totalPayout = claims
    .filter((c) => c.status === "PAID")
    .reduce((s, c) => s + (c.payout || 0), 0);
  const claimsThisMonth = claims.length;

  const conditionBars = [
    {
      name: "Workability",
      val: cond.workability,
      color:
        cond.workability > 60
          ? "#22c55e"
          : cond.workability > 30
            ? "#f59e0b"
            : "#ef4444",
    },
    {
      name: "Rainfall mm",
      val: cond.rainfall,
      color:
        cond.rainfall > 70
          ? "#ef4444"
          : cond.rainfall > 40
            ? "#f59e0b"
            : "#22c55e",
    },
    {
      name: "AQI",
      val: cond.aqi,
      color: cond.aqi > 60 ? "#ef4444" : cond.aqi > 30 ? "#f59e0b" : "#22c55e",
    },
    {
      name: "Traffic Idx",
      val: cond.traffic,
      color: cond.traffic > 70 ? "#ef4444" : "#f59e0b",
    },
  ];

  const bcrPct = bcrData ? Math.min(bcrData.bcr * 100, 100) : 0;
  const bcrClass =
    bcrData?.status === "SUSPEND_ENROLMENTS"
      ? "bcr-danger"
      : bcrData?.status === "WATCH"
        ? "bcr-watch"
        : "bcr-healthy";

  return (
    <div className="fade-in">
      {/* Zone Cards */}
      <div className="zone-row">
        {Object.entries(zones).map(([name, meta]) => (
          <div
            key={name}
            className={`zone-card ${meta.level}${selectedZone === name ? " selected" : ""}`}
            onClick={() => setSelectedZone(name)}
          >
            <div className="zone-name">{name.split(" - ")[1] || name}</div>
            <div
              className="zone-dai"
              style={{
                color:
                  meta.level === "disrupted"
                    ? "#ef4444"
                    : meta.level === "moderate"
                      ? "#f59e0b"
                      : "#22c55e",
              }}
            >
              {meta.dai.toFixed(2)}
            </div>
            <div className={`zone-status ${meta.level}`}>
              DAI · {meta.level.charAt(0).toUpperCase() + meta.level.slice(1)}
            </div>
          </div>
        ))}
      </div>

      {/* Metrics Row */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-label">Weekly Premium</div>
          <div className="metric-value green">
            {worker ? `₹${Math.round(worker.weeklyIncome / 7 * 0.05)}` : "—"}
          </div>
          <div className="metric-sub">{worker ? "Active policy" : "No policy yet"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Protected Earnings</div>
          <div className="metric-value">
            {totalPayout > 0 ? `₹${totalPayout.toLocaleString()}` : "₹0"}
          </div>
          <div className="metric-sub">{claims.length > 0 ? `${claims.length} claim(s) paid` : "No claims yet"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Claims This Month</div>
          <div className="metric-value">{claimsThisMonth}</div>
          <div className="metric-sub">₹{totalPayout.toFixed(0)} paid out</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Fraud Trust Score</div>
          <div className="metric-value" style={{ color: claims.some(c => c.status === "UNDER_REVIEW") ? "#f59e0b" : "#22c55e" }}>
            {claims.some(c => c.status === "UNDER_REVIEW") ? "⚠ Review" : "✓ Clear"}
          </div>
          <div className="metric-sub">{claims.some(c => c.status === "UNDER_REVIEW") ? "Claim under review" : "Instant payout eligible"}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="main-grid">
        {/* Left */}
        <div>
          {/* Activity Chart */}
          <div className="chart-card">
            <div className="card-header">
              <div className="card-title">Delivery Activity Index — Today</div>
              <div className="card-badge">LIVE</div>
            </div>
            <MiniChart zone={selectedZone} />
          </div>

          {/* Recent Claims */}
          <div className="chart-card">
            <div className="card-header">
              <div className="card-title">Claims & Payouts</div>
              <button className="btn-ghost-sm" onClick={onTrigger}>+ New Trigger</button>
            </div>
            {claims.length === 0 ? (
              <div style={{ padding: "1rem 0", textAlign: "center" }}>
                <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "0.75rem" }}>No claims yet.</p>
                <button className="btn-ghost-sm" onClick={onTrigger}>Simulate a disruption →</button>
              </div>
            ) : (
              <div className="claims-list">
                <div className="claims-list-header">
                  <span>Date</span>
                  <span>Trigger</span>
                  <span>Amount</span>
                  <span>Status</span>
                  <span></span>
                </div>
                {claims.slice().reverse().map((c) => (
                  <div key={c.id}>
                    <div
                      className={`claims-list-row${selectedClaim?.id === c.id ? " active" : ""}`}
                      onClick={() => setSelectedClaim(selectedClaim?.id === c.id ? null : c)}
                    >
                      <span className="date">{new Date(c.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                      <span><span className="trigger-pill">{c.trigger}</span></span>
                      <span className="amount">₹{c.payout?.toFixed(0)}</span>
                      <span><span className={c.status === "PAID" ? "status-paid" : "status-review"}>{c.status}</span></span>
                      <span style={{ color: "var(--muted)", fontSize: "12px" }}>{selectedClaim?.id === c.id ? "▲" : "▼"}</span>
                    </div>
                    {selectedClaim?.id === c.id && (
                      <div className="claim-detail-panel fade-in">
                        <div className="claim-detail-grid">
                          <div><div className="cdl">Claim ID</div><div className="cdv mono">{c.id}</div></div>
                          <div><div className="cdl">Transaction ID</div><div className="cdv mono">{c.txnId || "—"}</div></div>
                          <div><div className="cdl">Trigger</div><div className="cdv">{c.trigger}</div></div>
                          <div><div className="cdl">Payout</div><div className="cdv" style={{color:"var(--green)"}}>₹{c.payout?.toFixed(2)}</div></div>
                          <div><div className="cdl">Status</div><div className={c.status === "PAID" ? "cdv status-paid" : "cdv status-review"}>{c.status}</div></div>
                          <div><div className="cdl">Date & Time</div><div className="cdv">{new Date(c.timestamp).toLocaleString("en-IN")}</div></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zone Conditions */}
          <div className="chart-card">
            <div className="card-header">
              <div className="card-title">Zone Conditions — {selectedZone.split(" - ")[1] || selectedZone}</div>
            </div>
            <div className="zone-conditions">
              {conditionBars.map((b) => (
                <div key={b.name} className="condition-row">
                  <div className="condition-name">{b.name}</div>
                  <div className="condition-bar-wrap">
                    <div className="condition-bar" style={{ width: b.val + "%", background: b.color }} />
                  </div>
                  <div className="condition-val">{b.val}</div>
                </div>
              ))}
            </div>
          </div>


        </div>

        {/* Right Panel */}
        <div className="right-panel">
          {/* Shield Card */}
          <div className="shield-card">
            <div className="shield-label">Weekly Shield Plan</div>
            <div className="shield-price">
              {worker ? `₹${Math.round(worker.weeklyIncome / 7 * 0.05)}` : "—"}
              <span>/week</span>
            </div>
            <div className="shield-coverage">
              Coverage:{" "}
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              })}{" "}
              –{" "}
              {new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
            <div className="shield-meta">
              <div className="shield-meta-item">
                <span className="smk">Max payout / event</span>
                <span className="smv green">
                  {worker ? `₹${Math.round(worker.weeklyIncome * 0.8 / 6)}` : "—"}
                </span>
              </div>
              <div className="shield-meta-item">
                <span className="smk">Risk zone</span>
                <span
                  className={
                    "smv " +
                    (zones[selectedZone]?.level === "disrupted"
                      ? "red"
                      : "green")
                  }
                >
                  {zones[selectedZone]?.level === "disrupted"
                    ? "High"
                    : "Normal"}
                </span>
              </div>
              <div className="shield-meta-item">
                <span className="smk">Paid claims</span>
                <span className="smv">{claims.filter(c => c.status === "PAID").length}</span>
              </div>
              <div className="shield-meta-item">
                <span className="smk">Activity tier</span>
                <span className="smv" style={{ color: worker ? getWorkerTier(worker.activeDays).color : undefined }}>
                  {worker ? `${getWorkerTier(worker.activeDays).tier} — ${getWorkerTier(worker.activeDays).label}` : "—"}
                </span>
              </div>
            </div>
            <button
              className="btn-claim-auto"
              onClick={onTrigger}
              disabled={!workerId}
            >
              {workerId
                ? "Claim triggered automatically"
                : "Register to activate"}
            </button>
          </div>

          {/* Parametric Triggers */}
          <div className="chart-card" style={{ marginBottom: 0 }}>
            <div className="card-header">
              <div className="card-title">Parametric Triggers</div>
            </div>
            <div className="triggers-list">
              {PARAMETRIC_TRIGGERS.map((t) => (
                <div key={t.type} className="trigger-row">
                  <div className="trigger-left">
                    <span className="trigger-icon">{t.icon}</span>
                    <div>
                      <div className="trigger-name">{t.name}</div>
                      <div className="trigger-detail">{t.detail}</div>
                    </div>
                  </div>
                  <span className={`trigger-badge ${t.status}`}>
                    {t.status === "active"
                      ? "Active"
                      : t.status === "warning"
                        ? "Warning"
                        : "Normal"}
                  </span>
                </div>
              ))}
            </div>
          </div>


          {bcrData && (
            <div className="bcr-card">
              <div className="card-header" style={{ marginBottom: 0 }}>
                <div className="card-title">BCR Monitor</div>
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--mono)",
                    color:
                      bcrData.status === "HEALTHY"
                        ? "var(--green)"
                        : bcrData.status === "WATCH"
                          ? "var(--amber)"
                          : "var(--red)",
                  }}
                >
                  {bcrData.status}
                </span>
              </div>
              <div className="bcr-bar-wrap">
                <div
                  className={`bcr-bar ${bcrClass}`}
                  style={{ width: bcrPct + "%" }}
                />
              </div>
              <div className="bcr-ticks">
                <span>0</span>
                <span>0.55</span>
                <span>0.70</span>
                <span>0.85</span>
                <span>1.0</span>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--muted)",
                  marginTop: "6px",
                }}
              >
                {bcrData.message || "BCR within target range"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
