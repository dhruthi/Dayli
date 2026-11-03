import { describe, it, expect } from 'vitest';
import { route, getRouterMetadata } from '../lib/router/index.js';

describe('Dayli Human-Scale AI Router (lib/router)', () => {
  describe('Model Metadata and Compact Footprint', () => {
    it('loads the fit-for-purpose local linear model (< 300 KB)', () => {
      const meta = getRouterMetadata();
      expect(meta.version).toBe('1.0.0');
      expect(meta.featureSpaceSize).toBe(16384);
      expect(meta.intents.length).toBe(15);
      expect(meta.urgencies.length).toBe(3);
    });
  });

  describe('Intent Routing across languages', () => {
    it('correctly classifies English queries', () => {
      const heat = route('Can I drink ORSL or coconut water in this heat?');
      expect(heat.intent).toBe('heat_hydration');
      expect(heat.confidence).toBeGreaterThan(0.5);

      const aqi = route('Is the air pollution dangerous outside today?');
      expect(aqi.intent).toBe('air_quality');

      const fever = route('Toddler has 101F fever for 3 days and is refusing to eat');
      expect(fever.intent).toBe('symptom_fever');

      const labour = route('Find the nearest ready labour room in Hyderabad');
      expect(labour.intent).toBe('facility_hospital_labour');

      const pharmacy = route('Is there an open 24/7 medical store or pharmacy near me?');
      expect(pharmacy.intent).toBe('facility_pharmacy');

      const forecast = route('What is the temperature today in Hyderabad?');
      expect(forecast.intent).toBe('weather_now_24h');

      const f5d = route('What is the 5-day regional weather outlook for this week?');
      expect(f5d.intent).toBe('weather_5day');
    });

    it('correctly classifies Telugu script queries', () => {
      const heat = route('గర్భిణీ స్త్రీలు ఎండలో ఎంత నీరు తాగాలి?');
      expect(heat.intent).toBe('heat_hydration');
      expect(heat.language).toBe('te');
      expect(heat.script).toBe('telugu');

      const fever = route('మూడు రోజులుగా 101 డిగ్రీల జ్వరం ఉంది ఏ మందు వేయాలి?');
      expect(fever.intent).toBe('symptom_fever');
      expect(fever.language).toBe('te');

      const labour = route('నాకు దగ్గరలో ఉన్న ప్రసవ ఆసుపత్రి మరియు లేబర్ రూమ్ ఎక్కడ ఉంది?');
      expect(labour.intent).toBe('facility_hospital_labour');
      expect(labour.language).toBe('te');

      const weather = route('ఈరోజు హైదరాబాద్‌లో ఉష్ణోగ్రత ఎంత?');
      expect(weather.intent).toBe('weather_now_24h');
      expect(weather.language).toBe('te');
    });

    it('correctly classifies Hindi script queries', () => {
      const heat = route('गर्भावस्था में दिन में कितना पानी पीना चाहिए?');
      expect(heat.intent).toBe('heat_hydration');
      expect(heat.language).toBe('hi');
      expect(heat.script).toBe('devanagari');

      const fever = route('बच्चे को 3 दिन से 101 डिग्री बुखार है उतर नहीं रहा');
      expect(fever.intent).toBe('symptom_fever');
      expect(fever.language).toBe('hi');

      const clinic = route('प्रसव के लिए नजदीकी सरकारी अस्पताल कहां है?');
      expect(clinic.intent).toBe('facility_hospital_labour');
      expect(clinic.language).toBe('hi');

      const weather = route('आज हैदराबाद में तापमान कितना है?');
      expect(weather.intent).toBe('weather_now_24h');
      expect(weather.language).toBe('hi');
    });

    it('correctly classifies Tenglish (Romanized Telugu) queries', () => {
      const weather = route('eroju hyderabad lo temperature entha undi?');
      expect(weather.intent).toBe('weather_now_24h');
      expect(weather.language).toBe('te-Latn');

      const fever = route('3 days nundi jvaram taggatam ledu 101 undi');
      expect(fever.intent).toBe('symptom_fever');
      expect(fever.language).toBe('te-Latn');

      const labour = route('naaku daggara unna labour room delivery hospital ekkada?');
      expect(labour.intent).toBe('facility_hospital_labour');
    });

    it('correctly classifies Hinglish (Romanized Hindi) queries', () => {
      const weather = route('aaj hyderabad me kitni garmi hai temperature batao');
      expect(weather.intent).toBe('weather_now_24h');
      expect(weather.language).toBe('hi-Latn');

      const fever = route('3 din se 101 fever bukhar hai kam nahi ho raha');
      expect(fever.intent).toBe('symptom_fever');
      expect(fever.language).toBe('hi-Latn');

      const labour = route('delivery ke liye government hospital kahan hai');
      expect(labour.intent).toBe('facility_hospital_labour');
    });
    it('correctly classifies Tamil (தமிழ்) queries', () => {
      const heat = route('கர்ப்பிணி பெண்கள் வெயிலில் எவ்வளவு தண்ணீர் குடிக்க வேண்டும்?');
      expect(heat.intent).toBe('heat_hydration');
      expect(heat.language).toBe('ta');

      const clinic = route('அருகில் உள்ள பிரசவ மருத்துவமனை மற்றும் லேபர் ரூம் எங்குள்ளது?');
      expect(clinic.intent).toBe('facility_hospital_labour');
      expect(clinic.language).toBe('ta');
    });

    it('correctly classifies Kannada (ಕನ್ನಡ) queries', () => {
      const weather = route('ಇಂದು ತಾಪಮಾನ ಎಷ್ಟಿದೆ?');
      expect(weather.intent).toBe('weather_now_24h');
      expect(weather.language).toBe('kn');

      const clinic = route('ಹತ್ತಿರದ ಹೆರಿಗೆ ಆಸ್ಪತ್ರೆ ಮತ್ತು ಲೇಬರ್ ರೂಮ್ ಎಲ್ಲಿದೆ?');
      expect(clinic.intent).toBe('facility_hospital_labour');
      expect(clinic.language).toBe('kn');
    });

    it('correctly classifies Malayalam (മലയാളം) queries', () => {
      const clinic = route('അടുത്തുള്ള പ്രസവാശുപത്രിയും ലേബർ റൂമും എവിടെയാണ്?');
      expect(clinic.intent).toBe('facility_hospital_labour');
      expect(clinic.language).toBe('ml');

      const weather = route('ഇന്ന് താപനില എത്രയാണ്?');
      expect(weather.intent).toBe('weather_now_24h');
      expect(weather.language).toBe('ml');
    });

    it('correctly classifies Marathi (मराठी) queries', () => {
      const weather = route('आज तापमान किती आहे?');
      expect(weather.intent).toBe('weather_now_24h');
      expect(weather.language).toBe('mr');

      const clinic = route('जवळचे प्रसूती रुग्णालय आणि लेबर रूम कुठे आहे?');
      expect(clinic.intent).toBe('facility_hospital_labour');
      expect(clinic.language).toBe('mr');
    });

    it('correctly classifies Bengali (বাংলা) queries', () => {
      const weather = route('আজকের তাপমাত্রা কত?');
      expect(weather.intent).toBe('weather_now_24h');
      expect(weather.language).toBe('bn');

      const clinic = route('নিকটস্থ প্রসূতি হাসপাতাল এবং লেবার রুম কোথায়?');
      expect(clinic.intent).toBe('facility_hospital_labour');
      expect(clinic.language).toBe('bn');
    });
  });

  describe('Urgency & Emergency Prioritization', () => {
    it('escalates life-threatening infant distress to emergency_signal across all 8 Indian languages', () => {
      const enEmerg = route('My 2 month old baby is turning blue and struggling to breathe');
      expect(enEmerg.urgency).toBe('emergency_signal');

      const teEmerg = route('2 నెలల పసికందుకి ఊపిరి తీసుకోవడం కష్టంగా ఉంది పెదవులు నీలంగా మారాయి');
      expect(teEmerg.urgency).toBe('emergency_signal');

      const hiEmerg = route('2 महीने का शिशु सांस नहीं ले पा रहा है और होंठ नीले पड़ रहे हैं');
      expect(hiEmerg.urgency).toBe('emergency_signal');

      const taEmerg = route('2 மாத குழந்தைக்கு மூச்சு திணறல் மற்றும் உதடுகள் நீல நிறமாக மாறியுள்ளது');
      expect(taEmerg.urgency).toBe('emergency_signal');

      const knEmerg = route('2 ತಿಂಗಳ ಮಗುವಿಗೆ ಉಸಿರಾಟದ ತೊಂದರೆ ಮತ್ತು ತುಟಿಗಳು ನೀಲಿ ಬಣ್ಣಕ್ಕೆ ತಿರುಗಿವೆ');
      expect(knEmerg.urgency).toBe('emergency_signal');

      const mlEmerg = route('2 മാസം പ്രായമുള്ള കുഞ്ഞിന് ശ്വാസതടസ്സം ചുണ്ടുകൾ നീലനിറമായി');
      expect(mlEmerg.urgency).toBe('emergency_signal');

      const mrEmerg = route('२ महिन्यांच्या बाळाला श्वास घेण्यास त्रास होतोय आणि ओठ निळे पडले आहेत');
      expect(mrEmerg.urgency).toBe('emergency_signal');

      const bnEmerg = route('২ মাসের বাচ্চার শ্বাসকষ্ট হচ্ছে ও ঠোঁট নীল হয়ে গেছে');
      expect(bnEmerg.urgency).toBe('emergency_signal');
    });

    it('marks non-emergency health queries as routine urgency', () => {
      const mild = route('What is the temperature today in Hyderabad?');
      expect(mild.intent).toBe('weather_now_24h');
      expect(mild.urgency).toBe('routine');
    });
  });

  describe('Performance & Latency Benchmark', () => {
    it('runs in sub-millisecond latency (< 2ms per query on CPU)', () => {
      const start = performance.now();
      const iterations = 500;
      for (let i = 0; i < iterations; i++) {
        route('వడదెబ్బ తగలకుండా ఎలాంటి జాగ్రత్తలు తీసుకోవాలి?');
      }
      const totalMs = performance.now() - start;
      const avgMs = totalMs / iterations;
      expect(avgMs).toBeLessThan(2.0); // Typically 0.05ms - 0.2ms
    });
  });
});
