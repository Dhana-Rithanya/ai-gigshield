const config = require("./config");

// KYC status constants
const KYC_STATUS = { PENDING: "PENDING", VERIFIED: "VERIFIED", FAILED: "FAILED" };

// In-memory KYC store (replace with DB in production)
const kycStore = new Map(); // workerId -> { status, attempts, verifiedAt, reason }

function log(msg) {
  console.log(`[KYC] ${new Date().toISOString()} — ${msg}`);
}

// Basic format validators
const AADHAR_RE = /^\d{12}$/;
const PAN_RE    = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const UPI_RE    = /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/;

function maskId(id) {
  return id.slice(0, 4) + "****" + id.slice(-2);
}

/**
 * Initiate KYC for a worker.
 * In production: call Shuddhi/Signzy API here.
 * For now: validates format and simulates async verification.
 */
async function initiateKYC(workerId, { aadhar, pan, upiId }) {
  log(`Initiating KYC for worker=${workerId}`);

  const existing = kycStore.get(workerId);
  if (existing?.status === KYC_STATUS.VERIFIED) {
    return { status: KYC_STATUS.VERIFIED, message: "Already verified" };
  }

  // Format validation
  if (aadhar && !AADHAR_RE.test(aadhar)) {
    return { status: KYC_STATUS.FAILED, message: "Invalid Aadhar format (must be 12 digits)" };
  }
  if (pan && !PAN_RE.test(pan)) {
    return { status: KYC_STATUS.FAILED, message: "Invalid PAN format (e.g. ABCDE1234F)" };
  }
  if (upiId && !UPI_RE.test(upiId)) {
    return { status: KYC_STATUS.FAILED, message: "Invalid UPI ID format" };
  }
  if (!aadhar && !pan) {
    return { status: KYC_STATUS.FAILED, message: "Aadhar or PAN required" };
  }

  // Simulate async 3rd-party KYC call
  // In production: replace with actual Shuddhi/Signzy API call
  const verified = await simulateKYCVerification(aadhar || pan);

  const record = {
    status:     verified ? KYC_STATUS.VERIFIED : KYC_STATUS.FAILED,
    attempts:   (existing?.attempts || 0) + 1,
    verifiedAt: verified ? new Date().toISOString() : null,
    reason:     verified ? null : "Identity verification failed",
    idMasked:   maskId(aadhar || pan),
    upiId:      upiId || null,
  };

  kycStore.set(workerId, record);
  log(`KYC result: worker=${workerId} status=${record.status} attempts=${record.attempts}`);
  return record;
}

async function simulateKYCVerification(id) {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 300));
  // In sandbox: approve all valid-format IDs
  return true;
}

function getKYCStatus(workerId) {
  return kycStore.get(workerId) || { status: KYC_STATUS.PENDING };
}

function isKYCVerified(workerId) {
  const rec = kycStore.get(workerId);
  return rec?.status === KYC_STATUS.VERIFIED;
}

// Middleware: block claims if KYC not verified
function requireKYC(req, res, next) {
  const workerId = req.body.workerId || req.params.workerId;
  if (!isKYCVerified(workerId)) {
    return res.status(403).json({
      error: "KYC verification required before claims",
      kycStatus: getKYCStatus(workerId).status,
    });
  }
  next();
}

module.exports = { initiateKYC, getKYCStatus, isKYCVerified, requireKYC, KYC_STATUS };
