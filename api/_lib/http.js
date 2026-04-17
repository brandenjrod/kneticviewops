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

/**
 * Parse multipart/form-data body without external dependencies.
 * Jotform sends webhooks as multipart with a `rawRequest` field containing
 * the actual JSON submission data, plus top-level fields like formID and submissionID.
 */
function parseMultipart(raw, boundary) {
  const result = {};
  const delimiter = `--${boundary}`;
  const parts = raw.split(delimiter);

  for (const part of parts) {
    if (!part || part.trim() === "--" || part.trim() === "") {
      continue;
    }

    // Split headers from body on double CRLF
    const headerBodySplit = part.indexOf("\r\n\r\n");
    if (headerBodySplit === -1) continue;

    const headerSection = part.slice(0, headerBodySplit);
    // Body ends before trailing \r\n
    const body = part.slice(headerBodySplit + 4).replace(/\r\n$/, "");

    // Extract field name from Content-Disposition header
    const nameMatch = headerSection.match(/name="([^"]+)"/);
    if (!nameMatch) continue;

    const fieldName = nameMatch[1];
    result[fieldName] = body;
  }

  return result;
}

async function parseIncomingBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    // Vercel may pre-parse multipart as an object with a rawRequest string field
    // If so, normalize it the same way we do for raw multipart
    if (req.body.rawRequest || req.body.formID || req.body.submissionID) {
      const fields = req.body;
      let merged = { ...fields };
      if (fields.rawRequest) {
        try {
          const parsed = typeof fields.rawRequest === "string"
            ? JSON.parse(fields.rawRequest)
            : fields.rawRequest;
          merged = { ...fields, ...parsed };
        } catch (e) {}
      }
      return merged;
    }
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

  // Handle multipart/form-data (Jotform webhook format)
  if (contentType.includes("multipart/form-data")) {
    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1];
      const fields = parseMultipart(raw, boundary);

      // Jotform puts the real submission data in `rawRequest` as a JSON string
      // and top-level metadata in formID, submissionID etc.
      // Merge rawRequest fields into the result so jotform.js can find them.
      let merged = { ...fields };

      if (fields.rawRequest) {
        try {
          const parsed = JSON.parse(fields.rawRequest);
          // rawRequest fields take priority for question answers
          // but keep top-level fields like formID, submissionID
          merged = { ...fields, ...parsed };
        } catch (e) {
          // rawRequest wasn't valid JSON, keep fields as-is
        }
      }

      return merged;
    }
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
