// ============================================================
// HOME ROUTE — Main Application Logic
// ============================================================

// NOTE ON MTA DATA:
// The MTA GTFS-RT feed returns protobuf binary, which requires
// a protobuf decoder. Since this is a pure client-side PWA,
// we use the MTA's unofficial JSON proxy where available,
// or fall back to the subway time display showing schedule-based
// estimates with a clear disclaimer.
// Citi Bike data is fetched directly from the open GBFS JSON API.

const CORS_PROXY = "https://corsproxy.io/?url=";
const CITIBIKE_STATUS_URL = "https://gbfs.citibikenyc.com/gbfs/en/station_status.json";
const CITIBIKE_INFO_URL = "https://gbfs.citibikenyc.com/gbfs/en/station_information.json";

// Use an unofficial MTA JSON API (no key, JSON format)
const MTA_JSON_BASE = "https://collector-otp-prod.camsys-apps.com/realtime/gtfsrt/filtered/alerts?type=json&apikey=3dK1BhKVlJOVZqb3cTPYnSSwN5nP0UiQ";
// Primary: use mtaapi.onrender.com or similar community proxy
// We'll use the BusTime-style JSON stops endpoint as backup

const MTA_ARRIVALS_BASE = "https://otp-mta-prod.camsys-apps.com/otp/routers/default/index/stops";

// ============================================================
// DEMO MODE — realistic sample data for UI preview
// ============================================================

const DEMO_MODE_KEY = "homeRoute_demo";

function isDemoMode() {
  return document.getElementById("demoToggle")?.checked;
}

function onDemoToggle() {
  if (isDemoMode()) {
    loadData(); // auto-load demo data when toggled on
  }
}

function injectDemoData() {
  const now = Date.now() / 1000;

  // Fake subway state: trains arriving soon
  state.subwayData = {
    // 14th St / Union Sq — 6 train (route 1)
    "635": { data: [{ S: [
      { route: "6", time: now + 4 * 60 },
      { route: "6", time: now + 11 * 60 },
    ]}]},
    // Bleecker St — F train (route 1)
    "629": { data: [{ S: [
      { route: "F", time: now + 14 * 60 },
      { route: "F", time: now + 22 * 60 },
    ]}]},
    // Nevins St — 2/3 (route 2)
    "A36": { data: [{ S: [
      { route: "3", time: now + 2 * 60 },
      { route: "2", time: now + 7 * 60 },
    ]}]},
    // Grand Army Plaza — 2/3 (not used in calc but populated)
    "A48": { data: [{ S: [
      { route: "3", time: now + 11 * 60 },
    ]}]},
    // Atlantic Av — B/Q (route 3)
    "D24": { data: [{ S: [
      { route: "Q", time: now + 3 * 60 },
      { route: "B", time: now + 9 * 60 },
    ]}]},
    // Parkside Ave — B/Q
    "D26": { data: [{ S: [
      { route: "Q", time: now + 8 * 60 },
    ]}]},
    // Church Ave — B/Q
    "D27": { data: [{ S: [
      { route: "B", time: now + 13 * 60 },
    ]}]},
  };

  // Fake Citi Bike stations (normalized names → status)
  const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, "");
  state.bikeStations = {};

  const fakeStations = [
    // Route 2 pickup docks — good e-bike availability
    { name: "Plaza St W & Flatbush Ave",           ebikes: 3, classic: 1, docks: 8 },
    { name: "Grand Army Plaza & Plaza St W",        ebikes: 2, classic: 0, docks: 5 },
    // Route 3 pickup docks
    { name: "Parkside Ave & Ocean Ave",             ebikes: 1, classic: 2, docks: 6 },
    { name: "Parade Pl & Crooke Ave",               ebikes: 0, classic: 3, docks: 4 },
    // Home docks — primary is fine, backup 2 is full
    { name: "Prospect Park SW & Greenwood Ave",     ebikes: 0, classic: 0, docks: 4 },
    { name: "Park Circle & East Dr",                ebikes: 0, classic: 0, docks: 7 },
    { name: "Prospect Ave & Greenwood Ave",         ebikes: 0, classic: 0, docks: 0 },
  ];

  fakeStations.forEach(s => {
    const total = s.ebikes + s.classic;
    state.bikeStations[normalize(s.name)] = {
      name: s.name,
      num_bikes_available: total,
      num_ebikes_available: s.ebikes,
      num_docks_available: s.docks,
      is_renting: 1,
    };
  });
}

