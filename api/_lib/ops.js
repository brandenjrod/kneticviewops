function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function startOfWeek(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function weekKeyFromDate(value) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfWeek(parsed).toISOString().slice(0, 10);
}

function fillMissingWeeks(weeksBack) {
  const rows = [];
  const today = new Date();
  const current = startOfWeek(today);

  for (let index = weeksBack - 1; index >= 0; index -= 1) {
    const weekStart = new Date(current);
    weekStart.setDate(current.getDate() - index * 7);
    rows.push(weekStart.toISOString().slice(0, 10));
  }

  return rows;
}

function numericSort(left, right) {
  return Number(left) - Number(right);
}

function buildMetrics({ assets, boardRows, fleets, submissions, trucks }) {
  const now = Date.now();
  const lastThirtyDays = now - 30 * 24 * 60 * 60 * 1000;
  const activeFleets = fleets.filter((fleet) => !fleet.is_archived);
  const activePackages = boardRows.filter((row) => row.status === "inuse");
  const scheduledMoves = activeFleets.filter((fleet) => fleet.move_status === "scheduled" && fleet.move_date);
  const recentSubmissions = submissions.filter((submission) => new Date(submission.submitted_at).getTime() >= lastThirtyDays);
  const maintenanceSubmissions = recentSubmissions.filter((submission) => {
    const category = submission.form?.category || "";
    return category === "maintenance" || category === "inspection";
  });
  const truckTransfers = recentSubmissions.filter((submission) => submission.form?.category === "trucking");
  const weeks = fillMissingWeeks(8);
  const weeklySeries = new Map(
    weeks.map((week) => [
      week,
      {
        week,
        total: 0,
        job_setup: 0,
        inspection: 0,
        maintenance: 0,
        deployment: 0,
        trucking: 0,
        daily_ops: 0,
        npt: 0
      }
    ])
  );
  const formBreakdown = new Map();

  submissions.forEach((submission) => {
    const week = weekKeyFromDate(submission.submitted_at);
    const category = submission.form?.category || "other";
    const formName = submission.form?.form_name || "Unknown Form";

    if (week && weeklySeries.has(week)) {
      const bucket = weeklySeries.get(week);
      bucket.total += 1;
      bucket[category] = (bucket[category] || 0) + 1;
    }

    const existing = formBreakdown.get(formName) || {
      formName,
      category,
      count: 0
    };
    existing.count += 1;
    formBreakdown.set(formName, existing);
  });

  const upgradeAssets = assets
    .filter((asset) => asset.upgrade_progress !== null && asset.upgrade_progress !== undefined)
    .sort((left, right) => left.asset_number.localeCompare(right.asset_number));
  const completed = upgradeAssets.filter((asset) => Number(asset.upgrade_progress) >= 0.999).length;
  const inProgress = upgradeAssets.filter((asset) => Number(asset.upgrade_progress) > 0 && Number(asset.upgrade_progress) < 0.999).length;
  const notStarted = upgradeAssets.filter((asset) => Number(asset.upgrade_progress) === 0).length;
  const overall =
    upgradeAssets.length === 0
      ? 0
      : upgradeAssets.reduce((total, asset) => total + Number(asset.upgrade_progress || 0), 0) / upgradeAssets.length;

  const truckStatus = {
    total: trucks.length,
    inUse: trucks.filter((truck) => String(truck.truck_status || "").toLowerCase().includes("in use")).length,
    inShop: trucks.filter((truck) => {
      const status = String(truck.truck_status || "").toLowerCase();
      return status.includes("shop") || status.includes("repair");
    }).length,
    pmDue: trucks.filter((truck) => String(truck.truck_status || "").toLowerCase().includes("pm")).length
  };

  return {
    summary: {
      activeFleets: activeFleets.length,
      livePackages: activePackages.length,
      scheduledMoves: scheduledMoves.length,
      recentSubmissions: recentSubmissions.length,
      maintenanceActions: maintenanceSubmissions.length,
      truckTransfers: truckTransfers.length
    },
    weeklySubmissions: Array.from(weeklySeries.values()),
    formBreakdown: Array.from(formBreakdown.values()).sort((left, right) => right.count - left.count),
    recentSubmissions: submissions.slice(0, 12).map((submission) => ({
      id: submission.id,
      jotformSubmissionId: submission.jotform_submission_id,
      submittedAt: submission.submitted_at,
      submittedByName: submission.submitted_by_name,
      customer: submission.customer,
      fleetNumber: submission.fleet_number,
      assetCode: submission.asset_code,
      formName: submission.form?.form_name || "Unknown Form",
      category: submission.form?.category || "other",
      status: submission.status
    })),
    upcomingMoves: scheduledMoves
      .sort((left, right) => String(left.move_date || "").localeCompare(String(right.move_date || "")))
      .slice(0, 8)
      .map((fleet) => ({
        fleet: fleet.fleet_number,
        customer: fleet.customer,
        prsType: fleet.prs_type,
        moveDate: fleet.move_date
      })),
    upgrade: {
      overall,
      completed,
      inProgress,
      notStarted,
      assets: upgradeAssets.slice(0, 12).map((asset) => ({
        asset: asset.asset_number,
        progress: Number(asset.upgrade_progress || 0)
      }))
    },
    trucking: truckStatus
  };
}

