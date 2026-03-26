/* ── ADMIN LOGIN (from index page) ───────────────────────── */
const ADMIN_PASSWORD = 'adminjahim'; // Must match admin.js

function openAdminPanel() {
  document.getElementById('adminPanel').classList.add('open');
  setTimeout(() => document.getElementById('loginPassword').focus(), 50);
}

function closeAdminPanel() {
  document.getElementById('adminPanel').classList.remove('open');
  document.getElementById('loginError').classList.remove('show');
  document.getElementById('loginPassword').value = '';
}

function doLogin() {
  const pw = document.getElementById('loginPassword').value;
  if (pw === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin_auth', '1');
    window.location.href = 'admin.htm';
  } else {
    document.getElementById('loginError').classList.add('show');
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginPassword').focus();
  }
}

document.getElementById('loginPassword').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') doLogin();
  if (e.key === 'Escape') closeAdminPanel();
});

document.getElementById('adminPanel').addEventListener('click', function(e) {
  if (e.target === this) closeAdminPanel();
});

/* ── TABS ─────────────────────────────────────────────────── */
function switchTab(btn, panelId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(panelId).classList.add('active');
}

/* ── HELPERS ─────────────────────────────────────────────── */
function fi(r) { return r === 'W' ? '✅' : r === 'L' ? '❌' : '➖'; }
function show(id) { document.getElementById(id).classList.remove('hidden'); }

/* ── LOAD DATA ───────────────────────────────────────────── */
function loadData() {
  let data;
  try {
    const raw = localStorage.getItem('efootball_tournament');
    if (!raw) return;
    data = JSON.parse(raw);
  } catch (e) { return; }

  show('liveTag');

  if (data.updated) {
    const d = new Date(data.updated);
    document.getElementById('lastUpdated').textContent = 'Last updated: ' + d.toLocaleString();
  }

  if (data.standings && data.standings.length) {
    document.getElementById('heroStats').style.display = 'flex';
    document.getElementById('statPlayers').textContent = data.standings.length;
    document.getElementById('statMatches').textContent = data.played || 0;
    document.getElementById('statLeader').textContent = data.standings[0]?.name || '—';
    renderStandings(data.standings);
    renderPodium(data.standings);
    renderTicker(data.standings);
    const tt = document.getElementById('totalMatchTag');
    tt.classList.remove('hidden');
    tt.textContent = data.standings.length + ' players';
  }

  if (data.fixtures && data.fixtures.length) {
    renderFixtures(data.fixtures);
    renderResults(data.fixtures);
  }
}

/* ── STANDINGS ────────────────────────────────────────────── */
function renderStandings(standings) {
  let html = `<div class="tbl-wrap"><table class="stable">
    <thead><tr>
      <th style="width:36px">Pos</th><th class="tl">Player</th>
      <th>P</th><th>W</th><th>D</th><th>L</th>
      <th>GF</th><th>GA</th><th>GD</th><th>Pts</th><th>Form</th>
    </tr></thead><tbody>`;
  standings.forEach((s, i) => {
    const pos = i + 1;
    const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
    const rc = pos === 1 ? 'r1' : pos === 2 ? 'r2' : pos === 3 ? 'r3' : '';
    const gd = s.GD > 0 ? `<span class="gdp">+${s.GD}</span>` : s.GD < 0 ? `<span class="gdn">${s.GD}</span>` : '0';
    const form = (s.form || []).slice(-5).map(fi).join('');
    html += `<tr class="${rc}">
      <td>${medal}</td>
      <td class="tl pname">${s.name}</td>
      <td>${s.P}</td><td>${s.W}</td><td>${s.D}</td><td>${s.L}</td>
      <td>${s.GF}</td><td>${s.GA}</td><td>${gd}</td>
      <td class="pts">${s.Pts}</td>
      <td class="form-c">${form}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  document.getElementById('standingsContainer').innerHTML = html;
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
      <div class="pod-name">${s.name}</div>
      <div class="pod-pts">${s.Pts}</div>
      <div class="pod-sub">${s.W}W ${s.D}D ${s.L}L</div>
    </div>`;
  });
  document.getElementById('podiumContainer').innerHTML = html;
  show('podiumSection');
}

