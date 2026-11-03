/**
 * ==============================================================================
 * Dayli AI — Maternity Hospitals & Ready Labour Room Geospatial Router
 * ==============================================================================
 * Maps pregnant women and caregivers to the nearest CEmONC (Comprehensive
 * Emergency Obstetric and Newborn Care) facility with active, ready labour rooms,
 * obstetric cooling wards, and NICU capacity across Greater Hyderabad.
 */

export const MATERNITY_HOSPITALS = [
  {
    id: 'HOSP-HYD-01',
    name: 'Govt. Maternity Hospital, Petlaburj (Osmania Perinatal Wing)',
    shortName: 'Petlaburj Govt Maternity',
    zone: 'Charminar / Old City',
    type: 'Public CEmONC Tertiary',
    lat: 17.3684,
    lon: 78.4712,
    readyLabourRooms: 6,
    totalLabourRooms: 8,
    nicuBedsAvailable: 11,
    coolingWardStatus: 'Active (Solar + DG HVAC Backup)',
    ambulanceReady: true,
    heatProtocolCertified: true,
    emergencyPhone: '108 / 040-24523642',
  },
  {
    id: 'HOSP-HYD-02',
    name: 'Niloufer Hospital for Women & Children',
    shortName: 'Niloufer Perinatal Centre',
    zone: 'Red Hills / Lakdikapul',
    type: 'Public Super-Specialty Perinatal',
    lat: 17.3992,
    lon: 78.4611,
    readyLabourRooms: 8,
    totalLabourRooms: 10,
    nicuBedsAvailable: 16,
    coolingWardStatus: 'Active (Dedicated Heat-Stroke Obstetric Bay)',
    ambulanceReady: true,
    heatProtocolCertified: true,
    emergencyPhone: '108 / 040-23394449',
  },
  {
    id: 'HOSP-HYD-03',
    name: 'Modern Govt. Maternity Hospital, Sultan Bazar',
    shortName: 'Sultan Bazar Maternity',
    zone: 'Koti / Central Hyderabad',
    type: 'Public CEmONC Teaching Hospital',
    lat: 17.3869,
    lon: 78.4836,
    readyLabourRooms: 5,
    totalLabourRooms: 6,
    nicuBedsAvailable: 9,
    coolingWardStatus: 'Active (100% Climate Controlled)',
    ambulanceReady: true,
    heatProtocolCertified: true,
    emergencyPhone: '108 / 040-24657282',
  },
  {
    id: 'HOSP-HYD-04',
    name: 'Gandhi Hospital — Maternal & Obstetric Emergency Complex',
    shortName: 'Gandhi Obstetric Emergency',
    zone: 'Secunderabad / Musheerabad',
    type: 'Public Tertiary CEmONC',
    lat: 17.4246,
    lon: 78.5031,
    readyLabourRooms: 7,
    totalLabourRooms: 9,
    nicuBedsAvailable: 14,
    coolingWardStatus: 'Active (High-Risk Preterm & Heat Triage)',
    ambulanceReady: true,
    heatProtocolCertified: true,
    emergencyPhone: '108 / 040-27505566',
  },
  {
    id: 'HOSP-HYD-05',
    name: 'Area Hospital Vanasthalipuram & Almasguda MCH Hub',
    shortName: 'Vanasthalipuram Area MCH',
    zone: 'Almasguda / LB Nagar South-East',
    type: 'Public Area CEmONC Hospital',
    lat: 17.3389,
    lon: 78.5568,
    readyLabourRooms: 4,
    totalLabourRooms: 5,
    nicuBedsAvailable: 6,
    coolingWardStatus: 'Active (Cool-Roof + Obstetric Hydration Bay)',
    ambulanceReady: true,
    heatProtocolCertified: true,
    emergencyPhone: '108 / 040-24241108',
  },
  {
    id: 'HOSP-HYD-06',
    name: 'Fernandez Perinatal & Stork Home Centre, Banjara Hills',
    shortName: 'Fernandez Perinatal Hub',
    zone: 'Banjara Hills / Jubilee Hills',
    type: 'Dedicated Perinatal & Midwifery CEmONC',
    lat: 17.4195,
    lon: 78.4392,
    readyLabourRooms: 5,
    totalLabourRooms: 6,
    nicuBedsAvailable: 10,
    coolingWardStatus: 'Active (Level-III Perinatal ICU)',
    ambulanceReady: true,
    heatProtocolCertified: true,
    emergencyPhone: '040-40222300',
  },
  {
    id: 'HOSP-HYD-07',
    name: 'District Area Hospital, Kondapur (Cyberabad MCH Wing)',
    shortName: 'Kondapur District MCH',
    zone: 'HITEC City / Madhapur / Gachibowli',
    type: 'Public District CEmONC',
    lat: 17.4622,
    lon: 78.3568,
    readyLabourRooms: 4,
    totalLabourRooms: 5,
    nicuBedsAvailable: 8,
    coolingWardStatus: 'Active (24/7 Emergency Labour Suite)',
    ambulanceReady: true,
    heatProtocolCertified: true,
    emergencyPhone: '108 / 040-23112929',
  },
  {
    id: 'HOSP-HYD-08',
    name: 'Govt. Maternal & Child Health (MCH) Centre, Kukatpally',
    shortName: 'Kukatpally Govt MCH',
    zone: 'Kukatpally / Balanagar',
    type: 'Public MCH CEmONC Centre',
    lat: 17.4895,
    lon: 78.4041,
    readyLabourRooms: 3,
    totalLabourRooms: 4,
    nicuBedsAvailable: 5,
    coolingWardStatus: 'Active (Thermal Stabilization Ward)',
    ambulanceReady: true,
    heatProtocolCertified: true,
    emergencyPhone: '108 / 040-23054108',
  },
];

