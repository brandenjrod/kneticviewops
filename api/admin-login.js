const { validateAdminToken } = require("./_lib/auth");
const { methodNotAllowed, parseJsonBody } = require("./_lib/http");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST"]);
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const token = String(body.token || "");

    if (!token) {
      res.status(400).json({
        ok: false,
        error: "A token is required."
      });
      return;
    }

    if (!validateAdminToken(req, token)) {
      res.status(401).json({
        ok: false,
        error: "Invalid admin token."
      });
      return;
    }

    res.status(200).json({
      ok: true
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Unable to validate admin token."
    });
  }
};
