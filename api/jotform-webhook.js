const { validateWebhookSecret } = require("./_lib/auth");
const { methodNotAllowed } = require("./_lib/http");
const { getServiceClient } = require("./_lib/supabase");

// ─── Multipart parser ────────────────────────────────────────────────────────

function extractMultipartFields(body, contentType) {
  // Vercel pre-parses multipart/form-data oddly:
  // It creates {action: "\r\n--boundary...<rest of body>"} as a plain object.
  // We detect this and extract fields using regex directly.

  let raw = null;

  if (
    body &&
    typeof body === "object" &&
    typeof body.action === "string" &&
    body.action.includes("Content-Disposition")
  ) {
    // Reconstruct the full multipart string
    const boundaryMatch = String(contentType || "").match(/boundary=([^\s;]+)/);
    if (boundaryMatch) {
      raw = `--${boundaryMatch[1]}\r\nContent-Disposition: form-data; name="action"\r\n\r\n\r\n${body.action}`;
    } else {
      // No boundary in header — just use the action value directly
      raw = body.action;
    }
  } else if (typeof body === "string" && body.includes("Content-Disposition")) {
    raw = body;
  }

  if (!raw) return null;

  // Extract named fields using regex
  const fields = {};
  const fieldRegex = /Content-Disposition: form-data; name="([^"]+)"\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n$|$)/g;
  let match;
  while ((match = fieldRegex.exec(raw)) !== null) {
    fields[match[1]] = match[2].replace(/\r\n$/, "");
  }

  return fields;
}

// ─── Normalize Jotform payload ───────────────────────────────────────────────

function firstValue(value) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function normalizeSubmission(body, contentType) {
  // Try to extract multipart fields first
  const multipart = extractMultipartFields(body, contentType);

  let formId, submissionId, rawRequest, q;

  if (multipart) {
    formId = String(multipart.formID || multipart.formId || "").trim();
    submissionId = String(multipart.submissionID || multipart.submissionId || "").trim();
    rawRequest = multipart.rawRequest
      ? safeJsonParse(multipart.rawRequest, {})
      : {};
    q = rawRequest;
  } else {
    // Already a parsed object (JSON webhook or pre-parsed by Vercel correctly)
    const payload = typeof body === "string" ? safeJsonParse(body, {}) : (body || {});
    formId = String(payload.formID || payload.formId || payload.form_id || "").trim();
    submissionId = String(payload.submissionID || payload.submissionId || payload.submission_id || "").trim();
    rawRequest = payload.rawRequest
      ? safeJsonParse(payload.rawRequest, payload)
      : payload;
    q = rawRequest.q || rawRequest;
  }

  const name = [
    firstValue(q.q45_gasDecompression?.first || q.Name?.first),
    firstValue(q.q45_gasDecompression?.last || q.Name?.last)
  ].filter(Boolean).join(" ") || firstValue(q.Name) || null;

  const fleetNumber =
    firstValue(q.q4_fleetNumber) ||
    firstValue(q["Fleet Number"]) ||
    firstValue(q["Fleet #"]) ||
    firstValue(q.Location) ||
    null;

  const region =
    firstValue(q.q62_region) ||
    firstValue(q.Region) ||
    firstValue(q["Region:"]) ||
    null;

  const customer =
    firstValue(q.q3_customer) ||
    firstValue(q.Customer) ||
    null;

  const assetCode =
    firstValue(q["HP Cube Asset Number"]) ||
    firstValue(q["LP Cube Asset Number"]) ||
    firstValue(q["Control Cube Asset ID Number"]) ||
    firstValue(q["LPCC Asset ID"]) ||
    null;

  return {
    formId,
    submissionId,
    rawData: rawRequest,
    q,
    submittedAt: new Date().toISOString(),
    submittedByName: name,
    submittedByEmail: null,
    region,
    fleetNumber: fleetNumber ? String(fleetNumber).replace(/\D/g, "") || fleetNumber : null,
    jobNumber: firstValue(q.q37_job) || firstValue(q["Job #"]) || null,
    customer,
    assetCode
  };
}

// ─── Normalized record inserters ─────────────────────────────────────────────