/**
 * Computes exact Haversine distance in kilometers between two coordinates.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in km (rounded to 2 decimal places)
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Estimates urban emergency transit time in minutes (accounting for urban traffic).
 * Assumes average emergency corridor speed of 24 km/h + 3 min dispatch buffer.
 * @param {number} distanceKm
 * @returns {number} minutes
 */
export function estimateTransitMinutes(distanceKm) {
  return Math.max(4, Math.round((distanceKm / 24) * 60 + 3));
}

/**
 * Returns all maternity hospitals with ready labour room metadata.
 */
export function getAllLabourRoomHospitals() {
  return MATERNITY_HOSPITALS.map((h) => ({ ...h }));
}

/**
 * Finds the nearest hospital(s) with at least 1 Ready Labour Room (`readyLabourRooms > 0`).
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {object} { nearest, backup, allRanked }
 */
export function findNearestReadyLabourRoom(lat, lon) {
  const validLat = typeof lat === 'number' && !Number.isNaN(lat) ? lat : 17.385;
  const validLon = typeof lon === 'number' && !Number.isNaN(lon) ? lon : 78.4867;

  const ranked = MATERNITY_HOSPITALS.filter((h) => h.readyLabourRooms > 0)
    .map((h) => {
      const distanceKm = haversineDistanceKm(validLat, validLon, h.lat, h.lon);
      const etaMinutes = estimateTransitMinutes(distanceKm);
      return {
        ...h,
        distanceKm,
        etaMinutes,
        routeCoords: [
          [validLat, validLon],
          [h.lat, h.lon],
        ],
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const nearest = ranked[0] || null;
  const backup = ranked[1] || null;

  return {
    nearest,
    backup,
    allRanked: ranked,
  };
}

/**
 * Formats a concise, vernacular-aware WhatsApp clinical dispatch block pointing
 * a pregnant user to the nearest Ready Labour Room.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {string} [locale='en']
 * @returns {string}
 */
export function formatLabourRoomWhatsAppBlock(lat, lon, locale = 'en') {
  const { nearest, backup } = findNearestReadyLabourRoom(lat, lon);
  if (!nearest) return '';

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${nearest.lat},${nearest.lon}`;

  if (locale === 'te') {
    return (
      `\n\n🏥 *సమీపంలోని సిద్ధంగా ఉన్న లేబర్ రూమ్ (Ready Labour Room):*\n` +
      `• *${nearest.name}*\n` +
      `• దూరం: *${nearest.distanceKm} కి.మీ.* (~${nearest.etaMinutes} నిమిషాలు)\n` +
      `• సిద్ధంగా ఉన్న లేబర్ రూమ్‌లు: *${nearest.readyLabourRooms}* (NICU: ${nearest.nicuBedsAvailable} బెడ్లు)\n` +
      `• అత్యవసర నంబర్: *${nearest.emergencyPhone}*\n` +
      `• మ్యాప్ మార్గం: ${mapsUrl}`
    );
  }

  if (locale === 'hi') {
    return (
      `\n\n🏥 *निकटतम तैयार लेबर रूम (Ready Labour Room):*\n` +
      `• *${nearest.name}*\n` +
      `• दूरी: *${nearest.distanceKm} किमी* (~${nearest.etaMinutes} मिनट)\n` +
      `• उपलब्ध लेबर रूम: *${nearest.readyLabourRooms}* (NICU: ${nearest.nicuBedsAvailable} बेड)\n` +
      `• आपातकालीन नंबर: *${nearest.emergencyPhone}*\n` +
      `• मैप दिशा: ${mapsUrl}`
    );
  }

  return (
    `\n\n🏥 *Nearest Ready Labour Room & Obstetric Emergency Hub:*\n` +
    `• *${nearest.name}*\n` +
    `• Distance: *${nearest.distanceKm} km* (~${nearest.etaMinutes} mins transit)\n` +
    `• Ready Labour Suites: *${nearest.readyLabourRooms} available* (NICU: ${nearest.nicuBedsAvailable} beds)\n` +
    `• Emergency Line: *${nearest.emergencyPhone}*\n` +
    (backup ? `• Backup Hub: *${backup.shortName}* (${backup.distanceKm} km)\n` : '') +
    `• Directions: ${mapsUrl}`
  );
}