// ---- State ----
let state = {
  phase: "on-train",
  lastFetch: null,
  bikeStations: {},    // name → status
  bikeInfo: {},        // name → info
  subwayData: {},
  loading: false,
};

// ---- Phase Management ----
document.querySelectorAll(".phase-pill").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".phase-pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.phase = btn.dataset.phase;
    updatePhaseUI();
    if (state.lastFetch) renderRoutes();
  });
});

function updatePhaseUI() {
  const dockSection = document.getElementById("dockSection");
  if (state.phase === "at-dock") {
    dockSection.style.display = "block";
    renderHomeDocks();
  } else {
    dockSection.style.display = "none";
  }
}

// ---- Data Loading ----
async function loadData() {
  if (state.loading) return;
  state.loading = true;

  const btn = document.getElementById("refreshBtn");
  const icon = document.getElementById("refreshIcon");
  btn.disabled = true;
  icon.style.animation = "spin 1s linear infinite";

  document.getElementById("loadingState").style.display = "flex";
  document.getElementById("errorState").style.display = "none";
  document.getElementById("routesSection").style.opacity = "0.4";

  try {
    if (isDemoMode()) {
      await new Promise(r => setTimeout(r, 600)); // fake loading feel
      injectDemoData();
    } else {
      await Promise.all([
        fetchCitibikeData(),
        fetchSubwayData(),
      ]);
    }
    state.lastFetch = new Date();
    updateLastRefresh();
    renderRoutes();
    document.getElementById("errorState").style.display = "none";
  } catch (err) {
    console.error("Load error:", err);
    document.getElementById("errorState").style.display = "flex";
  } finally {
    state.loading = false;
    btn.disabled = false;
    icon.style.animation = "";
    document.getElementById("loadingState").style.display = "none";
    document.getElementById("routesSection").style.opacity = "1";
    updatePhaseUI();
  }
}

// ---- Citi Bike ----
async function fetchCitibikeData() {
  const [statusRes, infoRes] = await Promise.all([
    fetch(CITIBIKE_STATUS_URL),
    fetch(CITIBIKE_INFO_URL),
  ]);

  if (!statusRes.ok || !infoRes.ok) throw new Error("Citi Bike fetch failed");

  const [statusData, infoData] = await Promise.all([
    statusRes.json(),
    infoRes.json(),
  ]);

  // Build lookup by station_id
  const statusById = {};
  statusData.data.stations.forEach(s => { statusById[s.station_id] = s; });

  // Normalize station names for fuzzy matching
  const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Build lookup by normalized name
  state.bikeStations = {};
  state.bikeInfo = {};

  infoData.data.stations.forEach(info => {
    const normName = normalize(info.name);
    const status = statusById[info.station_id];
    if (status) {
      state.bikeInfo[normName] = { ...info, normName };
      state.bikeStations[normName] = { ...status, name: info.name };
    }
  });
}

function getStationStatus(namePattern) {
  const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, "");
  const norm = normalize(namePattern);

  // Exact match first
  if (state.bikeStations[norm]) return state.bikeStations[norm];

  // Fuzzy: find key that contains all words
  const words = norm.split(/(?=[a-z])/).filter(w => w.length > 2);
  const keys = Object.keys(state.bikeStations);

  // Try substring match
  for (const key of keys) {
    if (key.includes(norm) || norm.includes(key)) {
      return state.bikeStations[key];
    }
  }

  // Try word-by-word match
  for (const key of keys) {
    const matchCount = words.filter(w => key.includes(w)).length;
    if (matchCount >= Math.max(2, words.length - 1)) {
      return state.bikeStations[key];
    }
  }

  return null;
}

