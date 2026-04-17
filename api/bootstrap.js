const { methodNotAllowed } = require("./_lib/http");
const { buildDetailStore, buildMaintenanceRequests, buildMetrics, normalizeBoardRows, normalizeFleetRows, normalizeTruckRows } = require("./_lib/ops");
const { getServiceClient } = require("./_lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    methodNotAllowed(res, ["GET"]);
    return;
  }

  try {
    const supabase = getServiceClient();
    const [
      boardRowsResult,
      fleetsResult,
      trucksResult,
      notesResult,
      workOrdersResult,
      submissionsResult,
      assetsResult
    ] = await Promise.all([
      supabase.from("v_board_rows").select("*"),
      supabase.from("fleets").select("*"),
      supabase.from("trucks").select("*"),
      supabase.from("entity_notes").select("*").order("sort_order", { ascending: true }),
      supabase.from("work_orders").select("*").order("sort_order", { ascending: true }),
      supabase
        .from("form_submissions")
        .select("id, jotform_submission_id, submitted_at, submitted_by_name, customer, fleet_number, asset_code, status, form:forms(form_key, form_name, category)")
        .order("submitted_at", { ascending: false })
        .limit(40),
      supabase.from("assets").select("asset_number, short_code, upgrade_progress, status")
    ]);

    const errors = [
      boardRowsResult.error,
      fleetsResult.error,
      trucksResult.error,
      notesResult.error,
      workOrdersResult.error,
      submissionsResult.error,
      assetsResult.error
    ].filter(Boolean);

    if (errors.length) {
      throw errors[0];
    }

    const boardRows = normalizeBoardRows(boardRowsResult.data || []);
    const fleets = normalizeFleetRows(fleetsResult.data || []);
    const trucks = normalizeTruckRows(trucksResult.data || []);
    const detailStore = buildDetailStore(notesResult.data || [], workOrdersResult.data || []);
    const submissions = (submissionsResult.data || []).map((submission) => ({
      ...submission,
      form: Array.isArray(submission.form) ? submission.form[0] : submission.form
    }));
    const metrics = buildMetrics({
      assets: assetsResult.data || [],
      boardRows,
      fleets,
      submissions,
      trucks
    });
    const maintenanceRequests = buildMaintenanceRequests(workOrdersResult.data || [], submissions);

    res.status(200).json({
      ok: true,
      boardRows,
      fleets,
      trucks,
      detailStore,
      maintenanceRequests,
      metrics,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message || "Unable to load operational data."
    });
  }
};
