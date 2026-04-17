const cron = require("node-cron");
const { v4: uuid } = require("uuid");
const { getZoneWeather } = require("./weatherIntegration");
const { detectFraud } = require("./fraudDetector");
const Worker = require("../models/Worker");
const Policy = require("../models/Policy");
const Claim = require("../models/Claim");

let _logSystem;

function log(msg) {
  console.log(`[AutoEngine] ${new Date().toISOString()} — ${msg}`);
}

async function runMonitoringCycle(logSystemRef) {
  if (logSystemRef) _logSystem = logSystemRef;
  log("Starting monitoring cycle...");

  const report = { triggered: 0, skipped: 0, fraudBlocked: 0, errors: 0, byCondition: {}, byZone: {} };
  const allWorkers = await Worker.find();

  for (const worker of allWorkers) {
    const policy = await Policy.findOne({ workerId: worker.id });
    if (!policy || !worker.zone) { report.skipped++; continue; }

    const wClaims = await Claim.find({ workerId: worker.id });

    let weather;
    try {
      weather = await getZoneWeather(worker.zone);
    } catch (e) {
      log(`Weather fetch failed for ${worker.zone}: ${e.message}`);
      report.errors++;
      continue;
    }

    const triggers = [];
    if (weather.rainfall    > 20)  triggers.push("RAIN");
    if (weather.aqi         > 300) triggers.push("AQI");
    if (weather.temperature > 42)  triggers.push("HEAT");

    for (const trigger of triggers) {
      const recentSame = wClaims.find(
        c => c.trigger === trigger && Date.now() - c.timestamp < 86400000
      );
      if (recentSame) { report.skipped++; continue; }

      const fraud = detectFraud(worker, wClaims, trigger);

      if (fraud) {
        log(`Fraud blocked auto-claim: worker=${worker.name} trigger=${trigger} reason=${fraud}`);
        report.fraudBlocked++;
        if (_logSystem) await _logSystem("ClaimCenter", "Auto-Claim Fraud Blocked", { workerId: worker.id, trigger, reason: fraud });
        continue;
      }

      const claimData = {
        id:        uuid(),
        workerId:  worker.id,
        payout:    policy.dailyPayout,
        trigger,
        status:    "PAID",
        timestamp: Date.now(),
        txnId:     "AUTO-TXN-" + Math.floor(Math.random() * 100000),
        auto:      true,
      };

      const newClaim = await Claim.create(claimData);

      if (_logSystem) {
        await _logSystem("ClaimCenter", "Auto-Claim Triggered", newClaim);
        await _logSystem("ClaimCenter", "Auto-Payout Processed", { txnId: newClaim.txnId, amount: newClaim.payout });
      }

      log(`Auto-claim PAID: worker=${worker.name} zone=${worker.zone} trigger=${trigger} payout=₹${newClaim.payout}`);

      report.triggered++;
      report.byCondition[trigger] = (report.byCondition[trigger] || 0) + 1;
      report.byZone[worker.zone]  = (report.byZone[worker.zone]  || 0) + 1;
    }
  }

  log(`Cycle complete — triggered=${report.triggered} skipped=${report.skipped} fraudBlocked=${report.fraudBlocked} errors=${report.errors}`);
  if (_logSystem) await _logSystem("AutoEngine", "Monitoring Cycle Complete", report);
  return report;
}

function startScheduler(logSystemRef) {
  _logSystem = logSystemRef;
  log("Scheduler started — runs every 6 hours");
  cron.schedule("0 0,6,12,18 * * *", () => {
    runMonitoringCycle(_logSystem).catch(e => log(`Cycle error: ${e.message}`));
  });
}

module.exports = { startScheduler, runMonitoringCycle };
