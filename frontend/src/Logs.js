import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000";

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const fetch = () =>
      axios
        .get(`${API}/api/guidewire/logs`)
        .then((r) => setLogs(r.data || []))
        .catch(() => {});
    fetch();
    const iv = setInterval(fetch, 3000);
    return () => clearInterval(iv);
  }, []);

  const filtered =
    filter === "All" ? logs : logs.filter((l) => l.system === filter);

  return (
    <div className="fade-in">
      <div className="page-title">Guidewire Integration Logs</div>
      <div className="page-sub">
        Real-time mock API activity from PolicyCenter and ClaimCenter.
        Auto-refreshes every 3s.
      </div>

      <div className="logs-filters">
        {["All", "PolicyCenter", "ClaimCenter"].map((f) => (
          <button
            key={f}
            className={`filter-btn${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
        <span className="log-count-badge">{filtered.length} events</span>
      </div>

      {filtered.length === 0 ? (
        <div
          className="chart-card"
          style={{ textAlign: "center", padding: "2rem" }}
        >
          <p style={{ color: "var(--muted)", fontSize: "13px" }}>
            No Guidewire events yet. Register a worker to begin.
          </p>
        </div>
      ) : (
        <div className="log-list">
          {filtered.map((log, i) => {
            const isPolicy = log.system === "PolicyCenter";
            return (
              <div
                key={i}
                className={`log-entry ${isPolicy ? "policy" : "claim"} fade-in`}
              >
                <div className="log-meta">
                  <span
                    className={`log-sys-badge ${isPolicy ? "policy" : "claim"}`}
                  >
                    {log.system}
                  </span>
                  <span className="log-action">{log.action}</span>
                  <span className="log-time">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="log-data">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
