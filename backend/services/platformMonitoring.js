const cron = require("node-cron");
const { v4: uuid } = require("uuid");
const Worker = require("../models/Worker");
const Policy = require("../models/Policy");
const Claim = require("../models/Claim");
const Log = require("../models/Log");

const platformStatus = {
  Zomato: { status: "UP", lastOutageStart: null },
  Swiggy: { status: "UP", lastOutageStart: null }
};

async function logSystem(system, action, data) {
  try { await Log.create({ system, action, data, timestamp: new Date() }); } catch(err) {}
}

async function checkPlatformStatus() {
  for (const platform of ["Zomato", "Swiggy"]) {
    const isNowDown = Math.random() < 0.05; // 5% mock probability
    if (isNowDown && platformStatus[platform].status === "UP") {
      platformStatus[platform].status = "DOWN";
      platformStatus[platform].lastOutageStart = Date.now();
      await logSystem("PlatformMonitor", `${platform} Outage Detected`, { time: new Date() });
      await triggerAutoClaimsForOutage(platform);
    } else if (!isNowDown && platformStatus[platform].status === "DOWN") {
      platformStatus[platform].status = "UP";
      await logSystem("PlatformMonitor", `${platform} Back Online`, { time: new Date() });
    }
  }
}

async function triggerAutoClaimsForOutage(platform) {
  let triggeredCount = 0;
  const workers = await Worker.find({ $or: [{ platform: platform }, { platform: "Both" }] });

  for (const worker of workers) {
    const recentOutageClaim = await Claim.findOne({
      workerId: worker.id,
      trigger: "OUTAGE",
      timestamp: { $gt: Date.now() - 12 * 60 * 60 * 1000 }
    });
    
    if (!recentOutageClaim) {
      const policy = await Policy.findOne({ workerId: worker.id });
      if (!policy) continue;

      const claimData = {
        id: uuid(),
        workerId: worker.id,
        payout: policy.dailyPayout,
        trigger: "OUTAGE",
        status: "PAID",
        timestamp: Date.now(),
        txnId: "AUTO-OUTAGE-" + Math.floor(Math.random() * 100000),
        auto: true
      };
      await Claim.create(claimData);
      triggeredCount++;
    }
  }
  
  if (triggeredCount > 0) {
    await logSystem("PlatformMonitor", `Auto-Claimed for ${platform} Outage`, { claimsCreated: triggeredCount });
  }
}

function startPlatformMonitoring() {
  cron.schedule("*/30 * * * *", () => {
    checkPlatformStatus().catch(e => console.error("Platform monitoring error:", e));
  });
  console.log("📡 Platform Outage Monitoring Started");
}

module.exports = { startPlatformMonitoring, platformStatus, checkPlatformStatus };
