/* ── AUTH ──────────────────────────────────────────────────── */
const ADMIN_PASSWORD = 'adminjahim'; // Change this if you want

/* ── STATE ────────────────────────────────────────────────── */
let players = [], fixtures = [];

function show(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

/* ── LOCAL DRAFT ──────────────────────────────────────────── */
const DRAFT_KEY = 'efootball_admin_draft';

function saveDraft() {
  fixtures.forEach(ro => {
    ro.matches.forEach(m => {
      const he = document.getElementById('hs_' + m.id);
      const ae = document.getElementById('as_' + m.id);
      if (he) m.homeScore = he.value || '';
      if (ae) m.awayScore = ae.value || '';
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

    players = draft.players;
    fixtures = draft.fixtures || [];

    document.getElementById('playerInput').value = players.join('\n');

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

      fixtures.forEach(ro => {
        ro.matches.forEach(m => {
          const he = document.getElementById('hs_' + m.id);
          const ae = document.getElementById('as_' + m.id);
          if (he && m.homeScore) he.value = m.homeScore;
          if (ae && m.awayScore) ae.value = m.awayScore;
          if (m.homeScore || m.awayScore) mark(m.id);
        });
      });

      showDraftBanner();
    }
  } catch (e) { console.warn('Draft load failed'); }
}

function showDraftBanner() {
  const banner = document.getElementById('draftBanner');
  if (banner) banner.classList.remove('hidden');
}

function clearDraft() {
  if (!confirm('Clear all data and start fresh?')) return;
  localStorage.removeItem(DRAFT_KEY);
  location.reload();
}

/* ── GENERATE FIXTURES ───────────────────────────────────── */
function generateFixtures() {
  const raw = document.getElementById('playerInput').value.trim();
  players = raw.split('\n').map(s => s.trim()).filter(Boolean);
  if (players.length < 2) {
    alert('Enter at least 2 player names.');
    return;
  }

  const tag = document.getElementById('playerTag');
  tag.classList.remove('hidden');
  tag.textContent = '✓ ' + players.length + ' players';

  fixtures = [];
  let list = [...players];
  if (list.length % 2 !== 0) list.push('BYE');
  const n = list.length, rounds = n - 1, half = n / 2;
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
  document.getElementById('fixturesSection').scrollIntoView({ behavior: 'smooth' });
}

/* ── RENDER FIXTURES ─────────────────────────────────────── */
function renderFixtures() {
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
      html += `<div class="fx-card">
        <span class="fx-ltag ${tc}">${m.leg === 1 ? 'Home leg' : 'Away leg'}</span>
        <div class="fx-match">
          <span class="fx-p r">${escapeHtml(m.home)}</span>
          <span class="fx-vs">vs</span>
          <span class="fx-p">${escapeHtml(m.away)}</span>
        </div>
      </div>`;
    });
    html += `</div>`;
  });
  document.getElementById('fixturesContainer').innerHTML = html;
  document.getElementById('fixtureCount').textContent = fixtures.reduce((a,r) => a + r.matches.length, 0) + ' matches';
}

/* ── RESULTS TABLE ───────────────────────────────────────── */
function renderResultsTable() {
  let html = '', idx = 1, lastLeg = null;
  fixtures.forEach(ro => {
    if (ro.leg !== lastLeg) {
      lastLeg = ro.leg;
      const color = ro.leg === 1 ? 'var(--accent)' : 'var(--orange)';
      const icon = ro.leg === 1 ? '🏠' : '✈️';
      const title = ro.leg === 1 ? 'Leg 1 — First Leg' : 'Leg 2 — Second Leg';
      html += `<tr class="rleg-row"><td colspan="7" style="color:${color}">${icon} ${title}</td></tr>`;
    }
    ro.matches.forEach(m => {
      const bc = m.leg === 1 ? 'h' : 'a';
      html += `<tr>
        <td style="color:var(--dim);font-size:.78rem">${idx++}</td>
        <td class="pname">${escapeHtml(m.home)} <span class="lbadge ${bc}">${m.leg===1?'H':'A'}</span></td>
        <td style="text-align:center"><input type="number" min="0" max="99" class="score-in" id="hs_${m.id}" placeholder="–" oninput="onScoreInput(${m.id})"></td>
        <td style="text-align:center"><span class="sc">:</span></td>
        <td style="text-align:center"><input type="number" min="0" max="99" class="score-in" id="as_${m.id}" placeholder="–" oninput="onScoreInput(${m.id})"></td>
        <td class="pname">${escapeHtml(m.away)}</td>
        <td id="st_${m.id}" style="font-size:.8rem;color:var(--dim)">—</td>
      </tr>`;
    });
  });
  document.getElementById('resultsBody').innerHTML = html;
}

