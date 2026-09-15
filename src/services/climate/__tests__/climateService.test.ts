import { climateService } from '../climateService';
import { locationService } from '../locationService';
import { healthRiskEngine } from '../healthRiskEngine';
import { hydrationEngine } from '../hydrationEngine';
import { climateNormalizer } from '../normalizer';
import { mockWeatherProvider } from '../providers/MockWeatherProvider';
import { realWeatherProvider } from '../providers/RealWeatherProvider';

async function runClimateTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING DAYLI.AI CLIMATE SERVICE UNIT TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // TEST 1: Location Service - City & Coordinates Resolution
  try {
    const delhi = locationService.resolveLocation(28.6139, 77.209, 'New Delhi');
    assert(delhi.city.includes('Delhi') && delhi.latitude === 28.6139, '1. Location Resolution - New Delhi');
  } catch (err: any) {
    assert(false, '1. Location Resolution - New Delhi', err.message);
  }

  // TEST 2: Location Service - WhatsApp Shared GPS Location Parsing
  try {
    const waLoc = locationService.parseWhatsAppLocation({
      latitude: 19.076,
      longitude: 72.8777,
      name: 'Mumbai Coastal GPS',
    });
    assert(waLoc.source === 'whatsapp' && waLoc.latitude === 19.076, '2. WhatsApp GPS Payload Location Parsing');
  } catch (err: any) {
    assert(false, '2. WhatsApp GPS Payload Location Parsing', err.message);
  }

  // TEST 3: Mock Weather Provider - Micro-Zone Delhi Extreme Heatwave
  try {
    const raw = await mockWeatherProvider.getCurrentWeather(28.6139, 77.209, 'Delhi');
    assert(raw.temperature_c === 42.5 && raw.uv_index === 11, '3. Mock Provider - Delhi Extreme Heatwave');
  } catch (err: any) {
    assert(false, '3. Mock Provider - Delhi Extreme Heatwave', err.message);
  }

  // TEST 4: Mock Weather Provider - Mumbai High Coastal Humidity
  try {
    const raw = await mockWeatherProvider.getCurrentWeather(19.076, 72.8777, 'Mumbai');
    assert(raw.humidity_percent === 82 && raw.feels_like_c === 44.2, '4. Mock Provider - Mumbai Coastal Humidity');
  } catch (err: any) {
    assert(false, '4. Mock Provider - Mumbai Coastal Humidity', err.message);
  }

  // TEST 5: Mock Weather Provider - Kolkata Industrial High AQI Smog
  try {
    const raw = await mockWeatherProvider.getCurrentWeather(22.5726, 88.3639, 'Kolkata');
    assert(raw.aqi === 290, '5. Mock Provider - Kolkata Hazardous Smog');
  } catch (err: any) {
    assert(false, '5. Mock Provider - Kolkata Hazardous Smog', err.message);
  }

  // TEST 6: Normalizer & Thresholds - Standardizing Payload
  try {
    const loc = locationService.resolveLocation(13.0827, 80.2707, 'Chennai');
    const normalized = climateNormalizer.normalize(
      { temperature_c: 38, feels_like_c: 44, humidity_percent: 75, aqi: 180, uv_index: 10 },
      loc
    );
    assert(normalized.aqi_status === 'Unhealthy' && normalized.uv_status === 'Very High', '6. Normalizer & Status Threshold Mapping');
  } catch (err: any) {
    assert(false, '6. Normalizer & Status Threshold Mapping', err.message);
  }

  // TEST 7: Deterministic Health Risk Engine - Extreme Combined Risk
  try {
    const loc = locationService.resolveLocation(28.6139, 77.209, 'Delhi');
    const normalized = climateNormalizer.normalize(
      { temperature_c: 43, feels_like_c: 48, humidity_percent: 50, aqi: 310, uv_index: 11 },
      loc
    );
    const risk = healthRiskEngine.evaluate(normalized);
    assert(
      risk.heat_risk === 'extreme' &&
        risk.air_quality_risk === 'extreme' &&
        risk.overall_climate_risk === 'extreme',
      '7. Deterministic Risk Engine - Combined Extreme Climate Risks'
    );
  } catch (err: any) {
    assert(false, '7. Deterministic Risk Engine - Combined Extreme Climate Risks', err.message);
  }

  // TEST 8: Hydration Engine - Baseline & Pregnancy Trimester Calculation
  try {
    const loc = locationService.resolveLocation(28.6139, 77.209, 'Delhi');
    const normalized = climateNormalizer.normalize({ temperature_c: 42, feels_like_c: 46 }, loc);
    const hydration = hydrationEngine.calculateHydration({
      climateData: normalized,
      userProfile: { name: 'Ananya', phoneNumber: '', language: 'en', trimester: '2nd Trimester', isPregnant: true },
      weightKg: 65,
    });

    assert(
      hydration.recommended_target_ml >= 3400 &&
        hydration.disclaimer.includes('general climate health guidance'),
      '8. Hydration Engine - Target & Medical Disclaimer'
    );
  } catch (err: any) {
    assert(false, '8. Hydration Engine - Target & Medical Disclaimer', err.message);
  }

  // TEST 9: Provider Fallback Mechanism Execution
  try {
    climateService.setProviderType('real'); // Forced real provider attempt
    const intel = await climateService.getClimateIntelligence({
      latitude: 28.6139,
      longitude: 77.209,
      locationName: 'New Delhi',
      forceRefresh: true,
    });

    assert(intel.normalized.temperature_c > 0 && intel.sourceType !== undefined, '9. Provider Router & Fallback Handling');
  } catch (err: any) {
    assert(false, '9. Provider Router & Fallback Handling', err.message);
  }

  // TEST 10: Backward Compatibility Adapter - getClimateHealthData()
  try {
    const weatherData = await climateService.getClimateHealthData(28.6139, 77.209, 'New Delhi');
    assert(
      typeof weatherData.cityName === 'string' &&
        typeof weatherData.hydrationTargetLiters === 'number' &&
        weatherData.hydrationTargetLiters >= 3.0,
      '10. Backward Compatibility WeatherData Adapter'
    );
  } catch (err: any) {
    assert(false, '10. Backward Compatibility WeatherData Adapter', err.message);
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runClimateTests();
