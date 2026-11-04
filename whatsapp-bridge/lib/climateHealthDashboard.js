import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CLIMATE_HEALTH_DASHBOARD_HTML = fs.readFileSync(
  path.join(__dirname, 'climateHealthDashboard.html'),
  'utf8'
);
