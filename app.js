const TOTAL_ASSETS = 60;
const TOTAL_FLEETS = 200;
const ASSET_ORDER = ["HP", "LP", "HR", "CC"];
const BASE_SEGMENT_TO_CATEGORY = {
  "02": "HP",
  "03": "LP",
  "04": "HR",
  "05": "CC"
};

const CATEGORY_INFO = {
  HP: { base: "06-02-001", label: "High Pressure" },
  LP: { base: "06-03-001", label: "Low Pressure" },
  HR: { base: "06-04-001", label: "Hose Reel" },
  CC: { base: "06-05-001", label: "Control Cube" }
};

const INITIAL_BOARD_ROWS = [
  ...buildSeedRows("ready", "Standby", [
    ["HP17", "LP40", "", "CC15"],
    ["HP30", "LP27", "", "CC37"],
    ["HP10", "LP11", "", "CC21"],
    ["HP28", "LP08", "HR08", "CC22"]
  ]),
  ...buildSeedRows("testing", "Testing", [
    ["HP06", "LP49", "", "CC23"],
    ["HP16", "LP18", "", "CC09"]
  ]),
  ...buildSeedRows("queue", "In Queue", [
    ["HP18", "LP03", "HR09", "CC17"],
    ["HP46", "LP10", "HR11", "CC20"]
  ]),
  ...buildSeedRows("oos", "Standby", [
    ["HP02", "", "", ""],
    ["HP05", "", "", ""],
    ["HP11", "", "", ""],
    ["HP08", "", "", ""],
    ["HP21", "", "", ""],
    ["HP29", "", "", ""],
    ["HP03", "", "", ""],
    ["HP13", "", "", ""],
    ["HP32", "", "", ""],
    ["HP50", "", "", ""],
    ["", "LP04", "", ""]
  ]),
  ...buildSeedRows("inuse", "Fleet 2", [["HP34", "LP06", "HR26", "CC40"]]),
  ...buildSeedRows("inuse", "Fleet 4", [["", "LP23", "HR16", "CC14"]]),
  ...buildSeedRows("inuse", "Fleet 5", [["HP14", "LP16", "HR06", "CC42"]]),
  ...buildSeedRows("inuse", "Fleet 8", [["HP24", "LP50", "HR23", "CC39"]]),
  ...buildSeedRows("inuse", "Fleet 14", [["HP35", "LP01", "HR35", "CC28"]]),
  ...buildSeedRows("inuse", "Fleet 25", [["HP42", "LP26", "HR07", "CC07"]]),
  ...buildSeedRows("inuse", "Fleet 35", [["HP49", "LP51", "HR21", "CC05"]]),
  ...buildSeedRows("inuse", "Fleet 38", [["HP36", "LP44", "", "CC52"], ["HP43", "LP47", "", "CC46"]]),
  ...buildSeedRows("inuse", "Fleet 41", [["HP31", "LP35", "", "CC27"]]),
  ...buildSeedRows("inuse", "Fleet 50", [["HP15", "LP17", "", "CC24"], ["HP38", "LP43", "HR03", "CC43"]]),
  ...buildSeedRows("inuse", "Fleet 51", [["HP25", "LP28", "", "CC12"], ["HP33", "LP37", "HR33", "CC38"]]),
  ...buildSeedRows("inuse", "Fleet 57", [["", "LP07", "HR05", "CC29"]]),
  ...buildSeedRows("inuse", "Fleet 61", [["HP09", "LP14", "", ""], ["HP07", "LP15", "", "CC16"]]),
  ...buildSeedRows("inuse", "Fleet 91", [["HP27", "LP29", "HR18", "CC30"]]),
  ...buildSeedRows("inuse", "Fleet 93", [["HP26", "LP05", "HR02", "CC19"], ["HP20", "LP22", "", "CC18"]]),
  ...buildSeedRows("inuse", "Fleet 101", [["HP01", "LP36", "", "CC26"]]),
  ...buildSeedRows("inuse", "Fleet 120", [["HP22", "LP09", "HR17", "CC31"]]),
  ...buildSeedRows("inuse", "Fleet 135", [["HP37", "LP02", "HR25", "CC41"]]),
  ...buildSeedRows("inuse", "Fleet 157", [["", "LP46", "", "CC50"], ["", "LP38", "", "CC33"], ["", "LP52", "", "CC48"], ["", "LP42", "", "CC44"], ["HP47", "LP31", "", "CC06"], ["HP41", "LP39", "", "CC32"]]),
  ...buildSeedRows("inuse", "Fleet 159", [["HP04", "LP34", "HR19", "CC51"], ["HP39", "LP41", "HR19", "CC11"]]),
  ...buildSeedRows("inuse", "Fleet 175", [["HP45", "LP20", "", "CC34"], ["HP12", "LP33", "", "CC10"]]),
  ...buildSeedRows("inuse", "Fleet 178", [["HP10", "LP11", "", "CC21"], ["HP23", "LP30", "", "CC35"], ["HP44", "LP19", "", "CC45"]]),
  ...buildSeedRows("inuse", "Fleet 180", [["HP51", "LP24", "HR38", "CC08"]]),
  ...buildSeedRows("inuse", "Fleet 187", [["HP40", "LP45", "HR10", "CC36"]])
];

let boardRows = cloneBoardRows(INITIAL_BOARD_ROWS);
let READY_PACKAGES = [];
let TESTING_PACKAGES = [];
let QUEUE_PACKAGES = [];
let OOS_ASSETS = new Set();
let IN_USE_FLEETS = [];
let FLEET_LOOKUP = new Map();
let ACTIVE_FLEET_SET = new Set();
let IN_USE_PACKAGES = [];
let PACKAGE_REGISTRY = new Map();
let ASSET_ASSIGNMENTS = new Map();

const detailStore = {
  asset: {
    HP01: {
      notes: [
        {
          text: "Field assignment synced to the current roster update for Fleet 101.",
          date: "Mar 13, 2026"
        }
      ],
      workOrders: [{ id: "WO-1111", text: "Confirm pressure package turnover notes", complete: false }]
    }
  },
  package: {
    [formatFleetPackageId(101, "A")]: {
      notes: [
        {
          text: "Package roster updated to match the latest fleet allocation sheet.",
          date: "Mar 13, 2026"
        }
      ],
      workOrders: [{ id: "WO-2202", text: "Validate field package paperwork", complete: false }]
    }
  }
};

const RIG_MOVE_DATA = [
  { fleet: 2, moveDate: "2026-03-23", label: "Mar 23, 2026", status: "scheduled" },
  { fleet: 4, moveDate: "2026-05-05", label: "May 5, 2026", status: "scheduled" },
  { fleet: 5, moveDate: "2026-03-28", label: "Mar 28, 2026", status: "scheduled" },
  { fleet: 8, moveDate: "", label: "TBD", status: "tbd" },
  { fleet: 14, moveDate: "", label: "TBD", status: "tbd" },
  { fleet: 25, moveDate: "", label: "TBD", status: "tbd" },
  { fleet: 35, moveDate: "", label: "TBD", status: "tbd" },
  { fleet: 38, moveDate: "2026-03-21", label: "Mar 21, 2026", status: "scheduled" },
  { fleet: 41, moveDate: "2026-03-17", label: "Mar 17, 2026", status: "scheduled" },
  { fleet: 50, moveDate: "2026-04-09", label: "Apr 9, 2026", status: "scheduled" },
  { fleet: 51, moveDate: "2026-03-25", label: "Mar 25, 2026", status: "scheduled" },
  { fleet: 57, moveDate: "", label: "TBD", status: "tbd" },
  { fleet: 61, moveDate: "", label: "Permanent Site", status: "permanent" },
  { fleet: 91, moveDate: "2026-03-23", label: "Mar 23, 2026", status: "scheduled" },
  { fleet: 93, moveDate: "", label: "TBD", status: "tbd" },
  { fleet: 101, moveDate: "", label: "Permanent Site", status: "permanent" },
  { fleet: 120, moveDate: "", label: "TBD", status: "tbd" },
  { fleet: 135, moveDate: "2026-03-23", label: "Mar 23, 2026", status: "scheduled" },
  { fleet: 157, moveDate: "", label: "Permanent Site", status: "permanent" },
  { fleet: 159, moveDate: "2026-03-31", label: "Mar 31, 2026", status: "scheduled" },
  { fleet: 175, moveDate: "", label: "Permanent Site", status: "permanent" },
  { fleet: 178, moveDate: "", label: "Permanent Site", status: "permanent" },
  { fleet: 180, moveDate: "2026-03-26", label: "Mar 26, 2026", status: "scheduled" },
  { fleet: 187, moveDate: "2026-04-01", label: "Apr 1, 2026", status: "scheduled" }
];

const FLEET_REFERENCE_ROWS = [
  { fleet: 2, customer: "Conoco", gasType: "CNG", region: "Permian & Delaware", prsCount: "1x PRS", prsType: "PRS Retrofit" },
  { fleet: 4, customer: "Aethon", gasType: "FG", region: "ETX", prsCount: "1x PRS", prsType: "LP Only" },
  { fleet: 5, customer: "Civitas", gasType: "CNG", region: "Colorado", prsCount: "1x PRS", prsType: "PRS Retrofit" },
  { fleet: 8, customer: "Diamondback", gasType: "CNG / FG", region: "Permian", prsCount: "1x PRS", prsType: "PRS Retrofit" },
  { fleet: 14, customer: "Diamondback", gasType: "CNG / FG", region: "Permian", prsCount: "1x PRS", prsType: "PRS Retrofit" },
  { fleet: 25, customer: "Exxon", gasType: "CNG / FG", region: "Permian", prsCount: "1x PRS", prsType: "LPCC Retrofit" },
  { fleet: 35, customer: "Ovintiv", gasType: "CNG", region: "Permian", prsCount: "1x PRS", prsType: "LPCC Retrofit" },
  { fleet: 38, customer: "Chevron", gasType: "CNG?", region: "Colorado", prsCount: "2x PRS", prsType: "PRS Retrofit" },
  { fleet: 41, customer: "Exxon", gasType: "CNG / FG", region: "Permian & Delaware", prsCount: "1x PRS", prsType: "PRS Retrofit" },
  { fleet: 50, customer: "OXY", gasType: "CNG??", region: "Delaware", prsCount: "2x PRS", prsType: "PRS Retrofit" },
  { fleet: 51, customer: "Hess Corp", gasType: "CNG??", region: "North Dakota", prsCount: "2x PRS", prsType: "PRS Retrofit" },
  { fleet: 57, customer: "Aethon", gasType: "FG", region: "ETX", prsCount: "1x PRS", prsType: "LP Only" },
  { fleet: 61, customer: "South32", gasType: "CNG??", region: "Arizona", prsCount: "2x PRS", prsType: "1x PRS / 1x PRS Retrofit" },
  { fleet: 91, customer: "Diamondback", gasType: "CNG / FG", region: "Permian", prsCount: "1x PRS", prsType: "PRS Retrofit" },
  { fleet: 93, customer: "Matador", gasType: "CNG / FG??", region: "Delaware", prsCount: "2x PRS", prsType: "PRS Retrofit" },
  { fleet: 101, customer: "Warren CAT", gasType: "CNG", region: "Permian", prsCount: "1x PRS", prsType: "PRS Retrofit" },
  { fleet: 120, customer: "OXY", gasType: "CNG / FG??", region: "Delaware", prsCount: "1x PRS", prsType: "PRS Retrofit" },
  { fleet: 135, customer: "Diamondback", gasType: "CNG / FG", region: "Permian", prsCount: "1x PRS", prsType: "PRS Retrofit" },
  { fleet: 157, customer: "Oracle", gasType: "FG", region: "Data Center", prsCount: "4x PRS", prsType: "LP Only" },
  { fleet: 159, customer: "Oracle", gasType: "CNG", region: "Data Center", prsCount: "2x PRS", prsType: "LPCC Retrofit" },
  { fleet: 175, customer: "QTS", gasType: "CNG", region: "Data Center", prsCount: "2x PRS", prsType: "LPCC Retrofit" },
  { fleet: 178, customer: "Vantage", gasType: "CNG", region: "Data Center", prsCount: "3x PRS", prsType: "LPCC Retrofit" },
  { fleet: 180, customer: "Chevron", gasType: "CNG / FG", region: "Permian", prsCount: "1x PRS", prsType: "PRS Retrofit" },
  { fleet: 187, customer: "Chevron", gasType: "CNG / FG??", region: "Delaware", prsCount: "1x PRS", prsType: "LPCC Retrofit" }
];

const METRIC_SERIES = {
  fleetActivity: [
    { week: "2026-03-01", fleets: 17, rigUps: 3, prsSwaps: 0 },
    { week: "2026-03-08", fleets: 17, rigUps: 4, prsSwaps: 0 },
    { week: "2026-03-15", fleets: 16, rigUps: 5, prsSwaps: 0 }
  ],
  jds: [
    { week: "2026-03-01", submissions: 5 },
    { week: "2026-03-08", submissions: 3 },
    { week: "2026-03-15", submissions: 0 }
  ],
  inspections: [
    { week: "2026-03-01", rigUps: 6, site: 17, yard: 0 },
    { week: "2026-03-08", rigUps: 3, site: 22, yard: 0 },
    { week: "2026-03-15", rigUps: 0, site: 0, yard: 0 }
  ],
  npt: [
    { week: "2026-03-01", events: 0, hours: 0 },
    { week: "2026-03-08", events: 0, hours: 0 },
    { week: "2026-03-15", events: 0, hours: 0 }
  ],
  maintenance: [
    { week: "2026-03-01", rdhRepairs: 3, ezhRepairs: 1, hpFilters: 12, lpFilters: 0, hubbles: 17, contactors: 1, ssr: 0, fuses: 4 },
    { week: "2026-03-08", rdhRepairs: 3, ezhRepairs: 5, hpFilters: 4, lpFilters: 2, hubbles: 9, contactors: 0, ssr: 0, fuses: 2 },
    { week: "2026-03-15", rdhRepairs: 2, ezhRepairs: 0, hpFilters: 1, lpFilters: 1, hubbles: 0, contactors: 0, ssr: 0, fuses: 0 }
  ],
  upgrades: {
    overall: 0.7885,
    completed: 20,
    inProgress: 32,
    notStarted: 1,
    assets: [
      { asset: "06-05-001-001", progress: 1.0 },
      { asset: "06-05-001-002", progress: 0.2 },
      { asset: "06-05-001-003", progress: 0.4 },
      { asset: "06-05-001-005", progress: 0.6 },
      { asset: "06-05-001-006", progress: 0.8 },
      { asset: "06-05-001-008", progress: 1.0 }
    ]
  }
};

const WTX_ORG_CHART = [
  { name: "Kevin Madison", title: "Director", reportsTo: "Chris A.", region: "WTX/Delaware/AZ", group: "Leadership" },
  { name: "David Drake", title: "Area Manager", reportsTo: "Kevin Madison", region: "WTX/Delaware/AZ", group: "Leadership" },
  { name: "Josh White", title: "Operations Manager", reportsTo: "David Drake", region: "Midland", group: "Leadership" },
  { name: "Marc Lopez", title: "Electrical Manager", reportsTo: "David Drake", region: "Midland", group: "Leadership" },
  { name: "Omar Hinojosa", title: "Service Supervisor", reportsTo: "Josh White", region: "Midland", group: "Supervisors" },
  { name: "Brandon Rodriguez", title: "Service Supervisor", reportsTo: "Josh White", region: "Midland", group: "Supervisors" },
  { name: "Christian Fears", title: "Service Supervisor", reportsTo: "Josh White", region: "Midland", group: "Supervisors" },
  { name: "Ignacio Aviles", title: "Service Supervisor", reportsTo: "Josh White", region: "Midland", group: "Supervisors" },
  { name: "Christian Woodard", title: "Electrical Supervisor", reportsTo: "Marc Lopez", region: "Midland", group: "Supervisors" },
  { name: "Paul Wilson", title: "Service Supervisor", reportsTo: "Josh White", region: "Delaware/AZ", group: "Supervisors" },
  { name: "Paul Rivera", title: "Service Supervisor", reportsTo: "Josh White", region: "Delaware/AZ", group: "Supervisors" },
  { name: "Matthew Esquivel", title: "Service Supervisor", reportsTo: "Josh White", region: "Delaware/AZ", group: "Supervisors" },
  { name: "Vincent Montgomery", title: "Service Supervisor", reportsTo: "Josh White", region: "Delaware/AZ", group: "Supervisors" },
  { name: "Jaylon Marion", title: "Gas Electrical Technician", reportsTo: "Christian Woodard", region: "Midland", group: "Techs" },
  { name: "Joe Reyor", title: "Gas Electrical Technician", reportsTo: "Christian Woodard", region: "Midland", group: "Techs" },
  { name: "Randy Curtis", title: "Gas Electrical Technician", reportsTo: "Christian Woodard", region: "Midland", group: "Techs" },
  { name: "Mark Valle", title: "Gas Electrical Technician", reportsTo: "Christian Woodard", region: "Midland", group: "Techs" },
  { name: "Chris Perteet", title: "Gas Electrical Technician", reportsTo: "Christian Woodard", region: "Midland", group: "Techs" }
];

