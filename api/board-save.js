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
    const boardRows = Array.isArray(body.boardRows) ? body.boardRows : [];
    const rigMoves = Array.isArray(body.rigMoves) ? body.rigMoves : [];
    const actor = String(body.actor || "Admin").trim() || "Admin";

    if (!boardRows.length) {
      res.status(400).json({
        ok: false,
        error: "boardRows must include at least one row."
      });
      return;
    }

    const supabase = getServiceClient();
    const payload = boardRows.map((row, index) => ({
      id: row.id,
      status: row.status,
      allocation: row.allocation,
      hp_asset_code: row.HP || null,
      lp_asset_code: row.LP || null,
      hr_asset_code: row.HR || null,
      cc_asset_code: row.CC || null,
      sort_order: index
    }));

    const { error: boardError } = await supabase.from("board_rows").upsert(payload, {
      onConflict: "id"
    });

    if (boardError) {
      throw boardError;
    }

    if (rigMoves.length) {
      const fleetPayload = rigMoves.map((move) => ({
        fleet_number: Number(move.fleet),
        move_status: move.status,
        move_date: move.moveDate || null,
        is_archived: Boolean(move.archived)
      }));

      const { error: fleetError } = await supabase.from("fleets").upsert(fleetPayload, {
        onConflict: "fleet_number"
      });

      if (fleetError) {
        throw fleetError;
      }
    }

    const { error: syncError } = await supabase.rpc("sync_asset_snapshot_from_board");

    if (syncError) {
      throw syncError;
    }

    await supabase.from("activity_events").insert({
      event_type: "board_sync",
      entity_type: "board",
      entity_key: "deployment-board",
      summary: `${actor} synced ${payload.length} board rows`,
      metadata: {
        rowCount: payload.length,
        fleetMoveCount: rigMoves.length
      }
    });

    res.status(200).json({
      ok: true,
      count: payload.length
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Unable to save board data."
    });
  }
};
