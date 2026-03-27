/* ── ADMIN LOGIN ───────────────────────────────────────────── */
const ADMIN_PASSWORD = 'adminjahim';

function openAdminPanel() {
  document.getElementById('adminPanel').classList.add('open');
}

function closeAdminPanel() {
  document.getElementById('adminPanel').classList.remove('open');
  document.getElementById('loginError').classList.remove('show');
  document.getElementById('loginPassword').value = '';
}

function doLogin() {
  const pw = document.getElementById('loginPassword').value.trim();
  if (pw === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin_auth', '1');
    window.location.href = 'admin.htm';
  } else {
    document.getElementById('loginError').classList.add('show');
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginPassword').focus();
  }
}

/* ── TABS ─────────────────────────────────────────────────── */
function switchTab(btn, panelId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(panelId).classList.add('active');
}

/* ── HELPERS ─────────────────────────────────────────────── */
function fi(r) { return r === 'W' ? '✅' : r === 'L' ? '❌' : '➖'; }
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ── LOAD DATA FROM UPLOADED FILE ─────────────────────────── */
let currentData = null;

function loadDataFromFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      currentData = JSON.parse(e.target.result);
      renderAll(currentData);
      document.getElementById('liveTag').classList.remove('hidden');
    } catch (err) {
      alert('Invalid file! Please upload the correct tournament-data.json file.');
    }
  };
  reader.readAsText(file);
}

function renderAll(data) {
  if (!data || !data.standings) return;

  // Hero
  document.getElementById('heroStats').style.display = 'flex';
  document.getElementById('statPlayers').textContent = data.standings.length;
  document.getElementById('statMatches').textContent = data.played || 0;
  document.getElementById('statLeader').textContent = data.standings[0]?.name || '—';

  if (data.updated) {
    const d = new Date(data.updated);
    document.getElementById('lastUpdated').textContent = 'Last updated: ' + d.toLocaleString();
  }

  renderStandings(data.standings);
  renderPodium(data.standings);
  renderTicker(data.standings);

  if (data.fixtures) {
    renderFixtures(data.fixtures);
    renderResults(data.fixtures);
  }
}

function renderStandings(standings) {
  let html = `<div class="tbl-wrap"><table class="stable">
    <thead><tr><th style="width:36px">Pos</th><th class="tl">Player</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th><th>Form</th></tr></thead><tbody>`;
  standings.forEach((s, i) => {
    const pos = i + 1;
    const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
    const rc = pos === 1 ? 'r1' : pos === 2 ? 'r2' : pos === 3 ? 'r3' : '';
    const gd = s.GD > 0 ? `+${s.GD}` : s.GD;
    const form = (s.form || []).slice(-5).map(fi).join('');
    html += `<tr class="${rc}"><td>${medal}</td><td class="tl pname">${escapeHtml(s.name)}</td><td>${s.P}</td><td>${s.W}</td><td>${s.D}</td><td>${s.L}</td><td>${s.GF}</td><td>${s.GA}</td><td>${gd}</td><td class="pts">${s.Pts}</td><td class="form-c">${form}</td></tr>`;
  });
  html += '</tbody></table></div>';
  document.getElementById('standingsContainer').innerHTML = html;
}

function renderPodium(standings) {
  if (standings.length < 1) return;
  const order = [standings[1] || null, standings[0], standings[2] || null];
  let html = '';
  const medals = ['🥇','🥈','🥉'];
  const ranks = ['rank-2','rank-1','rank-3'];
  order.forEach((s, i) => {
    if (!s) return;
    html += `<div class="podium-card ${ranks[i]}">
      <span class="pod-medal">${medals[i === 1 ? 0 : i === 0 ? 1 : 2]}</span>
      <div class="pod-name">${escapeHtml(s.name)}</div>
      <div class="pod-pts">${s.Pts}</div>
      <div class="pod-sub">${s.W}W ${s.D}D ${s.L}L</div>
    </div>`;
  });
  document.getElementById('podiumContainer').innerHTML = html;
  show('podiumSection');
}

function renderTicker(standings) {
  let html = standings.map(s => 
    `<span class="tick-item"><span class="hi">${escapeHtml(s.name)}</span> · ${s.Pts} pts · ${s.W}W ${s.D}D ${s.L}L <span class="sep">///</span></span>`
  ).join('');
  document.getElementById('tickerInner').innerHTML = html + html;
  show('tickerWrap');
}

function renderFixtures(fixtures) {
  let html = '';
  fixtures.forEach(ro => {
    html += `<div class="rl">Round ${ro.round} - Leg ${ro.leg}</div><div class="fx-grid">`;
    ro.matches.forEach(m => {
      html += `<div class="fx-card">
        <div class="fx-match">
          <span class="fx-p r">${escapeHtml(m.home)}</span>
          <span class="fx-vs">vs</span>
          <span class="fx-p">${escapeHtml(m.away)}</span>
        </div>
      </div>`;
    });
    html += `</div>`;
  });
  document.getElementById('fixturesContainer').innerHTML = html || '<div class="empty"><h3>No fixtures yet</h3></div>';
}

function renderResults(fixtures) {
  let html = '';
  fixtures.forEach(ro => {
    ro.matches.forEach(m => {
      if (m.homeScore && m.awayScore) {
        html += `<div class="fx-card played">
          <div class="fx-match">
            <span class="fx-p">${escapeHtml(m.home)} ${m.homeScore}–${m.awayScore} ${escapeHtml(m.away)}</span>
          </div>
        </div>`;
      }
    });
  });
  document.getElementById('resultsContainer').innerHTML = html || '<div class="empty"><h3>No results yet</h3></div>';
}

/* ── INIT ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Add upload button
  const uploadHTML = `
    <div style="margin:20px 0; padding:15px; background:var(--card); border:1px solid var(--border); border-radius:8px;">
      <label style="display:block; margin-bottom:8px; font-weight:600; color:var(--accent);">Upload tournament-data.json</label>
      <input type="file" id="dataUpload" accept=".json" style="width:100%; padding:10px; background:var(--bg); border:1px solid var(--border); border-radius:8px; color:var(--text);">
    </div>
  `;
  document.getElementById('t-standings').insertAdjacentHTML('afterbegin', uploadHTML);

  document.getElementById('dataUpload').addEventListener('change', e => {
    if (e.target.files.length > 0) loadDataFromFile(e.target.files[0]);
  });

  console.log('✅ Public page ready - Upload the JSON file from admin');
});s
