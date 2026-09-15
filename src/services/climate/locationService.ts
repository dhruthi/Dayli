import { LocationInfo } from './types';

export class LocationService {
  private predefinedLocations: Record<string, LocationInfo> = {
    'new delhi': {
      latitude: 28.6139,
      longitude: 77.209,
      city: 'New Delhi',
      state: 'Delhi NCR',
      country: 'India',
      source: 'simulated',
    },
    delhi: {
      latitude: 28.6139,
      longitude: 77.209,
      city: 'New Delhi',
      state: 'Delhi NCR',
      country: 'India',
      source: 'simulated',
    },
    mumbai: {
      latitude: 19.076,
      longitude: 72.8777,
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      source: 'simulated',
    },
    kolkata: {
      latitude: 22.5726,
      longitude: 88.3639,
      city: 'Kolkata',
      state: 'West Bengal',
      country: 'India',
      source: 'simulated',
    },
    chennai: {
      latitude: 13.0827,
      longitude: 80.2707,
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      source: 'simulated',
    },
    jaipur: {
      latitude: 26.9124,
      longitude: 75.7873,
      city: 'Jaipur',
      state: 'Rajasthan',
      country: 'India',
      source: 'simulated',
    },
    gurgaon: {
      latitude: 28.4595,
      longitude: 77.0266,
      city: 'Gurgaon',
      state: 'Haryana',
      country: 'India',
      source: 'simulated',
    },
    hyderabad: {
      latitude: 17.385,
      longitude: 78.4867,
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      source: 'simulated',
    },
  };

  /**
   * Resolve location payload into standardized LocationInfo
   */
  resolveLocation(
    latitude?: number,
    longitude?: number,
    locationName?: string,
    sourceOverride?: 'gps' | 'simulated' | 'whatsapp' | 'manual'
  ): LocationInfo {
    const locNameClean = (locationName || '').trim().toLowerCase();

    // Check predefined city map
    if (locNameClean && this.predefinedLocations[locNameClean]) {
      return {
        ...this.predefinedLocations[locNameClean],
        source: sourceOverride || 'simulated',
      };
    }

    // Default to provided coordinates or Delhi defaults
    const lat = typeof latitude === 'number' && !isNaN(latitude) ? latitude : 28.6139;
    const lon = typeof longitude === 'number' && !isNaN(longitude) ? longitude : 77.209;

    let derivedCity = locationName || 'Local Micro-Climate Zone';
    let source: 'gps' | 'simulated' | 'whatsapp' | 'manual' = sourceOverride || 'gps';

    if (lat > 28 && lat < 29 && lon > 76 && lon < 78) {
      derivedCity = 'New Delhi Region';
    } else if (lat > 18 && lat < 20 && lon > 72 && lon < 74) {
      derivedCity = 'Mumbai Coastal Region';
    } else if (lat > 22 && lat < 23 && lon > 88 && lon < 89) {
      derivedCity = 'Kolkata Industrial Sector';
    } else if (lat > 16.5 && lat < 18.5 && lon > 77.5 && lon < 79.5) {
      derivedCity = 'Hyderabad Deccan Plateau';
    }

    return {
      latitude: Number(lat.toFixed(4)),
      longitude: Number(lon.toFixed(4)),
      city: derivedCity,
      country: 'India',
      source,
    };
  }

  /**
   * Parse WhatsApp location payload
   */
  parseWhatsAppLocation(locationMsg: { latitude: number; longitude: number; name?: string; address?: string }): LocationInfo {
    return this.resolveLocation(
      locationMsg.latitude,
      locationMsg.longitude,
      locationMsg.name || locationMsg.address || 'WhatsApp Shared GPS',
      'whatsapp'
    );
  }
}

export const locationService = new LocationService();