// ---- Subway (MTA) ----
// We use a community JSON REST proxy for MTA GTFS-RT
// https://mtaapi.herokuapp.com/departures?id=STOP_ID (deprecated)
// Better: use https://traintime.lirr.app/ style or BetterMTA
// Actual working endpoint for NYC Subway JSON arrivals:
// https://otp-mta-prod.camsys-apps.com/otp/routers/default/index/stops/{GTFS_ID}/stoptimes?apikey=KEY

// We'll use a reliable public endpoint that wraps MTA data
const SUBWAY_API = "https://api.wheresthefuckingtrain.com/by-id/";

async function fetchSubwayData() {
  const stopIds = ["635", "A36", "D24", "A48", "D26", "D27", "629"];
  const results = {};

  await Promise.all(stopIds.map(async (id) => {
    try {
      const res = await fetch(`${SUBWAY_API}${id}`);
      if (res.ok) {
        const data = await res.json();
        results[id] = data;
      }
    } catch (e) {
      results[id] = null;
    }
  }));

  state.subwayData = results;
}

function getNextArrival(stopId, lines, direction = "S") {
  const data = state.subwayData[stopId];
  if (!data || !data.data || !data.data[0]) return null;

  const station = data.data[0];
  const times = direction === "S" ? station.S : station.N;
  if (!times) return null;

  const now = Date.now() / 1000;
  const relevant = times
    .filter(t => lines.includes(t.route) && t.time > now)
    .sort((a, b) => a.time - b.time);

  if (!relevant.length) return null;

  return {
    line: relevant[0].route,
    minutesAway: Math.round((relevant[0].time - now) / 60),
    secondArrival: relevant[1]
      ? { line: relevant[1].route, minutesAway: Math.round((relevant[1].time - now) / 60) }
      : null,
  };
}

// ---- Route Calculation ----

function calcRoute1() {
  // 4/5 → 14 St → 6 → Bleecker → F → Fort Hamilton Pkwy → walk
  const sixTrain = getNextArrival("635", ["6"]);  // 14th St, 6 train S
  const fTrain = getNextArrival("629", ["F"]);     // Bleecker, F train S

  let waitStack = [];
  let totalMins = null;

  if (sixTrain !== null && fTrain !== null) {
    // Time: wait for 6 at 14th + 6 min ride + wait for F at Bleecker + ride + walk
    const sixWait = sixTrain.minutesAway;
    // After 6+transfer, how long until F?
    const arriveAtBleecker = sixWait + TRANSIT_TIMES["14TH_TO_BLEECKER_6"] + WALK_TIMES.BLEECKER_TO_F_PLATFORM;
    const fWait = fTrain.minutesAway;
    const actualFWait = Math.max(0, fWait - arriveAtBleecker);
    totalMins = sixWait + TRANSIT_TIMES["14TH_TO_BLEECKER_6"] + actualFWait + WALK_TIMES.F_TO_FHP_RIDE + WALK_TIMES.FHP_TO_HOME;

    waitStack = [
      { label: "6 at 14 St", value: `${sixWait} min`, line: "6" },
      { label: "Transfer to F at Bleecker", value: `${WALK_TIMES.BLEECKER_TO_F_PLATFORM} min walk` },
      { label: "F at Bleecker", value: fWait !== null ? `${fWait} min` : "?", line: "F" },
      { label: "F → Fort Hamilton Pkwy", value: `~${WALK_TIMES.F_TO_FHP_RIDE} min ride` },
      { label: "Walk home from FHP", value: `~${WALK_TIMES.FHP_TO_HOME} min` },
    ];

    if (fTrain.secondArrival) {
      waitStack[2].note = `Next: ${fTrain.secondArrival.minutesAway} min`;
    }
  } else {
    totalMins = null;
    waitStack = [
      { label: "6 at 14 St", value: sixTrain ? `${sixTrain.minutesAway} min` : "Loading…", line: "6" },
      { label: "F at Bleecker", value: fTrain ? `${fTrain.minutesAway} min` : "Loading…", line: "F" },
      { label: "Walk home from FHP", value: `~${WALK_TIMES.FHP_TO_HOME} min` },
    ];
  }

  return {
    id: "route1",
    label: "Route 1",
    name: "via F Train",
    description: "4/5 → 6 at 14 St → F at Bleecker → Fort Hamilton Pkwy",
    icon: "🚇",
    totalMins,
    waitStack,
    caveats: ["F can have 8+ min gaps. Check next arrival before committing."],
    bikeRequired: false,
  };
}

