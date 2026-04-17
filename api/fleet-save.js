const { assertAdminToken } = require("./_lib/auth");
const { methodNotAllowed, parseJsonBody } = require("./_lib/http");
const { getServiceClient } = require("./_lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST"]);
    return;
  }

  try {
    assertAdminToken(req);

    const body = await parseJsonBody(req);
    const fleetNumber = Number(body.fleetNumber);
    const actor = String(body.actor || "Admin").trim() || "Admin";
    const fields = body.fields || {};

    if (!fleetNumber) {
      res.status(400).json({
        ok: false,
        error: "fleetNumber is required."
      });
      return;
    }

    const payload = {
      fleet_number: fleetNumber,
      customer: fields.customer || "Pending",
      fuel_type: fields.fuelType || "Pending",
      pressure: fields.pressure || "Pending",
      jds_status: fields.jdsStatus || "Pending",
      grafana_status: fields.grafanaStatus || "Pending",
      jotform_status: fields.jotformStatus || "Pending",
      notes: fields.notes || "Pending"
    };

    const supabase = getServiceClient();
    const { error } = await supabase.from("fleets").upsert(payload, {
      onConflict: "fleet_number"
    });

    if (error) {
      throw error;
    }

    await supabase.from("activity_events").insert({
      event_type: "fleet_update",
      entity_type: "fleet",
      entity_key: `Fleet ${fleetNumber}`,
      summary: `${actor} updated Fleet ${fleetNumber}`,
      metadata: payload
    });

    res.status(200).json({
      ok: true
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Unable to save fleet details."
    });
  }
};
