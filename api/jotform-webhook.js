const { validateWebhookSecret } = require("./_lib/auth");
const { methodNotAllowed, parseIncomingBody } = require("./_lib/http");
const { buildFileEntries, firstValue, insertNormalizedRecord, normalizeAssetCode, normalizeFleetNumber, normalizeSubmission } = require("./_lib/jotform");
const { getServiceClient } = require("./_lib/supabase");

async function upsertFleetSnapshot(supabase, normalized, form, answers) {
  if (!normalized.fleetNumber) {
    return;
  }

  const payload = {
    fleet_number: normalized.fleetNumber,
    customer: normalized.customer || null,
    region: normalized.region || null,
    fuel_type: firstValue(answers["Fuel Type"]) || null,
    prs_count: Number(firstValue(answers["How many PRS's will be on site?"]) || 0) || null,
    prs_type: firstValue(answers["Type of Job"]) || null,
    jds_status: form.form_key === "prs_jds" ? "Submitted" : undefined
  };
  const cleaned = Object.fromEntries(Object.entries(payload).filter(([_, value]) => value !== undefined));

  await supabase.from("fleets").upsert(cleaned, {
    onConflict: "fleet_number"
  });
}

async function upsertTruckSnapshot(supabase, form, answers) {
  if (form.destination_table !== "truck_transfers") {
    return;
  }

  const truckNumber = String(firstValue(answers["Truck Number"]) || "").trim();

  if (!truckNumber) {
    return;
  }

  await supabase.from("trucks").upsert(
    {
      asset_id: truckNumber,
      license_plate: firstValue(answers["License Plate Number"]) || null,
      vin: firstValue(answers["Last 4 of VIN"]) || null,
      make: firstValue(answers.Make) || null,
      model: firstValue(answers.Model) || null,
      vehicle_label: [firstValue(answers.Make), firstValue(answers.Model)].filter(Boolean).join(" ") || null,
      driver: firstValue(answers.Name) || null,
      fleet_assignment: firstValue(answers["Location of Truck"]) || null,
      truck_status: answers["Date Picked Up"] ? "In Use" : "Available",
      notes: firstValue(answers.Notes) || null
    },
    { onConflict: "asset_id" }
  );
}

async function logSubmissionEvent(supabase, form, submission, normalized) {
  await supabase.from("activity_events").insert({
    event_type: "form_submission",
    entity_type: "form",
    entity_key: form.form_key,
    summary: `${form.form_name} submitted${normalized.fleetNumber ? ` for Fleet ${normalized.fleetNumber}` : ""}`,
    metadata: {
      submissionId: submission.id,
      jotformSubmissionId: submission.jotform_submission_id,
      fleetNumber: normalized.fleetNumber,
      assetCode: normalized.assetCode,
      customer: normalized.customer
    },
    occurred_at: normalized.submittedAt
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST"]);
    return;
  }

  const secretValid = validateWebhookSecret(req);
  let deliveryId = null;

  try {
    const supabase = getServiceClient();
    const body = await parseIncomingBody(req);
    const normalized = normalizeSubmission(body);
    const rawPayload = typeof body === "object" ? body : { raw: body };

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

    if (deliveryError) {
      throw deliveryError;
    }

    deliveryId = delivery.id;

    if (!secretValid) {
      res.status(401).json({
        ok: false,
        error: "Invalid webhook secret."
      });
      return;
    }

    if (!normalized.formId || !normalized.submissionId) {
      await supabase
        .from("webhook_deliveries")
        .update({
          processing_status: "failed",
          error_message: "Missing formId or submissionId",
          processed_at: new Date().toISOString()
        })
        .eq("id", deliveryId);

      res.status(400).json({
        ok: false,
        error: "Missing formId or submissionId."
      });
      return;
    }

    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("*")
      .eq("jotform_id", normalized.formId)
      .single();

    if (formError && formError.code !== "PGRST116") {
      throw formError;
    }

    if (!form) {
      await supabase
        .from("webhook_deliveries")
        .update({
          processing_status: "unmapped",
          error_message: `Unmapped Jotform form id ${normalized.formId}`,
          processed_at: new Date().toISOString()
        })
        .eq("id", deliveryId);

      res.status(202).json({
        ok: true,
        mapped: false,
        error: `No form mapping exists for Jotform id ${normalized.formId}. Raw payload was stored.`
      });
      return;
    }

    const submissionPayload = {
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
      raw_payload: normalized.rawData,
      normalized_payload: {
        fleetNumber: normalized.fleetNumber,
        customer: normalized.customer,
        assetCode: normalized.assetCode,
        jobNumber: normalized.jobNumber,
        region: normalized.region
      }
    };

    const { data: submission, error: submissionError } = await supabase
      .from("form_submissions")
      .upsert(submissionPayload, {
        onConflict: "jotform_submission_id"
      })
      .select("*")
      .single();

    if (submissionError) {
      throw submissionError;
    }

    const answers = normalized.q || {};
    const files = buildFileEntries(submission.id, answers);

    if (files.length) {
      await supabase.from("form_submission_files").delete().eq("submission_id", submission.id);
      const { error: fileError } = await supabase.from("form_submission_files").insert(files);

      if (fileError) {
        throw fileError;
      }
    }

    await insertNormalizedRecord(supabase, form.destination_table, submission.id, answers);
    await upsertFleetSnapshot(supabase, normalized, form, answers);
    await upsertTruckSnapshot(supabase, form, answers);
    await logSubmissionEvent(supabase, form, submission, normalized);

    await supabase
      .from("webhook_deliveries")
      .update({
        form_id: form.id,
        processing_status: "processed",
        processed_at: new Date().toISOString()
      })
      .eq("id", deliveryId);

    res.status(200).json({
      ok: true,
      mapped: true,
      form: form.form_key,
      submissionId: submission.id,
      fleetNumber: normalizeFleetNumber(normalized.fleetNumber),
      assetCode: normalizeAssetCode(normalized.assetCode)
    });
  } catch (error) {
    if (deliveryId) {
      try {
        const supabase = getServiceClient();
        await supabase
          .from("webhook_deliveries")
          .update({
            processing_status: "failed",
            error_message: error.message || "Webhook processing failed",
            processed_at: new Date().toISOString()
          })
          .eq("id", deliveryId);
      } catch (secondaryError) {
        // Ignore follow-up logging errors.
      }
    }

    res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Webhook processing failed."
    });
  }
};
