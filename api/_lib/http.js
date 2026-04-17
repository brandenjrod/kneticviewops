const querystring = require("node:querystring");

function methodNotAllowed(res, methods) {
  res.setHeader("Allow", methods.join(", "));
  res.status(405).json({
    ok: false,
    error: `Method not allowed. Use ${methods.join(", ")}.`
  });
}

async function readRawBody(req) {
  if (typeof req.body === "string") {
    return req.body;
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body.toString("utf8");
  }

  if (req.body && typeof req.body === "object") {
    return null;
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function normalizeObjectValues(record) {
  return Object.fromEntries(
    Object.entries(record || {}).map(([key, value]) => {
      if (Array.isArray(value) && value.length === 1) {
        return [key, value[0]];
      }

      return [key, value];
    })
  );
}

async function parseIncomingBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  const raw = await readRawBody(req);

  if (!raw) {
    return {};
  }

  const contentType = String(req.headers["content-type"] || "").toLowerCase();

  if (contentType.includes("application/json")) {
    return JSON.parse(raw);
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return normalizeObjectValues(querystring.parse(raw));
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return normalizeObjectValues(querystring.parse(raw));
  }
}

async function parseJsonBody(req) {
  const body = await parseIncomingBody(req);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    const error = new Error("Invalid JSON body");
    error.statusCode = 400;
    throw error;
  }

  return body;
}

module.exports = {
  methodNotAllowed,
  parseIncomingBody,
  parseJsonBody,
  readRawBody
};
