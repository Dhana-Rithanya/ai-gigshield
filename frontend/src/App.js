import React, { useState } from "react";
import Dashboard from "./Dashboard";
import Register from "./Register";
import Triggers from "./Triggers";
import Logs from "./Logs";
import "./App.css";

const ZONES_META = {
  "Chennai - Velachery": { dai: 0.44, level: "moderate" },
  "Chennai - Adyar":     { dai: 0.51, level: "moderate" },
  "Mumbai - Dharavi":    { dai: 0.83, level: "normal" },
  "Delhi - Noida":       { dai: 0.28, level: "disrupted" },
  "Bangalore - Koramangala": { dai: 0.79, level: "normal" },
};

export default function App() {
  const [page, setPage]     = useState("dashboard");
  const [workerId, setWorkerId] = useState(null);
  const [workerName, setWorkerName] = useState("Guest");
  const [selectedZone, setSelectedZone] = useState("Bangalore - Koramangala");

  const navItems = [
    { id: "dashboard",  icon: "⬛", label: "Dashboard" },
    // { id: "logs",       icon: "🔔", label: "Live Alerts", badge: 1 },
    // { id: "dashboard",  icon: "📋", label: "Claims" },
    // { id: "triggers",   icon: "💸", label: "Payouts" },
  ];

  const handleNav = (id) => setPage(id);

  return (
    <div className="shell">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="brand">Incurix <span>AI</span></div>
          <div className="sub">Smart Income Protection for Delivery Riders</div>
        </div>

        <div className="nav-section">
          <div className="nav-label">Platform</div>
          {navItems.map(n => (
            <button key={n.id}
              className={"nav-btn" + (page === n.id ? " active" : "")}
              onClick={() => handleNav(n.id)}>
              <span className="icon">{n.icon}</span>
              {n.label}
              {n.badge ? <span style={{marginLeft:"auto",background:"var(--red)",color:"#fff",borderRadius:"10px",padding:"0 5px",fontSize:"10px",fontWeight:700}}>{n.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* <div className="nav-section">
          <div className="nav-label">Analytics</div>
          {analyticsItems.map(n => (
            <button key={n.id} className="nav-btn" onClick={() => {}}>
              <span className="icon">{n.icon}</span>{n.label}
            </button>
          ))}
        </div> */}

        <div className="nav-section" style={{marginTop:"auto"}}>
          <div className="nav-label">Actions</div>
          <button className={"nav-btn" + (page==="register"?" active":"")} onClick={() => setPage("register")}>
            <span className="icon">📝</span>Register Worker
          </button>
          <button className={"nav-btn" + (page==="triggers"?" active":"")} onClick={() => setPage("triggers")}>
            <span className="icon">⚡</span>Triggers
          </button>
          <button className={"nav-btn" + (page==="logs"?" active":"")} onClick={() => setPage("logs")}>
            <span className="icon">🗂</span>GW Logs
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="avatar">{workerName[0]}</div>
          <div className="sidebar-user">
            <div className="name">{workerName}</div>
            <div className="role">Active Worker</div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main">
      {/* Content */}
        <div className="content">
          {page === "dashboard" && (
            <Dashboard
              workerId={workerId}
              zones={ZONES_META}
              selectedZone={selectedZone}
              setSelectedZone={setSelectedZone}
              onRegister={() => setPage("register")}
              onTrigger={() => setPage("triggers")}
            />
          )}
          {page === "register" && (
            <Register
              setWorkerId={(id) => setWorkerId(id)}
              setWorkerName={(n) => setWorkerName(n)}
              onDone={() => setPage("dashboard")}
            />
          )}
          {page === "triggers" && <Triggers workerId={workerId} onDone={() => setPage("dashboard")} />}
          {page === "logs" && <Logs />}
        </div>
      </div>
    </div>
  );
}