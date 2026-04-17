function firstValue(value) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function normalizeFleetNumber(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/(\d{1,3})/);
  return match ? Number(match[1]) : null;
}

function normalizeAssetCode(value) {
  const raw = String(value || "").trim().toUpperCase();

  if (!raw) {
    return null;
  }

  const fullCode = raw.match(/^06-(02|03|04|05)-001-(\d{3})$/);

  if (fullCode) {
    const prefix = {
      "02": "HP",
      "03": "LP",
      "04": "HR",
      "05": "CC"
    }[fullCode[1]];
    return `${prefix}${String(Number(fullCode[2])).padStart(2, "0")}`;
  }

  const shortCode = raw.match(/^(HP|LP|HR|CC)\s*0*(\d{1,2})$/);

  if (shortCode) {
    return `${shortCode[1]}${String(Number(shortCode[2])).padStart(2, "0")}`;
  }

  return raw;
}

function asNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTimestamp(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeSubmission(body) {
  const payload = typeof body === "string" ? safeJsonParse(body, {}) : body || {};
  const formId = String(payload.formID || payload.formId || payload.form_id || payload.form || "");
  const submissionId = String(payload.submissionID || payload.submissionId || payload.submission_id || "");
  const rawRequest =
    typeof payload.rawRequest === "string" ? safeJsonParse(payload.rawRequest, payload) : payload.rawRequest || payload;
  const q = rawRequest.q || rawRequest.pretty || rawRequest.answers || rawRequest || {};
  const name = [
    firstValue(q.Name?.first),
    firstValue(q.Name?.last)
  ]
    .filter(Boolean)
    .join(" ") || firstValue(q.Name) || firstValue(q["Filled Out By"]) || null;
  const email =
    firstValue(q.Email) ||
    firstValue(q["E-mail"]) ||
    firstValue(q["Email Address"]) ||
    null;
  const fleetNumber =
    normalizeFleetNumber(firstValue(q["Fleet Number"])) ||
    normalizeFleetNumber(firstValue(q["Fleet #"])) ||
    normalizeFleetNumber(firstValue(q["Fleet #:"])) ||
    normalizeFleetNumber(firstValue(q.Location)) ||
    null;
  const assetCode = normalizeAssetCode(
    firstValue(q["HP Cube Asset Number"]) ||
      firstValue(q["LP Cube Asset Number"]) ||
      firstValue(q["Control Cube Asset ID Number"]) ||
      firstValue(q["LPCC Asset ID"]) ||
      firstValue(q["Equipment Asset ID"]) ||
      firstValue(q["HP Cube Asset ID"]) ||
      firstValue(q["LP Cube Asset ID"]) ||
      firstValue(q["HR Cube Asset ID"]) ||
      firstValue(q["HP Cube Asset ID Number"]) ||
      firstValue(q["LP Cube Asset ID Number"]) ||
      firstValue(q["HR Cube Asset ID Number"])
  );

  return {
    formId,
    submissionId,
    rawData: rawRequest,
    q,
    submittedAt:
      parseTimestamp(firstValue(q.Date)) ||
      parseTimestamp(firstValue(q["Submission Date"])) ||
      parseTimestamp(firstValue(q["Date/Time of NPT Event - Gas Stopped"])) ||
      new Date().toISOString(),
    submittedByName: name,
    submittedByEmail: email,
    region: firstValue(q.Region) || firstValue(q["Region:"]) || null,
    fleetNumber,
    jobNumber: firstValue(q["Job #"]) || null,
    customer: firstValue(q.Customer) || null,
    assetCode
  };
}

function buildFileEntries(submissionId, answers) {
  return Object.entries(answers || {})
    .filter(([_, value]) => Array.isArray(value) && value.some((item) => typeof item === "string" && /^https?:\/\//.test(item)))
    .flatMap(([fieldLabel, value]) =>
      value
        .filter((item) => typeof item === "string" && /^https?:\/\//.test(item))
        .map((fileUrl) => ({
          submission_id: submissionId,
          field_label: fieldLabel,
          file_url: fileUrl,
          file_name: String(fileUrl).split("/").pop() || null
        }))
    );
}

async function insertNormalizedRecord(supabase, destinationTable, submissionId, q) {
  if (destinationTable === "filter_inspections") {
    await supabase.from("filter_inspections").upsert(
      {
        submission_id: submissionId,
        filter_type: q["LP Cube Asset Number"] ? "LP" : "HP",
        fleet_number: normalizeFleetNumber(firstValue(q["Fleet Number"])),
        asset_code: normalizeAssetCode(firstValue(q["HP Cube Asset Number"]) || firstValue(q["LP Cube Asset Number"])),
        customer: firstValue(q.Customer) || null,
        region: firstValue(q.Region) || null,
        filters_replaced: String(firstValue(q["Did we replace the filters?"]) || "").toLowerCase() === "yes",
        filters_replaced_detail: firstValue(q["Which Filters did we replace?"]) || null,
        workorder_number: firstValue(q["Workorder #"]) || null
      },
      { onConflict: "submission_id" }
    );
    return;
  }

  if (destinationTable === "regulator_inspections") {
    const isEzh = Boolean(firstValue(q["EZH Regulator being serviced. Bottom EZH"]));

    await supabase.from("regulator_inspections").upsert(
      {
        submission_id: submissionId,
        inspection_type: isEzh ? "EZH" : "RDH20",
        regulator_family: isEzh ? "EZH" : "RDH20",
        regulator_position: firstValue(q["EZH Regulator being serviced. Bottom EZH"]) || firstValue(q["Regulator being serviced."]) || null,
        reason_for_inspection: firstValue(q["Reason for EZH Inspection"]) || firstValue(q["Reason For RDH Inspection"]) || null,
        location_or_fleet: firstValue(q.Location) || null,
        asset_code: normalizeAssetCode(firstValue(q["LP Cube Asset Number"]) || firstValue(q["HP Cube Asset Number"])),
        overall_condition: firstValue(q["EZH Seat ORing Condition"]) || firstValue(q["Check One"]) || null,
        parts_replaced: firstValue(q["EZH Parts Replaced"]) || firstValue(q["RDH 20 Replaced Parts"]) || null,
        workorder_number: firstValue(q["Workorder #"]) || null,
        issue_summary:
          firstValue(q["Questions, Comments, Issues, or Request?"]) ||
          firstValue(q["Overall regulator condition - Comments/ Parts Used "]) ||
          null
      },
      { onConflict: "submission_id" }
    );
    return;
  }

  if (destinationTable === "prs_daily_checklists") {
    await supabase.from("prs_daily_checklists").upsert(
      {
        submission_id: submissionId,
        fleet_number: normalizeFleetNumber(firstValue(q["Fleet Number"])),
        control_cube_asset_code: normalizeAssetCode(firstValue(q["Control Cube Asset ID Number"])),
        hp_asset_code: normalizeAssetCode(firstValue(q["HP Cube Asset ID Number"])),
        lp_asset_code: normalizeAssetCode(firstValue(q["LP Cube Asset ID Number"])),
        hr_asset_code: normalizeAssetCode(firstValue(q["HR Cube Asset ID Number"])),
        top_rdh_status: firstValue(q["Top RDH"]) || null,
        bottom_rdh_status: firstValue(q["Bottom RDH"]) || null,
        top_ezh_status: firstValue(q["Top EZH"]) || null,
        bottom_ezh_status: firstValue(q["Bottom EZH"]) || null,
        pressure_upstream_rdh: asNumber(firstValue(q["Pressure upstream of the RDH valves"])),
        pressure_downstream_rdh: asNumber(firstValue(q["Pressure downstream of the RDH valves"])),
        pressure_upstream_ezh: asNumber(firstValue(q["Pressure upstream of the EZH regulator"])),
        pressure_downstream_ezh: asNumber(firstValue(q["Pressure downstream of the EZH regulator"])),
        notes: firstValue(q["Questions, Comments, Issues, or Request?"]) || null
      },
      { onConflict: "submission_id" }
    );
    return;
  }

  if (destinationTable === "rig_up_checklists") {
    await supabase.from("rig_up_checklists").upsert(
      {
        submission_id: submissionId,
        fleet_number: normalizeFleetNumber(firstValue(q["Fleet #:"]) || firstValue(q["Fleet Number"])),
        lpcc_asset_code: normalizeAssetCode(firstValue(q["LPCC Asset ID"])),
        hp_asset_code: normalizeAssetCode(firstValue(q["HP Cube Asset ID"])),
        lp_asset_code: normalizeAssetCode(firstValue(q["LP Cube Asset ID"])),
        hr_asset_code: normalizeAssetCode(firstValue(q["HR Cube Asset ID"])),
        region: firstValue(q.Region) || null,
        rig_up_completed_at: parseTimestamp(firstValue(q["Date Completed"])),
        projected_start_at: parseTimestamp(firstValue(q["Projected Start Date"])),
        requested_customer_pressure: asNumber(firstValue(q["Confirm gas pressure requested to customer and add here:"])),
        top_rdh_pressure: asNumber(firstValue(q["Top RDH Pressure:"])),
        bottom_rdh_pressure: asNumber(firstValue(q["Bottom RDH Pressure:"])),
        top_ezh_pressure: asNumber(firstValue(q["Top EZH Pressure:"])),
        bottom_ezh_pressure: asNumber(firstValue(q["Bottom EZH Pressure:"])),
        vg_efleet_or_dual_fuel: firstValue(q["Is this a VG E Fleet or Dual Fuel?"]) || null,
        notes: firstValue(q["Questions, Comments, Issues, or Request?"]) || null
      },
      { onConflict: "submission_id" }
    );
    return;
  }

  if (destinationTable === "truck_transfers") {
    const transferType = q["Date Picked Up"] ? "pickup" : "dropoff";

    await supabase.from("truck_transfers").upsert(
      {
        submission_id: submissionId,
        transfer_type: transferType,
        truck_number: firstValue(q["Truck Number"]) || null,
        license_plate: firstValue(q["License Plate Number"]) || null,
        vin_last4: firstValue(q["Last 4 of VIN"]) || null,
        employee_name: firstValue(q.Name) || null,
        department: firstValue(q.Department) || firstValue(q.Deparment) || null,
        location: firstValue(q["Location of Truck"]) || null,
        transfer_date: parseTimestamp(firstValue(q["Date Picked Up"]) || firstValue(q["Date Dropped Off"])),
        samsara_installed: String(firstValue(q["Is Samsara Installed?"]) || "").toLowerCase() === "yes",
        make: firstValue(q.Make) || null,
        model: firstValue(q.Model) || null,
        notes: firstValue(q.Notes) || null
      },
      { onConflict: "submission_id" }
    );
    return;
  }

  if (destinationTable === "prs_jds") {
    await supabase.from("prs_jds").upsert(
      {
        submission_id: submissionId,
        foreman_name: firstValue(q["Gas Decompression Foreman"]) || null,
        sme_name: firstValue(q["Gas Decompression SME"]) || null,
        region: firstValue(q["Region:"]) || firstValue(q.Region) || null,
        customer: firstValue(q.Customer) || null,
        job_number: firstValue(q["Job #"]) || null,
        fleet_number: normalizeFleetNumber(firstValue(q["Fleet Number"])),
        rig_in_date: parseTimestamp(firstValue(q["Rig In Date"])),
        fuel_type: firstValue(q["Fuel Type"]) || null,
        genset_type: firstValue(q["Type of Gensets"]) || null,
        genset_count: asNumber(firstValue(q["Number of Gensets on Site?"])),
        job_type: firstValue(q["Type of Job"]) || null,
        prs_count: asNumber(firstValue(q["How many PRS's will be on site?"])),
        expected_flow_rate_mscfd: asNumber(firstValue(q["Expected Flow Rate MSCF/D?"])),
        customer_delivery_pressure: asNumber(firstValue(q["What is the Customer Delivery Pressure?"])),
        power_source: firstValue(q["What is the power source supplying power to the PRS?"]) || null,
        contactors_needed: asNumber(firstValue(q["Number of Contactors Needed Enabled?"])),
        hp_hoses_needed: asNumber(firstValue(q["Number of HP Hoses Needed?"])),
        hp_hose_type: firstValue(q["Type of HP Hoses Needed."]) || null,
        lp_hoses_needed: asNumber(firstValue(q["Number of LP Hoses Needed?"])),
        lp_hose_size: firstValue(q["LP Hose Size Needed?"]) || null,
        lp_hose_notes: firstValue(q["Additional LP Hose Notes."]) || null,
        manifold_required: String(firstValue(q["Manifold required."]) || "").toLowerCase() === "yes",
        manifold_build_notes: firstValue(q["Explanation of the manifold build needed."]) || null,
        heater_start_sp: asNumber(firstValue(q["Heater Start SP"])),
        hp_heater_running_1_sp: asNumber(firstValue(q["HP Heater Running 1"])),
        bypass_sp: asNumber(firstValue(q["Bypass"])),
        trailer_switch_sp: asNumber(firstValue(q["Trailer Switch"])),
        rdh_block_sp: asNumber(firstValue(q["RDH Block SP"])),
        rdh_open_sp: asNumber(firstValue(q["RDH Open SP"])),
        hp_heater_running_2_sp: asNumber(firstValue(q["HP Heater 2 Running"])),
        trailer_empty_threshold: asNumber(firstValue(q["Trailer Empty Pressure Threshold"])),
        interstage_blowdown: asNumber(firstValue(q["Interstage Blowdown"])),
        trailer_switch_crossover_time: asNumber(firstValue(q["Trailer Switch Crossover Time"])),
        lp_heater_start_sp: asNumber(firstValue(q["LP Heater Start Up"])),
        lp_heater_running_sp: asNumber(firstValue(q["LP Heater Running"])),
        lp_outlet_temp_lolo: asNumber(firstValue(q["LP Outlet Temp LoLo"])),
        lp_outlet_pressure_hihi: asNumber(firstValue(q["LP Outlet Pressure HiHi"])),
        lp_outlet_temp_hihi: asNumber(firstValue(q["LP Outlet Temp HiHi"])),
        lp_psv_in_use: firstValue(q["Which LP PSV is being utilized?"]) || null,
        top_rdh_delivery_pressure: asNumber(firstValue(q["Top RDH Delivery Pressure"])),
        bottom_rdh_delivery_pressure: asNumber(firstValue(q["Bottom RDH Delivery Pressure"])),
        top_ezh_delivery_pressure: asNumber(firstValue(q["Top EZH Delivery Pressure"])),
        bottom_ezh_delivery_pressure: asNumber(firstValue(q["Bottom EZH Delivery Pressure"])),
        instrument_gas_pressure: asNumber(firstValue(q["Instrument Gas Pressure"])),
        change_of_scope: firstValue(q["Change of scope:"]) || null
      },
      { onConflict: "submission_id" }
    );
    return;
  }

  if (destinationTable === "npt_events") {
    const startTime =
      parseTimestamp(firstValue(q["Date/Time of NPT Event - Gas Started"])) ||
      parseTimestamp(firstValue(q["Date/Time of NPT Event - Start"]));
    const stopTime =
      parseTimestamp(firstValue(q["Date/Time of NPT Event - Gas Stopped"])) ||
      parseTimestamp(firstValue(q["Date/Time of NPT Event - Stop"]));
    const explicitHours =
      asNumber(firstValue(q["Duration (Hours)"])) ||
      asNumber(firstValue(q["Total NPT Hours"])) ||
      asNumber(firstValue(q["Hours of NPT"]));
    let calculatedHours = explicitHours;

    if (calculatedHours === null && startTime && stopTime) {
      calculatedHours = Math.max((new Date(stopTime).getTime() - new Date(startTime).getTime()) / 3600000, 0);
    }

    await supabase.from("npt_events").upsert(
      {
        submission_id: submissionId,
        fleet_number: normalizeFleetNumber(firstValue(q["Fleet Number"]) || firstValue(q["Fleet #:"])),
        customer: firstValue(q.Customer) || null,
        region: firstValue(q.Region) || null,
        job_number: firstValue(q["Job #"]) || null,
        event_started_at: startTime,
        event_stopped_at: stopTime,
        total_hours: calculatedHours,
        issue_summary:
          firstValue(q["NPT Event Description"]) ||
          firstValue(q["Description of Event"]) ||
          firstValue(q["Questions, Comments, Issues, or Request?"]) ||
          null,
        corrective_action:
          firstValue(q["Corrective Action Taken"]) ||
          firstValue(q["Action Taken"]) ||
          null
      },
      { onConflict: "submission_id" }
    );
  }
}

module.exports = {
  asNumber,
  buildFileEntries,
  firstValue,
  insertNormalizedRecord,
  normalizeAssetCode,
  normalizeFleetNumber,
  normalizeSubmission,
  parseTimestamp
};
