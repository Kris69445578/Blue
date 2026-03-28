/* ── RENDER: RESULTS TABLE ─────────────────────────────────────── */
function renderResultsTable() {
  const roundMap = {};
  fixtures.forEach(ro => {
    if (!roundMap[ro.round]) roundMap[ro.round] = { leg1: null, leg2: null };
    if (ro.leg === 1) roundMap[ro.round].leg1 = ro;
    else              roundMap[ro.round].leg2 = ro;
  });

  let html = '', matchupIdx = 1;

  Object.keys(roundMap).sort((a, b) => Number(a) - Number(b)).forEach(round => {
    const { leg1, leg2 } = roundMap[round];
    html += `<tr class="rleg-row"><td colspan="7" style="color:var(--muted)">Round ${round}</td></tr>`;

    if (leg1) {
      leg1.matches.forEach(m1 => {
        const m2  = leg2 ? leg2.matches.find(m => m.home === m1.away && m.away === m1.home) : null;
        const num = matchupIdx++;

        html += `<tr>
          <td rowspan="2" style="color:var(--accent);font-family:'Sora',sans-serif;font-weight:800;font-size:.95rem;text-align:center;vertical-align:middle;border-right:2px solid var(--border)">${num}</td>
          <td class="pname tl" style="border-bottom:1px solid var(--border-s)">${escapeHtml(m1.home)} <span class="lbadge h">L1</span></td>
          <td style="text-align:center;border-bottom:1px solid var(--border-s)">
            <input type="number" min="0" max="99" class="score-in" id="hs_${m1.id}" placeholder="-" oninput="onScoreInput(${m1.id})" onchange="onScoreInput(${m1.id})">
          </td>
          <td style="text-align:center;border-bottom:1px solid var(--border-s)"><span class="sc">:</span></td>
          <td style="text-align:center;border-bottom:1px solid var(--border-s)">
            <input type="number" min="0" max="99" class="score-in" id="as_${m1.id}" placeholder="-" oninput="onScoreInput(${m1.id})" onchange="onScoreInput(${m1.id})">
          </td>
          <td class="pname tl" style="border-bottom:1px solid var(--border-s)">${escapeHtml(m1.away)}</td>
          <td id="st_${m1.id}" style="font-size:.8rem;color:var(--dim);border-bottom:1px solid var(--border-s)">-</td>
        </tr>`;

        if (m2) {
          html += `<tr>
            <td class="pname tl" style="border-bottom:3px solid var(--border)">${escapeHtml(m2.home)} <span class="lbadge a">L2</span></td>
            <td style="text-align:center;border-bottom:3px solid var(--border)">
              <input type="number" min="0" max="99" class="score-in" id="hs_${m2.id}" placeholder="-" oninput="onScoreInput(${m2.id})" onchange="onScoreInput(${m2.id})">
            </td>
            <td style="text-align:center;border-bottom:3px solid var(--border)"><span class="sc">:</span></td>
            <td style="text-align:center;border-bottom:3px solid var(--border)">
              <input type="number" min="0" max="99" class="score-in" id="as_${m2.id}" placeholder="-" oninput="onScoreInput(${m2.id})" onchange="onScoreInput(${m2.id})">
            </td>
            <td class="pname tl" style="border-bottom:3px solid var(--border)">${escapeHtml(m2.away)}</td>
            <td id="st_${m2.id}" style="font-size:.8rem;color:var(--dim);border-bottom:3px solid var(--border)">-</td>
          </tr>`;
        }
      });
    }
  });

  const body = document.getElementById('resultsBody');
  if (body) body.innerHTML = html;
}