function calcRoute2() {
  // Stay on 4/5 → Nevins → 2/3 → Grand Army → Citi Bike through park
  const train23 = getNextArrival("A36", ["2", "3"]);
  const dock1 = getStationStatus(CITIBIKE_STATION_NAMES.GRAND_ARMY_1);
  const dock2 = getStationStatus(CITIBIKE_STATION_NAMES.GRAND_ARMY_2);

  const bikeInfo = calcPickupDock([dock1, dock2], CITIBIKE_STATION_NAMES);

  let totalMins = null;
  if (train23 && bikeInfo.hasEbike) {
    totalMins = train23.minutesAway
      + WALK_TIMES.NEVINS_TO_PLATFORM
      + TRANSIT_TIMES["NEVINS_TO_GRAND_ARMY_23"]
      + WALK_TIMES.GRAND_ARMY_TO_DOCK
      + WALK_TIMES.DOCK_TO_PARK_ENTRY
      + WALK_TIMES.PARK_DRIVE_RIDE
      + WALK_TIMES.SW_EXIT_TO_HOME;
  }

  const waitStack = [
    {
      label: "2/3 at Nevins",
      value: train23 ? `${train23.minutesAway} min` : "—",
      line: train23?.line || "2/3",
      note: train23?.secondArrival ? `Next: ${train23.secondArrival.minutesAway} min` : null,
    },
    { label: "Transfer + ride to Grand Army", value: `~${WALK_TIMES.NEVINS_TO_PLATFORM + TRANSIT_TIMES["NEVINS_TO_GRAND_ARMY_23"]} min` },
    { label: "Citi Bike pickup", value: bikeInfo.summary, isHighlight: !bikeInfo.hasEbike },
    { label: "Park drive ride home", value: `~${WALK_TIMES.PARK_DRIVE_RIDE + WALK_TIMES.SW_EXIT_TO_HOME} min` },
  ];

  const caveats = [];
  if (!bikeInfo.hasEbike) caveats.push("⚠ No e-bikes at pickup docks — consider Route 3");
  if (bikeInfo.docksFull) caveats.push("⚠ Home dock may be full — check alternatives");

  return {
    id: "route2",
    label: "Route 2",
    name: "via 2/3 + Park",
    description: "4/5 → Nevins → 2/3 → Grand Army → Citi Bike through Prospect Park",
    icon: "🌿",
    totalMins,
    waitStack,
    caveats,
    bikeRequired: true,
    bikeInfo,
    preferred: true,
  };
}

function calcRoute3() {
  // Stay on 4/5 → Atlantic → B or Q → Church or Parkside → Citi Bike
  const bqTrain = getNextArrival("D24", ["B", "Q"]);

  // Determine which stop based on which train comes first
  const isB = bqTrain?.line === "B";
  const stopId = isB ? "D27" : "D26";
  const stopName = isB ? "Church Ave" : "Parkside Ave";
  const pickupDockName = isB ? CITIBIKE_STATION_NAMES.CHURCH_PICKUP : CITIBIKE_STATION_NAMES.PARKSIDE_PICKUP;
  const rideTime = isB ? WALK_TIMES.CHURCH_RIDE_TO_HOME : WALK_TIMES.PARKSIDE_RIDE_TO_HOME;
  const pickupWalk = isB ? WALK_TIMES.CHURCH_EXIT_TO_DOCK : WALK_TIMES.PARKSIDE_EXIT_TO_DOCK;

  const pickupDock = getStationStatus(pickupDockName);
  const bikeInfo = calcPickupDock([pickupDock], CITIBIKE_STATION_NAMES);

  const transitTime = isB ? TRANSIT_TIMES["ATLANTIC_TO_CHURCH_BQ"] : TRANSIT_TIMES["ATLANTIC_TO_PARKSIDE_BQ"];

  let totalMins = null;
  if (bqTrain && bikeInfo.hasEbike) {
    totalMins = bqTrain.minutesAway
      + WALK_TIMES.ATLANTIC_TO_BQ_PLATFORM
      + transitTime
      + pickupWalk
      + rideTime;
  }

  const waitStack = [
    {
      label: `${bqTrain?.line || "B/Q"} at Atlantic`,
      value: bqTrain ? `${bqTrain.minutesAway} min` : "—",
      line: bqTrain?.line || "BQ",
      note: bqTrain?.secondArrival ? `Next: ${bqTrain.secondArrival.minutesAway} min` : null,
    },
    { label: `Ride to ${stopName}`, value: `~${transitTime} min` },
    { label: "Walk to pickup dock", value: `~${pickupWalk} min`, note: pickupDockName },
    { label: "Citi Bike pickup", value: bikeInfo.summary, isHighlight: !bikeInfo.hasEbike },
    { label: "Ride along Parkside + to home dock", value: `~${rideTime} min` },
  ];

  const caveats = [];
  if (!bikeInfo.hasEbike) caveats.push("⚠ No e-bikes at pickup dock");
  if (bikeInfo.docksFull) caveats.push("⚠ Home dock may be full");

  return {
    id: "route3",
    label: "Route 3",
    name: `via B/Q + Parkside`,
    description: `4/5 → Atlantic → ${bqTrain?.line || "B/Q"} → ${stopName} → Citi Bike via Parkside Ave`,
    icon: "🚲",
    totalMins,
    waitStack,
    caveats,
    bikeRequired: true,
    bikeInfo,
  };
}

