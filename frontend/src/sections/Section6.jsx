import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { drawTrendChart, drawTypeChart, drawDonutChart, drawFixChart } from '../utils/charts';
import { connectTableauAPI, pushTableauAPI } from '../api';

function ACCoverage({ ticket, tests }) {
  if (!ticket || !ticket.ac || !ticket.ac.length) {
    return <div className="empty" style={{ padding: '16px' }}><div className="ei">📋</div><p>No data yet</p></div>;
  }
  return (
    <div>
      <div style={{ fontSize: '9px', fontFamily: 'var(--fm)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>{ticket.id} — {ticket.ac.length} criteria</div>
      {ticket.ac.map((ac, i) => {
        const covered = tests.some((x) => x.name.toLowerCase().includes(ac.toLowerCase().split(' ').slice(0, 3).join(' ').toLowerCase()));
        const col = covered ? 'var(--g)' : 'var(--muted)';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', padding: '5px 0', borderBottom: '1px solid var(--border2)', fontSize: '10px' }}>
            <span style={{ color: col, fontWeight: 700, flexShrink: 0, fontFamily: 'var(--fm)' }}>{covered ? '✓' : '○'}</span>
            <span style={{ color: covered ? 'var(--text)' : 'var(--muted)', fontWeight: 300, lineHeight: 1.5 }}>{ac.substring(0, 65)}{ac.length > 65 ? '...' : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Section6() {
  const { dash, refreshDash, tests, selected, exportDashCSV, exportTableauJSON } = useApp();

  const trendRef = useRef(null);
  const typeRef = useRef(null);
  const donutRef = useRef(null);
  const fixRef = useRef(null);

  const [tableauForm, setTableauForm] = useState({ url: '', token: '', site: '', workbook: 'AutoQA Metrics' });
  const [tableauStatus, setTableauStatus] = useState(null);
  const [tableauBtnState, setTableauBtnState] = useState({ icon: '📊', text: 'Test Tableau Connection', connected: false });

  const runs = dash.runs;
  const totalTests = runs.reduce((s, r) => s + r.total, 0);
  const avgPass = runs.length ? Math.round(runs.reduce((s, r) => s + r.passRate, 0) / runs.length) : 0;
  const totalFixes = dash.fixCounts.reduce((s, v) => s + v, 0);
  const uniqueTickets = [...new Set(runs.map((r) => r.ticketId))].length;

  useEffect(() => {
    if (!runs.length) return;
    if (trendRef.current) drawTrendChart(trendRef.current, runs);
    if (typeRef.current && tests.length) drawTypeChart(typeRef.current, tests);
    if (donutRef.current && tests.length) {
      const pass = tests.filter((t) => t.status === 'pass').length;
      const fail = tests.filter((t) => t.status === 'fail').length;
      const total = tests.length;
      const passRate = total ? Math.round((pass / total) * 100) : 0;
      drawDonutChart(donutRef.current, { pass, fail, total, passRate });
    }
    if (fixRef.current) drawFixChart(fixRef.current, runs);
  }, [runs, tests]);

  const connectTableau = async () => {
    if (!tableauForm.url) { return; }
    setTableauBtnState({ icon: '⏳', text: 'Testing connection...', connected: false });
    setTableauStatus({ type: 'info', msg: `Connecting to ${tableauForm.url}...` });
    try {
      const res = await connectTableauAPI(tableauForm);
      if (res.status === 'success') {
        setTableauStatus({ type: 'success', msg: res.message });
        setTableauBtnState({ icon: '✓', text: 'Connected — Push Data Now', connected: true });
      } else {
        setTableauStatus({ type: 'warn', msg: res.message });
        setTableauBtnState({ icon: '📊', text: 'Test Tableau Connection', connected: false });
      }
    } catch (e) {
      setTableauStatus({ type: 'error', msg: 'Connection failed: ' + e.message });
      setTableauBtnState({ icon: '📊', text: 'Test Tableau Connection', connected: false });
    }
  };

  const pushToTableau = async () => {
    if (!runs.length) return;
    await pushTableauAPI({ runs });
  };

  return (
    <>
      <div className="s-hero">
        <div className="hero-tag">✦ Live Analytics · Visualizations · Tableau Connect</div>
        <h2><span className="dim">QA</span> <span className="acc">DASHBOARD</span></h2>
        <p>Live metrics across all test runs. Visualise pass rates, failure trends, fix attempts, and coverage. Connect to Tableau for deep analytics.</p>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '22px' }}>
        {[['Total Runs', runs.length, 'mv-w', 'all time'], ['Tests Run', totalTests, 'mv-b', 'total executed'], ['Avg Pass Rate', runs.length ? avgPass + '%' : '—', 'mv-g', 'across runs'], ['Fixes Applied', totalFixes, 'mv-w', 'AI fix attempts'], ['Tickets Tested', uniqueTickets, 'mv-b', 'unique tickets']].map(([label, val, cls, sub]) => (
          <div key={label} className="metric">
            <div className="m-label">{label}</div>
            <div className={`m-value ${cls}`}>{val}</div>
            <div className="m-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="card">
          <div className="ch"><div className="ct">📈 Pass Rate Trend</div><span style={{ fontSize: '9px', fontFamily: 'var(--fm)', color: 'var(--muted)' }}>per run</span></div>
          <div className="cb" style={{ padding: '14px' }}>
            {runs.length ? <canvas ref={trendRef} height="160" style={{ width: '100%', display: 'block' }} /> : <div className="empty" style={{ padding: '20px' }}><div className="ei">📈</div><p>Run tests to see trend</p></div>}
          </div>
        </div>
        <div className="card">
          <div className="ch"><div className="ct">🔬 Test Type Breakdown</div><span style={{ fontSize: '9px', fontFamily: 'var(--fm)', color: 'var(--muted)' }}>latest run</span></div>
          <div className="cb" style={{ padding: '14px' }}>
            {tests.length ? <canvas ref={typeRef} height="160" style={{ width: '100%', display: 'block' }} /> : <div className="empty" style={{ padding: '20px' }}><div className="ei">🔬</div><p>Run tests to see breakdown</p></div>}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="card">
          <div className="ch"><div className="ct">✓ Pass vs Fail</div></div>
          <div className="cb" style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {tests.length
              ? <canvas ref={donutRef} width="160" height="160" style={{ display: 'block' }} />
              : <div className="empty" style={{ padding: '16px' }}><div className="ei">⭕</div><p>No data yet</p></div>}
            <div style={{ display: 'flex', gap: '14px', marginTop: '10px', fontSize: '10px', fontFamily: 'var(--fm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--g)' }} />Passed</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--fail)' }} />Failed</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="ch"><div className="ct">🔧 Fix Attempts</div></div>
          <div className="cb" style={{ padding: '14px' }}>
            {runs.length ? <canvas ref={fixRef} height="160" style={{ width: '100%', display: 'block' }} /> : <div className="empty" style={{ padding: '16px' }}><div className="ei">🔧</div><p>No fix data yet</p></div>}
          </div>
        </div>
        <div className="card">
          <div className="ch"><div className="ct">📋 AC Coverage</div></div>
          <div className="cb" style={{ padding: '14px' }}>
            <ACCoverage ticket={selected} tests={tests} />
          </div>
        </div>
      </div>

      {/* Run History Table */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="ch">
          <div className="ct">🕐 Run History</div>
          <div style={{ display: 'flex', gap: '7px' }}>
            <button className="btn-sm" onClick={exportDashCSV}>↓ Export CSV</button>
            <button className="btn-sm" onClick={refreshDash}>↻ Refresh</button>
          </div>
        </div>
        {runs.length === 0
          ? <div className="empty" style={{ padding: '24px' }}><div className="ei">🕐</div><p>Run history will appear here after tests.</p></div>
          : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Run</th><th style={{ width: '80px' }}>Ticket</th><th>Title</th>
                  <th style={{ width: '54px' }}>Total</th><th style={{ width: '54px' }}>Pass</th><th style={{ width: '54px' }}>Fail</th>
                  <th style={{ width: '60px' }}>Rate</th><th style={{ width: '54px' }}>Fixes</th><th style={{ width: '56px' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {[...runs].reverse().map((r) => {
                  const rateCol = r.passRate >= 80 ? 'var(--g)' : r.passRate >= 60 ? 'var(--warn)' : 'var(--fail)';
                  return (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--muted)' }}>#{r.id}</td>
                      <td><span style={{ fontFamily: 'var(--fm)', fontSize: '10px', color: 'var(--g)' }}>{r.ticketId}</span></td>
                      <td style={{ fontSize: '10px', fontWeight: 500 }}>{r.ticketTitle.substring(0, 40)}{r.ticketTitle.length > 40 ? '...' : ''}</td>
                      <td style={{ fontFamily: 'var(--fm)', fontSize: '10px', textAlign: 'center' }}>{r.total}</td>
                      <td style={{ fontFamily: 'var(--fm)', fontSize: '10px', color: 'var(--g)', textAlign: 'center' }}>{r.pass}</td>
                      <td style={{ fontFamily: 'var(--fm)', fontSize: '10px', color: r.fail > 0 ? 'var(--fail)' : 'var(--muted)', textAlign: 'center' }}>{r.fail}</td>
                      <td><span style={{ fontFamily: 'var(--fm)', fontSize: '10px', fontWeight: 700, color: rateCol }}>{r.passRate}%</span></td>
                      <td style={{ fontFamily: 'var(--fm)', fontSize: '10px', textAlign: 'center' }}>{r.fixAttempts || 0}</td>
                      <td style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--muted)' }}>{r.ts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>

      {/* Tableau Connect */}
      <div className="card">
        <div className="ch">
          <div className="ct" style={{ color: 'var(--info)' }}>📊 Connect to Tableau</div>
          <span className="badge b-feat" style={{ fontSize: '9px' }}>Beta</span>
        </div>
        <div className="cb">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
            {/* Instructions */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>Push QA metrics to Tableau</div>
              <div style={{ fontSize: '12px', color: 'var(--dim)', fontWeight: 300, lineHeight: 1.8, marginBottom: '14px' }}>Connect AutoQA Agent to your Tableau dashboard to visualise test trends, failure patterns, and fix success rates alongside your existing HC Forward analytics.</div>
              {[['1️⃣', 'Export data', 'Download JSON or CSV from AutoQA'], ['2️⃣', 'Connect via REST API', 'Paste your Tableau server URL + API key'], ['3️⃣', 'Auto-push on every run', 'Dashboard updates in real time after each pipeline']].map(([icon, title, desc]) => (
                <div key={title} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 12px', background: 'var(--card2)', borderRadius: '8px', border: '1px solid var(--border2)', marginBottom: '8px' }}>
                  <div style={{ fontSize: '16px' }}>{icon}</div>
                  <div><div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '1px' }}>{title}</div><div style={{ fontSize: '10px', color: 'var(--muted)' }}>{desc}</div></div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-sm" onClick={exportTableauJSON} style={{ flex: 1, justifyContent: 'center', padding: '8px' }}>↓ Export for Tableau (JSON)</button>
                <button className="btn-sm" onClick={exportDashCSV} style={{ flex: 1, justifyContent: 'center', padding: '8px' }}>↓ Export CSV</button>
              </div>
            </div>

            {/* Connection Form */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '12px', color: 'var(--info)' }}>Direct Connection</div>
              {[
                { label: 'Tableau Server URL', id: 'url', type: 'text', placeholder: 'https://your-tableau-server.com' },
                { label: 'Tableau API Token', id: 'token', type: 'password', placeholder: 'Paste your Tableau PAT' },
                { label: 'Site Name', id: 'site', type: 'text', placeholder: 'HCForward', note: '(leave blank for default)' },
                { label: 'Datasource / Workbook Name', id: 'workbook', type: 'text', placeholder: 'AutoQA Metrics' },
              ].map((f) => (
                <div className="field" key={f.id} style={{ marginBottom: '11px' }}>
                  <label>{f.label} {f.note && <span style={{ color: 'var(--muted)', fontSize: '9px' }}>{f.note}</span>}</label>
                  <input
                    type={f.type}
                    value={tableauForm[f.id]}
                    onChange={(e) => setTableauForm((prev) => ({ ...prev, [f.id]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              <button
                className="btn btn-g"
                style={{ width: '100%', padding: '11px' }}
                onClick={tableauBtnState.connected ? pushToTableau : connectTableau}
              >
                <span>{tableauBtnState.icon}</span>
                <span>{tableauBtnState.text}</span>
              </button>
              {tableauStatus && (
                <div style={{
                  marginTop: '10px', fontSize: '11px', fontFamily: 'var(--fm)', padding: '8px 11px', borderRadius: '7px',
                  background: tableauStatus.type === 'success' ? 'rgba(134,188,37,.06)' : tableauStatus.type === 'warn' ? 'rgba(240,165,0,.06)' : 'rgba(56,189,248,.06)',
                  border: tableauStatus.type === 'success' ? '1px solid rgba(134,188,37,.25)' : tableauStatus.type === 'warn' ? '1px solid rgba(240,165,0,.2)' : '1px solid rgba(56,189,248,.2)',
                  color: tableauStatus.type === 'success' ? 'var(--g)' : tableauStatus.type === 'warn' ? 'var(--warn)' : 'var(--info)',
                }}>
                  {tableauStatus.msg}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