function buildDetailStore(notes, workOrders) {
  const store = {
    asset: {},
    package: {},
    fleet: {}
  };

  notes.forEach((note) => {
    const bucket = store[note.entity_type];

    if (!bucket) {
      return;
    }

    if (!bucket[note.entity_key]) {
      bucket[note.entity_key] = {
        notes: [],
        workOrders: []
      };
    }

    bucket[note.entity_key].notes.push({
      text: note.note_text,
      date: new Date(note.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    });
  });

  workOrders.forEach((order) => {
    const bucket = store[order.entity_type];

    if (!bucket) {
      return;
    }

    if (!bucket[order.entity_key]) {
      bucket[order.entity_key] = {
        notes: [],
        workOrders: []
      };
    }

    bucket[order.entity_key].workOrders.push({
      id: order.work_order_number,
      text: order.order_text,
      complete: Boolean(order.is_complete)
    });
  });

  return store;
}

function buildMaintenanceRequests(workOrders, submissions) {
  const openOrders = workOrders
    .filter((order) => !order.is_complete)
    .sort((left, right) => {
      const leftFleet = Number((left.entity_key || "").replace(/\D+/g, "")) || 9999;
      const rightFleet = Number((right.entity_key || "").replace(/\D+/g, "")) || 9999;
      return leftFleet - rightFleet || left.work_order_number.localeCompare(right.work_order_number);
    })
    .slice(0, 8)
    .map((order) => ({
      id: order.id,
      title: order.work_order_number,
      fleet: order.entity_type === "fleet" ? order.entity_key : "General",
      status: "Open work order",
      notes: order.order_text
    }));

  if (openOrders.length) {
    return openOrders;
  }

  return submissions
    .filter((submission) => {
      const category = submission.form?.category || "";
      return category === "maintenance" || category === "inspection";
    })
    .slice(0, 6)
    .map((submission) => ({
      id: submission.id,
      title: submission.form?.form_name || "Recent submission",
      fleet: submission.fleet_number ? `Fleet ${submission.fleet_number}` : "General",
      status: "Recent intake",
      notes: submission.customer || submission.asset_code || "Awaiting review"
    }));
}

function normalizeBoardRows(rows) {
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    allocation: row.allocation,
    HP: row.hp || "",
    LP: row.lp || "",
    HR: row.hr || "",
    CC: row.cc || ""
  }));
}

function normalizeFleetRows(rows) {
  return rows
    .map((row) => ({
      fleet_number: Number(row.fleet_number),
      customer: row.customer || "Pending",
      fuel_type: row.fuel_type || "Pending",
      region: row.region || "Pending",
      prs_count: row.prs_count,
      prs_type: row.prs_type || "Pending",
      pressure: row.pressure || "Pending",
      jds_status: row.jds_status || "Pending",
      grafana_status: row.grafana_status || "Pending",
      jotform_status: row.jotform_status || "Pending",
      notes: row.notes || "Pending",
      move_status: row.move_status || "tbd",
      move_date: row.move_date || null,
      is_archived: Boolean(row.is_archived)
    }))
    .sort((left, right) => numericSort(left.fleet_number, right.fleet_number));
}

function normalizeTruckRows(rows) {
  return rows
    .map((row) => ({
      assetId: row.asset_id,
      vin: row.vin || "Pending",
      plate: row.license_plate || "Pending",
      vehicle: row.vehicle_label || [row.make, row.model].filter(Boolean).join(" ") || "Pending",
      status: row.truck_status || "Pending",
      assigned: row.assigned_group || "Pending",
      driver: row.driver || "Pending",
      fleet: row.fleet_assignment || "Pending",
      notes: row.notes || "Pending"
    }))
    .sort((left, right) => left.assetId.localeCompare(right.assetId));
}

module.exports = {
  buildDetailStore,
  buildMaintenanceRequests,
  buildMetrics,
  normalizeBoardRows,
  normalizeFleetRows,
  normalizeTruckRows,
  toIsoDate
};
