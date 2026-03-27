/* ── CONFIG ─────────────────────────────────────────────────
   Must match admin.js
──────────────────────────────────────────────────────────── */
const ADMIN_PASSWORD = 'adminjahim';
const JSONBIN_ID     = 'PASTE_YOUR_BIN_ID_HERE';
const JSONBIN_KEY    = 'PASTE_YOUR_SECRET_KEY_HERE';
const JSONBIN_URL    = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;

/* ── CLOUD LOAD ──────────────────────────────────────────── */
async function loadFromCloud() {
  if (!JSONBIN_KEY || JSONBIN_KEY === 'PASTE_YOUR_SECRET_KEY_HERE') return null;
  try {
    const res = await fetch(JSONBIN_URL + '/latest', {
      headers: { 'X-Master-Key': JSONBIN_KEY }
    });
    if (res.ok) {
      const json = await res.json();
      return json.record || null;
    }
    return null;
  } catch (err) {
    console.error('Cloud load error:', err);
    return null;
  }
}

/* ── ADMIN MODAL ─────────────────────────────────────────── */
function openAdminPanel() {
  const panel = document.getElementById('adminPanel');
  if (panel) panel.classList.add('open');
  setTimeout(() => {
    const pw = document.getElementById('loginPassword');
    if (pw) pw.focus();
  }, 50);
}

function closeAdminPanel() {
  const panel = document.getElementById('adminPanel');
  if (panel) panel.classList.remove('open');
  const err = document.getElementById('loginError');
  if (err) err.classList.remove('show');
  const pw = document.getElementById('loginPassword');
  if (pw) pw.value = '';
}

function doLogin() {
  const pw  = document.getElementById('loginPassword');
  const err = document.getElementById('loginError');
  if (!pw || !err) return;

  if (pw.value === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin_auth', '1');
    window.location.href = 'admin.htm';
  } else {
    err.classList.add('show');
    pw.value = '';
    pw.focus();
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const pw = document.getElementById('loginPassword');
  if (pw) {
    pw.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')  doLogin();
      if (e.key === 'Escape') closeAdminPanel();
    });
  }

  const panel = document.getElementById('adminPanel');
  if (panel) {
    panel.addEventListener('click', function (e) {
      if (e.target === this) closeAdminPanel();
    });
  }

  loadData();
  setInterval(loadData, 15000);
});

/* ── TABS ────────────────────────────────────────────────── */
function switchTab(btn, panelId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const target = document.getElementById(panelId);
  if (target) target.classList.add('active');
}

/* ── HELPERS ─────────────────────────────────────────────── */
function fi(r) { return r === 'W' ? '✅' : r === 'L' ? '❌' : '➖'; }

