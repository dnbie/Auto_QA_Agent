// Canvas chart drawing utilities

export function drawTrendChart(canvas, runs) {
  if (!canvas || !runs.length) return;
  const pts = runs.map((r) => r.passRate);
  const maxPts = runs.length;
  const W = canvas.offsetWidth || 320;
  const H = 140;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const padL = 28, padR = 12, padT = 10, padB = 24;
  const gW = W - padL - padR, gH = H - padT - padB;

  [0, 25, 50, 75, 100].forEach((v) => {
    const y = padT + gH - (v / 100) * gH;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    ctx.fillStyle = '#444'; ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillText(v + '%', 0, y + 3);
  });

  if (maxPts < 2) {
    const x = padL + gW / 2;
    const y = padT + gH - (pts[0] / 100) * gH;
    ctx.fillStyle = '#86BC25';
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    return;
  }

  const grad = ctx.createLinearGradient(0, padT, 0, H - padB);
  grad.addColorStop(0, 'rgba(134,188,37,0.25)');
  grad.addColorStop(1, 'rgba(134,188,37,0.02)');
  ctx.beginPath();
  pts.forEach((v, i) => {
    const x = padL + (i / (maxPts - 1)) * gW;
    const y = padT + gH - (v / 100) * gH;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(padL + gW, H - padB); ctx.lineTo(padL, H - padB); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  ctx.beginPath(); ctx.strokeStyle = '#86BC25'; ctx.lineWidth = 2;
  pts.forEach((v, i) => {
    const x = padL + (i / (maxPts - 1)) * gW;
    const y = padT + gH - (v / 100) * gH;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  pts.forEach((v, i) => {
    const x = padL + (i / (maxPts - 1)) * gW;
    const y = padT + gH - (v / 100) * gH;
    ctx.fillStyle = '#86BC25';
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#86BC25'; ctx.font = 'bold 8px JetBrains Mono,monospace';
    ctx.fillText(v + '%', x - 8, y - 8);
    ctx.fillStyle = '#555'; ctx.font = '8px JetBrains Mono,monospace';
    ctx.fillText('R' + runs[i].id, x - 6, H - padB + 14);
  });
}

export function drawTypeChart(canvas, tests) {
  if (!canvas || !tests.length) return;
  const types = {};
  tests.forEach((t) => {
    if (!types[t.type]) types[t.type] = { pass: 0, fail: 0 };
    if (t.status === 'pass') types[t.type].pass++;
    else if (t.status === 'fail') types[t.type].fail++;
  });
  const labels = Object.keys(types);
  const W = canvas.offsetWidth || 320, H = 140;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const barW = Math.max(18, (W - 40) / (labels.length * 2 + 1));
  const padL = 12, padB = 28;
  const maxVal = Math.max(...labels.map((l) => types[l].pass + types[l].fail), 1);
  const gH = H - padB - 10;

  labels.forEach((lbl, i) => {
    const d = types[lbl];
    const passH = (d.pass / maxVal) * gH;
    const failH = (d.fail / maxVal) * gH;
    const x = padL + i * (barW * 2 + 12);
    ctx.fillStyle = '#86BC25'; ctx.fillRect(x, H - padB - passH, barW, passH);
    ctx.fillStyle = '#FF4545'; ctx.fillRect(x + barW + 2, H - padB - failH, barW, failH);
    ctx.fillStyle = '#555'; ctx.font = '7.5px JetBrains Mono,monospace';
    ctx.fillText(lbl.substring(0, 6), x, H - padB + 12);
    if (d.pass > 0) { ctx.fillStyle = '#86BC25'; ctx.font = 'bold 8px JetBrains Mono,monospace'; ctx.fillText(d.pass, x + 1, H - padB - passH - 2); }
    if (d.fail > 0) { ctx.fillStyle = '#FF4545'; ctx.fillText(d.fail, x + barW + 3, H - padB - failH - 2); }
  });
  ctx.fillStyle = '#86BC25'; ctx.fillRect(W - 55, 4, 8, 8);
  ctx.fillStyle = '#555'; ctx.font = '8px JetBrains Mono,monospace'; ctx.fillText('Pass', W - 44, 11);
  ctx.fillStyle = '#FF4545'; ctx.fillRect(W - 55, 16, 8, 8);
  ctx.fillStyle = '#555'; ctx.fillText('Fail', W - 44, 23);
}

export function drawDonutChart(canvas, results) {
  if (!canvas || !results.total) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 160, 160);
  const cx = 80, cy = 80, rad = 60, inner = 38;
  const slices = [[results.pass / results.total, '#86BC25'], [results.fail / results.total, '#FF4545']];
  let angle = -Math.PI / 2;
  slices.forEach(([pct, col]) => {
    if (pct <= 0) return;
    const end = angle + pct * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, rad, angle, end); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); angle = end;
  });
  ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2); ctx.fillStyle = '#141414'; ctx.fill();
  ctx.fillStyle = '#EFEFEF'; ctx.font = 'bold 16px Bebas Neue,sans-serif';
  ctx.textAlign = 'center'; ctx.fillText(results.passRate + '%', cx, cy + 2);
  ctx.fillStyle = '#666'; ctx.font = '8px JetBrains Mono,monospace';
  ctx.fillText('PASS RATE', cx, cy + 14); ctx.textAlign = 'left';
}

export function drawFixChart(canvas, runs) {
  if (!canvas || !runs.length) return;
  const W = canvas.offsetWidth || 200, H = 140;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const fixData = runs.map((r) => r.fixAttempts);
  const maxFix = Math.max(...fixData, 1);
  const padB = 24, padL = 20, gH = H - padB - 10;
  const bW = Math.max(16, (W - padL - 10) / Math.max(fixData.length, 1) - 4);
  fixData.forEach((v, i) => {
    const bH = (v / maxFix) * gH || 4;
    const x = padL + i * (bW + 6);
    const col = v === 0 ? 'rgba(134,188,37,0.2)' : v === 1 ? '#86BC25' : v === 2 ? '#F0A500' : '#FF4545';
    ctx.fillStyle = col; ctx.fillRect(x, H - padB - bH, bW, bH);
    ctx.fillStyle = '#555'; ctx.font = '8px JetBrains Mono,monospace';
    ctx.fillText('R' + runs[i].id, x, H - padB + 12);
    if (v > 0) { ctx.fillStyle = '#ddd'; ctx.font = 'bold 9px JetBrains Mono,monospace'; ctx.fillText(v, x + bW / 2 - 4, H - padB - bH - 3); }
  });
  ctx.fillStyle = '#555'; ctx.font = '8px JetBrains Mono,monospace'; ctx.fillText('Fixes', 0, 12);
}
