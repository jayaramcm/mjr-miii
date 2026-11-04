/* MJR Township: facts the sales and site teams own.
   Everything on the page that can go out of date lives here, so it can be
   updated without touching the layout. Empty lists hide their block, so
   nothing half-finished shows on the live site.

   BEFORE LAUNCH, CONFIRM:
     - map.lat / map.lng: drop the exact pin from Google Maps (right-click the
       gate, copy the coordinates). Until then the map searches the address.
     - distances: replace with road distances checked on Google Maps from the
       gate, then set verified: true.
     - status: one entry per milestone, with the date it was confirmed.
     - sitePhotos: dated photographs taken on site (not renders).
     - completedProjects: named projects behind the track-record figures.
   Plot availability and its date live in js/plots-data.js. */
window.MJR_SITE = {
  map: {
    // e.g. lat: 16.6xxxx, lng: 78.4xxxx
    lat: null,
    lng: null,
    address: 'MJR Township, Survey No. 720 & 729, Tirupati Highway NH 167K, Kalwakurthy, Telangana 509324',
  },

  // Road distances from the project gate. Approximate working values:
  // NOT yet verified. Check each on Google Maps, then set verified: true.
  distances: {
    verified: false,
    rows: [
      { to: 'Kalwakurthy town centre', km: 3 },
      { to: 'Nagarkurnool', km: 35 },
      { to: 'Jadcherla', km: 50 },
      { to: 'Outer Ring Road (Tukkuguda)', km: 70 },
      { to: 'Rajiv Gandhi International Airport', km: 75 },
      { to: 'Financial District, Hyderabad', km: 95 },
      { to: 'Srisailam', km: 145 },
    ],
  },

  // Development status. state: 'done' | 'progress' | 'next'
  statusAsOf: '2026-11-04',
  status: [
    { label: 'TG RERA registration', detail: 'Registered, No. P01600010465', state: 'done' },
    { label: 'Site visits', detail: 'By appointment with our sales team', state: 'done', stateLabel: 'Open' },
    // Add confirmed milestones, e.g.:
    // { label: 'Internal roads (30 ft & 40 ft)', detail: 'Laid', date: '2026-10-15', state: 'done' },
    // { label: 'Compound wall and gate', detail: 'In progress', state: 'progress' },
    // { label: 'Swimming pool', detail: 'Planned', state: 'next' },
  ],

  // Dated site photographs, e.g.:
  // { src: 'Assets/site/2026-10-roads.webp', date: '2026-10-15', caption: 'Internal 40 ft road' },
  sitePhotos: [],

  // Named completed projects supporting the track-record figures, e.g.:
  // { name: 'Project name', place: 'Town', year: 2019, units: 120 },
  completedProjects: [],
};
