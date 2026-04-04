function detectFraud(worker, claims, newTrigger) {
  const now = Date.now();

  // Rule 1: Too many total claims (checked first so it's not bypassed)
  const paidClaims = claims.filter(c => c.status === "PAID");
  if (paidClaims.length >= 5) {
    return "EXCESSIVE_CLAIMS";
  }

  // Rule 2: Duplicate within 24 hrs
  if (claims.length > 0) {
    const last = claims[claims.length - 1];
    if (now - last.timestamp < 86400000) {
      return "DUPLICATE_CLAIM";
    }
  }

  // Rule 3: Platform mismatch
  if (newTrigger === "OUTAGE" && worker.platform === "None") {
    return "PLATFORM_MISMATCH";
  }

  // Rule 4: Location mismatch
  if (!worker.zone) {
    return "LOCATION_MISMATCH";
  }

  // Rule 5: Manual trigger goes to review
  if (newTrigger === "EMERGENCY") {
    return "MANUAL_REVIEW";
  }

  return null;
}

module.exports = { detectFraud };