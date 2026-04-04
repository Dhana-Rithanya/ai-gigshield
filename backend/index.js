const express = require("express");
const cors = require("cors");
const { v4: uuid } = require("uuid");

// ✅ Import AI Services
const { calculatePremium } = require("./services/premiumEngine");
const { detectFraud } = require("./services/fraudDetector");
const { calculateBCR } = require("./services/bcrMonitor");

const app = express();
app.use(cors());
app.use(express.json());

// ================= IN-MEMORY STORAGE =================
const workers = new Map();
const policies = new Map();
const claims = new Map(); // workerId -> []
const logs = [];

// ================= LOG FUNCTION =================
function log(system, action, data) {
  logs.unshift({
    system,
    action,
    data,
    timestamp: new Date(),
  });
}

// ================= REGISTER WORKER =================
app.post("/api/workers/register", (req, res) => {
  const id = uuid();

  const { name, zone, platform, weeklyIncome, activeDays } = req.body;

  const worker = {
    id,
    name,
    zone,
    platform,
    weeklyIncome,
    activeDays,
  };

  workers.set(id, worker);

  // ✅ AI Premium Calculation
  const premium = calculatePremium(worker);

  const policy = {
    policyNumber: "GW-" + Math.floor(Math.random() * 100000),
    workerId: id,
    premium: premium.finalPremium,
    dailyPayout: premium.dailyPayout,
  };

  policies.set(id, policy);
  claims.set(id, []);

  // Logs
  log("PolicyCenter", "Account Created", worker);
  log("PolicyCenter", "Policy Created", policy);

  res.json({
    worker,
    policy,
    premium,
  });
});

// ================= GET WORKER =================
app.get("/api/workers/:id", (req, res) => {
  res.json(workers.get(req.params.id));
});

// ================= RECALCULATE PREMIUM =================
app.post("/api/policies/recalculate", (req, res) => {
  const { workerId, environment } = req.body;

  const worker = workers.get(workerId);
  const policy = policies.get(workerId);

  const premium = calculatePremium(worker, environment);

  policy.premium = premium.finalPremium;

  log("PolicyCenter", "Premium Updated", premium);

  res.json({ policy, premium });
});

// ================= TRIGGER CLAIM =================
app.post("/api/claims/trigger", (req, res) => {
  const { workerId, trigger } = req.body;

  const worker = workers.get(workerId);
  const policy = policies.get(workerId);
  const workerClaims = claims.get(workerId);

  if (!worker || !policy) {
    return res.status(404).json({ message: "Worker not found" });
  }

  // ✅ Fraud Detection
  const fraud = detectFraud(worker, workerClaims, trigger);

  const payout = policy.dailyPayout;

  const claim = {
    id: uuid(),
    workerId,
    payout,
    trigger,
    status: fraud ? "UNDER_REVIEW" : "PAID",
    timestamp: Date.now(),
    txnId: "TXN-" + Math.floor(Math.random() * 100000),
  };

  workerClaims.push(claim);

  // Logs
  log("ClaimCenter", "Claim Created", claim);

  if (fraud) {
    log("ClaimCenter", "Fraud Flagged", { reason: fraud });
  } else {
    log("ClaimCenter", "Payout Processed", { txnId: claim.txnId });
  }

  res.json(claim);
});

// ================= GET CLAIMS =================
app.get("/api/claims/:workerId", (req, res) => {
  res.json(claims.get(req.params.workerId) || []);
});

// ================= GET LOGS =================
app.get("/api/guidewire/logs", (req, res) => {
  res.json(logs);
});

// ================= BCR MONITOR =================
app.get("/api/bcr", (req, res) => {
  let totalClaims = 0;
  let totalPremium = 0;

  claims.forEach((workerClaims) => {
    workerClaims.forEach((c) => {
      if (c.status === "PAID") totalClaims += c.payout;
    });
  });

  policies.forEach((p) => {
    totalPremium += p.premium;
  });

  const result = calculateBCR(totalClaims, totalPremium);

  res.json(result);
});

// ================= START SERVER =================
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
