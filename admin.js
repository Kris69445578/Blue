/* ── CONFIG ────────────────────────────────────────────────
   Replace these values with your own.
   IMPORTANT: Never commit a real GitHub token to a public repo.
   Use a fine-grained token with only "Gist: Read and Write" scope.
──────────────────────────────────────────────────────────── */
const ADMIN_PASSWORD   = 'adminjahim';           // Change this
const GIST_ID          = 'bcdc1b9c3be807e8d5afff6c9243c692';
const GITHUB_USERNAME  = 'Kris69445578';
const GITHUB_TOKEN     = '';  // Paste your token here (keep this file private / server-side)
const GIST_API_URL     = `https://api.github.com/gists/${GIST_ID}`;
const GIST_RAW_URL     = `https://gist.githubusercontent.com/${GITHUB_USERNAME}/${GIST_ID}/raw/tournament-data.json`;

/* ── AUTH ──────────────────────────────────────────────────── */
function checkLogin() {
  if (sessionStorage.getItem('admin_auth') === '1') {
    const overlay = document.getElementById('loginOverlay');
    if (overlay) overlay.style.display = 'none';
  }
}

function doLogin() {
  const pwInput = document.getElementById('loginPassword');
  const errorEl = document.getElementById('loginError');
  if (!pwInput || !errorEl) return;

  if (pwInput.value === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin_auth', '1');
    document.getElementById('loginOverlay').style.display = 'none';
    errorEl.classList.remove('show');
    loadDraft();
  } else {
    errorEl.classList.add('show');
    pwInput.value = '';
    pwInput.focus();
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const pwInput = document.getElementById('loginPassword');
  if (pwInput) {
    pwInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doLogin();
    });
  }
  checkLogin();
  // Only auto-load draft if already logged in
  if (sessionStorage.getItem('admin_auth') === '1') {
    loadDraft();
  }
  console.log('Admin panel initialised');
});

/* ── STATE ─────────────────────────────────────────────────── */
let players  = [];
let fixtures = [];

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

/* ── PERSISTENCE (localStorage draft) ─────────────────────── */
const DRAFT_KEY = 'efootball_admin_draft';

function saveDraft() {
  // Snapshot current score inputs into fixtures before saving
  fixtures.forEach(ro => {
    ro.matches.forEach(m => {
      const he = document.getElementById('hs_' + m.id);
      const ae = document.getElementById('as_' + m.id);
      if (he) m.homeScore = he.value;
      if (ae) m.awayScore = ae.value;
    });
  });
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ players, fixtures }));
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (!draft.players || !draft.players.length) return;

    players  = draft.players;
    fixtures = draft.fixtures || [];

    // Restore the player textarea
    const playerInput = document.getElementById('playerInput');
    if (playerInput) playerInput.value = players.join('\n');

    // Show player tag
    const tag = document.getElementById('playerTag');
    if (tag) {
      tag.classList.remove('hidden');
      tag.textContent = '✓ ' + players.length + ' players';
    }

    if (fixtures.length) {
      renderFixtures();
      renderResultsTable();
      show('fixturesSection');
      show('resultsSection');

      // Restore saved scores into the inputs (inputs exist now after render)
      fixtures.forEach(ro => {
        ro.matches.forEach(m => {
          const he = document.getElementById('hs_' + m.id);
          const ae = document.getElementById('as_' + m.id);
          if (he && m.homeScore !== '') he.value = m.homeScore;
          if (ae && m.awayScore !== '') ae.value = m.awayScore;
          if (m.homeScore !== '' || m.awayScore !== '') mark(m.id);
        });
      });

      showDraftBanner();
    }
    console.log('Draft restored');
  } catch (e) {
    console.warn('Could not restore draft:', e);
  }
}

function showDraftBanner() {
  const banner = document.getElementById('draftBanner');
  if (banner) banner.classList.remove('hidden');
}

