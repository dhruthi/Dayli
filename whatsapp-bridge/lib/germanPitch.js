/**
 * ==============================================================================
 * Dayli AI — Executive Pitch & Clinical Dossier for German Partners
 * ==============================================================================
 * Topic: Extreme Heat & Maternal-Fetal Pathophysiology — Predictive AI
 *        Interventions via Microsoft Aurora 0.25° & Zero-PHI WhatsApp Routing.
 */

export const GERMAN_PITCH_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0E5C5A">
<title>dayli.ai — Executive Pitch: Maternal Heat Impact & Predictive AI</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,400..800,0..100;1,9..144,400..700,0..100&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  :root {
    --background: #FCF9F5;
    --foreground: #092227;
    --text-secondary: #35555B;
    --text-muted: #5F7D83;
    --card: #FFFFFF;
    --border: #D6DFE1;
    --border-light: #E8EFF0;
    --primary: #0E5C5A;
    --primary-light: #E6F3F2;
    --coral: #F26C4F;
    --coral-ink: #962A14;
    --coral-light: #FFE4E6;
    --marigold: #FCA82B;
    --marigold-ink: #87480E;
    --marigold-light: #FEF3C7;
    --emerald: #0D9488;
    --emerald-light: #E6F7F5;
    --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
    --font-serif: 'Fraunces', Georgia, serif;
    --font-mono: 'Space Mono', monospace;
    --shadow-md: 0 8px 30px -4px rgba(9, 34, 39, 0.06), 0 2px 8px -1px rgba(9, 34, 39, 0.04);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: var(--font-sans);
    color: var(--foreground);
    background-color: var(--background);
    background-image:
      radial-gradient(80% 60% at 85% 0%, rgba(252, 168, 43, 0.16) 0%, transparent 60%),
      radial-gradient(70% 50% at 0% 100%, rgba(242, 108, 79, 0.10) 0%, transparent 65%),
      linear-gradient(180deg, #FCF7EE, #FAF7F2 70%);
    line-height: 1.6;
  }
  .topbar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(252, 249, 245, 0.9);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    padding: 14px 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .brand-row {
    display: flex;
    align-items: baseline;
    text-decoration: none;
  }
  .brand-dayli {
    font-family: var(--font-serif);
    font-size: 26px;
    font-weight: 700;
    background: linear-gradient(95deg, var(--coral-ink), var(--marigold-ink) 45%, var(--primary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .brand-dot {
    background: var(--marigold);
    width: 7px;
    height: 7px;
    border-radius: 50%;
    margin: 0 4px;
    display: inline-block;
    transform: translateY(-5px);
  }
  .brand-ai {
    font-family: var(--font-serif);
    font-size: 26px;
    font-weight: 700;
    color: rgba(9, 34, 39, 0.45);
  }
  .topbar-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 18px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-outline {
    background: #FFFFFF;
    color: var(--primary);
    border: 1px solid var(--border);
  }
  .btn-outline:hover {
    border-color: var(--primary);
    background: var(--primary-light);
  }
  .btn-primary {
    background: var(--primary);
    color: #FFFFFF;
    border: 1px solid var(--primary);
    box-shadow: 0 4px 14px rgba(14, 92, 90, 0.22);
  }
  .btn-primary:hover {
    background: #0a4644;
  }
  .container {
    max-width: 1140px;
    margin: 0 auto;
    padding: 44px 28px 80px;
  }
  .hero {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 44px 48px;
    box-shadow: var(--shadow-md);
    margin-bottom: 32px;
    position: relative;
    overflow: hidden;
  }
  .hero::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 5px;
    background: linear-gradient(90deg, var(--coral), var(--marigold), var(--primary));
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--primary-light);
    color: var(--primary);
    padding: 5px 14px;
    border-radius: 9999px;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    margin-bottom: 18px;
  }
  h1 {
    font-family: var(--font-serif);
    font-size: 38px;
    line-height: 1.15;
    margin: 0 0 16px;
    color: var(--foreground);
  }
  .hero-lead {
    font-size: 17px;
    color: var(--text-secondary);
    max-width: 860px;
    margin: 0 0 28px;
  }
  .stat-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 16px;
    padding-top: 24px;
    border-top: 1px solid var(--border-light);
  }
  .stat-box {
    background: #FAF7F2;
    border: 1px solid var(--border-light);
    border-radius: 16px;
    padding: 16px 20px;
  }
  .stat-num {
    font-family: var(--font-serif);
    font-size: 30px;
    font-weight: 700;
    line-height: 1.1;
  }
  .stat-label {
    font-size: 12.5px;
    color: var(--text-secondary);
    margin-top: 4px;
  }
  .section-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 34px 38px;
    box-shadow: var(--shadow-md);
    margin-bottom: 28px;
  }
  .section-tag {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--coral-ink);
    margin-bottom: 6px;
  }
  h2 {
    font-family: var(--font-serif);
    font-size: 25px;
    margin: 0 0 18px;
    color: var(--foreground);
  }
  .cascade-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 14px;
    margin: 22px 0;
  }
  .cascade-step {
    background: #FCF9F5;
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 18px;
    position: relative;
  }
  .step-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--primary);
    color: #FFFFFF;
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .cascade-step h4 {
    margin: 0 0 6px;
    font-size: 14px;
    color: var(--foreground);
  }
  .cascade-step p {
    margin: 0;
    font-size: 12.5px;
    color: var(--text-secondary);
  }
  .grid-2 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
    gap: 24px;
  }
  .trimester-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin-top: 10px;
  }
  .trimester-table th {
    text-align: left;
    padding: 12px 10px;
    border-bottom: 2px solid var(--border);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--text-muted);
  }
  .trimester-table td {
    padding: 12px 10px;
    border-bottom: 1px solid var(--border-light);
    vertical-align: top;
  }
  .pill {
    display: inline-block;
    padding: 2px 9px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 700;
  }
  .pill-rose { background: var(--coral-light); color: #9F1239; }
  .pill-amber { background: var(--marigold-light); color: var(--marigold-ink); }
  .pill-teal { background: var(--primary-light); color: var(--primary); }
  @media print {
    .topbar { display: none; }
    body { background: #FFFFFF; }
    .hero, .section-card { box-shadow: none; break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="topbar">
    <a href="/dashboard" class="brand-row">
      <span class="brand-dayli">dayli</span><span class="brand-dot"></span><span class="brand-ai">ai</span>
    </a>
    <div class="topbar-actions">
      <a href="/dashboard" class="btn btn-outline">← Back to Live Surveillance Dashboard</a>
      <button onclick="window.print()" class="btn btn-primary">🖨️ Print / Save Pitch PDF</button>
    </div>
  </div>

  <div class="container">
    <!-- SLIDE 1: EXECUTIVE SUMMARY -->
    <section class="hero">
      <div class="eyebrow">🇩🇪 Executive Clinical & Climate Dossier · German Partner Briefing</div>
      <h1>Protecting Pregnant Women from Extreme Heat: Predictive AI & Last-Mile Obstetric Routing</h1>
      <p class="hero-lead">
        Climate change is no longer an abstract environmental metric—it is an acute obstetric emergency.
        <b>dayli.ai</b> combines <b>Microsoft Aurora 0.25° atmospheric foundation modeling</b> with a
        <b>Zero-PHI WhatsApp Clinical Copilot</b> to prevent heat-induced preterm birth, maternal dehydration,
        and uteroplacental insufficiency before emergency thresholds are crossed.
      </p>
      <div class="stat-strip">
        <div class="stat-box">
          <div class="stat-num" style="color:var(--coral-ink)">+16% to 25%</div>
          <div class="stat-label">Increased risk of <b>Preterm Birth & Stillbirth</b> during extreme heatwave windows (<i>Lancet Planetary Health</i>)</div>
        </div>
        <div class="stat-box">
          <div class="stat-num" style="color:var(--marigold-ink)">38.5°C Core</div>
          <div class="stat-label">Maternal core temperature threshold triggering <b>fetal tachycardia & oxytocin surge</b></div>
        </div>
        <div class="stat-box">
          <div class="stat-num" style="color:var(--primary)">1,800+ Mothers</div>
          <div class="stat-label">Supported across <b>24,000+ WhatsApp conversations</b> in the Govt. of Telangana field pilot</div>
        </div>
        <div class="stat-box">
          <div class="stat-num" style="color:var(--emerald)">8 CEmONC Hubs</div>
          <div class="stat-label">Mapped with <b>42 Ready Labour Rooms</b> & real-time Haversine emergency routing</div>
        </div>
      </div>
    </section>

    <!-- SLIDE 2: PATHOPHYSIOLOGY OF HEAT ON PREGNANT WOMEN -->
    <section class="section-card">
      <div class="section-tag">1. Clinical Pathophysiology</div>
      <h2>Why Pregnant Women Are Uniquely Vulnerable to Extreme Heat</h2>
      <p style="color:var(--text-secondary); margin-top:0">
        During gestation, maternal basal metabolic heat production increases by <b>+300 kcal/day</b> while the growing fetus
        maintains an endogenous temperature <b>+0.5°C higher</b> than the mother. Because the fetus can only dissipate heat
        across the umbilical-placental circulation into the maternal core, high ambient and <b>Stull Wet-Bulb (&ge;27°C)</b>
        temperatures rapidly overwhelm maternal thermoregulation:
      </p>

      <div class="cascade-grid">
        <div class="cascade-step">
          <div class="step-num">1</div>
          <h4>Thermal & Wet-Bulb Load</h4>
          <p>Ambient temp &ge;38°C or Wet-Bulb &ge;27°C blocks evaporative sweat cooling, elevating maternal core temperature.</p>
        </div>
        <div class="cascade-step">
          <div class="step-num">2</div>
          <h4>Cutaneous Shunting</h4>
          <p>Maternal blood shunts to peripheral skin vessels for cooling, reducing central blood volume and renal perfusion.</p>
        </div>
        <div class="cascade-step">
          <div class="step-num">3</div>
          <h4>Placental Hypoperfusion</h4>
          <p>Uterine artery blood flow drops by up to 20–30%, causing acute fetal hypoxia, oligohydramnios, and IUGR.</p>
        </div>
        <div class="cascade-step">
          <div class="step-num">4</div>
          <h4>Neuroendocrine Trigger</h4>
          <p>Dehydration triggers posterior pituitary ADH & <b>oxytocin co-release</b> alongside placental prostaglandin E2/F2α.</p>
        </div>
        <div class="cascade-step" style="border-color:var(--coral); background:#FFF5F5">
          <div class="step-num" style="background:#E11D48">5</div>
          <h4 style="color:#9F1239">Preterm Labour Onset</h4>
          <p>Premature uterine contractions, premature rupture of membranes (PROM), or acute placental abruption.</p>
        </div>
      </div>

      <table class="trimester-table">
        <thead>
          <tr>
            <th>Gestational Stage</th>
            <th>Primary Thermal Pathophysiology</th>
            <th>Clinical Risk Window</th>
            <th>Dayli AI Automated Intervention</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>1st Trimester</b> (Weeks 1–12)</td>
            <td>Hyperthermia-induced neural tube & cardiac organogenesis sensitivity; morning hyperemesis dehydration</td>
            <td><span class="pill pill-amber">Core Temp &gt;38.5°C</span></td>
            <td>Small-volume isotonic electrolyte pacing; morning/evening cooling schedules</td>
          </tr>
          <tr>
            <td><b>2nd Trimester</b> (Weeks 13–26)</td>
            <td>Rapid plasma volume expansion (+45%); orthostatic heat syncope; early gestational hypertension</td>
            <td><span class="pill pill-amber">Wet-Bulb &ge;26.5°C</span></td>
            <td>2.5L–3.0L structured hydration (tender coconut water / buttermilk); midday UHI avoidance</td>
          </tr>
          <tr>
            <td><b>3rd Trimester</b> (Weeks 27–40)</td>
            <td>Peak metabolic load; dehydration-induced oxytocin release; preterm uterine contractions & stillbirth risk</td>
            <td><span class="pill pill-rose">Critical (11 AM – 4 PM)</span></td>
            <td>Proactive 07:00 AM Aurora heat alert + <b>instant routing to Nearest Ready Labour Room</b></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- SLIDE 3: AURORA + WHATSAPP + LABOUR ROOM ROUTING -->
    <div class="grid-2">
      <section class="section-card" style="margin-bottom:0">
        <div class="section-tag">2. Atmospheric Intelligence</div>
        <h2>Microsoft Aurora 0.25° + Ready Labour Room Dispatch</h2>
        <p style="color:var(--text-secondary); font-size:14px">
          Standard weather apps report airport dry-bulb temperatures that miss high-density Urban Heat Islands (UHI) by up to <b>+2.5°C</b>.
          <b>dayli.ai</b> ingests <b>Microsoft Aurora 0.25° foundation model</b> forecasts initialized with ECMWF IFS HRES:
        </p>
        <ul style="font-size:13.5px; color:var(--text-secondary); padding-left:20px">
          <li><b>24h Diurnal Wet-Bulb Curve:</b> Identifies the exact midday window (11:00–16:00 IST) when evaporative cooling fails for pregnant women.</li>
          <li><b>Vernacular WhatsApp Copilot:</b> Delivers actionable guidance in Telugu, Hindi, and English via text and Bhashini voice notes—requiring zero app downloads.</li>
          <li><b>Nearest Ready Labour Room Mapping:</b> Continuously computes Haversine distance from each mother's ward to the nearest CEmONC hospital with <b>available Ready Labour Suites, HVAC cooling backup, and Level-III NICU beds</b>.</li>
        </ul>
      </section>

      <section class="section-card" style="margin-bottom:0">
        <div class="section-tag">3. European Governance & Scalability</div>
        <h2>GDPR, EU AI Act & Zero-PHI Architecture for German Partners</h2>
        <p style="color:var(--text-secondary); font-size:14px">
          Engineered from day one to meet strict European (<b>GDPR / EU AI Act</b>) and Indian (<b>DPDP Act</b>) health-data sovereignty standards:
        </p>
        <ul style="font-size:13.5px; color:var(--text-secondary); padding-left:20px">
          <li><b>Cryptographic Unique IDs (<span style="font-family:var(--font-mono); color:var(--primary)">DYL-MAT-XXXX</span>):</b> Names and phone numbers are never rendered on clinical dashboards; HMAC-SHA256 pseudonymization preserves longitudinal continuity without exposing identity.</li>
          <li><b>Deterministic Clinical Safety Core:</b> Hard-coded WHO/UNICEF safety guardrails (e.g., 100% enforcement of zero plain water for infants &lt;6 months) prevent LLM hallucinations.</li>
          <li><b>Turnkey Deployment for German Institutions:</b> Ready for co-deployment with German development agencies (GIZ), academic medical centers (Charité / PIK), and maternal pharma/insurance partners.</li>
        </ul>
      </section>
    </div>
  </div>
</body>
</html>`;