const DEPARTMENT_TASKS = [
  { title: "Spacing Requirement", detail: "Requested from Tyler for Fleet 51.", owner: "Engineering", status: "In Progress", complete: false },
  { title: "UPS 110 Backup Power", detail: "480 power loss plus 2 hour backup.", owner: "Engineering", status: "In Progress", complete: false },
  { title: "480 VAC Testing Ports", detail: "Identify on-site 480 loss and bad phase live.", owner: "Engineering", status: "Idea Sent", complete: false },
  { title: "SCADA License", detail: "Current availability capped at roughly 200 tags.", owner: "IT / Operations", status: "In Progress", complete: false },
  { title: "Loss of 480 Alerts", detail: "Proactive alerting workflow for field issues.", owner: "IT / Operations", status: "Waiting on SCADA", complete: false },
  { title: "Gas Ops Dashboard", detail: "Track equipment reliability and work orders.", owner: "Bells Team", status: "In Progress", complete: false },
  { title: "S-32 PRS Swap", detail: "Requested by Cam and Logan.", owner: "Operations", status: "Completed", complete: true },
  { title: "Inventory List", detail: "Spreadsheet delivered to David Brown for Flow Trac.", owner: "Operations", status: "Completed", complete: true },
  { title: "Inventory Bay #2", detail: "Shelving and opening day setup.", owner: "David Brown", status: "In Progress", complete: false },
  { title: "LOTO PRS Equipment", detail: "Document still needs to be built.", owner: "Neely / Perez", status: "Incomplete", complete: false },
  { title: "PRS LPCC Retrofit SOP", detail: "Due March 18, 2026.", owner: "Josh / Perez", status: "Incomplete", complete: false },
  { title: "LP Filter Maintenance Form", detail: "Needs a Jotform flow and Gas App entry.", owner: "Josh White", status: "Incomplete", complete: false },
  { title: "PRS Ring Network", detail: "Remove ring and get PRS on Ready Line.", owner: "Steve Morton / Josh", status: "In Progress", complete: false },
  { title: "Exxon Fleet 41", detail: "Replace stripped terminal blocks in the distro panel.", owner: "Lopez / Limon", status: "Incomplete", complete: false }
];

const WTX_SCHEDULE = {
  February: [
    { tech: "Ejay Longoria", town: "Midland", lodging: "Local to Midland", checkIn: "", checkOut: "", confirmed: "", shift: "" },
    { tech: "Isaac Becera", town: "Midland", lodging: "Odessa West", checkIn: "Feb 24, 2026", checkOut: "Mar 11, 2026", confirmed: "465748-11340318", shift: "" },
    { tech: "Warren Comeaux", town: "Midland", lodging: "Odessa West", checkIn: "Feb 24, 2026", checkOut: "Mar 11, 2026", confirmed: "465060-11312253", shift: "" },
    { tech: "Luke Gossett", town: "Midland", lodging: "CHS", checkIn: "Feb 24, 2026", checkOut: "Mar 11, 2026", confirmed: "582907", shift: "" },
    { tech: "Aaron King", town: "Midland", lodging: "CHS", checkIn: "Feb 24, 2026", checkOut: "Mar 12, 2026", confirmed: "582907", shift: "" },
    { tech: "Eric Navarrette", town: "Midland", lodging: "Local to Midland", checkIn: "", checkOut: "", confirmed: "", shift: "" },
    { tech: "Eshawn Pettigrew", town: "Carlsbad", lodging: "Seven Rivers", checkIn: "Feb 24, 2026", checkOut: "Mar 11, 2026", confirmed: "459974-11140445", shift: "" },
    { tech: "Howard Weldy", town: "Midland", lodging: "Odessa West", checkIn: "Feb 24, 2026", checkOut: "Mar 11, 2026", confirmed: "465748-11340319", shift: "" }
  ],
  March: [
    { tech: "Ivan Avila", town: "Odessa", lodging: "Odessa West", checkIn: "Mar 10, 2026", checkOut: "Mar 25, 2026", confirmed: "466164-11353671", shift: "DDD" },
    { tech: "Brenden Clakely", town: "Carlsbad", lodging: "Seven Rivers", checkIn: "Mar 10, 2026", checkOut: "Mar 25, 2026", confirmed: "459950-11139923", shift: "DDD" },
    { tech: "Rene De La Rosa", town: "Odessa", lodging: "Odessa West", checkIn: "Mar 10, 2026", checkOut: "Mar 25, 2026", confirmed: "466164-11353732", shift: "DDD" },
    { tech: "Isaiah Ducksworth", town: "Midland", lodging: "Candlewood on Longview", checkIn: "Mar 10, 2026", checkOut: "Mar 25, 2026", confirmed: "88944388", shift: "DDD" },
    { tech: "Teddy Galindo", town: "Midland", lodging: "CHS", checkIn: "Mar 10, 2026", checkOut: "Mar 25, 2026", confirmed: "589091", shift: "DDD" },
    { tech: "Hugo Buendia", town: "Midland", lodging: "Odessa West", checkIn: "Mar 3, 2026", checkOut: "Mar 18, 2026", confirmed: "466253-11355556", shift: "DDD" },
    { tech: "Johnathan Davis", town: "Midland", lodging: "Candlewood on Longview", checkIn: "Mar 3, 2026", checkOut: "Mar 18, 2026", confirmed: "", shift: "DDD" },
    { tech: "Ronald Deets", town: "Midland", lodging: "Odessa West", checkIn: "Mar 3, 2026", checkOut: "Mar 18, 2026", confirmed: "466164-11353721", shift: "DDD" },
    { tech: "Ejay Longoria", town: "Midland", lodging: "Local to Midland", checkIn: "", checkOut: "", confirmed: "", shift: "DDD" },
    { tech: "Norris McDaniel", town: "Carlsbad", lodging: "Seven Rivers", checkIn: "Mar 3, 2026", checkOut: "Mar 18, 2026", confirmed: "459971-11140369", shift: "DDD" },
    { tech: "Isaac Becera", town: "Odessa", lodging: "Odessa West", checkIn: "Mar 17, 2026", checkOut: "Apr 1, 2026", confirmed: "466164-11353707", shift: "NNNNNN" },
    { tech: "Warren Comeaux", town: "Midland", lodging: "Odessa West", checkIn: "Mar 17, 2026", checkOut: "Apr 1, 2026", confirmed: "466164-11353708", shift: "NNNNNN" },
    { tech: "Luke Gossett", town: "Midland", lodging: "CHS", checkIn: "Mar 17, 2026", checkOut: "Apr 1, 2026", confirmed: "589091", shift: "NNNNNN" },
    { tech: "Aaron King", town: "Midland", lodging: "CHS", checkIn: "Mar 17, 2026", checkOut: "Apr 1, 2026", confirmed: "589091", shift: "NNNNNN" },
    { tech: "Eric Navarrette", town: "Midland", lodging: "Local to Midland", checkIn: "", checkOut: "", confirmed: "", shift: "NNNNNN" },
    { tech: "Eshawn Pettigrew", town: "Carlsbad", lodging: "Seven Rivers", checkIn: "Mar 17, 2026", checkOut: "Apr 1, 2026", confirmed: "462443-11221758", shift: "NNNNNN" },
    { tech: "Howard Weldy", town: "Odessa", lodging: "Odessa West", checkIn: "Mar 17, 2026", checkOut: "Apr 1, 2026", confirmed: "466164-11353792", shift: "NNNNNN" }
  ],
  April: [
    { tech: "Ejay Longoria", town: "Midland", lodging: "Local to Midland", checkIn: "", checkOut: "", confirmed: "", shift: "NNNNNN" },
    { tech: "Eric Navarrette", town: "Midland", lodging: "Local to Midland", checkIn: "", checkOut: "", confirmed: "", shift: "" }
  ],
  May: [
    { tech: "Ejay Longoria", town: "Midland", lodging: "Local to Midland", checkIn: "", checkOut: "", confirmed: "", shift: "N" },
    { tech: "Eric Navarrette", town: "Midland", lodging: "Local to Midland", checkIn: "", checkOut: "", confirmed: "", shift: "DDDDDD" }
  ],
  June: [],
  July: [],
  August: [],
  September: [],
  October: [],
  November: [],
  December: []
};

const INVENTORY_GROUPS = {
  "Gas Decompression": {
    totalItems: 20,
    rows: [
      { vendor: "BarnCo", item: "LP Cube Filter", partNumber: "GCA5536K03V", min: "25", max: "50", location: "Bay 2-Midland" },
      { vendor: "Hi-Tech", item: "RDH Regulator Repair Kit", partNumber: "HTS RDH-20-SK", min: "50", max: "150", location: "Bay 2-Midland" },
      { vendor: "Hi-Tech", item: "EZH Regulator Seal Repair", partNumber: "HTS EZH-2000-SK", min: "25", max: "100", location: "Bay 2-Midland" },
      { vendor: "PowerBlanket", item: "Regulator Blankets", partNumber: "N/A", min: "QRTLY", max: "QRTLY", location: "Bay 2-Midland" },
      { vendor: "Swagelok", item: "RDH20 Rebuild Kit", partNumber: "RDHN20-02-6-VVVP-C1", min: "QRTLY", max: "QRTLY", location: "Bay 2-Midland" },
      { vendor: "Triad", item: "HP Cube Filter", partNumber: "7CPJEK-0031-SPA", min: "QRTLY", max: "QRTLY", location: "Bay 2-Midland" }
    ]
  },
  "Gas Electrical": {
    totalItems: 43,
    rows: [
      { vendor: "ElecDirect", item: "Hubble Male Plug", partNumber: "SCM4100P7W", min: "30", max: "50", location: "Bay 2-Midland" },
      { vendor: "ElecDirect", item: "Hubble Female Receptacle", partNumber: "SCM4100R7W", min: "30", max: "50", location: "Bay 2-Midland" },
      { vendor: "Fisher/Emerson", item: "Flow Meters", partNumber: "F200S420C2BAEZZZZ", min: "2", max: "3", location: "Bay 2-Midland" },
      { vendor: "GexPro/Rexel", item: "Contactors", partNumber: "SQDLC1D80G7", min: "15", max: "30", location: "Bay 2-Midland" },
      { vendor: "Reynolds", item: "SSR (Solid State Relay)", partNumber: "CARLRGC2P60I75C1AFM", min: "20", max: "40", location: "Bay 2-Midland" },
      { vendor: "TechStar", item: "104TX Ethernet Switch", partNumber: "104TX", min: "2", max: "5", location: "Bay 2-Midland" },
      { vendor: "Elliot Electric/Rexel", item: "PRS Fuses", partNumber: "A4J100", min: "50", max: "100", location: "Bay 2-Midland" },
      { vendor: "Rosemount/Emerson", item: "Pressure Transmitters", partNumber: "2051TG5A2B21AKBM5", min: "5", max: "10", location: "Bay 2-Midland" }
    ]
  }
};

const TRUCKING_ROSTER = [
  { assetId: "01-02-001-017", vin: "1FTFW1E53NKD05586", plate: "RNM0681", vehicle: "Ford F-150", status: "In Use", assigned: "Gas Pool", driver: "Brenden", fleet: "Pending", notes: "Pending" },
  { assetId: "01-02-001-044", vin: "1FTFW1E5XNKE64525", plate: "SNG5300", vehicle: "Ford F-150", status: "In Shop", assigned: "Gas Pool", driver: "Pending", fleet: "Delaware", notes: "Pending" },
  { assetId: "01-04-001-064", vin: "PG107207", plate: "STN0949", vehicle: "GMC Sierra", status: "In Shop", assigned: "Gas Pool", driver: "Pending", fleet: "Delaware", notes: "AC out" },
  { assetId: "01-04-001-066", vin: "PG107204", plate: "TPN1462", vehicle: "GMC Sierra", status: "In Use", assigned: "Gas Pool", driver: "Jon Carmiachel", fleet: "Pending", notes: "New sticker and paperwork on dashboard" },
  { assetId: "01-02-001-074", vin: "1FTFW1E56PKD05259", plate: "XDB3939", vehicle: "Ford F-150", status: "In Use", assigned: "Gas Pool", driver: "Paul Wilson", fleet: "Pending", notes: "No front tag / oil change due" },
  { assetId: "01-02-001-075", vin: "1FTFW1E56PKE09914", plate: "SXB6214", vehicle: "Ford F-150", status: "PM Due / In Use", assigned: "Gas Pool", driver: "Rene", fleet: "Pending", notes: "AC out" },
  { assetId: "01-02-001-079", vin: "1FTFW1E5XPKE09575", plate: "SXB6279", vehicle: "Ford F-150", status: "In Use", assigned: "Gas Pool", driver: "Ivan", fleet: "Fleet 41", notes: "Pending" },
  { assetId: "01-02-001-084", vin: "1FTFW1E55PFB48560", plate: "WXG3892", vehicle: "Ford F-150", status: "In Use", assigned: "Gas Pool", driver: "Isaac Becera", fleet: "Fleet 41", notes: "Pending" },
  { assetId: "01-03-001-126", vin: "1FT8W2BM4PEC11325", plate: "TKG7872", vehicle: "Ford F-150", status: "Needs Repair", assigned: "Gas Pool", driver: "Pending", fleet: "Pending", notes: "Windshield leak and driver-side tire replacement needed" }
];

const TRAINING_TRACKS = [
  { title: "Field Standards", description: "Store SOPs, checklists, and the standards each tech works from in the field.", status: "Build first" },
  { title: "Performance Trackers", description: "Keep individual technician progress, exercises, and accountability in one simple tracker.", status: "Planned" },
  { title: "Hands-On Exercises", description: "Stage repeatable exercises for gas, PRS, maintenance, and electrical work.", status: "Planned" },
  { title: "Training Videos", description: "House short internal video walkthroughs without burying them in email threads.", status: "Future media" }
];

const PLATFORM_LINKS = [
  { label: "Grafana", url: "", description: "Future live equipment performance and alert data feed." },
  { label: "Jotform", url: "", description: "Fleet JDS, testing lists, maintenance work, and truck submissions." },
  { label: "Microsoft Forms", url: "", description: "Inventory QR workflows and order status inputs." },
  { label: "KNETIC View", url: "", description: "Primary surface tying the rest together." }
];

const GAS_TO_GEN_DEFAULTS = {
  loadKw: 3300,
  heatRate: 8000,
  heatingValue: 1100,
  deliveryPsi: 165
};

const STANDARDIZED_SETPOINTS = [
  { breaker: "400 Amp", flow: "0-1000 MSCF/D", delivery: "0-150 PSI", rdhTop: "750 PSI", rdhBottom: "850 PSI", ezhTop: "145 PSI", ezhBottom: "150 PSI", hpStart: "75", hpRun1: "95", hpRun2: "120", lpStart: "75" },
  { breaker: "400 Amp", flow: "1000-3000 MSCF/D", delivery: "0-150 PSI", rdhTop: "750 PSI", rdhBottom: "850 PSI", ezhTop: "145 PSI", ezhBottom: "150 PSI", hpStart: "75", hpRun1: "95", hpRun2: "120", lpStart: "75" },
  { breaker: "400 Amp", flow: "3000-5000 MSCF/D", delivery: "0-150 PSI", rdhTop: "750 PSI", rdhBottom: "850 PSI", ezhTop: "145 PSI", ezhBottom: "150 PSI", hpStart: "75", hpRun1: "95", hpRun2: "120", lpStart: "75" },
  { breaker: "400 Amp", flow: "0-1000 MSCF/D", delivery: "150-250 PSI", rdhTop: "750 PSI", rdhBottom: "850 PSI", ezhTop: "245 PSI", ezhBottom: "250 PSI", hpStart: "75", hpRun1: "95", hpRun2: "120", lpStart: "75" },
  { breaker: "400 Amp", flow: "1000-3000 MSCF/D", delivery: "150-250 PSI", rdhTop: "750 PSI", rdhBottom: "850 PSI", ezhTop: "245 PSI", ezhBottom: "250 PSI", hpStart: "75", hpRun1: "95", hpRun2: "120", lpStart: "75" },
  { breaker: "400 Amp", flow: "3000-5000 MSCF/D", delivery: "150-250 PSI", rdhTop: "750 PSI", rdhBottom: "850 PSI", ezhTop: "245 PSI", ezhBottom: "250 PSI", hpStart: "75", hpRun1: "95", hpRun2: "120", lpStart: "75" }
];

const FLEET_REFERENCE_LOOKUP = new Map(FLEET_REFERENCE_ROWS.map((row) => [row.fleet, row]));
const RIG_MOVE_LOOKUP = new Map(RIG_MOVE_DATA.map((row) => [row.fleet, row]));
const ACTIVE_FLEET_ROSTER = RIG_MOVE_DATA.map((row) => row.fleet);
const fleetFieldStore = new Map();
const archivedFleetStore = new Set(
  Array.from({ length: TOTAL_FLEETS }, (_, index) => index + 1).filter((fleet) => !ACTIVE_FLEET_ROSTER.includes(fleet))
);
const maintenanceRequestStore = [
  {
    id: "MR-001",
    title: "Jotform maintenance intake",
    fleet: "Pending",
    status: "Awaiting live submissions",
    notes: "This section is staged and will start filling as the Jotform request flow is connected."
  }
];