function clearDraft() {
  if (!confirm('Clear all saved data and start fresh?')) return;
  localStorage.removeItem(DRAFT_KEY);
  players  = [];
  fixtures = [];

  const playerInput = document.getElementById('playerInput');
  if (playerInput) playerInput.value = '';

  const tag = document.getElementById('playerTag');
  if (tag) tag.classList.add('hidden');

  ['fixturesSection', 'resultsSection', 'standingsSection'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  const banner = document.getElementById('draftBanner');
  if (banner) banner.classList.add('hidden');

  const pubBox = document.getElementById('publishBox');
  if (pubBox) pubBox.classList.remove('show');

  window._data = null;
  console.log('Draft cleared');
}

/* ── CLOUD (GitHub Gist) ───────────────────────────────────── */
async function saveToCloud(data) {
  if (!GITHUB_TOKEN) {
    console.warn('No GitHub token set — skipping cloud save.');
    return false;
  }
  try {
    const res = await fetch(GIST_API_URL, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        files: {
          'tournament-data.json': { content: JSON.stringify(data, null, 2) }
        }
      })
    });
    if (res.ok) { console.log('Saved to Gist ✓'); return true; }
    console.error('Gist update failed:', res.status, await res.text());
    return false;
  } catch (err) {
    console.error('saveToCloud error:', err);
    return false;
  }
}

/* ── AUTO-SAVE (debounced) ─────────────────────────────────── */
let saveTimer = null;

function onScoreInput(id) {
  mark(id);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveDraft();
    flashSaveIndicator();
  }, 800);
}

function flashSaveIndicator() {
  const el = document.getElementById('saveIndicator');
  if (!el) return;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2000);
}

