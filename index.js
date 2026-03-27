/* ── ADMIN LOGIN (from index page) ───────────────────────── */
const ADMIN_PASSWORD = 'adminjahim'; // Must match admin.js

// GitHub Gist Configuration - REPLACE WITH YOUR ACTUAL VALUES
const GIST_ID = 'bcdc1b9c3be807e8d5afff6c9243c692';
const GITHUB_USERNAME = 'Kris69445578';
const GIST_RAW_URL = `https://gist.githubusercontent.com/${GITHUB_USERNAME}/${GIST_ID}/raw/tournament-data.json`;

// Load from GitHub Gist (read-only, no token needed for public gists)
async function loadFromCloud() {
  try {
    const response = await fetch(GIST_RAW_URL);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error loading from Gist:', error);
    return null;
  }
}

function openAdminPanel() {
  const panel = document.getElementById('adminPanel');
  if (panel) panel.classList.add('open');
  setTimeout(() => {
    const pwdInput = document.getElementById('loginPassword');
    if (pwdInput) pwdInput.focus();
  }, 50);
}

function closeAdminPanel() {
  const panel = document.getElementById('adminPanel');
  if (panel) panel.classList.remove('open');
  const errorEl = document.getElementById('loginError');
  if (errorEl) errorEl.classList.remove('show');
  const pwdInput = document.getElementById('loginPassword');
  if (pwdInput) pwdInput.value = '';
}

function doLogin() {
  const pw = document.getElementById('loginPassword').value;
  if (pw === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin_auth', '1');
    window.location.href = 'admin.htm';
  } else {
    const errorEl = document.getElementById('loginError');
    if (errorEl) errorEl.classList.add('show');
    const pwdInput = document.getElementById('loginPassword');
    if (pwdInput) {
      pwdInput.value = '';
      pwdInput.focus();
    }
  }
}

// Add event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  const pwdInput = document.getElementById('loginPassword');
  if (pwdInput) {
    pwdInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doLogin();
      if (e.key === 'Escape') closeAdminPanel();
    });
  }
  
  const adminPanel = document.getElementById('adminPanel');
  if (adminPanel) {
    adminPanel.addEventListener('click', function(e) {
      if (e.target === this) closeAdminPanel();
    });
  }
});

/* ── TABS ─────────────────────────────────────────────────── */
function switchTab(btn, panelId) {
  // Remove active class from all tabs
  const allTabs = document.querySelectorAll('.tab');
  allTabs.forEach(tab => tab.classList.remove('active'));
  
  // Remove active class from all panels
  const allPanels = document.querySelectorAll('.tab-panel');
  allPanels.forEach(panel => panel.classList.remove('active'));
  
  // Add active class to clicked tab
  btn.classList.add('active');
  
  // Add active class to target panel
  const targetPanel = document.getElementById(panelId);
  if (targetPanel) targetPanel.classList.add('active');
}

