import { useApp } from '../context/AppContext';
import ConsoleLogs from '../components/ConsoleLogs';

function SpinnerSVG() {
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" style={{ animation: 'spin 1s linear infinite', marginBottom: '14px' }}>
      <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(134,188,37,.2)" strokeWidth="3" />
      <path d="M24 4 A20 20 0 0 1 44 24" fill="none" stroke="var(--g)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function StatusBadge({ status }) {
  const cls = status === 'pass' ? 'tsb s-pass' : status === 'fail' ? 'tsb s-fail' : status === 'running' ? 'tsb s-run' : 'tsb s-pend';
  if (status === 'running') {
    return (
      <span className={cls}>
        <svg width="8" height="8" viewBox="0 0 10 10" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
        </svg>
        Running
      </span>
    );
  }
  return <span className={cls}><span className="dot" />{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

export default function Section2() {
  const {
    liveTickets, selected, selectTicket, depth, setDepth,
    testEnv, setTestEnv,
    runBtnLoading, runPipeline, runMsg, runProgress,
    runningVisible, resultsVisible,
    resultBannerData, metricsData, aiBoxData,
    tests, dlReport, exportCSV,
    con2Logs, setCon2Logs,
  } = useApp();

  const tc = (type) => type === 'Bug' ? 'b-bug' : type === 'Story' ? 'b-story' : type === 'Feature' ? 'b-feat' : 'b-task';

  return (
    <>
      <div className="s-hero">
        <div className="hero-tag">✦ Phase 2 · Test Execution</div>
        <h2><span className="dim">SELECT &amp;</span> <span className="acc">TEST</span></h2>
        <p>Pick a Jira ticket below. Claude generates test cases from the acceptance criteria and runs them against your QA environment.</p>
      </div>

      <div style={{ fontSize: '10px', fontFamily: 'var(--fm)', textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--muted)', marginBottom: '11px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🎯 Select a ticket <span style={{ color: 'var(--g)' }}>— fetched live via Claude MCP</span>
      </div>

      {/* Ticket Grid */}
      <div className="ticket-grid">
        {liveTickets.map((t) => (
          <div key={t.id} className={`tc-card${selected && selected.id === t.id ? ' selected' : ''}`} onClick={() => selectTicket(t)}>
            <div className="tc-id">
              {t.id}
              {t.fromPhase1 && <span className="badge b-ai" style={{ marginLeft: '6px' }}>✦ Phase 1</span>}
            </div>
            <div className="tc-title">{t.title}</div>
            <div className="tc-meta">
              <span className={`badge ${tc(t.type)}`}>{t.type}</span>
              {t.priority && t.priority !== '-' && <span className="badge b-med">{t.priority}</span>}
              <span className="badge b-task">{t.status}</span>
            </div>
            <div className="tc-desc">{t.ac && t.ac.length > 0 ? `${t.ac.length} AC` : 'No AC — generic tests'}</div>
          </div>
        ))}
      </div>

      {/* Selected Detail */}
      {selected && (
        <div className={`sel-detail show`}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '9px' }}>
            <div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: '10px', color: 'var(--g)', marginBottom: '2px' }}>{selected.id} · {selected.status}</div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>{selected.title}</div>
            </div>
            <a href={`https://vcmanoj.atlassian.net/browse/${selected.id}`} target="_blank" rel="noreferrer" style={{ fontSize: '9px', color: 'var(--muted)', textDecoration: 'none', fontFamily: 'var(--fm)', flexShrink: 0 }}>↗ Jira</a>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '9px' }}>
            <span className={`badge ${tc(selected.type)}`}>{selected.type}</span>
            {selected.priority && selected.priority !== '-' && <span className="badge b-med">{selected.priority}</span>}
            <span className="badge b-task">{selected.assignee}</span>
            {selected.fromPhase1 && <span className="badge b-ai">✦ From Phase 1</span>}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--dim)', fontWeight: 300, lineHeight: 1.7, marginBottom: '10px' }}>{selected.description}</div>
          <div style={{ fontSize: '9px', fontFamily: 'var(--fm)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '5px' }}>
            {selected.ac && selected.ac.length > 0 ? `Acceptance Criteria (${selected.ac.length})` : 'No acceptance criteria — generic tests will run'}
          </div>
          {selected.ac && selected.ac.length > 0 && (
            <ul className="ac-list">
              {selected.ac.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Run Section */}
      {selected && (
        <>
          <div className="card" style={{ marginBottom: '12px' }}>
            <div className="ch"><div className="ct">🌐 Test Environment</div></div>
            <div className="cb" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Target Base URL</label>
                <input
                  type="text"
                  value={testEnv.targetUrl}
                  onChange={(e) => setTestEnv((p) => ({ ...p, targetUrl: e.target.value }))}
                  placeholder="https://qa.your-app.com (or leave empty to use backend .env)"
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Auth Token (optional)</label>
                <input
                  type="password"
                  value={testEnv.authToken}
                  onChange={(e) => setTestEnv((p) => ({ ...p, authToken: e.target.value }))}
                  placeholder="Bearer token value"
                />
              </div>
            </div>
          </div>

          <div className="run-section">
            <select className="depth-sel" value={depth} onChange={(e) => setDepth(e.target.value)}>
              <option value="smoke">🔥 Smoke</option>
              <option value="regression">🔁 Regression</option>
              <option value="full">⚡ Full</option>
            </select>
            <button className="btn-run primary" disabled={runBtnLoading} onClick={() => runPipeline(false)}>
              <span>{runBtnLoading ? '⏳' : '▶'}</span>
              <span>{runBtnLoading ? 'Running...' : 'Run QA & Show Results'}</span>
            </button>
            <button className="btn-run secondary" disabled={runBtnLoading} onClick={() => runPipeline(true)}>
              <span>{runBtnLoading ? '⏳' : '🧠'}</span>
              <span>{runBtnLoading ? 'Running...' : 'Run QA · Fix · Re-run'}</span>
            </button>
          </div>
        </>
      )}

      {/* Running Box */}
      {runningVisible && (
        <div className="running-box">
          <SpinnerSVG />
          <div className="ldr" style={{ marginBottom: '11px' }}>
            <div className="dots"><div className="da" /><div className="da" /><div className="da" /></div>
            <span>{runMsg}</span>
          </div>
          <div style={{ maxWidth: '300px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontFamily: 'var(--fm)', color: 'var(--muted)', marginBottom: '4px' }}>
              <span>{runProgress.msg}</span><span>{Math.round(runProgress.pct)}%</span>
            </div>
            <div className="pw" style={{ height: '5px' }}>
              <div className="pb" style={{ width: runProgress.pct + '%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {resultsVisible && (
        <div>
          {/* Result Banner */}
          {resultBannerData && (
            <div className={`result-banner ${resultBannerData.type === 'pass' ? 'pass-banner' : 'fail-banner'}`}>
              <div className="rb-icon">{resultBannerData.type === 'pass' ? '✓' : '⚠'}</div>
              <div className="rb-title" style={{ color: resultBannerData.type === 'pass' ? 'var(--g)' : 'var(--fail)' }}
                dangerouslySetInnerHTML={{ __html: resultBannerData.lbl }} />
              <div className="rb-sub">{resultBannerData.sub}</div>
            </div>
          )}

          {/* Metrics */}
          <div className="metrics">
            <div className="metric"><div className="m-label">Total</div><div className="m-value mv-w">{metricsData.tot}</div><div className="m-sub">{metricsData.dep}</div></div>
            <div className="metric"><div className="m-label">Passed</div><div className="m-value mv-g">{metricsData.pas}</div><div className="m-sub">{metricsData.pasP}</div></div>
            <div className="metric"><div className="m-label">Failed</div><div className="m-value mv-r">{metricsData.fai}</div><div className="m-sub">{metricsData.faiP}</div></div>
            <div className="metric"><div className="m-label">Duration</div><div className="m-value mv-b">{metricsData.dur}</div><div className="m-sub">seconds</div></div>
          </div>

          {/* Pass Rate Bar */}
          <div style={{ marginBottom: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontFamily: 'var(--fm)', color: 'var(--muted)', marginBottom: '4px' }}>
              <span>Pass rate</span><span>{metricsData.passRate}%</span>
            </div>
            <div className="pw" style={{ height: '5px' }}>
              <div className="pb" style={{ width: metricsData.passRate + '%' }} />
            </div>
          </div>

          {/* AI Analysis Box */}
          {aiBoxData.visible && (
            <div className="ai-box">
              <div className="ai-hdr">🧠 Claude AI · Failure Analysis</div>
              <div className="ai-body">{aiBoxData.txt}</div>
            </div>
          )}

          {/* Test Results Table */}
          <div className="tbl-wrap">
            <div className="tbl-head">
              <span style={{ fontSize: '10px', fontFamily: 'var(--fm)', color: 'var(--muted)' }}>Test Results</span>
              <div style={{ display: 'flex', gap: '7px' }}>
                <button className="btn-sm" onClick={exportCSV}>↓ CSV</button>
                <button className="btn-sm" onClick={dlReport}>↓ PDF Report</button>
                <button className="btn-sm" onClick={() => runPipeline(false)}>↻ Re-run</button>
              </div>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: '62px' }}>ID</th>
                  <th>Test Case</th>
                  <th style={{ width: '74px' }}>Type</th>
                  <th style={{ width: '70px' }}>Status</th>
                  <th style={{ width: '56px' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t) => (
                  <tr key={t.id}>
                    <td><span style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--muted)' }}>{t.id}</span></td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '11px' }}>{t.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: '2px', fontWeight: 300 }}>{t.desc}</div>
                    </td>
                    <td><span className="badge b-task" style={{ fontSize: '7px' }}>{t.type}</span></td>
                    <td><StatusBadge status={t.status || 'pending'} /></td>
                    <td style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--muted)' }}>{t.duration || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Console */}
      <div className="card" style={{ marginTop: '14px' }}>
        <div className="ch">
          <div className="ct">Console</div>
          <button className="btn-sm" onClick={() => setCon2Logs([])}>Clear</button>
        </div>
        <div className="cb" style={{ padding: 0 }}>
          <div className="console" style={{ border: 'none', borderRadius: 0, height: '200px' }}>
            {con2Logs.map((entry, i) => (
              <div className="log" key={i}>
                <span className="lt">{entry.t}</span>
                <span className={`l${entry.lv}`}>[{entry.lv.toUpperCase().padEnd(5)}]</span>
                <span className="lm">{entry.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
