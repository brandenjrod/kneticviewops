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
    const rows = Array.isArray(body.trucks) ? body.trucks : [];
    const actor = String(body.actor || "Admin").trim() || "Admin";

    const payload = rows
      .filter((row) => String(row.assetId || "").trim())
      .map((row) => {
        const vehicleLabel = String(row.vehicle || "").trim();
        const parts = vehicleLabel.split(/\s+/);
        const make = parts.shift() || null;

        return {
          asset_id: row.assetId.trim(),
          vin: String(row.vin || "").trim() || null,
          license_plate: String(row.plate || "").trim() || null,
          make,
          model: parts.join(" ") || null,
          vehicle_label: vehicleLabel || null,
          truck_status: String(row.status || "Pending").trim(),
          assigned_group: String(row.assigned || "Pending").trim(),
          driver: String(row.driver || "Pending").trim(),
          fleet_assignment: String(row.fleet || "Pending").trim(),
          notes: String(row.notes || "Pending").trim()
        };
      });

    if (!payload.length) {
      res.status(400).json({
        ok: false,
        error: "At least one truck row with an asset id is required."
      });
      return;
    }

    const supabase = getServiceClient();
    const { error } = await supabase.from("trucks").upsert(payload, {
      onConflict: "asset_id"
    });

    if (error) {
      throw error;
    }

    await supabase.from("activity_events").insert({
      event_type: "truck_sync",
      entity_type: "truck",
      entity_key: "truck-roster",
      summary: `${actor} synced ${payload.length} trucking rows`,
      metadata: {
        rowCount: payload.length
      }
    });

    res.status(200).json({
      ok: true,
      count: payload.length
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Unable to save truck data."
    });
  }
};
