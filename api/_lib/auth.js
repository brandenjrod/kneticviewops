const crypto = require("node:crypto");

function getHeaderToken(req) {
  const header =
    req.headers.authorization ||
    req.headers.Authorization ||
    req.headers["x-admin-token"];

  if (!header) {
    return "";
  }

  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }

  return String(header).trim();
}

function safeCompare(left, right) {
  if (!left || !right) {
    return false;
  }

  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function validateAdminToken(req, suppliedToken = "") {
  const expected = process.env.KNETIC_ADMIN_TOKEN;

  if (!expected) {
    throw new Error("Missing KNETIC_ADMIN_TOKEN");
  }

  return safeCompare(suppliedToken || getHeaderToken(req), expected);
}

function assertAdminToken(req, suppliedToken = "") {
  if (!validateAdminToken(req, suppliedToken)) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }
}

function validateWebhookSecret(req) {
  const expected = process.env.JOTFORM_WEBHOOK_SECRET;

  if (!expected) {
    return true;
  }

  const fromQuery = req.query?.secret;
  const fromHeader = req.headers["x-jotform-webhook-secret"];
  return safeCompare(fromQuery || fromHeader || "", expected);
}

module.exports = {
  assertAdminToken,
  getHeaderToken,
  validateAdminToken,
  validateWebhookSecret
};
