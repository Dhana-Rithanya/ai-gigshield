const Worker = require("../models/Worker");
const Policy = require("../models/Policy");
const Claim = require("../models/Claim");

async function calculateZoneRisk(zone) {
  let totalZonePolicies = 0;
  let totalZoneClaims = 0;
  
  const workersInZone = await Worker.find({ zone });
  
  for (const w of workersInZone) {
    const hasPolicy = await Policy.exists({ workerId: w.id });
    if (hasPolicy) totalZonePolicies++;
    const claimsCount = await Claim.countDocuments({ workerId: w.id });
    totalZoneClaims += claimsCount;
  }

  const baseRates = {
    "Chennai - Velachery": 0.28,
    "Chennai - Adyar": 0.18,
    "Chennai - Tambaram": 0.2,
    "Mumbai - Dharavi": 0.26,
    "Delhi - Noida": 0.25,
    "Delhi - Saket": 0.18,
    "Bangalore - Koramangala": 0.07,
    "Hyderabad - Hitech City": 0.08,
  };

  const baseProbability = baseRates[zone] || 0.15;
  if (totalZonePolicies === 0) return baseProbability;

  const dynamicRate = totalZoneClaims / (totalZonePolicies * 6);
  return (baseProbability + dynamicRate) / 2;
}

function getSeasonalMultiplier() {
  const month = new Date().getMonth();
  if (month >= 5 && month <= 9) return 1.4; // Monsoon
  if (month >= 2 && month <= 4) return 1.1; // Summer
  if (month === 10) return 0.9;             // Diwali
  return 0.8;                               // Winter
}

function getZoneComplexityMultiplier(zone) {
  const highTraffic = ["Mumbai - Dharavi", "Bangalore - Koramangala", "Delhi - Noida"];
  const lowTraffic = ["Hyderabad - Hitech City", "Chennai - Tambaram"];
  
  if (highTraffic.includes(zone)) return 1.1;
  if (lowTraffic.includes(zone)) return 0.9;
  return 1.0;
}

async function calculatePremium(worker, environment = "CLEAR") {
  const triggerProbability = await calculateZoneRisk(worker.zone);
  const seasonalMulti = getSeasonalMultiplier();
  const zoneMulti = getZoneComplexityMultiplier(worker.zone);

  let envMultiplier = 1.0;
  if (environment === "RAIN") envMultiplier = 1.3;
  if (environment === "AQI") envMultiplier = 1.2;

  const adjustedProbability = triggerProbability * seasonalMulti * zoneMulti * envMultiplier;

  const avgIncomeLost = 0.8 * (worker.weeklyIncome / 6);
  const actuarialBase = adjustedProbability * avgIncomeLost * 6;
  const bcrLoaded = actuarialBase / 0.65;

  let discount = 0;
  if (worker.activeDays >= 20) discount += 2;
  
  const claimsLast6M = await Claim.countDocuments({ 
    workerId: worker.id, 
    timestamp: { $gt: Date.now() - 180 * 24 * 60 * 60 * 1000 } 
  });
  
  if (claimsLast6M === 0) discount += 1;
  else if (claimsLast6M > 3) discount -= 3;

  if (worker.activeDays < 20) discount -= 2;
  if (worker.activeDays > 200) discount += 1;

  let finalPremium = bcrLoaded - discount;
  finalPremium = Math.max(10, Math.min(100, finalPremium));

  const dailyPayout = avgIncomeLost;
  const stressBCR = (dailyPayout * 14) / (finalPremium * 2);
  const stressFlag = stressBCR > 1.5 ? "SUSPEND_ENROLMENTS" : "HEALTHY";

  return {
    finalPremium, dailyPayout,
    breakdown: { triggerProbability, actuarialBase, bcrLoaded, discount, stressBCR, stressFlag, multipliers: { season: seasonalMulti, zone: zoneMulti, environment: envMultiplier } },
    confidence: "HIGH"
  };
}

module.exports = { calculatePremium, calculateZoneRisk };
