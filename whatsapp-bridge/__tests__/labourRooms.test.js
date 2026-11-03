import { describe, it, expect } from 'vitest';
import {
  getAllLabourRoomHospitals,
  findNearestReadyLabourRoom,
  haversineDistanceKm,
  formatLabourRoomWhatsAppBlock,
} from '../lib/labourRooms.js';

describe('Maternity Hospitals & Ready Labour Room Router (lib/labourRooms.js)', () => {
  it('returns curated CEmONC maternity hospitals with ready labour rooms', () => {
    const hospitals = getAllLabourRoomHospitals();
    expect(hospitals.length).toBeGreaterThanOrEqual(8);
    for (const h of hospitals) {
      expect(h.readyLabourRooms).toBeGreaterThan(0);
      expect(h.nicuBedsAvailable).toBeGreaterThan(0);
      expect(typeof h.lat).toBe('number');
      expect(typeof h.lon).toBe('number');
    }
  });

  it('finds the nearest Ready Labour Room using Haversine distance and returns routing polyline', () => {
    // Near Charminar (17.3616, 78.4747) -> Petlaburj Govt Maternity (17.3684, 78.4712) should be closest
    const { nearest, backup, allRanked } = findNearestReadyLabourRoom(17.3616, 78.4747);
    expect(nearest).toBeDefined();
    expect(nearest.shortName).toContain('Petlaburj');
    expect(nearest.distanceKm).toBeLessThan(2);
    expect(nearest.etaMinutes).toBeGreaterThanOrEqual(4);
    expect(nearest.routeCoords).toEqual([
      [17.3616, 78.4747],
      [nearest.lat, nearest.lon],
    ]);
    expect(backup).toBeDefined();
    expect(allRanked[0].distanceKm).toBeLessThanOrEqual(allRanked[1].distanceKm);
  });

  it('formats vernacular WhatsApp Ready Labour Room dispatch blocks in Telugu, Hindi, and English', () => {
    const teBlock = formatLabourRoomWhatsAppBlock(17.3325, 78.5372, 'te');
    expect(teBlock).toContain('లేబర్ రూమ్');
    expect(teBlock).toContain('google.com/maps');

    const hiBlock = formatLabourRoomWhatsAppBlock(17.4399, 78.4983, 'hi');
    expect(hiBlock).toContain('लेबर रूम');

    const enBlock = formatLabourRoomWhatsAppBlock(17.4435, 78.3772, 'en');
    expect(enBlock).toContain('Nearest Ready Labour Room');
  });

  it('computes accurate Haversine distance', () => {
    const dist = haversineDistanceKm(17.385, 78.4867, 17.4399, 78.4983);
    expect(dist).toBeGreaterThan(5);
    expect(dist).toBeLessThan(8);
  });
});