/* ── TICKER ──────────────────────────────────────────────── */
function renderTicker(standings) {
  let html = '';
  standings.forEach(s => {
    html += `<span class="tick-item">
      <span class="hi">${s.name}</span>
      <span class="sep">·</span>${s.Pts} pts
      <span class="sep">·</span>${s.W}W ${s.D}D ${s.L}L
      <span class="sep">///</span>
    </span>`;
  });
  const ti = document.getElementById('tickerInner');
  ti.innerHTML = html + html;
  show('tickerWrap');
}

/* ── FIXTURES ────────────────────────────────────────────── */
function renderFixtures(fixtures) {
  let html = '', lastLeg = null;
  fixtures.forEach(ro => {
    if (ro.leg !== lastLeg) {
      lastLeg = ro.leg;
      const cls = ro.leg === 1 ? 'lb1' : 'lb2';
      const icon = ro.leg === 1 ? '🏠' : '✈️';
      const title = ro.leg === 1 ? 'Leg 1 — First Leg (Home)' : 'Leg 2 — Second Leg (Away)';
      html += `<div class="leg-banner ${cls}">${icon} <strong>${title}</strong></div>`;
    }
    html += `<div class="rl">Round ${ro.round}</div><div class="fx-grid">`;
    ro.matches.forEach(m => {
      const tc = m.leg === 1 ? 'home' : 'away';
      const tt = m.leg === 1 ? 'Home leg' : 'Away leg';
      html += `<div class="fx-card">
        <span class="fx-ltag ${tc}">${tt}</span>
        <div class="fx-match">
          <span class="fx-p r">${m.home}</span>
          <span class="fx-vs">vs</span>
          <span class="fx-p">${m.away}</span>
        </div>
      </div>`;
    });
    html += `</div>`;
  });
  if (html) document.getElementById('fixturesContainer').innerHTML = html;
}

/* ── RESULTS ─────────────────────────────────────────────── */
function renderResults(fixtures) {
  let html = '', hasAny = false, lastLeg = null;
  fixtures.forEach(ro => {
    const played = ro.matches.filter(m => m.homeScore !== '' && m.awayScore !== '' && m.homeScore !== undefined);
    if (!played.length) return;
    hasAny = true;
    if (ro.leg !== lastLeg) {
      lastLeg = ro.leg;
      const cls = ro.leg === 1 ? 'lb1' : 'lb2';
      const icon = ro.leg === 1 ? '🏠' : '✈️';
      const title = ro.leg === 1 ? 'Leg 1 — First Leg Results' : 'Leg 2 — Second Leg Results';
      html += `<div class="leg-banner ${cls}">${icon} <strong>${title}</strong></div>`;
    }
    html += `<div class="rl">Round ${ro.round}</div><div class="fx-grid">`;
    ro.matches.forEach(m => {
      const tc = m.leg === 1 ? 'home' : 'away';
      const tt = m.leg === 1 ? 'Home leg' : 'Away leg';
      if (m.homeScore === '' || m.awayScore === '' || m.homeScore === undefined) {
        html += `<div class="fx-card">
          <span class="fx-ltag ${tc}">${tt}</span>
          <div class="fx-match">
            <span class="fx-p r">${m.home}</span>
            <span class="fx-vs">vs</span>
            <span class="fx-p">${m.away}</span>
          </div>
        </div>`;
      } else {
        const h = parseInt(m.homeScore), a = parseInt(m.awayScore);
        const resultCls = h > a ? 'played' : a > h ? 'played away-win' : 'played draw';
        html += `<div class="fx-card ${resultCls}">
          <span class="fx-ltag ${tc}">${tt}</span>
          <div class="fx-match">
            <span class="fx-p r" style="${h > a ? 'color:var(--green)' : a > h ? 'color:var(--red)' : ''}">${m.home}</span>
            <span class="fx-score">${h} – ${a}</span>
            <span class="fx-p" style="${a > h ? 'color:var(--green)' : h > a ? 'color:var(--red)' : ''}">${m.away}</span>
          </div>
        </div>`;
      }
    });
    html += `</div>`;
  });
  if (hasAny) document.getElementById('resultsContainer').innerHTML = html;
}

/* ── INIT & POLL ─────────────────────────────────────────── */
loadData();
setInterval(loadData, 15000);