let saveTimer = null;
function onScoreInput(id) {
  mark(id);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 800);
}

function mark(id) {
  const hs = document.getElementById('hs_' + id)?.value || '';
  const as = document.getElementById('as_' + id)?.value || '';
  const el = document.getElementById('st_' + id);
  if (hs !== '' && as !== '') {
    const h = parseInt(hs), a = parseInt(as);
    if (h > a)      el.innerHTML = '<span class="tag tg-blue">Home Win</span>';
    else if (a > h) el.innerHTML = '<span class="tag tg-orange">Away Win</span>';
    else            el.innerHTML = '<span class="tag tg-amber">Draw</span>';
  } else {
    el.textContent = '—';
  }
}

/* ── CALCULATE STANDINGS ─────────────────────────────────── */
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

      hm.P++; am.P++;
      hm.GF += h; hm.GA += a;
      am.GF += a; am.GA += h;
      hm.GD = hm.GF - hm.GA;
      am.GD = am.GF - am.GA;

      if (h > a) {
        hm.W++; hm.Pts += 3; hm.form.push('W');
        am.L++; am.form.push('L');
      } else if (a > h) {
        am.W++; am.Pts += 3; am.form.push('W');
        hm.L++; hm.form.push('L');
      } else {
        hm.D++; hm.Pts++; hm.form.push('D');
        am.D++; am.Pts++; am.form.push('D');
      }
    });
  });

  const sorted = Object.entries(stats).sort(([,a], [,b]) => 
    b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF
  );

  renderStandings(sorted);

  window._data = {
    players,
    fixtures: fixtures.map(ro => ({
      ...ro,
      matches: ro.matches.map(m => {
        const he = document.getElementById('hs_' + m.id);
        const ae = document.getElementById('as_' + m.id);
        return { ...m, homeScore: he ? he.value : '', awayScore: ae ? ae.value : '' };
      })
    })),
    standings: sorted.map(([name, s], i) => ({ pos: i + 1, name, ...s })),
    played,
    updated: new Date().toISOString()
  };

  const mp = document.getElementById('matchesPlayed');
  mp.classList.remove('hidden');
  mp.textContent = played + ' results entered';

  show('standingsSection');
  saveDraft();
  document.getElementById('standingsSection').scrollIntoView({ behavior: 'smooth' });
}

function fi(r) { return r === 'W' ? '✅' : r === 'L' ? '❌' : '➖'; }

function renderStandings(sorted) {
  let html = `<table class="stable">
    <thead>
      <tr>
        <th style="width:36px">Pos</th><th class="tl">Player</th>
        <th>P</th><th>W</th><th>D</th><th>L</th>
        <th>GF</th><th>GA</th><th>GD</th><th>Pts</th><th>Form</th>
      </tr>
    </thead><tbody>`;
  
  sorted.forEach(([name, s], i) => {
    const pos = i + 1;
    const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
    const gd = s.GD > 0 ? `+${s.GD}` : s.GD;
    const form = s.form.slice(-5).map(fi).join('');
    html += `<tr>
      <td>${medal}</td>
      <td class="tl pname-s">${escapeHtml(name)}</td>
      <td>${s.P}</td><td>${s.W}</td><td>${s.D}</td><td>${s.L}</td>
      <td>${s.GF}</td><td>${s.GA}</td><td>${gd}</td>
      <td class="pts">${s.Pts}</td>
      <td class="form-c">${form}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('standingsContainer').innerHTML = html;
}

/* ── PUBLISH = DOWNLOAD JSON ─────────────────────────────── */
function publishData() {
  if (!window._data) {
    alert('Please click "Calculate Standings" first!');
    return;
  }

  const dataStr = JSON.stringify(window._data, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  const link = document.createElement('a');
  link.setAttribute('href', dataUri);
  link.setAttribute('download', 'tournament-data.json');
  link.click();

  const pb = document.getElementById('publishBox');
  pb.innerHTML = `<span>✅</span><p><strong>tournament-data.json</strong> downloaded!<br>Send this file to your friends.<br>They can upload it on the main page.</p>`;
  pb.classList.add('show');
  setTimeout(() => pb.classList.remove('show'), 8000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ── INIT ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  loadDraft();
  console.log('✅ Admin panel ready - Use Download JSON to share results');
});