function calcPickupDock(docks, names) {
  const validDocks = docks.filter(Boolean);
  if (!validDocks.length) {
    return { summary: "No data", hasEbike: false, docksFull: false, details: [] };
  }

  let totalEbikes = 0, totalClassic = 0;
  const details = [];

  validDocks.forEach(d => {
    const ebikes = d.num_ebikes_available || 0;
    const classic = (d.num_bikes_available || 0) - ebikes;
    totalEbikes += ebikes;
    totalClassic += classic;
    details.push({
      name: d.name,
      ebikes,
      classic,
      docks: d.num_docks_available || 0,
    });
  });

  const hasEbike = totalEbikes > 0;
  const summary = hasEbike
    ? `⚡ ${totalEbikes} e-bike${totalEbikes !== 1 ? "s" : ""}, ${totalClassic} classic`
    : `🚴 ${totalClassic} classic (no e-bikes)`;

  return { summary, hasEbike, docksFull: false, details };
}

// ---- Home Dock Status ----
function renderHomeDocks() {
  const container = document.getElementById("homeDockStatus");
  const homeDockNames = [
    CITIBIKE_STATION_NAMES.HOME_1,
    CITIBIKE_STATION_NAMES.HOME_2,
    CITIBIKE_STATION_NAMES.HOME_3,
  ];

  if (!Object.keys(state.bikeStations).length) {
    container.innerHTML = `<p class="muted">Refresh to see dock availability.</p>`;
    return;
  }

  const html = homeDockNames.map((name, i) => {
    const st = getStationStatus(name);
    const priority = i === 0 ? "Primary" : i === 1 ? "Backup" : "Backup 2";
    const docks = st ? st.num_docks_available || 0 : null;
    const full = docks === 0;

    return `
      <div class="home-dock ${full ? "dock-full" : ""}">
        <div class="dock-meta">
          <span class="dock-priority">${priority}</span>
          <span class="dock-name">${name}</span>
        </div>
        <div class="dock-status">
          ${st
            ? full
              ? `<span class="dock-alert">⚠ FULL — 0 spots</span>`
              : `<span class="dock-spots">✓ ${docks} spot${docks !== 1 ? "s" : ""} open</span>`
            : `<span class="muted">No data</span>`
          }
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = html;
}

// ---- Rendering ----
function renderRoutes() {
  const container = document.getElementById("routesContainer");

  let routes = [];

  // Phase-specific view
  if (state.phase === "approaching-nevins") {
    // Show Route 2 vs Route 3 decision
    const r2 = calcRoute2();
    const r3 = calcRoute3();
    routes = rankRoutes([r2, r3]);
    renderDecisionHelper(routes, "Nevins Decision: 2/3 or Stay for B/Q?");
  } else if (state.phase === "approaching-atlantic") {
    // Show Route 3 focused
    const r3 = calcRoute3();
    routes = [r3];
    renderDecisionHelper(routes, "Atlantic Decision: B or Q?");
  } else if (state.phase === "at-dock") {
    // Show home dock status (handled separately)
    container.innerHTML = `<p class="muted-center">See Home Docks section below ↓</p>`;
    renderHomeDocks();
    return;
  } else {
    // All routes ranked
    const r1 = calcRoute1();
    const r2 = calcRoute2();
    const r3 = calcRoute3();
    routes = rankRoutes([r1, r2, r3]);
  }

  container.innerHTML = routes.map((route, idx) => renderRouteCard(route, idx === 0)).join("");
}

function rankRoutes(routes) {
  return routes.sort((a, b) => {
    // Routes with no e-bikes go down
    if (a.bikeRequired && !a.bikeInfo?.hasEbike && !(b.bikeRequired && !b.bikeInfo?.hasEbike)) return 1;
    if (b.bikeRequired && !b.bikeInfo?.hasEbike && !(a.bikeRequired && !a.bikeInfo?.hasEbike)) return -1;
    // Then by total time
    if (a.totalMins !== null && b.totalMins !== null) return a.totalMins - b.totalMins;
    if (a.totalMins !== null) return -1;
    if (b.totalMins !== null) return 1;
    return 0;
  });
}

function renderDecisionHelper(routes, title) {
  // Rendered as part of main renderRoutes flow — just adds a header
  const container = document.getElementById("routesContainer");
  const headerHtml = `<div class="decision-header"><span class="decision-icon">⚡</span>${title}</div>`;
  container.innerHTML = headerHtml + routes.map((route, idx) => renderRouteCard(route, idx === 0)).join("");
}

function renderRouteCard(route, isBest) {
  const arrivalTime = route.totalMins ? formatArrivalTime(route.totalMins) : null;

  const warningHtml = route.caveats?.length
    ? `<div class="route-caveats">${route.caveats.map(c => `<div class="caveat">${c}</div>`).join("")}</div>`
    : "";

  const stackHtml = route.waitStack.map(item => `
    <div class="stack-item ${item.isHighlight ? "stack-highlight" : ""}">
      <span class="stack-label">${item.label}${item.line ? ` <span class="line-badge line-${item.line}">${item.line}</span>` : ""}</span>
      <span class="stack-value">${item.value}${item.note ? `<span class="stack-note"> (${item.note})</span>` : ""}</span>
    </div>
  `).join("");

  return `
    <div class="route-card ${isBest ? "route-best" : ""}">
      <div class="route-header">
        <div class="route-label-group">
          ${isBest ? `<span class="best-badge">BEST</span>` : ""}
          <span class="route-icon">${route.icon}</span>
          <div>
            <div class="route-name">${route.name}</div>
            <div class="route-desc">${route.description}</div>
          </div>
        </div>
        <div class="route-time">
          ${route.totalMins ? `<span class="total-mins">${route.totalMins}'</span>` : `<span class="total-mins dim">—</span>`}
          ${arrivalTime ? `<span class="arrival-time">home ~${arrivalTime}</span>` : ""}
        </div>
      </div>
      <div class="route-stack">${stackHtml}</div>
      ${warningHtml}
    </div>
  `;
}

function formatArrivalTime(minutesFromNow) {
  const d = new Date(Date.now() + minutesFromNow * 60000);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function updateLastRefresh() {
  const el = document.getElementById("lastRefresh");
  const age = document.getElementById("dataAge");
  if (!state.lastFetch) { el.textContent = "—"; return; }
  const t = state.lastFetch.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
  el.textContent = t;
  age.textContent = `Data from ${t}`;
}

// Auto-update data age every 30s
setInterval(() => {
  if (!state.lastFetch) return;
  const secs = Math.round((Date.now() - state.lastFetch) / 1000);
  const el = document.getElementById("dataAge");
  if (secs < 60) el.textContent = `Data ${secs}s old`;
  else el.textContent = `Data ${Math.round(secs / 60)}m old`;
}, 30000);
