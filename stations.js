// ============================================================
// STATION CONFIGURATION
// All station names must match exactly what Citi Bike returns
// so we can find them by name at runtime.
// ============================================================

const CITIBIKE_STATION_NAMES = {
  // Route 2 pickup (Grand Army Plaza area)
  GRAND_ARMY_1: "Plaza St W & Flatbush Ave",
  GRAND_ARMY_2: "Grand Army Plaza & Plaza St W",

  // Home docks (priority order)
  HOME_1: "Prospect Park SW & Greenwood Ave",
  HOME_2: "Park Circle & East Dr",
  HOME_3: "Prospect Ave & Greenwood Ave",

  // Route 3 pickup docks
  PARKSIDE_PICKUP: "Parkside Ave & Ocean Ave",
  CHURCH_PICKUP: "Parade Pl & Crooke Ave",
};

// MTA GTFS stop IDs (southbound = "S" suffix)
// 4/5 line feed: https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs
// B/D/F/M feed, A/C/E feed, N/Q/R/W feed, 1/2/3 feed, 4/5/6 feed, 7 feed, L feed, SIR feed
const MTA_STOPS = {
  // 4/5 southbound
  "125_ST_45_S": "635S",       // 125 St (4/5) southbound
  "NEVINS_45_S": "A36S",       // Nevins St (4/5) southbound  
  "ATLANTIC_45_S": "D24S",     // Atlantic Av - Barclays Ctr (4/5) southbound

  // 14th St (4/5/6) for route 1 transfer
  "14TH_456_S": "635S",        // 14 St-Union Sq southbound (456)
  "BLEECKER_6_S": "629S",      // Bleecker St (6) southbound

  // 2/3 southbound from Nevins
  "NEVINS_23_S": "A36S",       // Nevins (2/3 share platform)
  "GRAND_ARMY_23_S": "A48S",   // Grand Army Plaza (2/3) southbound

  // B/Q from Atlantic
  "ATLANTIC_BQ_S": "D24S",     // Atlantic Av - Barclays Ctr (B/Q) southbound
  "PARKSIDE_BQ_S": "D26S",     // Parkside Ave (B/Q) southbound
  "CHURCH_BQ_S": "D27S",       // Church Ave (B/Q) southbound
};

// MTA GTFS-RT feed URLs (no API key required)
const MTA_FEEDS = {
  "456": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs",        // 4,5,6
  "123": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs-123",    // 1,2,3
  "BDFM": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs-bdfm",  // B,D,F,M
  "NQRW": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs-nqrw",  // N,Q,R,W
  "ACE": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs-ace",    // A,C,E
};

// Walking time estimates (minutes) — based on Google Maps, confirmed routing
const WALK_TIMES = {
  NEVINS_TO_PLATFORM: 2,          // exit train, reach 2/3 platform
  GRAND_ARMY_TO_DOCK: 3,          // GAP station exit to nearest dock
  DOCK_TO_PARK_ENTRY: 1,          // dock to park drive entry
  PARK_DRIVE_RIDE: 8,             // park drive bike ride to SW exit (ebike, low assist)
  SW_EXIT_TO_HOME: 3,             // Prospect Park SW dock to home

  // Route 3 times
  ATLANTIC_TO_BQ_PLATFORM: 3,     // transfer walk at Atlantic
  PARKSIDE_EXIT_TO_DOCK: 4,       // Parkside Ave station to Parade Pl & Crooke Ave
  CHURCH_EXIT_TO_DOCK: 3,         // Church Ave station to Parkside & Ocean Ave  
  PARKSIDE_RIDE_TO_HOME: 10,      // Parkside Ave protected lane + park approach
  CHURCH_RIDE_TO_HOME: 12,        // Church Ave route to home dock

  // Route 1 times
  BLEECKER_TO_F_PLATFORM: 3,      // transfer at Bleecker to F
  F_TO_FHP_RIDE: 22,              // F train to Fort Hamilton Pkwy (estimated)
  FHP_TO_HOME: 3,                 // FHP station walk to home

  // Bike ride from Park Circle dock (backup)
  PARK_CIRCLE_RIDE: 5,
};

// Subway travel time estimates (minutes) — confirmed order-of-magnitude from schedules
const TRANSIT_TIMES = {
  "14TH_TO_BLEECKER_6": 6,        // 14 St → Bleecker on 6
  "NEVINS_TO_GRAND_ARMY_23": 8,   // Nevins → Grand Army Plaza on 2/3
  "ATLANTIC_TO_PARKSIDE_BQ": 5,   // Atlantic → Parkside Ave on B/Q
  "ATLANTIC_TO_CHURCH_BQ": 6,     // Atlantic → Church Ave on B/Q
  // These represent in-train travel, not including waits
};