async function insertNormalizedRecord(supabase, destinationTable, submissionId, q) {
  if (destinationTable === "prs_jds") {
    await supabase.from("prs_jds").upsert({
      submission_id: submissionId,
      foreman_name: firstValue(q.q45_gasDecompression?.first) ? `${q.q45_gasDecompression.first} ${q.q45_gasDecompression.last}`.trim() : firstValue(q["Gas Decompression Foreman"]) || null,
      sme_name: firstValue(q.q63_gasDecompression63?.first) ? `${q.q63_gasDecompression63.first} ${q.q63_gasDecompression63.last}`.trim() : null,
      region: firstValue(q.q62_region) || firstValue(q["Region:"]) || null,
      customer: firstValue(q.q3_customer) || firstValue(q.Customer) || null,
      job_number: firstValue(q.q37_job) || firstValue(q["Job #"]) || null,
      fleet_number: firstValue(q.q4_fleetNumber) || firstValue(q["Fleet Number"]) || null,
      fuel_type: Array.isArray(q.q8_fuelType) ? q.q8_fuelType.join(", ") : firstValue(q.q8_fuelType) || firstValue(q["Fuel Type"]) || null,
      genset_type: firstValue(q.q49_typeOf49) || firstValue(q["Type of Gensets"]) || null,
      genset_count: Number(firstValue(q.q68_numberOf68) || firstValue(q["Number of Gensets on Site?"]) || 0) || null,
      job_type: firstValue(q.q46_typeOf) || firstValue(q["Type of Job"]) || null,
      prs_count: Number(firstValue(q.q41_howMany) || firstValue(q["How many PRS's will be on site?"]) || 0) || null,
      expected_flow_rate_mscfd: Number(firstValue(q.q36_expectedFlow) || 0) || null,
      customer_delivery_pressure: Number(firstValue(q.q38_whatIs38) || 0) || null,
      power_source: firstValue(q.q12_whatIs) || firstValue(q["What is the power source supplying power to the PRS?"]) || null,
      contactors_needed: Number(firstValue(q.q48_typeA48) || 0) || null,
      hp_hoses_needed: Number(firstValue(q.q54_numberOf54) || 0) || null,
      hp_hose_type: Array.isArray(q.q55_typeOf55) ? q.q55_typeOf55.join(", ") : firstValue(q.q55_typeOf55) || null,
      lp_hoses_needed: Number(firstValue(q.q53_numberOf) || 0) || null,
      lp_hose_size: firstValue(q.q57_lpHose) || null,
      lp_hose_notes: firstValue(q.q58_additionalLp) || null,
      manifold_required: String(firstValue(q.q59_manifoldRequired) || "").toLowerCase() === "yes",
      manifold_build_notes: firstValue(q.q60_explanationOf) || null,
      heater_start_sp: Number(firstValue(q.q15_heaterStart) || 0) || null,
      hp_heater_running_1_sp: Number(firstValue(q.q16_hpHeater) || 0) || null,
      bypass_sp: Number(firstValue(q.q17_bypass) || 0) || null,
      trailer_switch_sp: Number(firstValue(q.q18_trailerSwitch) || 0) || null,
      rdh_block_sp: Number(firstValue(q.q19_rdhBlock) || 0) || null,
      rdh_open_sp: Number(firstValue(q.q20_rdhOpen) || 0) || null,
      hp_heater_running_2_sp: Number(firstValue(q.q21_hpHeater21) || 0) || null,
      trailer_empty_threshold: Number(firstValue(q.q22_trailerEmpty) || 0) || null,
      interstage_blowdown: Number(firstValue(q.q23_interstageBlowdown) || 0) || null,
      trailer_switch_crossover_time: Number(firstValue(q.q24_trailerSwitch24) || 0) || null,
      lp_heater_start_sp: Number(firstValue(q.q25_lpHeater) || 0) || null,
      lp_heater_running_sp: Number(firstValue(q.q26_lpHeater26) || 0) || null,
      lp_outlet_temp_lolo: Number(firstValue(q.q27_lpOutlet) || 0) || null,
      lp_outlet_pressure_hihi: Number(firstValue(q.q28_lpOutlet28) || 0) || null,
      lp_outlet_temp_hihi: Number(firstValue(q.q29_lpOutlet29) || 0) || null,
      lp_psv_in_use: firstValue(q.q66_whichLp) || null,
      top_rdh_delivery_pressure: Number(firstValue(q.q31_topRdh) || 0) || null,
      bottom_rdh_delivery_pressure: Number(firstValue(q.q32_bottomRdh) || 0) || null,
      top_ezh_delivery_pressure: Number(firstValue(q.q33_topEzh) || 0) || null,
      bottom_ezh_delivery_pressure: Number(firstValue(q.q34_bottomEzh) || 0) || null,
      instrument_gas_pressure: Number(firstValue(q.q35_instrumentGas) || 0) || null,
      change_of_scope: firstValue(q.q69_changeOf) || null
    }, { onConflict: "submission_id" });
  }

  if (destinationTable === "filter_inspections") {
    await supabase.from("filter_inspections").upsert({
      submission_id: submissionId,
      filter_type: q["LP Cube Asset Number"] ? "LP" : "HP",
      fleet_number: firstValue(q["Fleet Number"]) || null,
      asset_code: firstValue(q["HP Cube Asset Number"]) || firstValue(q["LP Cube Asset Number"]) || null,
      customer: firstValue(q.Customer) || null,
      region: firstValue(q.Region) || null,
      filters_replaced: String(firstValue(q["Did we replace the filters?"]) || "").toLowerCase() === "yes",
      filters_replaced_detail: firstValue(q["Which Filters did we replace?"]) || null,
      workorder_number: firstValue(q["Workorder #"]) || null
    }, { onConflict: "submission_id" });
  }

  if (destinationTable === "regulator_inspections") {
    await supabase.from("regulator_inspections").upsert({
      submission_id: submissionId,
      inspection_type: q["EZH Regulator being serviced. Bottom EZH"] ? "EZH" : "RDH20",
      regulator_position: firstValue(q["EZH Regulator being serviced. Bottom EZH"]) || firstValue(q["Regulator being serviced."]) || null,
      reason_for_inspection: firstValue(q["Reason for EZH Inspection"]) || firstValue(q["Reason For RDH Inspection"]) || null,
      location_or_fleet: firstValue(q.Location) || null,
      asset_code: firstValue(q["LP Cube Asset Number"]) || firstValue(q["HP Cube Asset Number"]) || null,
      parts_replaced: firstValue(q["EZH Parts Replaced"]) || firstValue(q["RDH 20 Replaced Parts"]) || null,
      workorder_number: firstValue(q["Workorder #"]) || null,
      issue_summary: firstValue(q["Questions, Comments, Issues, or Request?"]) || null
    }, { onConflict: "submission_id" });
  }

  if (destinationTable === "prs_daily_checklists") {
    await supabase.from("prs_daily_checklists").upsert({
      submission_id: submissionId,
      fleet_number: firstValue(q["Fleet Number"]) || null,
      notes: null
    }, { onConflict: "submission_id" });
  }

  if (destinationTable === "rig_up_checklists") {
    await supabase.from("rig_up_checklists").upsert({
      submission_id: submissionId,
      fleet_number: firstValue(q["Fleet #:"]) || firstValue(q["Fleet Number"]) || null,
      region: firstValue(q.Region) || null,
      notes: null
    }, { onConflict: "submission_id" });
  }

  if (destinationTable === "truck_transfers") {
    await supabase.from("truck_transfers").upsert({
      submission_id: submissionId,
      transfer_type: q["Date Picked Up"] ? "pickup" : "dropoff",
      truck_number: firstValue(q["Truck Number"]) || null,
      license_plate: firstValue(q["License Plate Number"]) || null,
      vin_last4: firstValue(q["Last 4 of VIN"]) || null,
      employee_name: firstValue(q.Name) || null,
      department: firstValue(q.Department) || null,
      location: firstValue(q["Location of Truck"]) || null,
      samsara_installed: String(firstValue(q["Is Samsara Installed?"]) || "").toLowerCase() === "yes",
      make: firstValue(q.Make) || null,
      model: firstValue(q.Model) || null
    }, { onConflict: "submission_id" });
  }
}

