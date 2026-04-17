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
    const kind = String(body.kind || "").trim();
    const key = String(body.key || "").trim();
    const actor = String(body.actor || "Admin").trim() || "Admin";
    const notes = Array.isArray(body.notes) ? body.notes : [];
    const workOrders = Array.isArray(body.workOrders) ? body.workOrders : [];

    if (!["asset", "package", "fleet"].includes(kind) || !key) {
      res.status(400).json({
        ok: false,
        error: "A valid detail kind and key are required."
      });
      return;
    }

    const supabase = getServiceClient();
    const { error: deleteNotesError } = await supabase.from("entity_notes").delete().eq("entity_type", kind).eq("entity_key", key);

    if (deleteNotesError) {
      throw deleteNotesError;
    }

    const { error: deleteOrdersError } = await supabase.from("work_orders").delete().eq("entity_type", kind).eq("entity_key", key);

    if (deleteOrdersError) {
      throw deleteOrdersError;
    }

    if (notes.length) {
      const notePayload = notes.map((note, index) => ({
        entity_type: kind,
        entity_key: key,
        note_text: String(note.text || "").trim(),
        created_by: actor,
        sort_order: index
      }));
      const { error: noteInsertError } = await supabase.from("entity_notes").insert(notePayload);

      if (noteInsertError) {
        throw noteInsertError;
      }
    }

    if (workOrders.length) {
      const orderPayload = workOrders.map((order, index) => ({
        entity_type: kind,
        entity_key: key,
        work_order_number: String(order.id || `WO-${index + 1}`).trim(),
        order_text: String(order.text || "").trim(),
        is_complete: Boolean(order.complete),
        created_by: actor,
        sort_order: index
      }));
      const { error: orderInsertError } = await supabase.from("work_orders").insert(orderPayload);

      if (orderInsertError) {
        throw orderInsertError;
      }
    }

    res.status(200).json({
      ok: true
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Unable to save detail records."
    });
  }
};
