const https = require("https");
const config = require("../config");

const MAX_RETRIES = config.PAYMENT_RETRY_ATTEMPTS;

function log(msg) {
  console.log(`[PaymentGateway] ${new Date().toISOString()} — ${msg}`);
}

// Razorpay payout via Razorpay X (Fund Account + Payout API)
async function razorpayTransfer(amount, upiId, workerId) {
  const auth = Buffer.from(`${config.RAZORPAY_API_KEY}:${config.RAZORPAY_API_SECRET}`).toString("base64");

  // Step 1: Create fund account for UPI
  const fundAccount = await apiCall("POST", "https://api.razorpay.com/v1/fund_accounts", auth, {
    contact_id: workerId,
    account_type: "vpa",
    vpa: { address: upiId },
  });

  // Step 2: Initiate payout
  const payout = await apiCall("POST", "https://api.razorpay.com/v1/payouts", auth, {
    account_number: config.RAZORPAY_ACCOUNT_NUMBER,
    fund_account_id: fundAccount.id,
    amount: Math.round(amount * 100), // paise
    currency: "INR",
    mode: "UPI",
    purpose: "payout",
    queue_if_low_balance: true,
    narration: "GigShield Income Protection Payout",
  });

  return { txnId: payout.id, status: payout.status };
}

function apiCall(method, url, auth, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method,
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error(parsed.error?.description || `HTTP ${res.statusCode}`));
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// Sandbox/mock fallback when no real keys configured
function mockTransfer(amount, upiId) {
  log(`[SANDBOX] Mock transfer ₹${amount} → ${upiId}`);
  return {
    txnId: "MOCK-TXN-" + Math.floor(Math.random() * 1000000),
    status: "processed",
  };
}

/**
 * Transfer payout to worker's UPI ID with retry logic.
 * @returns {{ success: boolean, txnId: string, error?: string }}
 */
async function transferPayout(workerId, amount, upiId) {
  const isSandbox = !config.RAZORPAY_API_KEY || config.RAZORPAY_API_KEY === "YOUR_RAZORPAY_KEY";

  log(`Initiating payout: worker=${workerId} amount=₹${amount} upi=${upiId} sandbox=${isSandbox}`);

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = isSandbox
        ? mockTransfer(amount, upiId)
        : await razorpayTransfer(amount, upiId, workerId);

      log(`Payout SUCCESS attempt=${attempt} txnId=${result.txnId}`);
      return { success: true, txnId: result.txnId };
    } catch (e) {
      lastError = e.message;
      log(`Payout FAILED attempt=${attempt}/${MAX_RETRIES}: ${e.message}`);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt)); // backoff
      }
    }
  }

  log(`Payout EXHAUSTED all retries for worker=${workerId}`);
  return { success: false, txnId: null, error: lastError };
}

module.exports = { transferPayout };
