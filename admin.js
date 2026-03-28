/* ── CONFIG ────────────────────────────────────────────────
   1. Go to https://jsonbin.io → Sign up free
   2. Click "+ Create Bin" → paste {} → Create
   3. Copy the Bin ID into JSONBIN_ID below
   4. Go to API Keys → copy your Secret Key into JSONBIN_KEY
──────────────────────────────────────────────────────────── */
const ADMIN_PASSWORD = 'adminjahim';           // Change this
const JSONBIN_ID     = '69c68d3ab7ec241ddcacb67d';
const JSONBIN_KEY    = '$2a$10$DX57eHfCWK5ZkMtEEmfEse3LTvARZQ/B57DePcN/kbnuWqFT1y5re';
const JSONBIN_URL    = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;

/* ── AUTH ──────────────────────────────────────────────────── */
function checkLogin() {
  if (sessionStorage.getItem('admin_auth') === '1') {
    const overlay = document.getElementById('loginOverlay');
    if (overlay) overlay.style.display = 'none';
  }
}

function showLoadingBanner() {
  const banner = document.getElementById('draftBanner');
  if (banner) {
    banner.classList.remove('hidden');
    banner.innerHTML = '<span style="color:var(--muted);font-size:.84rem">☁️ Syncing from cloud…</span>';
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
    showLoadingBanner();
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
  if (sessionStorage.getItem('admin_auth') === '1') {
    showLoadingBanner();
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

/* ── PERSISTENCE (localStorage + cloud cross-device sync) ──── */
const DRAFT_KEY = 'efootball_admin_draft';

// Snapshot score inputs into the fixtures array
function snapshotScores() {
  fixtures.forEach(ro => {
    ro.matches.forEach(m => {
      const he = document.getElementById('hs_' + m.id);
      const ae = document.getElementById('as_' + m.id);
      if (he) m.homeScore = he.value;
      if (ae) m.awayScore = ae.value;
    });
  });
}

function saveDraft() {
  snapshotScores();
  const draft = { players, fixtures, _saved: new Date().toISOString() };
  // Always write locally for instant same-device restore
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  // Debounced cloud sync so any device can pick it up
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => syncDraftToCloud(draft), 1500);
}

let cloudSaveTimer = null;

// Saves draft under "_draft" key in the bin — reads first to preserve all other data
async function syncDraftToCloud(draft) {
  if (!JSONBIN_KEY || JSONBIN_KEY === 'PASTE_YOUR_SECRET_KEY_HERE') return;
  try {
    // Always read current bin contents first so we never wipe published tournament data
    let current = {};
    const readRes = await fetch(JSONBIN_URL + '/latest', {
      headers: { 'X-Master-Key': JSONBIN_KEY, 'X-Bin-Meta': 'false' }
    });
    if (readRes.ok) {
      const readJson = await readRes.json();
      current = readJson.record || readJson || {};
    }

    // Embed draft alongside existing data
    current._draft = draft;

    const putRes = await fetch(JSONBIN_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_KEY,
        'X-Bin-Versioning': 'false'
      },
      body: JSON.stringify(current)
    });
    if (putRes.ok) {
      console.log('Draft synced to cloud ✓', draft._saved);
      flashSaveIndicator();
    } else {
      const txt = await putRes.text();
      console.warn('Draft cloud sync failed:', putRes.status, txt);
    }
  } catch (err) {
    console.warn('syncDraftToCloud error:', err);
  }
}

async function loadDraft() {
  let cloudDraft = null;

  // 1. Always try cloud first — this is what makes cross-device work
  if (JSONBIN_KEY && JSONBIN_KEY !== 'PASTE_YOUR_SECRET_KEY_HERE') {
    try {
      const res = await fetch(JSONBIN_URL + '/latest', {
        headers: { 'X-Master-Key': JSONBIN_KEY, 'X-Bin-Meta': 'false' }
      });
      if (res.ok) {
        const json = await res.json();
        const record = json.record || json;
        cloudDraft = record._draft || null;
        console.log('Cloud bin read OK, _draft present:', !!cloudDraft);
      } else {
        console.warn('Cloud read failed:', res.status);
      }
    } catch (e) {
      console.warn('Cloud draft fetch error:', e);
    }
  }

  // 2. Also read localStorage
  let localDraft = null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) localDraft = JSON.parse(raw);
  } catch (e) {}

  // 3. Pick whichever is newer
  const cloudTime = cloudDraft?._saved ? new Date(cloudDraft._saved).getTime() : 0;
  const localTime = localDraft?._saved  ? new Date(localDraft._saved).getTime()  : 0;
  const best = cloudTime >= localTime ? cloudDraft : localDraft;

  if (!best || !best.players || !best.players.length) {
    // Nothing to restore — clear the loading banner
    const banner = document.getElementById('draftBanner');
    if (banner) banner.classList.add('hidden');
    console.log('No draft found anywhere');
    return;
  }

  console.log('Restoring draft from', cloudTime >= localTime ? 'cloud ☁️' : 'localStorage 💾', '—', best.players.length, 'players');
  applyDraft(best);
  // Keep localStorage in sync with whatever we loaded
  localStorage.setItem(DRAFT_KEY, JSON.stringify(best));
}