const menuTab = document.getElementById("menuTab");
const menuView = document.getElementById("menuView");
const testingView = document.getElementById("testingView");
const fleetOpsView = document.getElementById("fleetOpsView");
const placeholderView = document.getElementById("placeholderView");
const menuGrid = document.getElementById("menuGrid");
const placeholderKicker = document.getElementById("placeholderKicker");
const placeholderTitle = document.getElementById("placeholderTitle");
const placeholderCopy = document.getElementById("placeholderCopy");
const placeholderContent = document.getElementById("placeholderContent");
const fleetOpsFleetGrid = document.getElementById("fleetOpsFleetGrid");
const fleetOpsPackageGrid = document.getElementById("fleetOpsPackageGrid");
const fleetOpsActiveSummary = document.getElementById("fleetOpsActiveSummary");
const fleetOpsPackageSummary = document.getElementById("fleetOpsPackageSummary");
const fleetOpsSummaryGrid = document.getElementById("fleetOpsSummaryGrid");
const fleetOpsMoveSummary = document.getElementById("fleetOpsMoveSummary");
const rigMoveBoard = document.getElementById("rigMoveBoard");
const maintenanceRequestSummary = document.getElementById("maintenanceRequestSummary");
const maintenanceRequestList = document.getElementById("maintenanceRequestList");
const loginTrigger = document.getElementById("loginTrigger");
const authBadge = document.getElementById("authBadge");
const fleetLoginTrigger = document.getElementById("fleetLoginTrigger");
const fleetAuthBadge = document.getElementById("fleetAuthBadge");
const fleetArchiveTrigger = document.getElementById("fleetArchiveTrigger");
const fleetArchiveCount = document.getElementById("fleetArchiveCount");
const adminDock = document.getElementById("adminDock");
const editorTrigger = document.getElementById("editorTrigger");
const drawerTitle = document.getElementById("drawerTitle");
const drawerCopy = document.getElementById("drawerCopy");
const assetList = document.getElementById("assetList");
const ladderRows = document.querySelectorAll(".ladder-row");
const displayCards = document.querySelectorAll(".display-card");
const readyPreview = document.getElementById("readyPreview");
const testingPreview = document.getElementById("testingPreview");
const queuePreview = document.getElementById("queuePreview");
const inUsePreview = document.getElementById("inUsePreview");
const fieldFleetPreview = document.getElementById("fieldFleetPreview");
const fieldPrsPreview = document.getElementById("fieldPrsPreview");
const readySummary = document.getElementById("readySummary");
const testingSummary = document.getElementById("testingSummary");
const queueSummary = document.getElementById("queueSummary");
const syncStatusBadge = document.getElementById("syncStatusBadge");
const oosSummary = document.getElementById("oosSummary");
const activeFleetSummary = document.getElementById("activeFleetSummary");
const activePackageSummary = document.getElementById("activePackageSummary");
const testingUpgradeGrid = document.getElementById("testingUpgradeGrid");
const upgradeProgressTag = document.getElementById("upgradeProgressTag");
const oosTrigger = document.getElementById("oosTrigger");
const oosPanel = document.getElementById("oosPanel");
const closeOosPanel = document.getElementById("closeOosPanel");
const oosList = document.getElementById("oosList");
const searchForm = document.getElementById("searchForm");
const searchType = document.getElementById("searchType");
const searchInput = document.getElementById("searchInput");
const sectionOverlay = document.getElementById("sectionOverlay");
const sectionOverlayKicker = document.getElementById("sectionOverlayKicker");
const sectionOverlayTitle = document.getElementById("sectionOverlayTitle");
const sectionOverlayBody = document.getElementById("sectionOverlayBody");
const closeSectionOverlay = document.getElementById("closeSectionOverlay");
const detailOverlay = document.getElementById("detailOverlay");
const detailOverlayKicker = document.getElementById("detailOverlayKicker");
const detailOverlayTitle = document.getElementById("detailOverlayTitle");
const closeDetailOverlay = document.getElementById("closeDetailOverlay");
const loginOverlay = document.getElementById("loginOverlay");
const closeLoginOverlay = document.getElementById("closeLoginOverlay");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");
const editorOverlay = document.getElementById("editorOverlay");
const closeEditorOverlay = document.getElementById("closeEditorOverlay");
const editorTableBody = document.getElementById("editorTableBody");
const noteComposer = document.getElementById("noteComposer");
const noteComposerState = document.getElementById("noteComposerState");
const cancelNoteEdit = document.getElementById("cancelNoteEdit");
const noteLedger = document.getElementById("noteLedger");
const workOrderIdInput = document.getElementById("workOrderIdInput");
const workOrderTextInput = document.getElementById("workOrderTextInput");
const addWorkOrderButton = document.getElementById("addWorkOrderButton");
const workOrderList = document.getElementById("workOrderList");

let activeCategory = "HP";
let activeDetail = null;
let editingNoteIndex = null;
let boardSaveTimer = null;
let fleetSaveTimer = null;
let truckSaveTimer = null;
let detailSaveTimer = null;
const appState = {
  currentView: "menu",
  isAuthorized: false,
  adminToken: "",
  adminUser: "",
  placeholderRoute: "metrics",
  metricsWindow: 3,
  scheduleMonth: "March",
  calculatorInputs: { ...GAS_TO_GEN_DEFAULTS },
  sectionOverlayContext: null,
  dataStatus: "loading",
  bootstrapError: "",
  syncStatus: "loading",
  syncLabel: "Connecting to live data..."
};

clearLiveCollections();
rebuildBoardData();
initializeTiltDisplays();
initializeCategoryControls();
initializeDashboardActions();
initializeSearch();
initializeOverlayActions();
initializeShellActions();
refreshAll();
showView("menu");
bootstrapAppData();

function pad(value) {
  return String(value).padStart(2, "0");
}

function padThree(value) {
  return String(value).padStart(3, "0");
}

function packageLetter(index) {
  return String.fromCharCode(65 + index);
}

function formatAsset(category, index) {
  return `${category}${pad(index)}`;
}

function formatFullAsset(category, index) {
  return `${CATEGORY_INFO[category].base}-${padThree(index)}`;
}

function formatFleetPackageId(fleet, letter) {
  return `FLT${padThree(fleet)}-${letter}`;
}

function parseAssetCode(asset) {
  return {
    category: asset.slice(0, 2),
    index: Number(asset.slice(2))
  };
}

function compareAssetCodes(left, right) {
  const leftMeta = parseAssetCode(left);
  const rightMeta = parseAssetCode(right);
  const categoryDelta = ASSET_ORDER.indexOf(leftMeta.category) - ASSET_ORDER.indexOf(rightMeta.category);

  if (categoryDelta !== 0) {
    return categoryDelta;
  }

  return leftMeta.index - rightMeta.index;
}

function unique(items) {
  return [...new Set(items)];
}

function buildSeedRows(status, allocation, entries) {
  return entries.map(([HP = "", LP = "", HR = "", CC = ""]) => ({
    status,
    allocation,
    HP,
    LP,
    HR,
    CC
  }));
}

function cloneBoardRows(rows) {
  return rows.map((row, index) => ({
    id: row.id ?? `ROW-${padThree(index + 1)}`,
    status: row.status,
    allocation: row.allocation,
    HP: row.HP ?? "",
    LP: row.LP ?? "",
    HR: row.HR ?? "",
    CC: row.CC ?? ""
  }));
}

function getRowAssets(row) {
  return ASSET_ORDER.map((category) => row[category]).filter(Boolean);
}

function parseFleetNumber(allocation) {
  const match = allocation.toUpperCase().match(/^FLEET\s*0*(\d{1,3})$/);
  return match ? Number(match[1]) : null;
}

function normalizeAllocationInput(value, status) {
  const trimmed = value.trim();

  if (status === "testing") {
    return "Testing";
  }

  if (status === "queue") {
    return "In Queue";
  }

  if (status === "ready" || status === "oos") {
    return "Standby";
  }

  const fleet = parseFleetNumber(trimmed);
  return fleet ? `Fleet ${fleet}` : "Fleet 1";
}

function normalizeAssetInput(category, value) {
  const trimmed = value.trim().toUpperCase();

  if (!trimmed) {
    return "";
  }

  const fullMatch = trimmed.match(/^(HP|LP|HR|CC)\s*0*(\d{1,2})$/);

  if (fullMatch) {
    return `${fullMatch[1]}${pad(Number(fullMatch[2]))}`;
  }

  const numberMatch = trimmed.match(/^0*(\d{1,2})$/);

  if (numberMatch) {
    return `${category}${pad(Number(numberMatch[1]))}`;
  }

  return trimmed;
}

function rebuildBoardData() {
  READY_PACKAGES = boardRows
    .filter((row) => row.status === "ready")
    .map((row, index) => createQueuePackage("ready", index, getRowAssets(row), row.id));

  TESTING_PACKAGES = boardRows
    .filter((row) => row.status === "testing")
    .map((row, index) => createQueuePackage("testing", index, getRowAssets(row), row.id));

  QUEUE_PACKAGES = boardRows
    .filter((row) => row.status === "queue")
    .map((row, index) => createQueuePackage("queue", index, getRowAssets(row), row.id));

  OOS_ASSETS = new Set(
    boardRows
      .filter((row) => row.status === "oos")
      .flatMap((row) => getRowAssets(row))
  );

  const inUseGroups = new Map();

  boardRows
    .filter((row) => row.status === "inuse")
    .forEach((row) => {
      const fleet = parseFleetNumber(row.allocation);

      if (!fleet || fleet < 1 || fleet > TOTAL_FLEETS) {
        return;
      }

      if (!inUseGroups.has(fleet)) {
        inUseGroups.set(fleet, []);
      }

      inUseGroups.get(fleet).push(row);
    });

  IN_USE_FLEETS = Array.from(inUseGroups.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([fleet, rows]) => ({
      fleet,
      packages: rows.map((row, index) => createFleetPackage(fleet, index, getRowAssets(row), row.id))
    }));

  FLEET_LOOKUP = new Map(IN_USE_FLEETS.map((entry) => [entry.fleet, entry]));
  ACTIVE_FLEET_SET = new Set(IN_USE_FLEETS.map((entry) => entry.fleet));
  IN_USE_PACKAGES = IN_USE_FLEETS.flatMap((entry) => entry.packages);
  PACKAGE_REGISTRY = new Map([...READY_PACKAGES, ...TESTING_PACKAGES, ...QUEUE_PACKAGES, ...IN_USE_PACKAGES].map((item) => [item.id, item]));
  ASSET_ASSIGNMENTS = buildAssetAssignments();
}

function createQueuePackage(section, index, assets, rowId = null) {
  const prefix = {
    ready: "RDY",
    testing: "TST",
    queue: "QUE"
  }[section] ?? "PKG";
  const labelPrefix = {
    ready: "Ready",
    testing: "Test",
    queue: "Queue"
  }[section] ?? "Package";

  return {
    id: `${prefix}-${pad(index + 1)}`,
    label: `${labelPrefix} ${pad(index + 1)}`,
    section,
    assets,
    rowId
  };
}

function createFleetPackage(fleet, index, assets, rowId = null) {
  const letter = packageLetter(index);

  return {
    id: formatFleetPackageId(fleet, letter),
    label: `Fleet ${fleet}${letter}`,
    section: "inuse",
    fleet,
    letter,
    assets,
    rowId
  };
}

function buildAssetAssignments() {
  const assignments = new Map();
  const packageLookupByRowId = new Map(
    [...READY_PACKAGES, ...TESTING_PACKAGES, ...QUEUE_PACKAGES, ...IN_USE_PACKAGES]
      .filter((pkg) => pkg.rowId)
      .map((pkg) => [pkg.rowId, pkg])
  );
  const pushAssignment = (asset, assignment) => {
    if (!assignments.has(asset)) {
      assignments.set(asset, []);
    }

    assignments.get(asset).push(assignment);
  };

  boardRows.forEach((row) => {
    const assets = getRowAssets(row);
    const packageMeta = packageLookupByRowId.get(row.id);
    const section = row.status;
    const allocation = packageMeta?.label ?? (section === "oos" ? "Maintenance Hold" : row.allocation);
    const packageId = packageMeta?.id ?? row.id;

    assets.forEach((asset) => {
      pushAssignment(asset, {
        section,
        allocation,
        packageId,
        packageLabel: allocation,
        fleet: section === "inuse" ? parseFleetNumber(row.allocation) : null,
        relatedAssets: assets.filter((item) => item !== asset)
      });
    });
  });

  assignments.forEach((items) => {
    items.sort((left, right) => {
      if (left.section !== right.section) {
        return getSectionPriority(left.section) - getSectionPriority(right.section);
      }

      return left.allocation.localeCompare(right.allocation);
    });
  });

  return assignments;
}

function getSectionPriority(section) {
  return {
    oos: 0,
    testing: 1,
    queue: 2,
    ready: 3,
    inuse: 4
  }[section] ?? 5;
}

function getSectionStatusLabel(section) {
  return {
    ready: "Ready to Deploy",
    testing: "In Testing",
    queue: "In Queue",
    oos: "Out of Service",
    inuse: "In Use",
    pool: "Standby",
    mixed: "Multi-Assigned"
  }[section];
}

function getPackageTag(pkg) {
  if (pkg.section === "ready") {
    return "Ready";
  }

  if (pkg.section === "testing") {
    return "Testing";
  }

  if (pkg.section === "queue") {
    return "In Queue";
  }

  return `Fleet ${pkg.fleet}`;
}

function getPackageContextLabel(pkg) {
  if (pkg.section === "inuse") {
    return `Fleet ${pkg.fleet}`;
  }

  return getSectionStatusLabel(pkg.section);
}

function getAssetAssignments(asset) {
  return ASSET_ASSIGNMENTS.get(asset) ?? [];
}

function getAssetStatusTone(assignments) {
  if (!assignments.length) {
    return "pool";
  }

  if (assignments.length > 1) {
    return "mixed";
  }

  return assignments[0].section;
}

function getAssetStatusLabel(assignments) {
  return getSectionStatusLabel(getAssetStatusTone(assignments));
}

function ensureDetailRecord(kind, key) {
  if (!detailStore[kind][key]) {
    detailStore[kind][key] = {
      notes: [],
      workOrders: []
    };
  }

  return detailStore[kind][key];
}

function summarizeLatestNote(kind, key, fallback) {
  const record = ensureDetailRecord(kind, key);
  const latest = record.notes.at(-1);

  if (!latest) {
    return fallback;
  }

  return truncate(latest.text, 72);
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

function toNumber(value) {
  return Number(value || 0);
}

function formatMetric(value) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1);
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function formatWeekLabel(week) {
  const date = new Date(`${week}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function getCurrentWeekStart() {
  const today = new Date();
  const local = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  local.setDate(local.getDate() - local.getDay());
  return local.toISOString().slice(0, 10);
}

function getMetricWindowRows(rows) {
  const currentWeek = getCurrentWeekStart();
  const eligible = rows.filter((row) => row.week <= currentWeek);
  const source = eligible.length ? eligible : rows;
  return source.slice(-appState.metricsWindow);
}

function buildEmptyStateCard(title, copy) {
  return `
    <article class="empty-state-card">
      <strong>${title}</strong>
      <p>${copy}</p>
    </article>
  `;
}

function buildEmptyLiveMetrics() {
  return {
    summary: {
      activeFleets: 0,
      livePackages: 0,
      scheduledMoves: 0,
      recentSubmissions: 0,
      maintenanceActions: 0,
      truckTransfers: 0
    },
    weeklySubmissions: [],
    formBreakdown: [],
    recentSubmissions: [],
    upcomingMoves: [],
    upgrade: {
      overall: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      assets: []
    },
    trucking: {
      total: 0,
      inUse: 0,
      inShop: 0,
      pmDue: 0
    }
  };
}

function getLiveMetrics() {
  return METRIC_SERIES.live || buildEmptyLiveMetrics();
}

function applyMetrics(metrics) {
  const liveMetrics = metrics || buildEmptyLiveMetrics();

  METRIC_SERIES.live = liveMetrics;
  METRIC_SERIES.upgrades = {
    overall: liveMetrics.upgrade?.overall ?? 0,
    completed: liveMetrics.upgrade?.completed ?? 0,
    inProgress: liveMetrics.upgrade?.inProgress ?? 0,
    notStarted: liveMetrics.upgrade?.notStarted ?? 0,
    assets: liveMetrics.upgrade?.assets ?? []
  };
}

function clearLiveCollections() {
  boardRows = [];
  READY_PACKAGES = [];
  TESTING_PACKAGES = [];
  QUEUE_PACKAGES = [];
  OOS_ASSETS = new Set();
  IN_USE_FLEETS = [];
  FLEET_LOOKUP = new Map();
  ACTIVE_FLEET_SET = new Set();
  IN_USE_PACKAGES = [];
  PACKAGE_REGISTRY = new Map();
  ASSET_ASSIGNMENTS = new Map();
  RIG_MOVE_DATA.splice(0, RIG_MOVE_DATA.length);
  FLEET_REFERENCE_ROWS.splice(0, FLEET_REFERENCE_ROWS.length);
  TRUCKING_ROSTER.splice(0, TRUCKING_ROSTER.length);
  maintenanceRequestStore.splice(0, maintenanceRequestStore.length);
  FLEET_REFERENCE_LOOKUP.clear();
  RIG_MOVE_LOOKUP.clear();
  ACTIVE_FLEET_ROSTER.splice(0, ACTIVE_FLEET_ROSTER.length);
  archivedFleetStore.clear();
  fleetFieldStore.clear();
  detailStore.asset = {};
  detailStore.package = {};
  detailStore.fleet = {};
  applyMetrics(buildEmptyLiveMetrics());

  for (let fleet = 1; fleet <= TOTAL_FLEETS; fleet += 1) {
    archivedFleetStore.add(fleet);
  }
}

function applyBootstrapData(payload) {
  clearLiveCollections();
  boardRows = cloneBoardRows(Array.isArray(payload?.boardRows) ? payload.boardRows : []);

  const fleets = Array.isArray(payload?.fleets) ? payload.fleets : [];

  FLEET_REFERENCE_ROWS.splice(
    0,
    FLEET_REFERENCE_ROWS.length,
    ...fleets.map((fleet) => ({
      fleet: fleet.fleet_number,
      customer: fleet.customer || "Pending",
      gasType: fleet.fuel_type || "Pending",
      region: fleet.region || "Pending",
      prsCount: fleet.prs_count ? `${fleet.prs_count}x PRS` : "Pending",
      prsType: fleet.prs_type || "Pending"
    }))
  );

  RIG_MOVE_DATA.splice(
    0,
    RIG_MOVE_DATA.length,
    ...fleets.map((fleet) => ({
      fleet: fleet.fleet_number,
      moveDate: fleet.move_date || "",
      label: fleet.move_date ? formatRigMoveLabel({ status: fleet.move_status, moveDate: fleet.move_date }) : fleet.move_status === "permanent" ? "Permanent Site" : "TBD",
      status: fleet.move_status || "tbd",
      archived: Boolean(fleet.is_archived)
    }))
  );

  FLEET_REFERENCE_LOOKUP.clear();
  FLEET_REFERENCE_ROWS.forEach((row) => {
    FLEET_REFERENCE_LOOKUP.set(row.fleet, row);
  });

  RIG_MOVE_LOOKUP.clear();
  RIG_MOVE_DATA.forEach((row) => {
    RIG_MOVE_LOOKUP.set(row.fleet, row);
  });

  ACTIVE_FLEET_ROSTER.splice(
    0,
    ACTIVE_FLEET_ROSTER.length,
    ...fleets.filter((fleet) => !fleet.is_archived).map((fleet) => fleet.fleet_number)
  );

  archivedFleetStore.clear();

  for (let fleet = 1; fleet <= TOTAL_FLEETS; fleet += 1) {
    if (!ACTIVE_FLEET_ROSTER.includes(fleet)) {
      archivedFleetStore.add(fleet);
    }
  }

  fleetFieldStore.clear();
  fleets.forEach((fleet) => {
    fleetFieldStore.set(fleet.fleet_number, {
      customer: fleet.customer || "Pending",
      fuelType: fleet.fuel_type || "Pending",
      pressure: fleet.pressure || "Pending",
      jdsStatus: fleet.jds_status || "Pending",
      grafanaStatus: fleet.grafana_status || "Pending",
      jotformStatus: fleet.jotform_status || "Pending",
      notes: fleet.notes || "Pending"
    });
  });

  TRUCKING_ROSTER.splice(0, TRUCKING_ROSTER.length, ...(payload?.trucks || []));
  maintenanceRequestStore.splice(0, maintenanceRequestStore.length, ...(payload?.maintenanceRequests || []));
  detailStore.asset = payload?.detailStore?.asset || {};
  detailStore.package = payload?.detailStore?.package || {};
  detailStore.fleet = payload?.detailStore?.fleet || {};
  applyMetrics(payload?.metrics);
  rebuildBoardData();
}

function renderSyncStatus() {
  if (!syncStatusBadge) {
    return;
  }

  syncStatusBadge.textContent = appState.syncLabel;
  syncStatusBadge.classList.remove("is-loading", "is-saving", "is-error", "is-ready");
  syncStatusBadge.classList.add(`is-${appState.syncStatus}`);
}

function setSyncState(status, label) {
  appState.syncStatus = status;
  appState.syncLabel = label;
  renderSyncStatus();
}

async function apiRequest(path, options = {}) {
  const fetchOptions = {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      ...(options.headers || {})
    }
  };

  if (options.body !== undefined) {
    fetchOptions.headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(path, fetchOptions);
  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Request failed for ${path}`);
  }

  return payload;
}

