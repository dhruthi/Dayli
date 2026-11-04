/**
 * The /ops dashboard page.
 *
 * Served as one self-contained HTML string with no external assets: the bot
 * runs on a single small instance and the dashboard must keep working when a
 * CDN does not. It fetches /ops/metrics on an interval; Basic Auth credentials
 * ride along automatically once the browser has them.
 */

export const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>dayli ops</title>
<style>
  :root {
    --bg: #0b0f14; --panel: #131a23; --line: #1f2a37; --text: #e6edf3;
    --muted: #8b98a9; --accent: #4ade80; --warn: #fbbf24; --bad: #f87171;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font: 14px/1.5 ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  header {
    display: flex; flex-wrap: wrap; align-items: baseline; gap: 16px;
    padding: 16px 20px; border-bottom: 1px solid var(--line); background: var(--panel);
  }
  h1 { font-size: 15px; margin: 0; letter-spacing: .3px; }
  .muted { color: var(--muted); }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  main { padding: 20px; display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
  section { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; }
  section h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .8px; color: var(--muted); margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 5px 0; vertical-align: baseline; }
  td:last-child { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .big { display: flex; gap: 22px; flex-wrap: wrap; margin-bottom: 12px; }
  .big div { min-width: 74px; }
  .big b { display: block; font-size: 22px; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .big span { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; }
  .ok { color: var(--accent); } .warn { color: var(--warn); } .bad { color: var(--bad); }
  .empty { color: var(--muted); font-style: italic; }
  .trend { overflow-x: auto; }
  .trend table { min-width: 560px; }
  .trend th { text-align: right; font-weight: 500; color: var(--muted); font-size: 11px; padding: 4px 8px; }
  .trend th:first-child, .trend td:first-child { text-align: left; }
  .trend td { padding: 4px 8px; border-top: 1px solid var(--line); }
  footer { padding: 0 20px 28px; color: var(--muted); font-size: 12px; }
</style>
</head>
<body>
<header>
  <h1>dayli ops</h1>
  <span class="muted mono" id="status">loading…</span>
  <span class="muted mono" id="stamp" style="margin-left:auto"></span>
</header>
<main id="grid"></main>
<footer>Aggregate counts only — no phone numbers, no message content. Auto-refreshes every 15s.</footer>

<script>
const $ = (id) => document.getElementById(id);
const n = (v) => (v == null ? '—' : typeof v === 'number' ? v.toLocaleString() : v);

function rows(obj, emptyLabel) {
  const entries = Object.entries(obj || {}).filter(([, v]) => v);
  if (!entries.length) return '<p class="empty">' + emptyLabel + '</p>';
  entries.sort((a, b) => b[1] - a[1]);
  return '<table>' + entries.map(([k, v]) =>
    '<tr><td>' + k + '</td><td>' + n(v) + '</td></tr>').join('') + '</table>';
}

function pick(counters, prefix) {
  const out = {};
  for (const [k, v] of Object.entries(counters || {})) {
    if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
  }
  return out;
}

function uptime(s) {
  if (s == null) return '—';
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? d + 'd ' + h + 'h' : h ? h + 'h ' + m + 'm' : m + 'm';
}

function render(d) {
  const c = d.process.counters || {};
  const lat = d.process.latency || {};
  const act = d.users || {};
  const sent = c['outbound.sent'] || 0, failed = c['outbound.failed'] || 0;
  const aiCalls = c['ai.call'] || 0, aiFail = c['ai.fail'] || 0;
  const failRate = sent + failed ? ((failed / (sent + failed)) * 100).toFixed(1) : '0.0';
  const aiFailRate = aiCalls ? ((aiFail / aiCalls) * 100).toFixed(1) : '0.0';
  const latCls = lat.p95 == null ? '' : lat.p95 > 15000 ? 'bad' : lat.p95 > 8000 ? 'warn' : 'ok';

  $('status').textContent = d.service.store + ' · ' + d.service.safetyRules +
    ' · up ' + uptime(d.process.uptimeSeconds);
  $('stamp').textContent = new Date().toLocaleTimeString();

  const trend = (d.rollups || []).slice().reverse();
  const trendKeys = ['inbound.message', 'outbound.sent', 'outbound.failed', 'ai.fail', 'safety.risk.emergency'];

  $('grid').innerHTML = [
    section('Throughput', \`
      <div class="big">
        <div><b>\${n(c['inbound.message'])}</b><span>inbound</span></div>
        <div><b>\${n(sent)}</b><span>sent</span></div>
        <div><b class="\${failed ? 'bad' : 'ok'}">\${failRate}%</b><span>send fail</span></div>
        <div><b>\${n(c['inbound.dedup_suppressed'])}</b><span>deduped</span></div>
      </div>\` + rows(pick(c, 'status.'), 'No delivery receipts yet.')),

    section('Reply latency', \`
      <div class="big">
        <div><b>\${n(lat.p50)}<span style="font-size:11px"> ms</span></b><span>p50</span></div>
        <div><b class="\${latCls}">\${n(lat.p95)}<span style="font-size:11px"> ms</span></b><span>p95</span></div>
        <div><b>\${n(lat.p99)}<span style="font-size:11px"> ms</span></b><span>p99</span></div>
        <div><b>\${n(lat.samples)}</b><span>samples</span></div>
      </div>
      <p class="muted" style="margin:0;font-size:12px">Webhook received → reply dispatched.</p>\`),

    section('AI pipeline', \`
      <div class="big">
        <div><b>\${n(aiCalls)}</b><span>calls</span></div>
        <div><b class="\${aiFail ? 'warn' : 'ok'}">\${aiFailRate}%</b><span>failed</span></div>
        <div><b>\${n(c['ai.fallback_gemini'])}</b><span>gemini</span></div>
      </div>\` + rows(pick(c, 'ai.'), 'No AI calls yet.')),

    section('Facility lookup', rows(pick(c, 'facility.'),
      'No hospital or pharmacy lookups yet.') +
      '<p class="muted" style="margin:10px 0 0;font-size:12px">' +
      '<code>unavailable</code> means the directory did not answer — not that nothing is nearby.</p>'),

    section('Clinical safety', rows(pick(c, 'safety.'), 'No safety events recorded yet.') +
      '<p class="muted" style="margin:10px 0 0;font-size:12px">' +
      'Violations are the model being overruled by the validator. Any sustained count deserves a look.</p>'),

    section('Users', \`
      <div class="big">
        <div><b>\${n(act.consentedUsers)}</b><span>consented</span></div>
        <div><b>\${n(act.activeLast24h)}</b><span>24h</span></div>
        <div><b>\${n(act.activeLast7d)}</b><span>7d</span></div>
        <div><b>\${n(act.windowOpen)}</b><span>window open</span></div>
      </div>
      <table>
        <tr><td>Onboarded (subject known)</td><td>\${n(act.onboarded)}</td></tr>
        <tr><td>Shared a location</td><td>\${n(act.withLocation)}</td></tr>
        <tr><td>Follow-ups queued</td><td>\${n(act.pendingFollowUps)}</td></tr>
      </table>
      <p class="muted" style="margin:10px 0 0;font-size:12px">
        Sessions are only retained after consent, so this counts consented users — not everyone who messaged.</p>
      \${act.truncated ? '<p class="muted" style="font-size:12px">Sampled the first ' + n(act.sampled) + ' sessions.</p>' : ''}\`),

    section('Consent funnel', rows(pick(c, 'consent.'), 'No consent decisions this process.') +
      '<p class="muted" style="margin:10px 0 0;font-size:12px">' +
      'Counted as events, because a decline deletes the session it came from.</p>'),

    section('Language', rows(act.locale, 'No sessions yet.')),
    section('Subject', rows(act.subjectType, 'No sessions yet.')),

    section('Aurora Climate Model (Hyderabad)', \`
      <div class="big">
        <div><b class="\${d.aurora?.loaded ? (d.aurora.fresh ? 'ok' : 'warn') : 'bad'}">\${d.aurora?.loaded ? (d.aurora.fresh ? 'LIVE' : 'STALE') : 'OFFLINE'}</b><span>feed status</span></div>
        <div><b>\${d.aurora?.ageHours != null ? d.aurora.ageHours + '<span style="font-size:11px">h</span>' : '—'}</b><span>model age</span></div>
        <div><b>\${d.aurora?.steps ?? '—'}</b><span>steps</span></div>
      </div>
      <table>
        <tr><td>Coverage</td><td>Hyderabad (0.25° grid)</td></tr>
        <tr><td>Init time</td><td class="mono">\${d.aurora?.initTime ? d.aurora.initTime.slice(0, 16).replace('T', ' ') : 'none'}</td></tr>
        <tr><td>Generated</td><td class="mono">\${d.aurora?.generatedAt ? d.aurora.generatedAt.slice(0, 16).replace('T', ' ') : 'none'}</td></tr>
      </table>
      <p class="muted" style="margin:10px 0 0;font-size:12px">
        Mesoscale corrections for Hyderabad weather queries. Stale (>30h) feeds gracefully fallback to Open-Meteo.
      </p>\`),

    '<section style="grid-column:1/-1"><h2>Last 7 days</h2><div class="trend">' +
      (trend.length
        ? '<table><tr><th>Date</th>' + trendKeys.map((k) => '<th>' + k + '</th>').join('') + '</tr>' +
          trend.map((day) => '<tr><td class="mono">' + day.date + '</td>' +
            trendKeys.map((k) => '<td>' + n(day.counters[k] || 0) + '</td>').join('') + '</tr>').join('') +
          '</table>'
        : '<p class="empty">No rollups stored yet — they appear once Redis has a full flush.</p>') +
      '</div></section>',
  ].join('');
}

function section(title, body) {
  return '<section><h2>' + title + '</h2>' + body + '</section>';
}

async function tick() {
  try {
    const res = await fetch('/ops/metrics', { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    render(await res.json());
  } catch (err) {
    $('status').textContent = 'metrics unavailable: ' + err.message;
    $('status').className = 'mono bad';
  }
}

tick();
setInterval(tick, 15000);
</script>
</body>
</html>`;