function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ── LOAD DATA ───────────────────────────────────────────── */
async function loadData() {
  let data = null;

  // 1. Try GitHub Gist (shared / always up-to-date)
  try {
    const cloud = await loadFromCloud();
    if (cloud && cloud.standings && cloud.standings.length) data = cloud;
  } catch (e) { /* fall through */ }

  // 2. Fallback: localStorage (same device as admin)
  if (!data) {
    try {
      const raw = localStorage.getItem('efootball_tournament');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.standings && parsed.standings.length) data = parsed;
      }
    } catch (e) { /* ignore */ }
  }

  if (!data) return;

  // Live dot
  show('liveTag');

  // Last updated
  if (data.updated) {
    const updatedEl = document.getElementById('lastUpdated');
    if (updatedEl) {
      updatedEl.textContent = 'Last updated: ' + new Date(data.updated).toLocaleString();
    }
  }

  // Hero stats
  if (data.standings && data.standings.length) {
    const heroStats = document.getElementById('heroStats');
    if (heroStats) heroStats.style.display = 'flex';

    setText('statPlayers', data.standings.length);
    setText('statMatches', data.played || 0);
    setText('statLeader',  data.standings[0]?.name || '—');

    renderStandings(data.standings);
    renderPodium(data.standings);
    renderTicker(data.standings);

    const tag = document.getElementById('totalMatchTag');
    if (tag) {
      tag.classList.remove('hidden');
      tag.textContent = data.standings.length + ' players';
    }
  }

  if (data.fixtures && data.fixtures.length) {
    renderFixtures(data.fixtures);
    renderResults(data.fixtures);
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── STANDINGS ───────────────────────────────────────────── */
function renderStandings(standings) {
  let html = `<div class="tbl-wrap"><table class="stable">
    <thead>
      <tr>
        <th style="width:36px">Pos</th>
        <th class="tl">Player</th>
        <th>P</th><th>W</th><th>D</th><th>L</th>
        <th>GF</th><th>GA</th><th>GD</th>
        <th>Pts</th><th>Form</th>
      </tr>
    </thead><tbody>`;

  standings.forEach((s, i) => {
    const pos   = i + 1;
    const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
    const rc    = pos === 1 ? 'r1' : pos === 2 ? 'r2' : pos === 3 ? 'r3' : '';
    const gd    = s.GD > 0 ? `<span class="gdp">+${s.GD}</span>`
                : s.GD < 0 ? `<span class="gdn">${s.GD}</span>` : '0';
    const form  = (s.form || []).slice(-5).map(fi).join('');
    html += `<tr class="${rc}">
      <td>${medal}</td>
      <td class="tl pname">${escapeHtml(s.name)}</td>
      <td>${s.P}</td><td>${s.W}</td><td>${s.D}</td><td>${s.L}</td>
      <td>${s.GF}</td><td>${s.GA}</td><td>${gd}</td>
      <td class="pts">${s.Pts}</td>
      <td class="form-c">${form}</td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  const el = document.getElementById('standingsContainer');
  if (el) el.innerHTML = html;
}

/* ── PODIUM ──────────────────────────────────────────────── */
function renderPodium(standings) {
  if (!standings.length) return;
  const medals = ['🥇', '🥈', '🥉'];
  // Display order: 2nd | 1st | 3rd
  const order = [standings[1] || null, standings[0], standings[2] || null];
  const ranks = ['rank-2', 'rank-1', 'rank-3'];
  const mIdx  = [1, 0, 2]; // which medal each slot uses

  let html = '';
  order.forEach((s, i) => {
    if (!s) return;
    html += `<div class="podium-card ${ranks[i]}">
      <span class="pod-medal">${medals[mIdx[i]]}</span>
      <div class="pod-name">${escapeHtml(s.name)}</div>
      <div class="pod-pts">${s.Pts}</div>
      <div class="pod-sub">${s.W}W ${s.D}D ${s.L}L</div>
    </div>`;
  });

  const el = document.getElementById('podiumContainer');
  if (el) el.innerHTML = html;
  show('podiumSection');
}

/* ── TICKER ──────────────────────────────────────────────── */
function renderTicker(standings) {
  let html = '';
  standings.forEach(s => {
    html += `<span class="tick-item">
      <span class="hi">${escapeHtml(s.name)}</span>
      <span class="sep">·</span>${s.Pts} pts
      <span class="sep">·</span>${s.W}W ${s.D}D ${s.L}L
      <span class="sep">///</span>
    </span>`;
  });
  const el = document.getElementById('tickerInner');
  if (el) {
    el.innerHTML = html + html; // duplicate for seamless loop
    show('tickerWrap');
  }
}

/* ── MATCHUP MAP ─────────────────────────────────────────── */
function buildMatchups(fixtures) {
  const map = {};
  fixtures.forEach(ro => {
    ro.matches.forEach(m => {
      const [p1, p2] = [m.home, m.away].sort();
      const key = `${ro.round}__${p1}__${p2}`;
      if (!map[key]) map[key] = { p1, p2, round: ro.round, legs: [] };
      map[key].legs.push({
        leg: m.leg,
        home: m.home, away: m.away,
        homeScore: m.homeScore, awayScore: m.awayScore
      });
    });
  });
  return map;
}

/* ── FIXTURES TAB ────────────────────────────────────────── */
function renderFixtures(fixtures) {
  const map    = buildMatchups(fixtures);
  const rounds = {};
  Object.values(map).forEach(mu => {
    if (!rounds[mu.round]) rounds[mu.round] = [];
    rounds[mu.round].push(mu);
  });

  let html = '';
  Object.keys(rounds).sort((a, b) => a - b).forEach(round => {
    html += `<div class="rl">Round ${round}</div><div class="fx-grid">`;
    rounds[round].forEach(mu => {
      html += `<div class="fx-card">
        <div class="fx-match">
          <span class="fx-p r">${escapeHtml(mu.p1)}</span>
          <span class="fx-vs">vs</span>
          <span class="fx-p">${escapeHtml(mu.p2)}</span>
        </div>
      </div>`;
    });
    html += `</div>`;
  });

  const el = document.getElementById('fixturesContainer');
  if (el && html) el.innerHTML = html;
}

/* ── RESULTS TAB ─────────────────────────────────────────── */
function renderResults(fixtures) {
  const map    = buildMatchups(fixtures);
  const rounds = {};

  Object.values(map).forEach(mu => {
    const hasScore = mu.legs.some(l =>
      l.homeScore !== '' && l.homeScore !== undefined &&
      l.awayScore !== '' && l.awayScore !== undefined
    );
    if (!hasScore) return;
    if (!rounds[mu.round]) rounds[mu.round] = [];
    rounds[mu.round].push(mu);
  });

  if (!Object.keys(rounds).length) return;

  let html = '';
  Object.keys(rounds).sort((a, b) => a - b).forEach(round => {
    html += `<div class="rl">Round ${round}</div><div class="fx-grid">`;
    rounds[round].forEach(mu => {
      let p1Total = 0, p2Total = 0, legsPlayed = 0;
      const legDetails = [];

      mu.legs.forEach(l => {
        const hs = l.homeScore, as_ = l.awayScore;
        if (hs === '' || hs === undefined || as_ === '' || as_ === undefined) return;
        const h = parseInt(hs), a = parseInt(as_);
        legsPlayed++;
        if (l.home === mu.p1) { p1Total += h; p2Total += a; }
        else                  { p1Total += a; p2Total += h; }
        legDetails.push({ leg: l.leg, home: l.home, away: l.away, h, a });
      });

      const bothLegs  = legsPlayed === 2;
      const resultCls = p1Total > p2Total ? 'played'
                      : p2Total > p1Total ? 'played away-win' : 'played draw';
      const cardCls   = bothLegs ? resultCls : 'played';
      const breakdown = legDetails.map(d => `Leg ${d.leg}: ${d.home} ${d.h}–${d.a} ${d.away}`).join(' · ');

      html += `<div class="fx-card ${cardCls}" title="${escapeHtml(breakdown)}">`;

      if (bothLegs) {
        html += `<span class="fx-ltag agg">Aggregate</span>
          <div class="fx-match">
            <span class="fx-p r" style="${p1Total > p2Total ? 'color:var(--green)' : p2Total > p1Total ? 'color:var(--red)' : ''}">${escapeHtml(mu.p1)}</span>
            <span class="fx-score">${p1Total} – ${p2Total}</span>
            <span class="fx-p" style="${p2Total > p1Total ? 'color:var(--green)' : p1Total > p2Total ? 'color:var(--red)' : ''}">${escapeHtml(mu.p2)}</span>
          </div>
          <div class="fx-legs">${legDetails.map(d =>
            `<span>Leg ${d.leg}: ${escapeHtml(d.home === mu.p1 ? d.h+'-'+d.a : d.a+'-'+d.h)}</span>`
          ).join('')}</div>`;
      } else {
        const d   = legDetails[0];
        const p1g = d.home === mu.p1 ? d.h : d.a;
        const p2g = d.home === mu.p1 ? d.a : d.h;
        html += `<span class="fx-ltag ${d.leg === 1 ? 'home' : 'away'}">Leg ${d.leg}</span>
          <div class="fx-match">
            <span class="fx-p r" style="${p1g > p2g ? 'color:var(--green)' : p2g > p1g ? 'color:var(--red)' : ''}">${escapeHtml(mu.p1)}</span>
            <span class="fx-score">${p1g} – ${p2g}</span>
            <span class="fx-p" style="${p2g > p1g ? 'color:var(--green)' : p1g > p2g ? 'color:var(--red)' : ''}">${escapeHtml(mu.p2)}</span>
          </div>`;
      }

      html += `</div>`;
    });
    html += `</div>`;
  });

  const el = document.getElementById('resultsContainer');
  if (el) el.innerHTML = html;
}