async function authorizedRequest(path, body) {
  if (!appState.adminToken) {
    throw new Error("Admin token not loaded.");
  }

  return apiRequest(path, {
    method: "POST",
    headers: {
      "X-Admin-Token": appState.adminToken
    },
    body
  });
}

function getActorName() {
  return appState.adminUser || usernameInput.value.trim() || "Admin";
}

async function bootstrapAppData() {
  appState.dataStatus = "loading";
  appState.bootstrapError = "";
  setSyncState("loading", "Connecting to live data...");
  refreshAll();

  try {
    const payload = await apiRequest("/api/bootstrap");
    applyBootstrapData(payload);
    appState.dataStatus = "ready";
    setSyncState("ready", `Live data synced ${new Date(payload.serverTime || Date.now()).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`);
    refreshAll();
  } catch (error) {
    clearLiveCollections();
    rebuildBoardData();
    appState.dataStatus = "error";
    appState.bootstrapError = error.message;
    setSyncState("error", `Data error: ${error.message}`);
    refreshAll();
  }
}

function buildRigMovePayload() {
  return RIG_MOVE_DATA.map((entry) => ({
    fleet: entry.fleet,
    status: entry.status === "scheduled" || entry.status === "permanent" ? entry.status : "tbd",
    moveDate: entry.status === "scheduled" ? entry.moveDate : "",
    archived: !isFleetActive(entry.fleet)
  }));
}

function queueBoardSave() {
  if (!appState.isAuthorized) {
    return;
  }

  clearTimeout(boardSaveTimer);
  setSyncState("saving", "Saving board changes...");
  boardSaveTimer = setTimeout(async () => {
    try {
      await authorizedRequest("/api/board-save", {
        boardRows,
        rigMoves: buildRigMovePayload(),
        actor: getActorName()
      });
      setSyncState("ready", "Board changes saved");
    } catch (error) {
      setSyncState("error", error.message);
    }
  }, 550);
}

function queueFleetSave(fleetNumber) {
  if (!appState.isAuthorized) {
    return;
  }

  clearTimeout(fleetSaveTimer);
  setSyncState("saving", `Saving Fleet ${fleetNumber}...`);
  fleetSaveTimer = setTimeout(async () => {
    try {
      await authorizedRequest("/api/fleet-save", {
        fleetNumber,
        fields: ensureFleetDetailRecord(fleetNumber),
        actor: getActorName()
      });
      setSyncState("ready", `Fleet ${fleetNumber} saved`);
    } catch (error) {
      setSyncState("error", error.message);
    }
  }, 500);
}

function queueTruckSave() {
  if (!appState.isAuthorized || appState.placeholderRoute !== "trucking") {
    return;
  }

  clearTimeout(truckSaveTimer);
  setSyncState("saving", "Saving trucking board...");
  truckSaveTimer = setTimeout(async () => {
    try {
      await authorizedRequest("/api/truck-save", {
        trucks: TRUCKING_ROSTER,
        actor: getActorName()
      });
      setSyncState("ready", "Trucking board saved");
    } catch (error) {
      setSyncState("error", error.message);
    }
  }, 500);
}

function queueDetailSave() {
  if (!appState.isAuthorized || !activeDetail) {
    return;
  }

  clearTimeout(detailSaveTimer);
  setSyncState("saving", "Saving notes and work orders...");
  detailSaveTimer = setTimeout(async () => {
    try {
      const record = ensureDetailRecord(activeDetail.kind, activeDetail.key);
      await authorizedRequest("/api/detail-save", {
        kind: activeDetail.kind,
        key: activeDetail.key,
        notes: record.notes,
        workOrders: record.workOrders,
        actor: getActorName()
      });
      setSyncState("ready", "Detail notes saved");
    } catch (error) {
      setSyncState("error", error.message);
    }
  }, 450);
}

function requiresWorkspaceAuth(route) {
  return ["inventory", "trucking", "masterinfo"].includes(route);
}

function buildWorkspaceAuthPanel(route, copy) {
  if (!requiresWorkspaceAuth(route)) {
    return "";
  }

  return `
    <section class="workspace-auth-panel">
      <div>
        <p class="display-kicker">Permitted Access</p>
        <h2>${appState.isAuthorized ? "Authorized Editing" : "Login Required"}</h2>
        <p class="drawer-copy">${copy}</p>
      </div>
      <button class="login-pill" data-open-auth="${route}" type="button">${appState.isAuthorized ? "Authorized" : "Login"}</button>
    </section>
  `;
}

