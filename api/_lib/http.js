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

function parseMultipartString(raw, boundary) {
  const result = {};
  const delimiter = `--${boundary}`;
  const parts = raw.split(delimiter);

  for (const part of parts) {
    if (!part || part.trim() === "--" || part.trim() === "") {
      continue;
    }

    const headerBodySplit = part.indexOf("\r\n\r\n");
    if (headerBodySplit === -1) continue;

    const headerSection = part.slice(0, headerBodySplit);
    const body = part.slice(headerBodySplit + 4).replace(/\r\n$/, "");

    const nameMatch = headerSection.match(/name="([^"]+)"/);
    if (!nameMatch) continue;

    result[nameMatch[1]] = body;
  }

  return result;
}

function mergeJotformFields(fields) {
  let merged = { ...fields };

  if (fields.rawRequest) {
    try {
      const parsed = typeof fields.rawRequest === "string"
        ? JSON.parse(fields.rawRequest)
        : fields.rawRequest;
      merged = { ...fields, ...parsed };
    } catch (e) {
      // keep as-is
    }
  }

  return merged;
}

async function parseIncomingBody(req) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();

  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {

    // Already correctly parsed with Jotform fields
    if (req.body.formID || req.body.submissionID || req.body.rawRequest) {
      return mergeJotformFields(req.body);
    }

    // Vercel mangled the multipart — action key contains the rest of the body
    if (
      typeof req.body.action === "string" &&
      req.body.action.includes("Content-Disposition") &&
      contentType.includes("multipart/form-data")
    ) {
      const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
      if (boundaryMatch) {
        const boundary = boundaryMatch[1];
        const reconstructed = `--${boundary}\r\nContent-Disposition: form-data; name="action"\r\n\r\n\r\n${req.body.action}`;
        const fields = parseMultipartString(reconstructed, boundary);
        return mergeJotformFields(fields);
      }
    }

    return req.body;
  }

  const raw = await readRawBody(req);

  if (!raw) {
    return {};
  }

  if (contentType.includes("application/json")) {
    return JSON.parse(raw);
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return normalizeObjectValues(querystring.parse(raw));
  }

  if (contentType.includes("multipart/form-data")) {
    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
    if (boundaryMatch) {
      const fields = parseMultipartString(raw, boundaryMatch[1]);
      return mergeJotformFields(fields);
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
