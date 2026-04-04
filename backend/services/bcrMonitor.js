function calculateBCR(totalClaims, totalPremium) {
  if (totalPremium === 0) return { bcr: 0, status: "HEALTHY", message: "No premiums collected yet" };

  const bcr = totalClaims / totalPremium;

  let status = "HEALTHY";

  if (bcr > 0.85) status = "SUSPEND_ENROLMENTS";
  else if (bcr > 0.7) status = "WATCH";

  return { bcr, status };
}

module.exports = { calculateBCR };