#!/usr/bin/env node
/**
 * ==============================================================================
 * Dayli AI — Microsoft Aurora Regional Model Interactive Demo
 * Prepared for Executive & Stakeholder Demonstrations
 * ==============================================================================
 * Run: npm run demo:aurora OR node scripts/demo_aurora.js
 */

import 'dotenv/config';
import readline from 'readline';
import { auroraStatus, initAuroraFeed } from '../whatsapp-bridge/lib/auroraFeed.js';
import { fetchAuroraForecast } from '../whatsapp-bridge/lib/forecast.js';
import { composeMorningBrief } from '../whatsapp-bridge/lib/morningBrief.js';
import { compose24HourWeatherChangeAdvice } from '../whatsapp-bridge/lib/actionAdvisor.js';
import { CloudApiClient } from '../whatsapp-bridge/lib/cloudApi.js';

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const MAGENTA = '\x1b[35m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function banner() {
  console.clear();
  console.log(`${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║         DAYLI AI — MICROSOFT AURORA REGIONAL FORECAST DEMO               ║${RESET}`);
  console.log(`${CYAN}${BOLD}║   High-Resolution Atmospheric AI Model + Pediatric Climate Clinical Core ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════════╝${RESET}\n`);
}

async function runDemo() {
  banner();

  console.log(`${YELLOW}⚡ Initializing Microsoft Aurora 0.25° Regional Feed for Hyderabad...${RESET}`);
  await initAuroraFeed();
  const status = await auroraStatus();

  console.log(`${GREEN}✔ Model Feed Active:${RESET}`);
  console.log(`  • Model:              ${BOLD}${status.model || 'Microsoft Aurora 0.25°'}${RESET}`);
  console.log(`  • Region Box:         ${BOLD}Greater Hyderabad & Deccan Plateau (17.385° N, 78.486° E)${RESET}`);
  console.log(`  • Initial Conditions: ${status.initialConditions}`);
  console.log(`  • Horizon:            5-Day Rolling Forecast (20 steps, through ${status.lastValidTime ? status.lastValidTime.slice(0, 10) : 'Next 5 Days'})`);
  console.log(`  • Freshness:          Generated ${status.ageHours}h ago (${status.fresh ? 'Fresh' : 'Re-checking'})\n`);

  console.log(`${CYAN}📡 Pulling live 24-hour microclimate prediction for Hyderabad...${RESET}`);
  const forecast = await fetchAuroraForecast(17.385, 78.4867, 'Hyderabad');

  if (!forecast) {
    console.error('Failed to load forecast data.');
    process.exit(1);
  }

  const shifts = forecast.shifts || {};
  const currentTemp = shifts.current?.temperature ?? forecast.current?.temperature ?? 30;
  const maxTemp = shifts.temperature?.max ?? 35;
  const minTemp = shifts.temperature?.min ?? 24;
  const swing = shifts.temperature?.swing ?? 9;
  const heatWindow = shifts.heatWindow || {};

  console.log(`\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BOLD}📊 Sensed 24-Hour Microclimate Shifts (Live Aurora Output):${RESET}`);
  console.log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`  • ${BOLD}Current Temp:${RESET}       ${currentTemp}°C`);
  console.log(`  • ${BOLD}Peak Daytime Heat:${RESET}  ${maxTemp}°C ${shifts.temperature?.maxHour ? `around ${shifts.temperature.maxHour.slice(11, 16)} UTC` : ''}`);
  console.log(`  • ${BOLD}Overnight Low:${RESET}      ${minTemp}°C (24h diurnal swing: ${swing}°C)`);
  if (heatWindow.hasPeakHeat) {
    console.log(`  • ${BOLD}Peak Heat Window:${RESET}   ${heatWindow.startHour ? heatWindow.startHour.slice(11, 16) : 'Midday'} to ${heatWindow.endHour ? heatWindow.endHour.slice(11, 16) : 'Late Afternoon'} (Feels like ~${heatWindow.peakFeels ?? maxTemp}°C)`);
  }
  if (shifts.rain?.expected) {
    console.log(`  • ${BOLD}Precipitation:${RESET}      Rain/Showers onset expected (${shifts.rain.maxProb}% chance)`);
  } else {
    console.log(`  • ${BOLD}Precipitation:${RESET}      Low precipitation risk today`);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptMenu = () => {
    console.log(`\n${CYAN}${BOLD}Select a Demo Scenario to showcase:${RESET}`);
    console.log(`  ${BOLD}[1]${RESET} Infant Profile Briefing (English) — Pediatric heat & safe hydration`);
    console.log(`  ${BOLD}[2]${RESET} Pregnant Person Briefing (Telugu - తెలుగు) — Vernacular heat avoidance`);
    console.log(`  ${BOLD}[3]${RESET} School Child Caregiver Briefing (Hindi - हिंदी) — Play protection`);
    console.log(`  ${BOLD}[4]${RESET} General Adult 24-Hour Timeline & Shifts`);
    console.log(`  ${BOLD}[5]${RESET} Interactive Custom Query (Type a real question)`);
    console.log(`  ${BOLD}[6]${RESET} Dispatch Live WhatsApp Message to a phone number`);
    console.log(`  ${BOLD}[0]${RESET} Exit\n`);

    rl.question(`${YELLOW}${BOLD}Enter choice (0-6): ${RESET}`, async (choice) => {
      const c = choice.trim();

      if (c === '1') {
        console.log(`\n${MAGENTA}${BOLD}--- [1] Infant Profile Briefing (English) ---${RESET}\n`);
        const session = {
          profile: { name: 'Yashwanth', locale: 'en', subjectType: 'infant', childAgeMonths: 4, location: { name: 'Hyderabad' } },
        };
        const brief = composeMorningBrief(session, { cityName: 'Hyderabad', forecast });
        console.log(brief);
        return promptMenu();
      }

      if (c === '2') {
        console.log(`\n${MAGENTA}${BOLD}--- [2] Pregnant Person Briefing (Telugu - తెలుగు) ---${RESET}\n`);
        const session = {
          profile: { name: 'లక్ష్మి', locale: 'te', subjectType: 'pregnant_person', location: { name: 'హైదరాబాద్' } },
        };
        const brief = composeMorningBrief(session, { cityName: 'హైదరాబాద్', forecast });
        console.log(brief);
        return promptMenu();
      }

      if (c === '3') {
        console.log(`\n${MAGENTA}${BOLD}--- [3] School Child Caregiver Briefing (Hindi - हिंदी) ---${RESET}\n`);
        const session = {
          profile: { name: 'अमित', locale: 'hi', subjectType: 'child', location: { name: 'हैदराबाद' } },
        };
        const brief = composeMorningBrief(session, { cityName: 'हैदराबाद', forecast });
        console.log(brief);
        return promptMenu();
      }

      if (c === '4') {
        console.log(`\n${MAGENTA}${BOLD}--- [4] General Adult 24-Hour Timeline & Shifts ---${RESET}\n`);
        const session = {
          profile: { name: 'Ravi', locale: 'en', subjectType: 'adult', location: { name: 'Hyderabad' } },
        };
        const brief = composeMorningBrief(session, { cityName: 'Hyderabad', forecast });
        console.log(brief);
        return promptMenu();
      }

      if (c === '5') {
        rl.question(`\n${YELLOW}Type your question (e.g. "Can I take my 3-month-old baby out this afternoon in Hyderabad?"): ${RESET}`, (query) => {
          const q = query.trim() || 'weather and safe timing for baby';
          console.log(`\n${CYAN}🤖 Generating tailored recommendation using Aurora 24h shifts...${RESET}\n`);
          const session = {
            profile: {
              name: 'Demo User',
              locale: 'en',
              subjectType: q.toLowerCase().includes('baby') ? 'infant' : 'adult',
              location: { name: 'Hyderabad' },
            },
          };
          const response = compose24HourWeatherChangeAdvice(forecast, session.profile, q);
          console.log(response);
          return promptMenu();
        });
        return;
      }

      if (c === '6') {
        rl.question(`\n${YELLOW}Enter WhatsApp recipient phone number with country code (e.g. 919876543210): ${RESET}`, async (phone) => {
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          if (!cleanPhone || cleanPhone.length < 10) {
            console.log(`${DIM}Invalid number. Returning to menu.${RESET}`);
            return promptMenu();
          }

          console.log(`\n${CYAN}🚀 Dispatching live 24-hour Aurora forecast to +${cleanPhone} via Meta Cloud API...${RESET}`);
          const cloudApi = new CloudApiClient({
            accessToken: process.env.META_WHATSAPP_ACCESS_TOKEN,
            phoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID,
          });

          const session = {
            profile: { name: 'Yashwanth', locale: 'en', subjectType: 'infant', location: { name: 'Hyderabad' } },
          };
          const brief = composeMorningBrief(session, { cityName: 'Hyderabad', forecast });

          try {
            const res = await cloudApi.sendText(cleanPhone, brief);
            if (res.ok) {
              console.log(`${GREEN}✔ Delivered successfully! Meta Message ID: ${res.messageId}${RESET}`);
            } else {
              console.log(`${YELLOW}⚠ Meta response: ${res.error || res.reason || 'Not delivered (24h window closed or test recipient restriction)'}${RESET}`);
            }
          } catch (err) {
            console.error(`Send error:`, err.message);
          }
          return promptMenu();
        });
        return;
      }

      if (c === '0') {
        console.log(`\n${GREEN}Demo session finished. Have a great presentation! 🚀${RESET}\n`);
        rl.close();
        process.exit(0);
      }

      console.log('Invalid selection.');
      promptMenu();
    });
  };

  promptMenu();
}

runDemo().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});