/* ── HELPERS ─────────────────────────────────────────────── */
function fi(r) { return r === 'W' ? '✅' : r === 'L' ? '❌' : '➖'; }
function show(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

/* ── LOAD DATA ───────────────────────────────────────────── */
async function loadData() {
  let data;
  
  // Try to load from Gist first
  try {
    const cloudData = await loadFromCloud();
    if (cloudData && cloudData.standings && cloudData.standings.length) {
      data = cloudData;
    }
  } catch (e) {
    console.log('Could not load from Gist, checking localStorage');
  }
  
  // Fallback to localStorage if Gist fails
  if (!data) {
    try {
      const raw = localStorage.getItem('efootball_tournament');
      if (raw) data = JSON.parse(raw);
    } catch (e) { return; }
  }
  
  if (!data) return;

  show('liveTag');

  if (data.updated) {
    const d = new Date(data.updated);
    const updatedEl = document.getElementById('lastUpdated');
    if (updatedEl) updatedEl.textContent = 'Last updated: ' + d.toLocaleString();
  }

  if (data.standings && data.standings.length) {
    const heroStats = document.getElementById('heroStats');
    if (heroStats) heroStats.style.display = 'flex';
    
    const statPlayers = document.getElementById('statPlayers');
    if (statPlayers) statPlayers.textContent = data.standings.length;
    
    const statMatches = document.getElementById('statMatches');
    if (statMatches) statMatches.textContent = data.played || 0;
    
    const statLeader = document.getElementById('statLeader');
    if (statLeader) statLeader.textContent = data.standings[0]?.name || '—';
    
    renderStandings(data.standings);
    renderPodium(data.standings);
    renderTicker(data.standings);
    
    const totalMatchTag = document.getElementById('totalMatchTag');
    if (totalMatchTag) {
      totalMatchTag.classList.remove('hidden');
      totalMatchTag.textContent = data.standings.length + ' players';
    }
  }

  if (data.fixtures && data.fixtures.length) {
    renderFixtures(data.fixtures);
    renderResults(data.fixtures);
  }
}

/* ── STANDINGS ────────────────────────────────────────────── */
function renderStandings(standings) {
  let html = `<div class="tbl-wrap"><table class="stable">
    <thead>
      <tr>
        <th style="width:36px">Pos</th>
        <th class="tl">Player</th>
        <th>P</th>
        <th>W</th>
        <th>D</th>
        <th>L</th>
        <th>GF</th>
        <th>GA</th>
        <th>GD</th>
        <th>Pts</th>
        <th>Form</th>
      </tr>
    </thead>
    <tbody>`;
  
  standings.forEach((s, i) => {
    const pos = i + 1;
    const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
    const rc = pos === 1 ? 'r1' : pos === 2 ? 'r2' : pos === 3 ? 'r3' : '';
    const gd = s.GD > 0 ? `<span class="gdp">+${s.GD}</span>` : s.GD < 0 ? `<span class="gdn">${s.GD}</span>` : '0';
    const form = (s.form || []).slice(-5).map(fi).join('');
    html += `<tr class="${rc}">
      <td>${medal}</td>
      <td class="tl pname">${escapeHtml(s.name)}</td>
      <td>${s.P}</td>
      <td>${s.W}</td>
      <td>${s.D}</td>
      <td>${s.L}</td>
      <td>${s.GF}</td>
      <td>${s.GA}</td>
      <td>${gd}</td>
      <td class="pts">${s.Pts}</td>
      <td class="form-c">${form}</td>
    </tr>`;
  });
  
  html += '</tbody></table></div>';
  const standingsContainer = document.getElementById('standingsContainer');
  if (standingsContainer) standingsContainer.innerHTML = html;
}

/* ── PODIUM ──────────────────────────────────────────────── */
function renderPodium(standings) {
  if (standings.length < 1) return;
  const medals = ['🥇', '🥈', '🥉'];
  const order = [standings[1] || null, standings[0], standings[2] || null];
  const ranks = ['rank-2', 'rank-1', 'rank-3'];
  let html = '';
  order.forEach((s, i) => {
    if (!s) return;
    html += `<div class="podium-card ${ranks[i]}">
      <span class="pod-medal">${medals[i === 1 ? 0 : i === 0 ? 1 : 2]}</span>
      <div class="pod-name">${escapeHtml(s.name)}</div>
      <div class="pod-pts">${s.Pts}</div>
      <div class="pod-sub">${s.W}W ${s.D}D ${s.L}L</div>
    </div>`;
  });
  const podiumContainer = document.getElementById('podiumContainer');
  if (podiumContainer) podiumContainer.innerHTML = html;
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
  const tickerInner = document.getElementById('tickerInner');
  if (tickerInner) {
    tickerInner.innerHTML = html + html;
    show('tickerWrap');
  }
}

/* ── BUILD MATCHUP MAP ───────────────────────────────────── */
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

/* ── FIXTURES ────────────────────────────────────────────── */
function renderFixtures(fixtures) {
  const map = buildMatchups(fixtures);
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
  if (html) {
    const fixturesContainer = document.getElementById('fixturesContainer');
    if (fixturesContainer) fixturesContainer.innerHTML = html;
  }
}

/* ── RESULTS ─────────────────────────────────────────────── */
function renderResults(fixtures) {
  const map = buildMatchups(fixtures);
  const rounds = {};
  Object.values(map).forEach(mu => {
    const hasScore = mu.legs.some(l => l.homeScore !== '' && l.homeScore !== undefined && l.awayScore !== '' && l.awayScore !== undefined);
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
        const hs = l.homeScore, as = l.awayScore;
        if (hs === '' || hs === undefined || as === '' || as === undefined) return;
        const h = parseInt(hs), a = parseInt(as);
        legsPlayed++;
        if (l.home === mu.p1) { p1Total += h; p2Total += a; }
        else                  { p1Total += a; p2Total += h; }
        legDetails.push({ leg: l.leg, home: l.home, away: l.away, h, a });
      });

      const bothLegs = legsPlayed === 2;
      const resultCls = p1Total > p2Total ? 'played' : p2Total > p1Total ? 'played away-win' : 'played draw';
      const cardCls = bothLegs ? resultCls : 'played';
      const breakdown = legDetails.map(d => `Leg ${d.leg}: ${d.home} ${d.h}–${d.a} ${d.away}`).join(' · ');

      html += `<div class="fx-card ${cardCls}" title="${breakdown}">`;

      if (bothLegs) {
        html += `<span class="fx-ltag agg">Aggregate</span>
          <div class="fx-match">
            <span class="fx-p r" style="${p1Total > p2Total ? 'color:var(--green)' : p2Total > p1Total ? 'color:var(--red)' : ''}">${escapeHtml(mu.p1)}</span>
            <span class="fx-score">${p1Total} – ${p2Total}</span>
            <span class="fx-p" style="${p2Total > p1Total ? 'color:var(--green)' : p1Total > p2Total ? 'color:var(--red)' : ''}">${escapeHtml(mu.p2)}</span>
          </div>
          <div class="fx-legs">${legDetails.map(d => `<span>Leg ${d.leg}: ${d.home === mu.p1 ? d.h+'-'+d.a : d.a+'-'+d.h}</span>`).join('')}</div>`;
      } else {
        const d = legDetails[0];
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

  const resultsContainer = document.getElementById('resultsContainer');
  if (resultsContainer) resultsContainer.innerHTML = html;
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ── INIT & POLL ─────────────────────────────────────────── */
// Load data when page loads
document.addEventListener('DOMContentLoaded', function() {
  loadData();
  // Set up polling every 15 seconds
  setInterval(loadData, 15000);
});