/* ── GENERATE FIXTURES ─────────────────────────────────────── */
function generateFixtures() {
  const raw = document.getElementById('playerInput').value.trim();
  players = raw.split('\n').map(s => s.trim()).filter(Boolean);

  if (players.length < 2) {
    alert('Enter at least 2 player names.');
    return;
  }

  const tag = document.getElementById('playerTag');
  if (tag) {
    tag.classList.remove('hidden');
    tag.textContent = '✓ ' + players.length + ' players';
  }

  fixtures = [];
  let list = [...players];
  if (list.length % 2 !== 0) list.push('BYE');

  const n      = list.length;
  const rounds = n - 1;
  const half   = n / 2;
  let id = 0;
  const L1 = [], L2 = [];

  for (let r = 0; r < rounds; r++) {
    const r1 = [], r2 = [];
    for (let i = 0; i < half; i++) {
      const h = list[i], a = list[n - 1 - i];
      if (h !== 'BYE' && a !== 'BYE') {
        r1.push({ home: h, away: a, homeScore: '', awayScore: '', id: id++, leg: 1 });
        r2.push({ home: a, away: h, homeScore: '', awayScore: '', id: id++, leg: 2 });
      }
    }
    L1.push({ round: r + 1, leg: 1, matches: r1 });
    L2.push({ round: r + 1, leg: 2, matches: r2 });
    const last = list.splice(n - 1, 1)[0];
    list.splice(1, 0, last);
  }
  fixtures = [...L1, ...L2];

  renderFixtures();
  renderResultsTable();
  show('fixturesSection');
  show('resultsSection');
  showDraftBanner();
  saveDraft();

  document.getElementById('fixturesSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  console.log('Fixtures generated:', fixtures.length, 'rounds');
}

/* ── RENDER: FIXTURES LIST ─────────────────────────────────── */
function renderFixtures() {
  let total = 0, html = '', lastLeg = null;

  fixtures.forEach(ro => {
    if (ro.leg !== lastLeg) {
      lastLeg = ro.leg;
      const cls   = ro.leg === 1 ? 'lb1' : 'lb2';
      const icon  = ro.leg === 1 ? '🏠' : '✈️';
      const title = ro.leg === 1 ? 'Leg 1 — First Leg (Home)' : 'Leg 2 — Second Leg (Away)';
      html += `<div class="leg-banner ${cls}">${icon} <strong>${title}</strong></div>`;
    }

    html += `<div class="rl">Round ${ro.round}</div><div class="fx-grid">`;
    ro.matches.forEach(m => {
      total++;
      const tc = m.leg === 1 ? 'home' : 'away';
      const tt = m.leg === 1 ? 'Home leg' : 'Away leg';
      html += `<div class="fx-card">
        <span class="fx-ltag ${tc}">${tt}</span>
        <div class="fx-match">
          <span class="fx-p r">${escapeHtml(m.home)}</span>
          <span class="fx-vs">vs</span>
          <span class="fx-p">${escapeHtml(m.away)}</span>
        </div>
      </div>`;
    });
    html += `</div>`;
  });

  const container = document.getElementById('fixturesContainer');
  if (container) container.innerHTML = html;

  const countEl = document.getElementById('fixtureCount');
  if (countEl) countEl.textContent = total + ' matches · 2 legs';
}

/* ── RENDER: RESULTS TABLE ─────────────────────────────────── */
function renderResultsTable() {
  let html = '', idx = 1, lastLeg = null;

  fixtures.forEach(ro => {
    if (ro.leg !== lastLeg) {
      lastLeg = ro.leg;
      const color = ro.leg === 1 ? 'var(--accent)' : 'var(--orange)';
      const icon  = ro.leg === 1 ? '🏠' : '✈️';
      const title = ro.leg === 1 ? 'Leg 1 — First Leg' : 'Leg 2 — Second Leg';
      html += `<tr class="rleg-row"><td colspan="7" style="color:${color}">${icon} ${title}</td></tr>`;
    }

    ro.matches.forEach(m => {
      const bc = m.leg === 1 ? 'h' : 'a';
      const bt = m.leg === 1 ? 'H' : 'A';
      html += `<tr>
        <td style="color:var(--dim);font-size:.78rem">${idx++}</td>
        <td class="pname tl">${escapeHtml(m.home)} <span class="lbadge ${bc}">${bt}</span></td>
        <td style="text-align:center">
          <input type="number" min="0" max="99" class="score-in" id="hs_${m.id}"
            placeholder="–" oninput="onScoreInput(${m.id})" onchange="onScoreInput(${m.id})">
        </td>
        <td style="text-align:center"><span class="sc">:</span></td>
        <td style="text-align:center">
          <input type="number" min="0" max="99" class="score-in" id="as_${m.id}"
            placeholder="–" oninput="onScoreInput(${m.id})" onchange="onScoreInput(${m.id})">
        </td>
        <td class="pname tl">${escapeHtml(m.away)}</td>
        <td id="st_${m.id}" style="font-size:.8rem;color:var(--dim)">—</td>
      </tr>`;
    });
  });

  const body = document.getElementById('resultsBody');
  if (body) body.innerHTML = html;
}

/* ── MARK RESULT CELL ──────────────────────────────────────── */
function mark(id) {
  const hsEl = document.getElementById('hs_' + id);
  const asEl = document.getElementById('as_' + id);
  const stEl = document.getElementById('st_' + id);
  if (!hsEl || !asEl || !stEl) return;

  const hs = hsEl.value, as_ = asEl.value;
  if (hs !== '' && as_ !== '') {
    const h = parseInt(hs), a = parseInt(as_);
    if (h > a)      stEl.innerHTML = '<span class="tag tg-blue">Home Win</span>';
    else if (a > h) stEl.innerHTML = '<span class="tag tg-orange">Away Win</span>';
    else            stEl.innerHTML = '<span class="tag tg-amber">Draw</span>';
  } else {
    stEl.textContent = '—';
  }
}

/* ── CALCULATE STANDINGS ───────────────────────────────────── */
function calculateStandings() {
  const stats = {};
  players.forEach(p => {
    stats[p] = { P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0, form: [] };
  });

  let played = 0;
  fixtures.forEach(ro => {
    ro.matches.forEach(m => {
      const he = document.getElementById('hs_' + m.id);
      const ae = document.getElementById('as_' + m.id);
      if (!he || !ae || he.value === '' || ae.value === '') return;

      const h = parseInt(he.value), a = parseInt(ae.value);
      played++;
      const hm = stats[m.home], am = stats[m.away];
      if (!hm || !am) return;

      hm.P++; am.P++;
      hm.GF += h; hm.GA += a;
      am.GF += a; am.GA += h;
      hm.GD = hm.GF - hm.GA;
      am.GD = am.GF - am.GA;

      if (h > a) {
        hm.W++; hm.Pts += 3; hm.form.push('W');
        am.L++;              am.form.push('L');
      } else if (a > h) {
        am.W++; am.Pts += 3; am.form.push('W');
        hm.L++;              hm.form.push('L');
      } else {
        hm.D++; hm.Pts++; hm.form.push('D');
        am.D++; am.Pts++; am.form.push('D');
      }
    });
  });

  const sorted = Object.entries(stats).sort(([, a], [, b]) => {
    if (b.Pts !== a.Pts) return b.Pts - a.Pts;
    if (b.GD  !== a.GD)  return b.GD  - a.GD;
    return b.GF - a.GF;
  });

  renderStandings(sorted);

  // Snapshot scores into fixtures data for publish
  const fixturesSnap = fixtures.map(ro => ({
    ...ro,
    matches: ro.matches.map(m => {
      const he = document.getElementById('hs_' + m.id);
      const ae = document.getElementById('as_' + m.id);
      return { ...m, homeScore: he ? he.value : '', awayScore: ae ? ae.value : '' };
    })
  }));

  window._data = {
    players,
    fixtures: fixturesSnap,
    standings: sorted.map(([name, s], i) => ({ pos: i + 1, name, ...s })),
    played,
    updated: new Date().toISOString()
  };

  const mp = document.getElementById('matchesPlayed');
  if (mp) {
    mp.classList.remove('hidden');
    mp.textContent = played + ' results entered';
  }

  show('standingsSection');
  saveDraft();
  document.getElementById('standingsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  console.log('Standings calculated, played:', played);
}

/* ── RENDER: STANDINGS TABLE ───────────────────────────────── */
function fi(r) { return r === 'W' ? '✅' : r === 'L' ? '❌' : '➖'; }

function renderStandings(sorted) {
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

  sorted.forEach(([name, s], i) => {
    const pos   = i + 1;
    const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
    const gd    = s.GD > 0 ? `<span class="gdp">+${s.GD}</span>`
                : s.GD < 0 ? `<span class="gdn">${s.GD}</span>` : '0';
    const form  = s.form.slice(-5).map(fi).join('');
    const rc    = pos === 1 ? 'r1' : pos === 2 ? 'r2' : pos === 3 ? 'r3' : '';
    html += `<tr class="${rc}">
      <td>${medal}</td>
      <td class="tl pname-s">${escapeHtml(name)}</td>
      <td>${s.P}</td><td>${s.W}</td><td>${s.D}</td><td>${s.L}</td>
      <td>${s.GF}</td><td>${s.GA}</td><td>${gd}</td>
      <td class="pts">${s.Pts}</td>
      <td class="form-c">${form}</td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  const container = document.getElementById('standingsContainer');
  if (container) container.innerHTML = html;
}

/* ── PUBLISH ───────────────────────────────────────────────── */
async function publishData() {
  if (!window._data) {
    alert('Please calculate standings first.');
    return;
  }

  // Refresh fixture scores before publish
  window._data.fixtures = fixtures.map(ro => ({
    ...ro,
    matches: ro.matches.map(m => {
      const he = document.getElementById('hs_' + m.id);
      const ae = document.getElementById('as_' + m.id);
      return { ...m, homeScore: he ? he.value : '', awayScore: ae ? ae.value : '' };
    })
  }));
  window._data.updated = new Date().toISOString();

  // Always save to localStorage so the public page can read it
  localStorage.setItem('efootball_tournament', JSON.stringify(window._data));
  saveDraft();

  const pb = document.getElementById('publishBox');
  if (!pb) return;

  pb.style.display = 'flex';
  pb.classList.add('show');
  pb.innerHTML = '<span>⏳</span><p>Publishing…</p>';

  let success = false;

  if (GITHUB_TOKEN) {
    success = await saveToCloud(window._data);
  }

  if (success) {
    pb.innerHTML = `<span>✅</span><p>Published to GitHub Gist! <a href="index.html">View public page →</a></p>`;
  } else {
    // Saved to localStorage — public page on same device will pick it up
    pb.innerHTML = `<span>✅</span><p>Saved locally. <a href="index.html">View public page →</a>${GITHUB_TOKEN ? ' (Gist update failed — check token)' : ''}</p>`;
  }

  pb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setTimeout(() => pb.classList.remove('show'), 8000);
}