// ─── Main handler ────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST"]);
    return;
  }

  const secretValid = validateWebhookSecret(req);
  let deliveryId = null;

  try {
    const supabase = getServiceClient();
    const contentType = req.headers["content-type"] || "";
    const normalized = normalizeSubmission(req.body, contentType);
    const rawPayload = typeof req.body === "object" ? req.body : { raw: req.body };

    const { data: delivery, error: deliveryError } = await supabase
      .from("webhook_deliveries")
      .insert({
        jotform_form_id: normalized.formId || null,
        jotform_submission_id: normalized.submissionId || null,
        secret_valid: secretValid,
        processing_status: secretValid ? "received" : "rejected",
        headers: req.headers,
        raw_payload: rawPayload
      })
      .select("id")
      .single();

    if (deliveryError) throw deliveryError;
    deliveryId = delivery.id;

    if (!secretValid) {
      res.status(401).json({ ok: false, error: "Invalid webhook secret." });
      return;
    }

    if (!normalized.formId || !normalized.submissionId) {
      await supabase.from("webhook_deliveries").update({
        processing_status: "failed",
        error_message: "Missing formId or submissionId",
        processed_at: new Date().toISOString()
      }).eq("id", deliveryId);

      res.status(400).json({ ok: false, error: "Missing formId or submissionId." });
      return;
    }

    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("*")
      .eq("jotform_id", normalized.formId)
      .single();

    if (formError && formError.code !== "PGRST116") throw formError;

    if (!form) {
      await supabase.from("webhook_deliveries").update({
        processing_status: "unmapped",
        error_message: `Unmapped Jotform form id ${normalized.formId}`,
        processed_at: new Date().toISOString()
      }).eq("id", deliveryId);

      res.status(202).json({ ok: true, mapped: false });
      return;
    }

    const { data: submission, error: submissionError } = await supabase
      .from("form_submissions")
      .upsert({
        form_id: form.id,
        webhook_delivery_id: deliveryId,
        jotform_submission_id: normalized.submissionId,
        submitted_at: normalized.submittedAt,
        submitted_by_name: normalized.submittedByName,
        submitted_by_email: normalized.submittedByEmail,
        region: normalized.region,
        fleet_number: normalized.fleetNumber,
        customer: normalized.customer,
        asset_code: normalized.assetCode,
        status: "processed",
        raw_payload: normalized.rawData || {},
        normalized_payload: {
          fleetNumber: normalized.fleetNumber,
          customer: normalized.customer,
          assetCode: normalized.assetCode,
          jobNumber: normalized.jobNumber,
          region: normalized.region
        }
      }, { onConflict: "jotform_submission_id" })
      .select("*")
      .single();

    if (submissionError) throw submissionError;

    await insertNormalizedRecord(supabase, form.destination_table, submission.id, normalized.q || {});

    await supabase.from("activity_events").insert({
      event_type: "form_submission",
      entity_type: "form",
      entity_key: form.form_key,
      summary: `${form.form_name} submitted${normalized.fleetNumber ? ` for Fleet ${normalized.fleetNumber}` : ""}`,
      metadata: {
        submissionId: submission.id,
        fleetNumber: normalized.fleetNumber,
        customer: normalized.customer
      }
    });

    await supabase.from("webhook_deliveries").update({
      form_id: form.id,
      processing_status: "processed",
      processed_at: new Date().toISOString()
    }).eq("id", deliveryId);

    res.status(200).json({
      ok: true,
      mapped: true,
      form: form.form_key,
      submissionId: submission.id,
      fleetNumber: normalized.fleetNumber
    });

  } catch (error) {
    if (deliveryId) {
      try {
        const supabase = getServiceClient();
        await supabase.from("webhook_deliveries").update({
          processing_status: "failed",
          error_message: error.message || "Webhook processing failed",
          processed_at: new Date().toISOString()
        }).eq("id", deliveryId);
      } catch (e) {}
    }

    res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Webhook processing failed."
    });
  }
};
