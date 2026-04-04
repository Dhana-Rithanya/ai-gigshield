const zoneData = {
  "Chennai - Velachery": 0.28,
  "Chennai - Adyar": 0.18,
  "Chennai - Tambaram": 0.2,
  "Mumbai - Dharavi": 0.26,
  "Delhi - Noida": 0.25,
  "Delhi - Saket": 0.18,
  "Bangalore - Koramangala": 0.07,
  "Hyderabad - Hitech City": 0.08,
};

function calculatePremium(worker, environment = "CLEAR") {
  let baseProb = zoneData[worker.zone];

  // Environmental multiplier
  let multiplier = 1.0;
  if (environment === "RAIN") multiplier = 1.3;
  if (environment === "AQI") multiplier = 1.2;

  const triggerProbability = baseProb * multiplier;

  const avgIncomeLost = 0.8 * (worker.weeklyIncome / 6);

  const actuarialBase = triggerProbability * avgIncomeLost * 6;

  const bcrLoaded = actuarialBase / 0.65;

  // Activity discount
  let discount = 0;
  if (worker.activeDays >= 20) discount = 2;

  let finalPremium = bcrLoaded - discount;

  finalPremium = Math.max(20, Math.min(50, finalPremium));

  const dailyPayout = avgIncomeLost;

  const stressBCR = (dailyPayout * 14) / (finalPremium * 2);
  const stressFlag = stressBCR > 1.5 ? "SUSPEND_ENROLMENTS" : "HEALTHY";

  return {
    triggerProbability,
    actuarialBase,
    bcrLoaded,
    discount,
    finalPremium,
    dailyPayout,
    stressBCR,
    stressFlag,
  };
}

module.exports = { calculatePremium };