function formatRigMoveLabel(entry) {
  if (entry.status === "permanent") {
    return "Permanent Site";
  }

  if (entry.status === "tbd" || !entry.moveDate) {
    return "TBD";
  }

  const date = new Date(`${entry.moveDate}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function buildTextControl(value, dataAttributes, multiline = false) {
  const attrs = Object.entries(dataAttributes)
    .map(([key, attrValue]) => `data-${key}="${escapeHtml(attrValue)}"`)
    .join(" ");
  const safeValue = escapeHtml(value);

  if (!appState.isAuthorized) {
    return multiline ? `<div class="read-only-block">${safeValue || "-"}</div>` : `<span class="read-only-inline">${safeValue || "-"}</span>`;
  }

  if (multiline) {
    return `<textarea ${attrs} rows="3">${safeValue}</textarea>`;
  }

  return `<input ${attrs} type="text" value="${safeValue}">`;
}

function sumBy(rows, key) {
  return rows.reduce((total, row) => total + toNumber(row[key]), 0);
}

function buildBarMarkup(value, maxValue) {
  const width = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 12 : 0) : 0;
  return `<span class="mini-bar-fill" style="width:${width}%"></span>`;
}

function ensureFleetDetailRecord(fleet) {
  if (!fleetFieldStore.has(fleet)) {
    const reference = FLEET_REFERENCE_LOOKUP.get(fleet);
    fleetFieldStore.set(fleet, {
      customer: reference?.customer ?? "Pending",
      fuelType: reference?.gasType ?? "Pending",
      pressure: "Pending",
      jdsStatus: "Pending",
      grafanaStatus: "Grafana hookup pending",
      jotformStatus: "Jotform hookup pending",
      notes: "Pending"
    });
  }

  return fleetFieldStore.get(fleet);
}

function isFleetActive(fleet) {
  return ACTIVE_FLEET_ROSTER.includes(fleet);
}

function getArchivedFleetNumbers() {
  return Array.from(archivedFleetStore).sort((left, right) => left - right);
}

function archiveFleet(fleet) {
  const activeIndex = ACTIVE_FLEET_ROSTER.indexOf(fleet);

  if (activeIndex !== -1) {
    ACTIVE_FLEET_ROSTER.splice(activeIndex, 1);
  }

  archivedFleetStore.add(fleet);
  const moveEntry = RIG_MOVE_LOOKUP.get(fleet);

  if (moveEntry) {
    moveEntry.archived = true;
    moveEntry.label = "Archived";
    moveEntry.moveDate = "";
  }
}

function restoreFleet(fleet) {
  if (!ACTIVE_FLEET_ROSTER.includes(fleet)) {
    ACTIVE_FLEET_ROSTER.push(fleet);
    ACTIVE_FLEET_ROSTER.sort((left, right) => left - right);
  }

  archivedFleetStore.delete(fleet);
  const moveEntry = RIG_MOVE_LOOKUP.get(fleet);

  if (moveEntry) {
    moveEntry.archived = false;

    if (!moveEntry.status) {
      moveEntry.status = "tbd";
      moveEntry.moveDate = "";
    }

    moveEntry.label = formatRigMoveLabel(moveEntry);
  }
}

function getFleetProfile(fleet) {
  const reference = FLEET_REFERENCE_LOOKUP.get(fleet);
  const move = RIG_MOVE_LOOKUP.get(fleet) ?? { label: "Pending", status: "tbd", moveDate: "" };
  const packages = FLEET_LOOKUP.get(fleet)?.packages ?? [];
  const fields = ensureFleetDetailRecord(fleet);

  return {
    fleet,
    customer: fields.customer || reference?.customer || "Pending",
    gasType: fields.fuelType || reference?.gasType || "Pending",
    prsType: reference?.prsType ?? "Pending",
    prsCount: reference?.prsCount ?? (packages.length ? String(packages.length) : "Pending"),
    region: reference?.region ?? "Pending",
    moveLabel: move.label || formatRigMoveLabel(move),
    moveDate: move.moveDate,
    moveStatus: move.status,
    packages,
    assets: unique(packages.flatMap((pkg) => pkg.assets)).sort(compareAssetCodes),
    fields,
    active: isFleetActive(fleet)
  };
}

function getActiveFleetProfiles() {
  return ACTIVE_FLEET_ROSTER.map((fleet) => getFleetProfile(fleet));
}

function getActiveInUseFleetEntries() {
  return IN_USE_FLEETS.filter((entry) => isFleetActive(entry.fleet));
}

function getActiveInUsePackages() {
  return getActiveInUseFleetEntries().flatMap((entry) => entry.packages);
}

function buildFleetSummaryMarkup() {
  if (appState.dataStatus === "loading") {
    return buildEmptyStateCard("Loading fleet snapshot", "Pulling fleet schedules, move dates, and board totals from Supabase.");
  }

  if (appState.dataStatus === "error") {
    return buildEmptyStateCard("Fleet snapshot unavailable", appState.bootstrapError || "The live fleet summary could not be loaded.");
  }

  const activeEntries = RIG_MOVE_DATA.filter((entry) => isFleetActive(entry.fleet));
  const scheduled = activeEntries.filter((entry) => entry.status === "scheduled").length;
  const tbd = activeEntries.filter((entry) => entry.status === "tbd").length;
  const permanent = activeEntries.filter((entry) => entry.status === "permanent").length;

  if (!activeEntries.length) {
    return buildEmptyStateCard("No active fleets yet", "Add fleet rows or run the starter seed so the Fleet Ops snapshot has data to render.");
  }

  return `
    <article class="summary-tile">
      <span class="summary-tile-kicker">Active Fleets</span>
      <strong>${ACTIVE_FLEET_ROSTER.length}</strong>
      <p>Live fleet rows are coming from the database instead of the original hardcoded roster.</p>
    </article>
    <article class="summary-tile">
      <span class="summary-tile-kicker">Projected Moves</span>
      <strong>${scheduled}</strong>
      <p>Scheduled moves stay sorted chronologically and update immediately when the board changes.</p>
    </article>
    <article class="summary-tile">
      <span class="summary-tile-kicker">Pending / Sites</span>
      <strong>${tbd + permanent}</strong>
      <p>${tbd} fleets are marked TBD and ${permanent} are permanent sites without a move date.</p>
    </article>
  `;
}

function buildRigMoveBoardMarkup() {
  if (appState.dataStatus === "loading") {
    return buildEmptyStateCard("Loading rig move board", "Connecting to live move data and fleet schedules.");
  }

  if (appState.dataStatus === "error") {
    return buildEmptyStateCard("Rig move board unavailable", appState.bootstrapError || "The move schedule could not be loaded.");
  }

  const sorted = RIG_MOVE_DATA.filter((entry) => isFleetActive(entry.fleet)).sort((left, right) => {
    const leftRank = left.status === "scheduled" ? 0 : left.status === "tbd" ? 1 : 2;
    const rightRank = right.status === "scheduled" ? 0 : right.status === "tbd" ? 1 : 2;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    if (left.moveDate && right.moveDate) {
      return left.moveDate.localeCompare(right.moveDate);
    }

    return left.fleet - right.fleet;
  });

  if (!sorted.length) {
    return buildEmptyStateCard("No scheduled fleets", "As fleets are added or restored, they will appear here in date order.");
  }

  return sorted
    .map((entry) => {
      const profile = getFleetProfile(entry.fleet);
      const statusLabel = entry.status === "scheduled" ? "Scheduled" : entry.status === "permanent" ? "Permanent" : "TBD";
      const editor = appState.isAuthorized
        ? `
          <div class="rig-move-editor">
            <div class="rig-move-controls">
              <label class="rig-move-field">
                <span>Status</span>
                <select data-rig-status="${entry.fleet}">
                  <option value="scheduled" ${entry.status === "scheduled" ? "selected" : ""}>Scheduled</option>
                  <option value="tbd" ${entry.status === "tbd" ? "selected" : ""}>TBD</option>
                  <option value="permanent" ${entry.status === "permanent" ? "selected" : ""}>Permanent</option>
                </select>
              </label>
              <label class="rig-move-field">
                <span>Move Date</span>
                <input data-rig-date="${entry.fleet}" type="date" value="${entry.moveDate}" ${entry.status === "scheduled" ? "" : "disabled"}>
              </label>
            </div>
          </div>
        `
        : "";

      return `
        <article class="rig-move-card status-${entry.status}">
          <div class="rig-move-shell">
            <button class="rig-move-open" data-open-fleet="${entry.fleet}" type="button">
              <strong>Fleet ${entry.fleet}</strong>
              <span>${profile.customer}</span>
              <small>${profile.prsType}</small>
            </button>
            <div class="rig-move-meta">
              <div class="rig-move-pill-row">
                <span class="rig-move-pill status-${entry.status}">${statusLabel}</span>
                <span class="rig-move-pill">${profile.prsCount}</span>
              </div>
              <span class="rig-move-date">${formatRigMoveLabel(entry)}</span>
            </div>
            ${editor}
          </div>
        </article>
      `;
    })
    .join("");
}

function buildMaintenanceRequestMarkup() {
  if (appState.dataStatus === "loading") {
    return buildEmptyStateCard("Loading intake queue", "Checking recent submissions and open work orders.");
  }

  if (appState.dataStatus === "error") {
    return buildEmptyStateCard("Intake queue unavailable", appState.bootstrapError || "The live request queue could not be loaded.");
  }

  if (!maintenanceRequestStore.length) {
    return buildEmptyStateCard("No queued requests", "Recent maintenance submissions and open work orders will collect here.");
  }

  return maintenanceRequestStore
    .map(
      (request) => `
        <article class="maintenance-request-card">
          <span class="summary-tile-kicker">${request.status}</span>
          <strong>${request.title}</strong>
          <p>${request.notes}</p>
          <small>${request.fleet}</small>
        </article>
      `
    )
    .join("");
}

function buildTestingUpgradeSummaryMarkup() {
  const upgrade = getLiveMetrics().upgrade;

  return `
    <article class="upgrade-chip">
      <span class="summary-tile-kicker">Complete</span>
      <strong>${upgrade.completed}</strong>
    </article>
    <article class="upgrade-chip">
      <span class="summary-tile-kicker">In Progress</span>
      <strong>${upgrade.inProgress}</strong>
    </article>
    <article class="upgrade-chip">
      <span class="summary-tile-kicker">Not Started</span>
      <strong>${upgrade.notStarted}</strong>
    </article>
    <article class="upgrade-chip">
      <span class="summary-tile-kicker">Average</span>
      <strong>${formatPercent(upgrade.overall || 0)}</strong>
    </article>
  `;
}

function renderTestingUpgradeSummary() {
  const upgrade = getLiveMetrics().upgrade;
  upgradeProgressTag.textContent = `${formatPercent(upgrade.overall || 0)} complete`;
  testingUpgradeGrid.innerHTML = buildTestingUpgradeSummaryMarkup();
}

function getWorkspaceMeta(route) {
  return {
    metrics: {
      kicker: "Metrics Workspace",
      title: "Metrics",
      copy: "Live operational metrics, submission flow, rig move timing, and upgrade progress pulled from Supabase."
    },
    training: {
      kicker: "Training Workspace",
      title: "Training",
      copy: "Standards, performance tracking, exercises, and video support laid out as the future training surface."
    },
    inventory: {
      kicker: "Inventory Workspace",
      title: "Inventory",
      copy: "Basic inventory split between gas decompression and gas electrical using target quantities, vendors, part numbers, and locations from the workbook."
    },
    trucking: {
      kicker: "Trucking Workspace",
      title: "Trucking",
      copy: "Live trucking roster with Supabase-backed status, assignment, PM visibility, and Jotform transfer intake."
    },
    masterinfo: {
      kicker: "Master Reference",
      title: "Master Info",
      copy: "Org chart, department tasks, WTX schedule, platform links, gas-to-gen calculator, and standardized setpoints in one straightforward section."
    }
  }[route];
}

function buildMetricTile(kicker, value, copy) {
  return `
    <article class="metric-tile">
      <span class="summary-tile-kicker">${kicker}</span>
      <strong>${value}</strong>
      <p>${copy}</p>
    </article>
  `;
}

function buildMetricTrendRows(rows, keys) {
  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => keys.map((entry) => toNumber(row[entry.key])))
  );

  return rows
    .map((row) => {
      const bars = keys
        .map(
          (entry) => `
            <div class="metric-line-item">
              <span>${entry.label}</span>
              <div class="mini-bar">${buildBarMarkup(toNumber(row[entry.key]), maxValue)}</div>
              <strong>${toNumber(row[entry.key])}</strong>
            </div>
          `
        )
        .join("");

      return `
        <div class="metric-week-row">
          <div class="metric-week-label">${formatWeekLabel(row.week)}</div>
          <div class="metric-line-stack">${bars}</div>
        </div>
      `;
    })
    .join("");
}

function buildRecentSubmissionMarkup(rows) {
  if (!rows.length) {
    return buildEmptyStateCard("No recent submissions", "Once Jotform or manual intake starts writing to Supabase, recent submissions will list here.");
  }

  return `
    <div class="submission-list">
      ${rows
        .map(
          (row) => `
            <article class="submission-row">
              <div class="submission-row-head">
                <strong>${row.formName}</strong>
                <span class="badge-chip">${String(row.category || "other").replaceAll("_", " ")}</span>
              </div>
              <div class="submission-row-meta">
                <small>${row.fleetNumber ? `Fleet ${row.fleetNumber}` : row.assetCode || "General intake"}</small>
                <small>${new Date(row.submittedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small>
              </div>
              <small>${row.customer || row.submittedByName || "Awaiting field assignment"}</small>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function buildFormBreakdownMarkup(rows) {
  if (!rows.length) {
    return buildEmptyStateCard("No form activity yet", "The breakdown will populate automatically after the first live submissions arrive.");
  }

  return `
    <div class="metric-breakdown-list">
      ${rows
        .slice(0, 8)
        .map(
          (row) => `
            <article class="metric-breakdown-item">
              <div class="submission-row-head">
                <strong>${row.formName}</strong>
                <span class="badge-chip">${row.count} total</span>
              </div>
              <p>${String(row.category || "other").replaceAll("_", " ")}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function buildUpcomingMoveMarkup(rows) {
  if (!rows.length) {
    return buildEmptyStateCard("No upcoming moves", "Scheduled fleets will appear here as soon as move dates are set.");
  }

  return `
    <div class="submission-list">
      ${rows
        .map(
          (row) => `
            <article class="submission-row">
              <div class="submission-row-head">
                <strong>Fleet ${row.fleet}</strong>
                <span class="badge-chip">${new Date(`${row.moveDate}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
              <div class="submission-row-meta">
                <small>${row.customer || "Pending customer"}</small>
                <small>${row.prsType || "Pending PRS type"}</small>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderMetricsWorkspace() {
  if (appState.dataStatus === "loading") {
    return `
      <section class="workspace-panel">
        ${buildEmptyStateCard("Loading metrics", "Gathering recent submissions, upgrade progress, and move counts from Supabase.")}
      </section>
    `;
  }

  if (appState.dataStatus === "error") {
    return `
      <section class="workspace-panel">
        ${buildEmptyStateCard("Metrics unavailable", appState.bootstrapError || "The live metrics workspace could not be loaded.")}
      </section>
    `;
  }

  const metrics = getLiveMetrics();
  const weeklyRows = getMetricWindowRows(metrics.weeklySubmissions);
  const buttons = [1, 3, 6, 8]
    .map(
      (value) => `
        <button class="filter-pill ${appState.metricsWindow === value ? "active" : ""}" data-metrics-window="${value}" type="button">
          ${value} week${value === 1 ? "" : "s"}
        </button>
      `
    )
    .join("");

  return `
    <section class="workspace-panel">
      <div class="section-panel-title">
        <div>
          <p class="display-kicker">Live Snapshot</p>
          <h2>Operations Metrics</h2>
        </div>
        <div class="filter-pill-row">${buttons}</div>
      </div>
      <div class="metric-grid">
        ${buildMetricTile("Active Fleets", metrics.summary.activeFleets, "Current non-archived fleet rows from the live database.")}
        ${buildMetricTile("Live Packages", metrics.summary.livePackages, "Packages currently marked in use on the deployment board.")}
        ${buildMetricTile("Scheduled Moves", metrics.summary.scheduledMoves, "Fleets with a dated scheduled move on the rig move board.")}
        ${buildMetricTile("Recent Submissions", metrics.summary.recentSubmissions, "Jotform submissions received in the last 30 days.")}
        ${buildMetricTile("Maintenance Actions", metrics.summary.maintenanceActions, "Maintenance and inspection forms received in the last 30 days.")}
        ${buildMetricTile("Truck Transfers", metrics.summary.truckTransfers, "Pickup and drop-off forms received in the last 30 days.")}
      </div>
    </section>

    <div class="workspace-grid">
      <section class="workspace-panel">
        <div class="section-panel-title">
          <div>
            <p class="display-kicker">Submission Trend</p>
            <h2>Weekly Intake</h2>
          </div>
          <span class="preview-tag">${weeklyRows.length} tracked weeks</span>
        </div>
        <div class="metric-week-list">
          ${weeklyRows.length
            ? buildMetricTrendRows(weeklyRows, [
              { key: "total", label: "Total" },
              { key: "job_setup", label: "JDS" },
              { key: "inspection", label: "Inspection" },
              { key: "maintenance", label: "Maintenance" }
            ])
            : buildEmptyStateCard("No weekly activity", "Weekly submission totals will populate as records arrive.")}
        </div>
      </section>

      <section class="workspace-panel">
        <div class="section-panel-title">
          <div>
            <p class="display-kicker">Upcoming Moves</p>
            <h2>Chronological Board</h2>
          </div>
          <span class="preview-tag">${metrics.summary.scheduledMoves} scheduled</span>
        </div>
        ${buildUpcomingMoveMarkup(metrics.upcomingMoves)}
      </section>

      <section class="workspace-panel">
        <div class="section-panel-title">
          <div>
            <p class="display-kicker">Recent Intake</p>
            <h2>Latest Submissions</h2>
          </div>
          <span class="preview-tag">${metrics.recentSubmissions.length} recent</span>
        </div>
        ${buildRecentSubmissionMarkup(metrics.recentSubmissions)}
      </section>

      <section class="workspace-panel">
        <div class="section-panel-title">
          <div>
            <p class="display-kicker">Form Mix</p>
            <h2>Submission Breakdown</h2>
          </div>
          <span class="preview-tag">${metrics.formBreakdown.length} forms</span>
        </div>
        ${buildFormBreakdownMarkup(metrics.formBreakdown)}
      </section>

      <section class="workspace-panel">
        <div class="section-panel-title">
          <div>
            <p class="display-kicker">LPCC Rollout</p>
            <h2>Upgrade Progress</h2>
          </div>
          <span class="preview-tag">${formatPercent(metrics.upgrade.overall || 0)}</span>
        </div>
        <div class="upgrade-progress-list">
          ${metrics.upgrade.assets.length
            ? metrics.upgrade.assets
              .map(
                (asset) => `
                  <div class="upgrade-progress-row">
                    <strong>${asset.asset}</strong>
                    <div class="mini-bar">${buildBarMarkup(asset.progress * 100, 100)}</div>
                    <span>${formatPercent(asset.progress)}</span>
                  </div>
                `
              )
              .join("")
            : buildEmptyStateCard("No tracked upgrades", "Set asset upgrade progress in Supabase to start visualizing rollout progress.")}
        </div>
      </section>

      <section class="workspace-panel">
        <div class="section-panel-title">
          <div>
            <p class="display-kicker">Trucking</p>
            <h2>Vehicle Status</h2>
          </div>
          <span class="preview-tag">${metrics.trucking.total} units</span>
        </div>
        <div class="metric-grid">
          ${buildMetricTile("Total Units", metrics.trucking.total, "Live truck rows stored in Supabase.")}
          ${buildMetricTile("In Use", metrics.trucking.inUse, "Units marked in use on the trucking board.")}
          ${buildMetricTile("In Shop", metrics.trucking.inShop, "Shop or repair statuses currently active.")}
          ${buildMetricTile("PM Due", metrics.trucking.pmDue, "Rows with PM due status in the trucking roster.")}
        </div>
      </section>
    </div>
  `;
}

function renderTrainingWorkspace() {
  return `
    <section class="workspace-panel">
      <div class="section-panel-title">
        <div>
          <p class="display-kicker">Training Surface</p>
          <h2>What Lives Here</h2>
        </div>
        <span class="preview-tag">Framework first</span>
      </div>
      <div class="workspace-card-grid">
        ${TRAINING_TRACKS
          .map(
            (track) => `
              <article class="workspace-card">
                <span class="summary-tile-kicker">${track.status}</span>
                <strong>${track.title}</strong>
                <p>${track.description}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderInventoryWorkspace() {
  return `
    ${buildWorkspaceAuthPanel("inventory", "Inventory is editable after login so gas decompression and gas electrical counts can stay useful until the forms workflow is live.")}
    ${Object.entries(INVENTORY_GROUPS)
      .map(
        ([name, group]) => `
          <section class="workspace-panel">
            <div class="section-panel-title">
              <div>
                <p class="display-kicker">Inventory Group</p>
                <h2>${name}</h2>
              </div>
              <span class="preview-tag">${group.totalItems} listed items</span>
            </div>
            <div class="inventory-table">
              <div class="inventory-row inventory-head">
                <span>Vendor</span>
                <span>Item</span>
                <span>Part #</span>
                <span>Min</span>
                <span>Max</span>
                <span>Location</span>
              </div>
              ${group.rows
                .map(
                  (row, rowIndex) => `
                    <div class="inventory-row">
                      <div>${buildTextControl(row.vendor, { "inventory-group": name, "inventory-row": rowIndex, "inventory-field": "vendor" })}</div>
                      <div>${buildTextControl(row.item, { "inventory-group": name, "inventory-row": rowIndex, "inventory-field": "item" })}</div>
                      <div>${buildTextControl(row.partNumber, { "inventory-group": name, "inventory-row": rowIndex, "inventory-field": "partNumber" })}</div>
                      <div>${buildTextControl(row.min, { "inventory-group": name, "inventory-row": rowIndex, "inventory-field": "min" })}</div>
                      <div>${buildTextControl(row.max, { "inventory-group": name, "inventory-row": rowIndex, "inventory-field": "max" })}</div>
                      <div>${buildTextControl(row.location, { "inventory-group": name, "inventory-row": rowIndex, "inventory-field": "location" })}</div>
                    </div>
                  `
                )
                .join("")}
            </div>
          </section>
        `
      )
      .join("")}
  `;
}

function renderTruckingWorkspace() {
  if (appState.dataStatus === "loading") {
    return `
      <section class="workspace-panel">
        ${buildEmptyStateCard("Loading trucking board", "Pulling live vehicle rows and recent transfer activity from Supabase.")}
      </section>
    `;
  }

  if (appState.dataStatus === "error") {
    return `
      <section class="workspace-panel">
        ${buildEmptyStateCard("Trucking board unavailable", appState.bootstrapError || "The live trucking surface could not be loaded.")}
      </section>
    `;
  }

  const metrics = getLiveMetrics().trucking;

  return `
    ${buildWorkspaceAuthPanel("trucking", "Trucking updates persist to Supabase after you unlock permitted mode with the admin token.")}
    <section class="workspace-panel">
      <div class="metric-grid">
        ${buildMetricTile("Tracked Units", metrics.total, "This count is coming from the live trucks table in Supabase.")}
        ${buildMetricTile("In Use", metrics.inUse, "Pickup/drop-off forms and manual edits will both drive this board.")}
        ${buildMetricTile("In Shop", metrics.inShop, "Shop and repair statuses remain visible for dispatch planning.")}
        ${buildMetricTile("PM Due", metrics.pmDue, "Units tagged with PM due stay surfaced for follow-up.")}
      </div>
    </section>

    <section class="workspace-panel">
      <div class="section-panel-title">
        <div>
          <p class="display-kicker">Truck Roster</p>
          <h2>Live Vehicle Board</h2>
        </div>
        <div class="workspace-inline-actions">
          <span class="preview-tag">${TRUCKING_ROSTER.length} live rows</span>
          ${appState.isAuthorized ? '<button class="section-action" data-add-truck="true" type="button">Add Truck</button>' : ""}
        </div>
      </div>
      ${TRUCKING_ROSTER.length
        ? `
          <div class="truck-table">
            <div class="truck-row truck-head">
              <span>Asset</span>
              <span>VIN</span>
              <span>Plate</span>
              <span>Vehicle</span>
              <span>Status</span>
              <span>Driver</span>
              <span>Fleet</span>
              <span>Notes</span>
            </div>
            ${TRUCKING_ROSTER
              .map(
                (row, rowIndex) => `
                  <div class="truck-row">
                    <div>${buildTextControl(row.assetId, { "truck-row": rowIndex, "truck-field": "assetId" })}</div>
                    <div>${buildTextControl(row.vin, { "truck-row": rowIndex, "truck-field": "vin" })}</div>
                    <div>${buildTextControl(row.plate, { "truck-row": rowIndex, "truck-field": "plate" })}</div>
                    <div>${buildTextControl(row.vehicle, { "truck-row": rowIndex, "truck-field": "vehicle" })}</div>
                    <div>${buildTextControl(row.status, { "truck-row": rowIndex, "truck-field": "status" })}</div>
                    <div>${buildTextControl(row.driver, { "truck-row": rowIndex, "truck-field": "driver" })}</div>
                    <div>${buildTextControl(row.fleet, { "truck-row": rowIndex, "truck-field": "fleet" })}</div>
                    <div>${buildTextControl(row.notes, { "truck-row": rowIndex, "truck-field": "notes" }, true)}</div>
                  </div>
                `
              )
              .join("")}
          </div>
        `
        : buildEmptyStateCard("No truck rows yet", "Use the starter seed or add the first truck row after unlocking permitted mode.")}
    </section>
  `;
}

function buildOrgGroupMarkup(title, group) {
  return `
    <article class="workspace-card">
      <span class="summary-tile-kicker">${title}</span>
      <div class="org-list">
        ${group
          .map(
            (person) => `
              <div class="org-person">
                <strong>${person.name}</strong>
                <span>${person.title}</span>
                <small>${person.region}</small>
              </div>
            `
          )
          .join("")}
      </div>
    </article>
  `;
}

function calculateGasToGen() {
  const inputs = appState.calculatorInputs;
  const gasScfHr = (toNumber(inputs.loadKw) * toNumber(inputs.heatRate)) / Math.max(toNumber(inputs.heatingValue), 1);
  const gasMscfd = (gasScfHr * 24) / 1000;
  const prsRequired = gasMscfd / 7000;
  const trailersPerDay = gasMscfd / 460;

  return {
    gasScfHr,
    gasMscfd,
    prsRequired,
    trailersPerDay
  };
}

function renderMasterInfoWorkspace() {
  const orgGroups = {
    Leadership: WTX_ORG_CHART.filter((person) => person.group === "Leadership"),
    Supervisors: WTX_ORG_CHART.filter((person) => person.group === "Supervisors"),
    Techs: WTX_ORG_CHART.filter((person) => person.group === "Techs")
  };
  const scheduleButtons = Object.keys(WTX_SCHEDULE)
    .map(
      (month) => `
        <button class="filter-pill ${appState.scheduleMonth === month ? "active" : ""}" data-schedule-month="${month}" type="button">
          ${month}
        </button>
      `
    )
    .join("");
  const activeSchedule = WTX_SCHEDULE[appState.scheduleMonth] ?? [];
  const calculator = calculateGasToGen();

  return `
    ${buildWorkspaceAuthPanel("masterinfo", "Master Info is editable after login so department tasks, schedule rows, and platform links can be maintained manually for now.")}
    <section class="workspace-panel">
      <div class="section-panel-title">
        <div>
          <p class="display-kicker">Org Chart</p>
          <h2>WTX / Delaware / AZ</h2>
        </div>
        <span class="preview-tag">Simplified view</span>
      </div>
      <div class="workspace-card-grid">
        ${buildOrgGroupMarkup("Leadership", orgGroups.Leadership)}
        ${buildOrgGroupMarkup("Supervisors", orgGroups.Supervisors)}
        ${buildOrgGroupMarkup("Techs", orgGroups.Techs)}
      </div>
    </section>

    <div class="workspace-grid">
      <section class="workspace-panel">
        <div class="section-panel-title">
          <div>
            <p class="display-kicker">Department Tasks</p>
            <h2>Manual Task Board</h2>
          </div>
          <div class="workspace-inline-actions">
            <span class="preview-tag">${DEPARTMENT_TASKS.length} staged items</span>
            ${appState.isAuthorized ? '<button class="section-action" data-add-task="true" type="button">Add Task</button>' : ""}
          </div>
        </div>
        <div class="task-board">
          ${DEPARTMENT_TASKS
            .map(
              (task, taskIndex) => `
                <article class="task-card ${task.complete ? "complete" : ""}">
                  <div>${buildTextControl(task.status, { "task-index": taskIndex, "task-field": "status" })}</div>
                  <div>${buildTextControl(task.title, { "task-index": taskIndex, "task-field": "title" })}</div>
                  <div>${buildTextControl(task.detail, { "task-index": taskIndex, "task-field": "detail" }, true)}</div>
                  <div>${buildTextControl(task.owner, { "task-index": taskIndex, "task-field": "owner" })}</div>
                </article>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="workspace-panel">
        <div class="section-panel-title">
          <div>
            <p class="display-kicker">2026 WTX Schedule</p>
            <h2>Travel Schedule</h2>
          </div>
          <div class="workspace-inline-actions">
            <div class="filter-pill-row">${scheduleButtons}</div>
            ${appState.isAuthorized ? '<button class="section-action" data-add-schedule-row="true" type="button">Add Row</button>' : ""}
          </div>
        </div>
        <div class="schedule-table">
          <div class="schedule-row schedule-head">
            <span>Tech</span>
            <span>Town</span>
            <span>Lodging</span>
            <span>Check In</span>
            <span>Check Out</span>
            <span>Shift</span>
          </div>
          ${(activeSchedule.length ? activeSchedule : [{ tech: "No current rows", town: "", lodging: "", checkIn: "", checkOut: "", shift: "" }])
            .map(
              (row, rowIndex) => `
                <div class="schedule-row">
                  <div>${buildTextControl(row.tech, { "schedule-month": appState.scheduleMonth, "schedule-row": rowIndex, "schedule-field": "tech" })}</div>
                  <div>${buildTextControl(row.town, { "schedule-month": appState.scheduleMonth, "schedule-row": rowIndex, "schedule-field": "town" })}</div>
                  <div>${buildTextControl(row.lodging, { "schedule-month": appState.scheduleMonth, "schedule-row": rowIndex, "schedule-field": "lodging" })}</div>
                  <div>${buildTextControl(row.checkIn, { "schedule-month": appState.scheduleMonth, "schedule-row": rowIndex, "schedule-field": "checkIn" })}</div>
                  <div>${buildTextControl(row.checkOut, { "schedule-month": appState.scheduleMonth, "schedule-row": rowIndex, "schedule-field": "checkOut" })}</div>
                  <div>${buildTextControl(row.shift, { "schedule-month": appState.scheduleMonth, "schedule-row": rowIndex, "schedule-field": "shift" })}</div>
                </div>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="workspace-panel">
        <div class="section-panel-title">
          <div>
            <p class="display-kicker">Platform Links</p>
            <h2>Manual Link List</h2>
          </div>
          <div class="workspace-inline-actions">
            <span class="preview-tag">Editable after login</span>
            ${appState.isAuthorized ? '<button class="section-action" data-add-link="true" type="button">Add Link</button>' : ""}
          </div>
        </div>
        <div class="link-table">
          <div class="link-row link-head">
            <span>Label</span>
            <span>URL</span>
            <span>Description</span>
          </div>
          ${PLATFORM_LINKS.map((link, linkIndex) => `
            <div class="link-row">
              <div>${buildTextControl(link.label, { "link-index": linkIndex, "link-field": "label" })}</div>
              <div>${buildTextControl(link.url, { "link-index": linkIndex, "link-field": "url" })}</div>
              <div>${buildTextControl(link.description, { "link-index": linkIndex, "link-field": "description" }, true)}</div>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="workspace-panel">
        <div class="section-panel-title">
          <div>
            <p class="display-kicker">Tool</p>
            <h2>Gas to Gen Calculator</h2>
          </div>
          <span class="preview-tag">Interactive</span>
        </div>
        <div class="calculator-grid">
          <label>
            <span>Load (kW)</span>
            <input data-calc-field="loadKw" type="number" value="${appState.calculatorInputs.loadKw}">
          </label>
          <label>
            <span>Heat Rate (BTU/kWh)</span>
            <input data-calc-field="heatRate" type="number" value="${appState.calculatorInputs.heatRate}">
          </label>
          <label>
            <span>Heating Value (BTU/scf)</span>
            <input data-calc-field="heatingValue" type="number" value="${appState.calculatorInputs.heatingValue}">
          </label>
          <label>
            <span>Delivery PSI</span>
            <input data-calc-field="deliveryPsi" type="number" value="${appState.calculatorInputs.deliveryPsi}">
          </label>
        </div>
        <div class="metric-grid">
          ${buildMetricTile("Gas Flow", `${formatMetric(calculator.gasScfHr)} SCF/hr`, "Current planner uses load, heat rate, and heating value inputs from the calculator sheet.")}
          ${buildMetricTile("Gas Demand", `${formatMetric(calculator.gasMscfd)} MSCFD`, "24-hour throughput estimate for planning purposes.")}
          ${buildMetricTile("PRS Needed", formatMetric(calculator.prsRequired), "Estimated with the current workbook assumption of about 7,000 MSCFD per PRS.")}
          ${buildMetricTile("Avg Trailers / Day", formatMetric(calculator.trailersPerDay), "Estimated with the current workbook assumption of about 460 MSCFD per trailer.")}
        </div>
      </section>

      <section class="workspace-panel">
        <div class="section-panel-title">
          <div>
            <p class="display-kicker">Reference Sheet</p>
            <h2>Standardized Setpoints</h2>
          </div>
          <span class="preview-tag">Document style</span>
        </div>
        <div class="setpoint-doc">
          <div class="setpoint-row setpoint-head">
            <span>Breaker</span>
            <span>Flow</span>
            <span>Delivery</span>
            <span>RDH Top</span>
            <span>RDH Bottom</span>
            <span>EZH Top</span>
            <span>EZH Bottom</span>
          </div>
          ${STANDARDIZED_SETPOINTS
            .map(
              (row) => `
                <div class="setpoint-row">
                  <span>${row.breaker}</span>
                  <span>${row.flow}</span>
                  <span>${row.delivery}</span>
                  <span>${row.rdhTop}</span>
                  <span>${row.rdhBottom}</span>
                  <span>${row.ezhTop}</span>
                  <span>${row.ezhBottom}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}

function renderPlaceholderView() {
  const route = appState.placeholderRoute;
  const meta = getWorkspaceMeta(route);

  if (!meta) {
    return;
  }

  placeholderKicker.textContent = meta.kicker;
  placeholderTitle.textContent = meta.title;
  placeholderCopy.textContent = meta.copy;

  if (route === "metrics") {
    placeholderContent.innerHTML = renderMetricsWorkspace();
    return;
  }

  if (route === "training") {
    placeholderContent.innerHTML = renderTrainingWorkspace();
    return;
  }

  if (route === "inventory") {
    placeholderContent.innerHTML = renderInventoryWorkspace();
    return;
  }

  if (route === "trucking") {
    placeholderContent.innerHTML = renderTruckingWorkspace();
    return;
  }

  placeholderContent.innerHTML = renderMasterInfoWorkspace();
}

function addPlatformLink() {
  PLATFORM_LINKS.push({
    label: "New Link",
    url: "",
    description: "Pending"
  });
}

function addTruckRow() {
  TRUCKING_ROSTER.push({
    assetId: "",
    vin: "",
    plate: "",
    vehicle: "",
    status: "Pending",
    assigned: "Pending",
    driver: "Pending",
    fleet: "Pending",
    notes: "Pending"
  });
}

function addTaskRow() {
  DEPARTMENT_TASKS.unshift({
    title: "New Task",
    detail: "Pending",
    owner: "Pending",
    status: "Pending",
    complete: false
  });
}

function addScheduleRow(month) {
  WTX_SCHEDULE[month].push({
    tech: "Pending",
    town: "Pending",
    lodging: "Pending",
    checkIn: "",
    checkOut: "",
    confirmed: "",
    shift: ""
  });
}

function buildArchivedFleetMarkup() {
  const archived = getArchivedFleetNumbers();

  if (!archived.length) {
    return `
      <div class="section-panel">
        <p class="drawer-copy">No archived fleets are tracked yet.</p>
      </div>
    `;
  }

  return `
    <div class="section-panel">
      <div class="section-panel-title">
        <div>
          <p class="display-kicker">Fleet Archive</p>
          <h3>Inactive &amp; Not Listed Fleets</h3>
        </div>
        <span class="preview-tag">${archived.length} archived</span>
      </div>
      <div class="fleet-grid">
        ${archived
          .map((fleet) => {
            const reference = FLEET_REFERENCE_LOOKUP.get(fleet);
            return `
              <div class="fleet-box inactive archive-fleet-card">
                <strong>Fleet ${fleet}</strong>
                <span>${reference?.customer ?? "Inactive / not listed"}</span>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function openFleetArchiveSection() {
  sectionOverlay.hidden = false;
  appState.sectionOverlayContext = { type: "archive" };
  sectionOverlayKicker.textContent = "Fleet Archive";
  sectionOverlayTitle.textContent = "Archived Fleets";
  sectionOverlayBody.innerHTML = buildArchivedFleetMarkup();
}

function renderTopbarSummary() {
  const activePackages = getActiveInUsePackages();

  if (appState.dataStatus === "loading") {
    readySummary.innerHTML = "Ready Packages: <strong>Loading...</strong>";
    testingSummary.innerHTML = "Testing Packages: <strong>Loading...</strong>";
    queueSummary.innerHTML = "In Queue: <strong>Loading...</strong>";
    oosSummary.textContent = "loading";
    activeFleetSummary.textContent = "Loading...";
    activePackageSummary.textContent = "Loading...";
    return;
  }

  if (appState.dataStatus === "error") {
    readySummary.innerHTML = "Ready Packages: <strong>Error</strong>";
    testingSummary.innerHTML = "Testing Packages: <strong>Error</strong>";
    queueSummary.innerHTML = "In Queue: <strong>Error</strong>";
    oosSummary.textContent = "error";
    activeFleetSummary.textContent = "Unavailable";
    activePackageSummary.textContent = "Unavailable";
    return;
  }

  readySummary.innerHTML = `Ready Packages: <strong>${READY_PACKAGES.length} packages</strong>`;
  testingSummary.innerHTML = `Testing Packages: <strong>${TESTING_PACKAGES.length} packages</strong>`;
  queueSummary.innerHTML = `In Queue: <strong>${QUEUE_PACKAGES.length} packages</strong>`;
  oosSummary.textContent = `${OOS_ASSETS.size} tracked`;
  activeFleetSummary.textContent = `${ACTIVE_FLEET_ROSTER.length} / ${TOTAL_FLEETS}`;
  activePackageSummary.textContent = `${activePackages.length} packages`;
}

function renderMainPreviews() {
  const activePackages = getActiveInUsePackages();

  if (appState.dataStatus === "loading") {
    const loadingCard = buildEmptyStateCard("Loading board data", "Live board rows are on the way.");
    readyPreview.innerHTML = loadingCard;
    testingPreview.innerHTML = loadingCard;
    queuePreview.innerHTML = loadingCard;
    inUsePreview.innerHTML = loadingCard;
    fieldFleetPreview.innerHTML = loadingCard;
    fieldPrsPreview.innerHTML = "";
    return;
  }

  readyPreview.innerHTML = buildLimitedPreviewMarkup(READY_PACKAGES, 4);
  testingPreview.innerHTML = buildLimitedPreviewMarkup(TESTING_PACKAGES, 4);
  queuePreview.innerHTML = buildLimitedPreviewMarkup(QUEUE_PACKAGES, 4);
  inUsePreview.innerHTML = buildLimitedPreviewMarkup(activePackages, 4);

  fieldFleetPreview.innerHTML = ACTIVE_FLEET_ROSTER.slice(0, 4)
    .map((fleet) => {
      const profile = getFleetProfile(fleet);
      const countLabel = profile.packages.length
        ? `${profile.packages.length} package${profile.packages.length === 1 ? "" : "s"}`
        : "Pending package data";

      return `
      <div class="mini-fleet-box active">
        <strong>Fleet ${fleet}</strong>
        <span>${countLabel}</span>
      </div>
    `;
    })
    .join("") || buildEmptyStateCard("No active fleets", "Fleet package previews will appear here once live rows are assigned.");

  fieldPrsPreview.innerHTML = activePackages.slice(0, 4)
    .map((pkg) => `<span>${pkg.label}</span>`)
    .join("") || `<span>No live packages</span>`;
}

function renderFleetOpsView() {
  const activePackages = getActiveInUsePackages();
  const scheduledMoves = RIG_MOVE_DATA.filter((entry) => isFleetActive(entry.fleet) && entry.status === "scheduled").length;
  const loadingLabel = appState.dataStatus === "loading" ? "Loading..." : appState.dataStatus === "error" ? "Unavailable" : null;

  fleetOpsActiveSummary.textContent = loadingLabel || `${ACTIVE_FLEET_ROSTER.length} active`;
  fleetOpsPackageSummary.textContent = loadingLabel || `${activePackages.length} packages`;
  fleetOpsMoveSummary.textContent = loadingLabel || `${scheduledMoves} dated moves`;
  fleetArchiveCount.textContent = `${getArchivedFleetNumbers().length} archived`;
  maintenanceRequestSummary.textContent = loadingLabel || `${maintenanceRequestStore.length} request${maintenanceRequestStore.length === 1 ? "" : "s"}`;
  fleetOpsSummaryGrid.innerHTML = buildFleetSummaryMarkup();
  rigMoveBoard.innerHTML = buildRigMoveBoardMarkup();
  maintenanceRequestList.innerHTML = buildMaintenanceRequestMarkup();
  fleetOpsFleetGrid.innerHTML = appState.dataStatus === "ready"
    ? buildFleetGridMarkup(true)
    : buildEmptyStateCard("Fleet register unavailable", appState.dataStatus === "loading" ? "Loading live fleet rows." : appState.bootstrapError || "No live fleet rows are available.");
  fleetOpsPackageGrid.innerHTML = appState.dataStatus === "ready" && activePackages.length
    ? activePackages.map((pkg) => buildSectionPackageCard(pkg)).join("")
    : buildEmptyStateCard("No live packages", appState.dataStatus === "loading" ? "Loading package rows from the board." : "In-use packages will appear here once the board is populated.");
}

function renderPermittedState() {
  const authorized = appState.isAuthorized;

  adminDock.hidden = !authorized;
  authBadge.hidden = !authorized;
  fleetAuthBadge.hidden = !authorized;
  loginTrigger.textContent = authorized ? "Authorized" : "Login";
  fleetLoginTrigger.textContent = authorized ? "Authorized" : "Login";
}

function renderEditorTable() {
  if (!boardRows.length) {
    editorTableBody.innerHTML = `
      <tr>
        <td class="data-table-empty" colspan="6">No board rows are loaded yet.</td>
      </tr>
    `;
    return;
  }

  editorTableBody.innerHTML = boardRows
    .map((row) => `
      <tr data-row-id="${row.id}">
        <td>
          <select data-field="status">
            <option value="ready" ${row.status === "ready" ? "selected" : ""}>RTG</option>
            <option value="inuse" ${row.status === "inuse" ? "selected" : ""}>In Use</option>
            <option value="oos" ${row.status === "oos" ? "selected" : ""}>OOS</option>
            <option value="testing" ${row.status === "testing" ? "selected" : ""}>Testing</option>
            <option value="queue" ${row.status === "queue" ? "selected" : ""}>In Queue</option>
          </select>
        </td>
        <td><input data-field="allocation" type="text" value="${row.allocation}" placeholder="Fleet 12"></td>
        <td><input data-field="HP" type="text" value="${row.HP}" placeholder="HP07"></td>
        <td><input data-field="LP" type="text" value="${row.LP}" placeholder="LP22"></td>
        <td><input data-field="HR" type="text" value="${row.HR}" placeholder="HR04"></td>
        <td><input data-field="CC" type="text" value="${row.CC}" placeholder="CC11"></td>
      </tr>
    `)
    .join("");
}

function refreshAll() {
  renderSyncStatus();
  renderTopbarSummary();
  renderMainPreviews();
  renderTestingUpgradeSummary();
  renderOosPanel();
  renderCategory(activeCategory);
  renderFleetOpsView();
  renderPlaceholderView();
  renderPermittedState();

  if (!editorOverlay.hidden) {
    renderEditorTable();
  }

  if (!detailOverlay.hidden && activeDetail) {
    renderDetailContent();
  }
}

function showView(view) {
  appState.currentView = view;
  appState.sectionOverlayContext = null;
  sectionOverlay.hidden = true;
  detailOverlay.hidden = true;
  loginOverlay.hidden = true;
  editorOverlay.hidden = true;
  menuView.hidden = view !== "menu";
  testingView.hidden = view !== "testing";
  fleetOpsView.hidden = view !== "fleetops";
  placeholderView.hidden = view !== "placeholder";
  menuTab.hidden = view === "menu";
  menuTab.classList.toggle("active", view === "menu");
}

function openPlaceholder(label) {
  appState.placeholderRoute = label;
  renderPlaceholderView();
  showView("placeholder");
}

function openLoginOverlay() {
  loginError.hidden = true;
  usernameInput.value = appState.adminUser || "";
  passwordInput.value = "";
  loginOverlay.hidden = false;
  passwordInput.focus();
}

function closeLoginModal() {
  loginOverlay.hidden = true;
}

function openEditorOverlay() {
  if (!appState.isAuthorized) {
    openLoginOverlay();
    return;
  }

  renderEditorTable();
  editorOverlay.hidden = false;
}

function closeEditorModal() {
  editorOverlay.hidden = true;
}

function initializeShellActions() {
  menuTab.addEventListener("click", () => {
    showView("menu");
  });

  menuGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-route]");

    if (!button) {
      return;
    }

    const route = button.dataset.route;

    if (route === "testing") {
      showView("testing");
      return;
    }

    if (route === "fleetops") {
      showView("fleetops");
      return;
    }

    openPlaceholder(route);
  });

  fleetOpsFleetGrid.addEventListener("click", (event) => {
    const fleetButton = event.target.closest("[data-open-fleet]");

    if (!fleetButton) {
      return;
    }

    openFleetPackagesSection(Number(fleetButton.dataset.openFleet));
  });

  rigMoveBoard.addEventListener("click", (event) => {
    const fleetButton = event.target.closest("[data-open-fleet]");

    if (!fleetButton) {
      return;
    }

    openFleetPackagesSection(Number(fleetButton.dataset.openFleet));
  });

  rigMoveBoard.addEventListener("change", (event) => {
    const statusField = event.target.closest("[data-rig-status]");
    const dateField = event.target.closest("[data-rig-date]");

    if ((statusField || dateField) && !appState.isAuthorized) {
      openLoginOverlay();
      renderFleetOpsView();
      return;
    }

    if (statusField) {
      const entry = RIG_MOVE_LOOKUP.get(Number(statusField.dataset.rigStatus));

      if (!entry) {
        return;
      }

      entry.status = statusField.value;
      if (entry.status !== "scheduled") {
        entry.moveDate = "";
      }

      entry.label = formatRigMoveLabel(entry);
      renderFleetOpsView();
      queueBoardSave();
      return;
    }

    if (dateField) {
      const entry = RIG_MOVE_LOOKUP.get(Number(dateField.dataset.rigDate));

      if (!entry) {
        return;
      }

      entry.moveDate = dateField.value;
      if (entry.moveDate) {
        entry.status = "scheduled";
      }

      entry.label = formatRigMoveLabel(entry);
      renderFleetOpsView();
      queueBoardSave();
    }
  });

  fleetOpsPackageGrid.addEventListener("click", (event) => {
    const detailButton = event.target.closest("[data-open-package]");
    const assetButton = event.target.closest("[data-focus-category]");

    if (detailButton) {
      openDetailOverlay("package", detailButton.dataset.openPackage);
      return;
    }

    if (assetButton) {
      showView("testing");
      renderCategory(assetButton.dataset.focusCategory, Number(assetButton.dataset.focusIndex));
    }
  });

  loginTrigger.addEventListener("click", () => {
    if (appState.isAuthorized) {
      openEditorOverlay();
      return;
    }

    openLoginOverlay();
  });

  fleetLoginTrigger.addEventListener("click", () => {
    if (appState.isAuthorized) {
      openEditorOverlay();
      return;
    }

    openLoginOverlay();
  });

  fleetArchiveTrigger.addEventListener("click", openFleetArchiveSection);

  adminDock.addEventListener("click", openEditorOverlay);
  editorTrigger.addEventListener("click", openEditorOverlay);
  closeLoginOverlay.addEventListener("click", closeLoginModal);
  closeEditorOverlay.addEventListener("click", closeEditorModal);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.hidden = true;

    try {
      const token = passwordInput.value.trim();

      if (!token) {
        throw new Error("Admin token required.");
      }

      await apiRequest("/api/admin-login", {
        method: "POST",
        body: { token }
      });

      appState.isAuthorized = true;
      appState.adminToken = token;
      appState.adminUser = usernameInput.value.trim() || "Admin";
      closeLoginModal();
      refreshAll();

      if (appState.sectionOverlayContext?.type === "fleet") {
        openFleetPackagesSection(appState.sectionOverlayContext.fleet);
      }
      setSyncState("ready", "Permitted mode unlocked");
      return;
    } catch (error) {
      loginError.textContent = error.message || "Invalid admin token.";
      loginError.hidden = false;
    }
  });

  editorTableBody.addEventListener("change", (event) => {
    const target = event.target;
    const rowElement = target.closest("tr[data-row-id]");

    if (!rowElement) {
      return;
    }

    const row = boardRows.find((entry) => entry.id === rowElement.dataset.rowId);

    if (!row) {
      return;
    }

    const field = target.dataset.field;

    if (field === "status") {
      row.status = target.value;
      if (row.status === "ready" || row.status === "oos") {
        row.allocation = "Standby";
      } else if (row.status === "queue") {
        row.allocation = "In Queue";
      } else if (row.status === "testing") {
        row.allocation = "Testing";
      } else if (!row.allocation.toUpperCase().startsWith("FLEET")) {
        row.allocation = "Fleet 1";
      }
    } else if (field === "allocation") {
      row.allocation = normalizeAllocationInput(target.value, row.status);
    } else {
      row[field] = normalizeAssetInput(field, target.value);
    }

    rebuildBoardData();
    refreshAll();
    renderEditorTable();
    queueBoardSave();
  });

  placeholderContent.addEventListener("click", (event) => {
    const windowButton = event.target.closest("[data-metrics-window]");
    const monthButton = event.target.closest("[data-schedule-month]");
    const authButton = event.target.closest("[data-open-auth]");
    const addLinkButton = event.target.closest("[data-add-link]");
    const addTruckButton = event.target.closest("[data-add-truck]");
    const addTaskButton = event.target.closest("[data-add-task]");
    const addScheduleRowButton = event.target.closest("[data-add-schedule-row]");

    if (windowButton) {
      appState.metricsWindow = Number(windowButton.dataset.metricsWindow);
      renderPlaceholderView();
      return;
    }

    if (monthButton) {
      appState.scheduleMonth = monthButton.dataset.scheduleMonth;
      renderPlaceholderView();
      return;
    }

    if (authButton) {
      if (!appState.isAuthorized) {
        openLoginOverlay();
      }
      return;
    }

    if (addLinkButton && appState.isAuthorized) {
      addPlatformLink();
      renderPlaceholderView();
      return;
    }

    if (addTruckButton && appState.isAuthorized) {
      addTruckRow();
      renderPlaceholderView();
      return;
    }

    if (addTaskButton && appState.isAuthorized) {
      addTaskRow();
      renderPlaceholderView();
      return;
    }

    if (addScheduleRowButton && appState.isAuthorized) {
      addScheduleRow(appState.scheduleMonth);
      renderPlaceholderView();
    }
  });

  placeholderContent.addEventListener("change", (event) => {
    const calcField = event.target.closest("[data-calc-field]");
    const inventoryField = event.target.closest("[data-inventory-field]");
    const truckField = event.target.closest("[data-truck-field]");
    const taskField = event.target.closest("[data-task-field]");
    const scheduleField = event.target.closest("[data-schedule-field]");
    const linkField = event.target.closest("[data-link-field]");

    if (!calcField) {
      if (!appState.isAuthorized) {
        return;
      }

      if (inventoryField) {
        const row = INVENTORY_GROUPS[inventoryField.dataset.inventoryGroup]?.rows?.[Number(inventoryField.dataset.inventoryRow)];

        if (row) {
          row[inventoryField.dataset.inventoryField] = inventoryField.value.trim() || "Pending";
          renderPlaceholderView();
        }
        return;
      }

      if (truckField) {
        const row = TRUCKING_ROSTER[Number(truckField.dataset.truckRow)];

        if (row) {
          row[truckField.dataset.truckField] = truckField.value.trim() || "Pending";
          renderPlaceholderView();
          queueTruckSave();
        }
        return;
      }

      if (taskField) {
        const task = DEPARTMENT_TASKS[Number(taskField.dataset.taskIndex)];

        if (task) {
          task[taskField.dataset.taskField] = taskField.value.trim() || "Pending";
          task.complete = task.status.toLowerCase().includes("complete");
          renderPlaceholderView();
        }
        return;
      }

      if (scheduleField) {
        const row = WTX_SCHEDULE[scheduleField.dataset.scheduleMonth]?.[Number(scheduleField.dataset.scheduleRow)];

        if (row) {
          row[scheduleField.dataset.scheduleField] = scheduleField.value.trim();
          renderPlaceholderView();
        }
        return;
      }

      if (linkField) {
        const link = PLATFORM_LINKS[Number(linkField.dataset.linkIndex)];

        if (link) {
          link[linkField.dataset.linkField] = linkField.value.trim();
          renderPlaceholderView();
        }
      }

      return;
    }

    appState.calculatorInputs[calcField.dataset.calcField] = Number(calcField.value || 0);
    renderPlaceholderView();
  });
}

function buildLimitedPreviewMarkup(packages, limit) {
  if (!packages.length) {
    return buildEmptyStateCard("No packages yet", "This lane will fill automatically as live board rows are added.");
  }

  const visible = packages.slice(0, limit).map((pkg) => buildPackagePreviewCard(pkg)).join("");
  const remaining = packages.length - limit;
  const more = remaining > 0 ? `<div class="preview-more">+${remaining} more</div>` : "";

  return `${visible}${more}`;
}

function buildPackagePreviewCard(pkg) {
  const assets = pkg.assets
    .slice()
    .sort(compareAssetCodes)
    .map((asset) => `<span>${asset}</span>`)
    .join("");

  return `
    <button class="preview-card" data-package="${pkg.id}" type="button" aria-label="Open ${pkg.label} detail">
      <div class="prs-graphic" aria-hidden="true">
        <span class="stripe white"></span>
        <span class="stripe red"></span>
        <span class="stripe white"></span>
      </div>
      <div class="preview-card-main">
        <strong>${pkg.label}</strong>
        <div class="preview-assets">${assets}</div>
      </div>
      <span class="preview-tag">${getPackageTag(pkg)}</span>
    </button>
  `;
}

function buildAllocationMarkup(assignments) {
  if (!assignments.length) {
    return "<strong>Standby Pool</strong>";
  }

  const allocations = unique(assignments.map((item) => item.allocation));

  if (allocations.length === 1) {
    return `<strong>${allocations[0]}</strong>`;
  }

  return `<div class="marriage-list">${allocations.map((item) => `<span>${item}</span>`).join("")}</div>`;
}

function buildMarriedMarkup(assets) {
  if (!assets.length) {
    return "<span>Unassigned</span>";
  }

  return assets.map((asset) => `<span>${asset}</span>`).join("");
}

function buildAssetFallbackSummary(assignments, statusTone) {
  if (statusTone === "mixed") {
    return `Tracked in ${assignments.length} package entries.`;
  }

  if (statusTone === "pool") {
    return "No active package assignment.";
  }

  if (statusTone === "ready") {
    return "Ready package staged for deployment.";
  }

  if (statusTone === "testing") {
    return "Testing package is active.";
  }

  if (statusTone === "queue") {
    return "Queued package is waiting on formal testing.";
  }

  if (statusTone === "oos") {
    return "Held out of service for maintenance.";
  }

  return `${assignments[0].allocation} is active.`;
}

function getAssetRecord(category, index) {
  const asset = formatAsset(category, index);
  const assignments = getAssetAssignments(asset);
  const statusTone = getAssetStatusTone(assignments);
  const marriedAssets = unique(assignments.flatMap((item) => item.relatedAssets)).sort(compareAssetCodes);

  return {
    asset,
    fullAsset: formatFullAsset(category, index),
    status: getAssetStatusLabel(assignments),
    statusTone,
    statusClass: statusTone,
    allocationMarkup: buildAllocationMarkup(assignments),
    marriedMarkup: buildMarriedMarkup(marriedAssets),
    noteSummary: summarizeLatestNote("asset", asset, buildAssetFallbackSummary(assignments, statusTone))
  };
}

function renderCategory(category, focusIndex = null) {
  activeCategory = category;
  drawerTitle.textContent = `${category} asset ladder`;
  drawerCopy.textContent = `${CATEGORY_INFO[category].label} assets are shown from ${CATEGORY_INFO[category].base}-001 through ${CATEGORY_INFO[category].base}-060 with pairings, notes, and fleet allocation details.`;

  ladderRows.forEach((row) => {
    row.classList.toggle("active", row.dataset.category === category);
  });

  if (appState.dataStatus === "loading") {
    assetList.innerHTML = buildEmptyStateCard("Loading asset ladder", "Fetching live board assignments for this asset family.");
    return;
  }

  if (appState.dataStatus === "error") {
    assetList.innerHTML = buildEmptyStateCard("Asset ladder unavailable", appState.bootstrapError || "The asset ladder could not be loaded.");
    return;
  }

  const rows = [];

  for (let index = 1; index <= TOTAL_ASSETS; index += 1) {
    const record = getAssetRecord(category, index);

    rows.push(`
      <div class="asset-row" id="${category}-${pad(index)}" data-status-tone="${record.statusTone}">
        <div class="asset-row-label">
          <strong>${record.asset}</strong>
          <small>${record.fullAsset}</small>
        </div>
        <div>
          <span class="status-badge ${record.statusClass}">${record.status}</span>
        </div>
        <div>
          <div class="asset-detail-label">Allocation</div>
          ${record.allocationMarkup}
        </div>
        <div>
          <div class="asset-detail-label">Paired Assets</div>
          <div class="marriage-list">${record.marriedMarkup}</div>
        </div>
        <div class="note-action-cell">
          <button class="note-trigger" data-asset="${record.asset}" type="button" aria-label="Open notes and work orders for ${record.asset}"></button>
        </div>
        <div>
          <div class="asset-detail-label">Notes</div>
          <div class="asset-row-note">${record.noteSummary}</div>
        </div>
      </div>
    `);
  }

  assetList.innerHTML = rows.join("");

  if (focusIndex !== null) {
    targetAssetRow(category, focusIndex);
  } else {
    assetList.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function targetAssetRow(category, index) {
  const target = document.getElementById(`${category}-${pad(index)}`);

  if (!target) {
    return;
  }

  document.querySelectorAll(".asset-row.targeted").forEach((row) => {
    row.classList.remove("targeted");
  });

  target.classList.add("targeted");
  target.scrollIntoView({ behavior: "smooth", block: "center" });
}

function initializeCategoryControls() {
  ladderRows.forEach((row) => {
    row.addEventListener("click", () => {
      renderCategory(row.dataset.category);
    });
  });

  assetList.addEventListener("click", (event) => {
    const noteTrigger = event.target.closest(".note-trigger");

    if (!noteTrigger) {
      return;
    }

    openDetailOverlay("asset", noteTrigger.dataset.asset);
  });
}

function initializeDashboardActions() {
  displayCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest(".preview-card")) {
        return;
      }

      openSectionOverlay(card.dataset.section);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openSectionOverlay(card.dataset.section);
      }
    });
  });

  [readyPreview, testingPreview, queuePreview, inUsePreview].forEach((preview) => {
    preview.addEventListener("click", (event) => {
      const button = event.target.closest(".preview-card");

      if (!button) {
        return;
      }

      event.stopPropagation();
      openDetailOverlay("package", button.dataset.package);
    });
  });

  oosTrigger.addEventListener("click", () => {
    const nextState = oosPanel.hasAttribute("hidden");

    if (nextState) {
      oosPanel.removeAttribute("hidden");
      oosPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      oosPanel.setAttribute("hidden", "");
    }
  });

  closeOosPanel.addEventListener("click", () => {
    oosPanel.setAttribute("hidden", "");
  });
}

function initializeSearch() {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSearch(searchType.value, searchInput.value.trim());
  });
}

function handleSearch(type, rawQuery) {
  if (!rawQuery) {
    return;
  }

  const query = rawQuery.toUpperCase();

  if (PACKAGE_REGISTRY.has(query)) {
    openDetailOverlay("package", query);
    return;
  }

  const fullAssetMatch = query.match(/^06-(02|03|04|05)-001-(\d{3})$/);

  if (fullAssetMatch) {
    const category = BASE_SEGMENT_TO_CATEGORY[fullAssetMatch[1]];
    const index = Number(fullAssetMatch[2]);

    if (category && index >= 1 && index <= TOTAL_ASSETS) {
      renderCategory(category, index);
      return;
    }
  }

  const assetMatch = query.match(/^(HP|LP|HR|CC)\s*[- ]?0*(\d{1,2})$/);

  if (assetMatch) {
    const [, category, numberText] = assetMatch;
    const index = Number(numberText);

    if (index >= 1 && index <= TOTAL_ASSETS) {
      renderCategory(category, index);
    }

    return;
  }

  const fleetPackageMatch = query.match(/^(?:FLEET\s*)?0*(\d{1,3})([A-Z])$/);

  if (fleetPackageMatch) {
    const fleet = Number(fleetPackageMatch[1]);
    const packageId = formatFleetPackageId(fleet, fleetPackageMatch[2]);

    if (PACKAGE_REGISTRY.has(packageId)) {
      openDetailOverlay("package", packageId);
      return;
    }
  }

  const fleetMatch = query.match(/^FLEET\s*0*(\d{1,3})$/);

  if (fleetMatch) {
    const fleet = Number(fleetMatch[1]);

    if (fleet >= 1 && fleet <= TOTAL_FLEETS) {
      openFleetPackagesSection(fleet);
    }

    return;
  }

  const numberMatch = query.match(/^0*(\d{1,3})$/);

  if (!numberMatch) {
    return;
  }

  const index = Number(numberMatch[1]);

  if (type === "FLEET") {
    if (index >= 1 && index <= TOTAL_FLEETS) {
      openFleetPackagesSection(index);
    }

    return;
  }

  if (index >= 1 && index <= TOTAL_ASSETS) {
    renderCategory(type, index);
  }
}

function initializeOverlayActions() {
  closeSectionOverlay.addEventListener("click", closeSectionModal);
  closeDetailOverlay.addEventListener("click", closeDetailModal);

  document.querySelectorAll(".overlay-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", () => {
      const target = backdrop.dataset.close;
      if (target === "section") {
        closeSectionModal();
      } else if (target === "detail") {
        closeDetailModal();
      } else if (target === "login") {
        closeLoginModal();
      } else if (target === "editor") {
        closeEditorModal();
      }
    });
  });

  sectionOverlayBody.addEventListener("click", (event) => {
    const detailButton = event.target.closest("[data-open-package]");
    const assetButton = event.target.closest("[data-focus-category]");
    const fleetButton = event.target.closest("[data-open-fleet]");
    const terminateButton = event.target.closest("[data-terminate-fleet]");

    if (detailButton) {
      openDetailOverlay("package", detailButton.dataset.openPackage);
      return;
    }

    if (assetButton) {
      renderCategory(assetButton.dataset.focusCategory, Number(assetButton.dataset.focusIndex));
      closeSectionModal();
      return;
    }

    if (fleetButton) {
      openFleetPackagesSection(Number(fleetButton.dataset.openFleet));
      return;
    }

    if (terminateButton && appState.isAuthorized) {
      archiveFleet(Number(terminateButton.dataset.terminateFleet));
      closeSectionModal();
      refreshAll();
      queueBoardSave();
    }
  });

  sectionOverlayBody.addEventListener("change", (event) => {
    const field = event.target.closest("[data-fleet-field]");

    if (!field || !appState.isAuthorized || appState.sectionOverlayContext?.type !== "fleet") {
      return;
    }

    const record = ensureFleetDetailRecord(appState.sectionOverlayContext.fleet);
    record[field.dataset.fleetField] = field.value.trim() || "Pending";
    openFleetPackagesSection(appState.sectionOverlayContext.fleet);
    renderFleetOpsView();
    queueFleetSave(appState.sectionOverlayContext.fleet);
  });

  noteComposer.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      addNoteFromComposer();
    }
  });

  noteComposer.addEventListener("blur", () => {
    addNoteFromComposer();
  });

  cancelNoteEdit.addEventListener("click", resetNoteComposer);

  noteLedger.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-note-edit]");
    const deleteButton = event.target.closest("[data-note-delete]");

    if (!activeDetail) {
      return;
    }

    const record = ensureDetailRecord(activeDetail.kind, activeDetail.key);

    if (editButton) {
      editingNoteIndex = Number(editButton.dataset.noteEdit);
      noteComposer.value = record.notes[editingNoteIndex]?.text ?? "";
      noteComposerState.textContent = `Editing entry ${editingNoteIndex + 1}`;
      cancelNoteEdit.hidden = false;
      noteComposer.focus();
      return;
    }

    if (deleteButton) {
      const index = Number(deleteButton.dataset.noteDelete);
      record.notes.splice(index, 1);
      if (editingNoteIndex === index) {
        resetNoteComposer();
      }
      renderDetailContent();
      if (activeDetail.kind === "asset") {
        renderCategory(activeCategory);
      } else {
        renderMainPreviews();
      }
      queueDetailSave();
    }
  });

  addWorkOrderButton.addEventListener("click", addWorkOrderFromComposer);

  [workOrderIdInput, workOrderTextInput].forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addWorkOrderFromComposer();
      }
    });
  });

  workOrderList.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-wo-id]");

    if (!toggle || !activeDetail) {
      return;
    }

    const record = ensureDetailRecord(activeDetail.kind, activeDetail.key);
    const workOrder = record.workOrders.find((item) => item.id === toggle.dataset.woId);

    if (!workOrder) {
      return;
    }

    workOrder.complete = toggle.dataset.woState === "complete";
    renderDetailContent();
    queueDetailSave();
  });
}

function openSectionOverlay(section) {
  sectionOverlay.hidden = false;
  appState.sectionOverlayContext = { type: "section", section };

  if (section === "ready") {
    sectionOverlayKicker.textContent = "Deployment Lane";
    sectionOverlayTitle.textContent = "Ready to Deploy";
    sectionOverlayBody.innerHTML = buildPackageSectionMarkup(READY_PACKAGES, "Ready package queue", "Interactive Queue");
    return;
  }

  if (section === "testing") {
    sectionOverlayKicker.textContent = "Test Cell";
    sectionOverlayTitle.textContent = "In Testing";
    sectionOverlayBody.innerHTML = buildPackageSectionMarkup(TESTING_PACKAGES, "Testing package queue", "Interactive Queue");
    return;
  }

  if (section === "queue") {
    sectionOverlayKicker.textContent = "Pre-Test Lane";
    sectionOverlayTitle.textContent = "In Queue";
    sectionOverlayBody.innerHTML = buildPackageSectionMarkup(
      QUEUE_PACKAGES,
      "Queued package list",
      "Awaiting formal testing",
      `${QUEUE_PACKAGES.length} packages`,
      "No queued packages are currently staged."
    );
    return;
  }

  sectionOverlayKicker.textContent = "Field Status";
  sectionOverlayTitle.textContent = "In Use Fleet Ladder";
  sectionOverlayBody.innerHTML = buildInUseMarkup();
}

function openFleetPackagesSection(fleet) {
  const profile = getFleetProfile(fleet);

  sectionOverlay.hidden = false;
  appState.sectionOverlayContext = { type: "fleet", fleet };
  sectionOverlayKicker.textContent = "Fleet Detail";
  sectionOverlayTitle.textContent = `Fleet ${fleet}`;
  sectionOverlayBody.innerHTML = buildFleetDetailMarkup(profile);
}

function closeSectionModal() {
  sectionOverlay.hidden = true;
  appState.sectionOverlayContext = null;
}

function buildPackageSectionMarkup(packages, heading, kicker, badgeText = `${packages.length} packages`, emptyMessage = "No tracked packages.") {
  const body = packages.length
    ? `<div class="section-panel-grid">${packages.map((pkg) => buildSectionPackageCard(pkg)).join("")}</div>`
    : `<p class="drawer-copy">${emptyMessage}</p>`;

  return `
    <div class="section-panel">
      <div class="section-panel-title">
        <div>
          <p class="display-kicker">${kicker}</p>
          <h3>${heading}</h3>
        </div>
        <span class="preview-tag">${badgeText}</span>
      </div>
      ${body}
    </div>
  `;
}

function buildFleetDetailField(label, key, value, multiline = false) {
  if (multiline) {
    return `
      <label class="fleet-detail-field wide">
        <span>${label}</span>
        <textarea data-fleet-field="${key}" rows="3" ${appState.isAuthorized ? "" : "readonly"}>${value}</textarea>
      </label>
    `;
  }

  return `
    <label class="fleet-detail-field">
      <span>${label}</span>
      <input data-fleet-field="${key}" type="text" value="${value}" ${appState.isAuthorized ? "" : "readonly"}>
    </label>
  `;
}

function buildFleetDetailMarkup(profile) {
  const assetChips = profile.assets.length
    ? profile.assets.map((asset) => `<span class="asset-chip">${asset}</span>`).join("")
    : `<span class="asset-chip">Pending</span>`;
  const packagePanel = buildPackageSectionMarkup(
    profile.packages,
    profile.packages.length ? "Tracked packages" : "Pending package set",
    "Fleet package set",
    profile.packages.length ? `${profile.packages.length} packages` : "Pending",
    "This fleet is active on the board, but the package row still needs to be worked through."
  );
  const terminateButton = appState.isAuthorized && profile.active
    ? `<button class="section-action danger" data-terminate-fleet="${profile.fleet}" type="button">Terminate Job</button>`
    : "";

  return `
    <div class="workspace-grid overlay-fleet-grid">
      <div class="section-panel">
        <div class="section-panel-title">
          <div>
            <p class="display-kicker">Fleet Snapshot</p>
            <h3>Fleet ${profile.fleet}</h3>
          </div>
          <div class="workspace-inline-actions">
            <span class="preview-tag">${profile.moveLabel}</span>
            ${terminateButton}
          </div>
        </div>
        <div class="metric-grid">
          ${buildMetricTile("Customer", profile.customer, "Workbook-backed where available and editable once you log in.")}
          ${buildMetricTile("Gas Type", profile.gasType, "Customer gas type is staged from the active fleet list you provided and remains editable after login.")}
          ${buildMetricTile("PRS Type", profile.prsType, "Pulled from the active fleet list and ready to be refined as the live workflow grows.")}
          ${buildMetricTile("Region", profile.region, "Helps keep Midland and Delaware/AZ contexts separated in the front view.")}
          ${buildMetricTile("PRS Count", profile.prsCount, "Counts can stay pending until the remaining fleet rows are worked through.")}
        </div>
        <div class="asset-stack">${assetChips}</div>
      </div>

      <div class="section-panel">
        <div class="section-panel-title">
          <div>
            <p class="display-kicker">Job Info</p>
            <h3>Editable Fleet Data</h3>
          </div>
          <span class="preview-tag">${appState.isAuthorized ? "Editable" : "Login to edit"}</span>
        </div>
        <div class="fleet-detail-form">
          ${buildFleetDetailField("Customer", "customer", profile.customer)}
          ${buildFleetDetailField("Fuel Type", "fuelType", profile.fields.fuelType)}
          ${buildFleetDetailField("Pressure", "pressure", profile.fields.pressure)}
          ${buildFleetDetailField("JDS Submitted", "jdsStatus", profile.fields.jdsStatus)}
          ${buildFleetDetailField("Grafana", "grafanaStatus", profile.fields.grafanaStatus)}
          ${buildFleetDetailField("Jotform Intake", "jotformStatus", profile.fields.jotformStatus)}
          ${buildFleetDetailField("Fleet Notes", "notes", profile.fields.notes, true)}
        </div>
      </div>
    </div>
    ${packagePanel}
  `;
}

function buildSectionPackageCard(pkg) {
  const assets = pkg.assets
    .slice()
    .sort(compareAssetCodes)
    .map((asset) => `<span>${asset}</span>`)
    .join("");
  const focusTarget = getPrimaryAssetTarget(pkg);
  const openAssetsButton = focusTarget
    ? `<button class="section-action" data-focus-category="${focusTarget.category}" data-focus-index="${focusTarget.index}" type="button">Open Assets</button>`
    : "";

  return `
    <article class="section-prs-card">
      <div class="prs-graphic" aria-hidden="true">
        <span class="stripe white"></span>
        <span class="stripe red"></span>
        <span class="stripe white"></span>
      </div>
      <div class="section-prs-meta">
        <strong>${pkg.label}</strong>
        <div class="preview-assets">${assets}</div>
        <div class="asset-detail-label">${getPackageContextLabel(pkg)}</div>
      </div>
      <div class="section-prs-actions">
        <button class="section-action" data-open-package="${pkg.id}" type="button">Notes / WO</button>
        ${openAssetsButton}
      </div>
    </article>
  `;
}

function getPrimaryAssetTarget(pkg) {
  const primary = pkg.assets.slice().sort(compareAssetCodes)[0];

  if (!primary) {
    return null;
  }

  return parseAssetCode(primary);
}

function buildFleetGridMarkup(includeDataHooks = true) {
  return ACTIVE_FLEET_ROSTER
    .map((fleet) => {
      const profile = getFleetProfile(fleet);
      const packageCount = profile.packages.length;
      const statusText = packageCount ? `${packageCount} package${packageCount === 1 ? "" : "s"}` : "Pending package data";
      const attributes = includeDataHooks ? `data-open-fleet="${fleet}"` : "";

      return `
        <button class="fleet-box active fleet-roster-card" ${attributes} type="button">
          <strong>Fleet ${fleet}</strong>
          <span>${profile.customer}</span>
          <small>${statusText}</small>
          <small>${profile.moveLabel}</small>
        </button>
      `;
    })
    .join("");
}

function buildInUseMarkup() {
  const activePackages = getActiveInUsePackages();
  const previewCards = activePackages.slice(0, 12).map((pkg) => buildSectionPackageCard(pkg)).join("");
  const fleetBoxes = buildFleetGridMarkup(true);

  return `
    <div class="section-panel">
      <div class="section-panel-title">
        <div>
          <p class="display-kicker">Fleet Ladder</p>
          <h3>Active Fleets</h3>
        </div>
        <span class="preview-tag">${ACTIVE_FLEET_ROSTER.length} active</span>
      </div>
      <div class="fleet-grid">${fleetBoxes}</div>
    </div>
    <div class="section-panel">
      <div class="section-panel-title">
        <div>
          <p class="display-kicker">Field Preview</p>
          <h3>Active package sample</h3>
        </div>
        <span class="preview-tag">${activePackages.length} packages</span>
      </div>
      <div class="section-panel-grid">${previewCards}</div>
    </div>
  `;
}

function openDetailOverlay(kind, key) {
  activeDetail = { kind, key };
  resetNoteComposer();
  workOrderIdInput.value = "";
  workOrderTextInput.value = "";
  detailOverlay.hidden = false;
  renderDetailContent();
}

function closeDetailModal() {
  detailOverlay.hidden = true;
  resetNoteComposer();
  workOrderIdInput.value = "";
  workOrderTextInput.value = "";
  activeDetail = null;
}

function renderDetailContent() {
  if (!activeDetail) {
    return;
  }

  const record = ensureDetailRecord(activeDetail.kind, activeDetail.key);
  const notes = record.notes.map(buildNoteEntryMarkup).join("") || `<div class="note-entry"><div class="note-text">No entries yet.</div></div>`;
  const workOrders = record.workOrders.map(buildWorkOrderMarkup).join("") || `
    <div class="workorder-item">
      <div class="workorder-copy">No work orders queued.</div>
    </div>
  `;

  if (activeDetail.kind === "package") {
    const pkg = PACKAGE_REGISTRY.get(activeDetail.key);

    if (!pkg) {
      return;
    }

    detailOverlayTitle.textContent = pkg.label;
    detailOverlayKicker.textContent = `${getPackageContextLabel(pkg)} | ${pkg.assets.join(" | ")}`;
  } else {
    const category = activeDetail.key.slice(0, 2);
    const index = Number(activeDetail.key.slice(2));
    detailOverlayTitle.textContent = activeDetail.key;
    detailOverlayKicker.textContent = `${CATEGORY_INFO[category].label} | ${formatFullAsset(category, index)}`;
  }

  noteLedger.innerHTML = notes;
  workOrderList.innerHTML = workOrders;
  noteComposer.disabled = !appState.isAuthorized;
  workOrderIdInput.disabled = !appState.isAuthorized;
  workOrderTextInput.disabled = !appState.isAuthorized;
  addWorkOrderButton.disabled = !appState.isAuthorized;
  noteComposer.placeholder = appState.isAuthorized
    ? `Add a note for ${activeDetail.kind === "package" ? detailOverlayTitle.textContent : activeDetail.key} and press Enter.`
    : "Login with the admin token to edit notes.";
}

function buildNoteEntryMarkup(note, index) {
  const actions = appState.isAuthorized
    ? `
      <div class="note-actions">
        <button class="note-entry-action" data-note-edit="${index}" type="button">Edit</button>
        <button class="note-entry-action" data-note-delete="${index}" type="button">Delete</button>
      </div>
    `
    : "";

  return `
    <article class="note-entry">
      <div class="note-text">${note.text}</div>
      <button class="note-date" type="button">${note.date}</button>
      ${actions}
    </article>
  `;
}

function buildWorkOrderMarkup(workOrder) {
  return `
    <article class="workorder-item ${workOrder.complete ? "completed" : ""}">
      <div class="workorder-head">
        <strong>${workOrder.id}</strong>
        <div class="wo-toggle-group">
          <button class="wo-toggle queued ${workOrder.complete ? "" : "active"}" data-wo-id="${workOrder.id}" data-wo-state="queued" type="button" ${appState.isAuthorized ? "" : "disabled"}>X</button>
          <button class="wo-toggle complete ${workOrder.complete ? "active" : ""}" data-wo-id="${workOrder.id}" data-wo-state="complete" type="button" ${appState.isAuthorized ? "" : "disabled"}>&#10003;</button>
        </div>
      </div>
      <div class="workorder-copy">${workOrder.text}</div>
    </article>
  `;
}

function addNoteFromComposer() {
  if (!activeDetail) {
    return;
  }

  if (!appState.isAuthorized) {
    openLoginOverlay();
    return;
  }

  const text = noteComposer.value.trim();

  if (!text) {
    return;
  }

  const record = ensureDetailRecord(activeDetail.kind, activeDetail.key);
  const timestamp = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  if (editingNoteIndex !== null) {
    record.notes[editingNoteIndex] = {
      text,
      date: timestamp
    };
  } else {
    record.notes.push({
      text,
      date: timestamp
    });
  }

  resetNoteComposer();
  renderDetailContent();

  if (activeDetail.kind === "asset") {
    renderCategory(activeCategory);
  } else {
    renderMainPreviews();
  }

  queueDetailSave();
}

function resetNoteComposer() {
  editingNoteIndex = null;
  noteComposer.value = "";
  noteComposerState.textContent = "New entry";
  cancelNoteEdit.hidden = true;
}

function addWorkOrderFromComposer() {
  if (!activeDetail) {
    return;
  }

  if (!appState.isAuthorized) {
    openLoginOverlay();
    return;
  }

  const rawId = workOrderIdInput.value.trim().toUpperCase();
  const text = workOrderTextInput.value.trim();

  if (!rawId || !text) {
    return;
  }

  const normalizedId = rawId.startsWith("WO-") ? rawId : `WO-${rawId.replace(/^WO-?/, "")}`;
  const record = ensureDetailRecord(activeDetail.kind, activeDetail.key);

  record.workOrders.unshift({
    id: normalizedId,
    text,
    complete: false
  });

  workOrderIdInput.value = "";
  workOrderTextInput.value = "";
  renderDetailContent();
  queueDetailSave();
}

function renderOosPanel() {
  if (appState.dataStatus === "loading") {
    oosList.innerHTML = buildEmptyStateCard("Loading OOS assets", "Checking live maintenance hold rows.");
    return;
  }

  if (appState.dataStatus === "error") {
    oosList.innerHTML = buildEmptyStateCard("OOS assets unavailable", appState.bootstrapError || "The OOS surface could not be loaded.");
    return;
  }

  const entries = Array.from(OOS_ASSETS)
    .sort(compareAssetCodes)
    .map((asset) => {
      const meta = parseAssetCode(asset);

      return `
        <article class="oos-item">
          <strong>${asset}</strong>
          <p>${formatFullAsset(meta.category, meta.index)}</p>
          <p>Maintenance state: out of service.</p>
        </article>
      `;
    });

  oosList.innerHTML = entries.join("") || buildEmptyStateCard("No OOS assets", "Assets marked out of service will appear here.");
}

function initializeTiltDisplays() {
  displayCards.forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const bounds = card.getBoundingClientRect();
      const relativeX = event.clientX - bounds.left;
      const relativeY = event.clientY - bounds.top;
      const centerX = bounds.width / 2;
      const centerY = bounds.height / 2;
      const rotateY = ((relativeX - centerX) / centerX) * 6;
      const rotateX = ((centerY - relativeY) / centerY) * 5;

      card.style.setProperty("--mx", `${(relativeX / bounds.width) * 100}%`);
      card.style.setProperty("--my", `${(relativeY / bounds.height) * 100}%`);
      card.style.transform = `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg) translateY(0)";
      card.style.setProperty("--mx", "50%");
      card.style.setProperty("--my", "50%");
    });

    card.addEventListener("focus", () => {
      card.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg) translateY(-4px)";
    });

    card.addEventListener("blur", () => {
      card.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg) translateY(0)";
    });
  });
}
