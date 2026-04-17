import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "./admin.css";

const API = "http://localhost:5000";

export default function Dashboard({ workerId, zones, selectedZone, setSelectedZone, onTrigger }) {
  const [bcrData, setBcrData] = useState(null);
  const [adminDash, setAdminDash] = useState(null);
  const [adminZones, setAdminZones] = useState([]);
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [pendingClaims, setPendingClaims] = useState([]);
  
  const [worker, setWorker] = useState(null);
  const [workerClaims, setWorkerClaims] = useState([]);

  const fetchData = () => {
    // Admin calls
    axios.get(`${API}/api/admin/dashboard`).then(r => setAdminDash(r.data)).catch(()=>{});
    axios.get(`${API}/api/admin/zones`).then(r => setAdminZones(r.data)).catch(()=>{});
    axios.get(`${API}/api/admin/bcr`).then(r => setBcrData(r.data)).catch(()=>{});
    axios.get(`${API}/api/admin/claims/pending`).then(r => setPendingClaims(r.data)).catch(()=>{});
    axios.get(`${API}/api/admin/weather-alerts`).then(r => setWeatherAlerts(r.data)).catch(()=>{});

    // Worker specific calls
    if (workerId) {
      axios.get(`${API}/api/workers/${workerId}`).then(r => setWorker(r.data)).catch(()=>{});
      axios.get(`${API}/api/claims/${workerId}`).then(r => setWorkerClaims(r.data)).catch(()=>{});
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [workerId]);

  const bcrRotation = bcrData ? (bcrData.overall_bcr * 180) - 90 : -90; // -90 is empty (left), 90 is full (right)

  return (
    <div className="fade-in">
      <div className="page-title">Monitoring & Real-Time Alerts</div>

      {/* Admin Monitoring Top Level Stats */}
      <div className="metrics-row" style={{marginBottom: "1.5rem"}}>
         <div className="metric-card">
           <div className="metric-label">Active Policies</div>
           <div className="metric-value green">{adminDash?.totalPoliciesActive || 0}</div>
           <div className="metric-sub">Across all regions</div>
         </div>
         <div className="metric-card">
           <div className="metric-label">Payout Status (Today)</div>
           <div className="metric-value">₹{adminDash?.totalPayoutsToday?.toLocaleString() || 0}</div>
           <div className="metric-sub">{adminDash?.totalClaimsToday || 0} claims processed</div>
         </div>
         <div className="metric-card">
           <div className="metric-label">Fraud Escalations</div>
           <div className="metric-value" style={{color: pendingClaims.length > 0 ? "var(--amber)" : "var(--green)"}}>
             {pendingClaims.length}
           </div>
           <div className="metric-sub">Pending manual review</div>
         </div>
         <div className="metric-card">
           <div className="metric-label">Fraud Detect Rate</div>
           <div className="metric-value">{adminDash?.fraudDetectionRate || 0}%</div>
           <div className="metric-sub">Blocked via ML Anomalies</div>
         </div>
      </div>

      <div className="admin-dashboard">
        
        {/* Left Column */}
        <div>
          {/* Zone Status Table */}
          <div className="admin-panel">
            <h3 style={{marginTop: 0, marginBottom: "1rem"}}>Zone Status Table</h3>
            <table className="zone-table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Policies</th>
                  <th>Today's Claims</th>
                  <th>Claim Rate</th>
                  <th>Weather Context</th>
                </tr>
              </thead>
              <tbody>
                {adminZones.length === 0 && (
                  <tr><td colSpan="5" style={{textAlign:"center", color:"var(--muted)", padding:"2rem 0"}}>No zone data available</td></tr>
                )}
                {adminZones.map((z, i) => {
                  const isAlert = z.weather?.rainfall > 20 || z.weather?.aqi > 300;
                  return (
                    <tr key={i}>
                      <td>
                        <span className={`status-indicator ${isAlert ? "status-alert" : "status-safe"}`}></span>
                        {z.name.split(" - ")[1] || z.name}
                      </td>
                      <td>{z.totalPolicies}</td>
                      <td>{z.totalClaims}</td>
                      <td>{z.claimRate}% per 100</td>
                      <td>
                        <span style={{color: "var(--muted)", fontSize: 12}}>
                           Rain: {z.weather?.rainfall||0}mm | AQI: {z.weather?.aqi||50}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Claims Alert Feed */}
          <div className="admin-panel">
             <h3 style={{marginTop: 0, marginBottom: "1rem"}}>Auto-Trigger Alert Feed</h3>
             <div style={{maxHeight: "200px", overflowY: "auto"}}>
                {weatherAlerts.length === 0 ? (
                  <div style={{color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "1.5rem 0"}}>No weather alerts currently active</div>
                ) : (
                  weatherAlerts.map((wa, i) => (
                    <div key={i} className="alert-feed-item">
                      <strong style={{color: "var(--red)"}}>ALERT:</strong> {wa.activeTriggers.join(",")} detected in {wa.zone}.<br/>
                      <span style={{color: "var(--muted)"}}>{wa.affectedWorkers} claims automatically triggering. Rain: {wa.rainfall}mm/hr | AQI: {wa.aqi}</span>
                    </div>
                  ))
                )}
             </div>
          </div>
          
        </div>

        {/* Right Column */}
        <div>
          
          {/* BCR Gauge Widget */}
          <div className="admin-panel">
            <h3 style={{marginTop: 0, marginBottom: "1rem", display: "flex", justifyContent: "space-between"}}>
               BCR Gauge
               <span style={{color: bcrData?.status === "CRITICAL" ? "var(--red)" : "var(--green)", fontSize: 12}}>{bcrData?.status || "HEALTHY"}</span>
            </h3>
            <div className="bcr-gauge-container">
               <div className="bcr-gauge-bg"></div>
               <div className="bcr-gauge-needle" style={{transform: `rotate(${Math.min(90, Math.max(-90, bcrRotation))}deg)`}}></div>
            </div>
            <div style={{textAlign: "center", marginTop: 10}}>
               <span style={{fontSize: "24px", fontWeight: "bold"}}>{bcrData?.overall_bcr?.toFixed(2) || "0.00"}</span>
            </div>
            <div style={{textAlign: "center", fontSize: 12, color: "var(--muted)", marginTop: 5}}>
               Target: 0.65 | Alert thresholds at 0.70 & 0.85<br/>
               Stress Test (14-monsoon): {bcrData?.stress_test?.result || "0.00"}
            </div>
          </div>

          {/* Zone Weather Details */}
          <div className="admin-panel">
             <h3 style={{marginTop: 0, marginBottom: "1rem"}}>Zone Weather Widget</h3>
             <div style={{background: "var(--bg)", padding: 10, borderRadius: 8}}>
                <div style={{display: "flex", justifyContent: "space-between", marginBottom: 5}}>
                  <span style={{color: "var(--muted)", fontSize: 12}}>Updates every 30m</span>
                  <span style={{color: "var(--amber)", fontSize: 12}}>Live</span>
                </div>
                {adminZones.slice(0, 3).map((z, i) => (
                  <div key={i} style={{marginBottom: 10, fontSize: 13, display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 5}}>
                     <span>{z.name.split(" - ")[1]}</span>
                     <span style={{color: z.weather?.rainfall > 20 ? "var(--red)" : "var(--green)"}}>
                        {z.weather?.rainfall > 20 ? `Heavy Rain (${z.weather.rainfall}mm/hr)` : `Clear (${z.weather?.rainfall||0}mm)`}
                     </span>
                  </div>
                ))}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