// Apply a draft object to the UI
function applyDraft(draft) {
  if (!draft || !draft.players || !draft.players.length) return false;

  players  = draft.players;
  fixtures = draft.fixtures || [];

  const playerInput = document.getElementById('playerInput');
  if (playerInput) playerInput.value = players.join('\n');

  const tag = document.getElementById('playerTag');
  if (tag) {
    tag.classList.remove('hidden');
    tag.textContent = '✓ ' + players.length + ' players';
  }

  if (fixtures.length) {
    renderResultsTable();
    show('resultsSection');

    fixtures.forEach(ro => {
      ro.matches.forEach(m => {
        const he = document.getElementById('hs_' + m.id);
        const ae = document.getElementById('as_' + m.id);
        if (he && m.homeScore !== '') he.value = m.homeScore;
        if (ae && m.awayScore !== '') ae.value = m.awayScore;
        if (m.homeScore !== '' || m.awayScore !== '') mark(m.id);
      });
    });

    showDraftBanner(); // restores the real banner content
  } else {
    // No fixtures yet — just hide the loading banner
    const banner = document.getElementById('draftBanner');
    if (banner) banner.classList.add('hidden');
  }
  return true;
}

function showDraftBanner() {
  const banner = document.getElementById('draftBanner');
  if (!banner) return;
  // Restore the real banner HTML (clear the "syncing…" loading state)
  banner.innerHTML = `
    <span>📝 Draft auto-saved — enter scores and publish when ready.</span>
    <button class="draft-clear" onclick="clearDraft()">🗑 Clear & Start Over</button>
  `;
  banner.classList.remove('hidden');
}

function clearDraft() {
  if (!confirm('Clear all saved data and start fresh?')) return;
  localStorage.removeItem(DRAFT_KEY);
  players  = [];
  fixtures = [];

  // Wipe the cloud draft too so other devices don't restore stale data
  if (JSONBIN_KEY && JSONBIN_KEY !== 'PASTE_YOUR_SECRET_KEY_HERE') {
    fetch(JSONBIN_URL + '/latest', { headers: { 'X-Master-Key': JSONBIN_KEY } })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json) return;
        const current = json.record || {};
        delete current._draft;
        return fetch(JSONBIN_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY, 'X-Bin-Versioning': 'false' },
          body: JSON.stringify(current)
        });
      })
      .catch(() => {});
  }

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

/* ── CLOUD (JSONBin.io) — publish tournament data ──────────── */
async function saveToCloud(data) {
  if (!JSONBIN_KEY || JSONBIN_KEY === 'PASTE_YOUR_SECRET_KEY_HERE') {
    console.warn('No JSONBin key set — skipping cloud save.');
    return false;
  }
  try {
    // Preserve any existing _draft in the bin when publishing
    let existing = {};
    try {
      const r = await fetch(JSONBIN_URL + '/latest', { headers: { 'X-Master-Key': JSONBIN_KEY } });
      if (r.ok) { const j = await r.json(); existing = j.record || {}; }
    } catch (e) {}

    const payload = { ...data, _draft: existing._draft || null };
    const res = await fetch(JSONBIN_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_KEY,
        'X-Bin-Versioning': 'false'
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) { console.log('Published to JSONBin ✓'); return true; }
    console.error('JSONBin update failed:', res.status, await res.text());
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

  renderResultsTable();
  show('resultsSection');
  showDraftBanner();
  saveDraft();

  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  console.log('Fixtures generated:', fixtures.length, 'rounds');
}

/* ── RENDER: FIXTURES LIST — admin view removed, public only ── */
function renderFixtures() { /* fixtures shown on public page only */ }

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

  if (JSONBIN_KEY && JSONBIN_KEY !== 'PASTE_YOUR_SECRET_KEY_HERE') {
    success = await saveToCloud(window._data);
  }

  if (success) {
    pb.innerHTML = `<span>✅</span><p>Published! Your friends can now see the latest results. <a href="index.html">View public page →</a></p>`;
  } else {
    pb.innerHTML = `<span>⚠️</span><p style="color:var(--amber)">Cloud save failed. Add your JSONBin key in admin.js so friends can see updates. <a href="index.html">View locally →</a></p>`;
  }

  pb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setTimeout(() => pb.classList.remove('show'), 8000);
}
