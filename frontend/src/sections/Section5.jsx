import { useApp } from '../context/AppContext';

export default function Section5() {
  const { reportState, dlReport, results } = useApp();
  const { empty, generating, body } = reportState;

  return (
    <>
      <div className="s-hero">
        <div className="hero-tag">✦ Phase 5 · Final Report</div>
        <h2><span className="dim">TEST</span> <span className="acc">REPORT</span></h2>
        <p>Complete test run summary with all results, fix attempts, and Claude AI analysis. Download as PDF.</p>
      </div>

      {empty && (
        <div className="empty">
          <div className="ei">📊</div>
          <p>Run tests in Phase 2 to generate a full report here.</p>
        </div>
      )}

      {!empty && generating && (
        <div style={{ background: 'var(--card)', border: '1px solid rgba(167,139,250,.2)', borderRadius: '13px', padding: '28px', textAlign: 'center' }}>
          <svg width="36" height="36" viewBox="0 0 48 48" style={{ animation: 'spin 1s linear infinite', marginBottom: '14px' }}>
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(167,139,250,.2)" strokeWidth="3" />
            <path d="M24 4 A20 20 0 0 1 44 24" fill="none" stroke="var(--ai)" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div style={{ fontFamily: 'var(--fh)', fontSize: '16px', letterSpacing: '2px', color: 'var(--ai)', marginBottom: '6px' }}>GENERATING AI REPORT</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--fm)' }}>Claude AI is analysing test results, failures, and fix attempts...</div>
        </div>
      )}

      {!empty && !generating && body && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontFamily: 'var(--fh)', fontSize: '18px', letterSpacing: '1px' }}>Full Test Report</div>
            <button className="btn btn-g" style={{ width: 'auto', padding: '10px 20px' }} onClick={dlReport}>↓ Download PDF</button>
          </div>

          {/* Report Header */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '13px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '10px', fontFamily: 'var(--fm)', color: 'var(--g)', marginBottom: '3px' }}>AutoQA Report · {body.ticket.id} · QA Bot</div>
                <div style={{ fontSize: '17px', fontWeight: 700, lineHeight: 1.3, marginBottom: '6px' }}>{body.ticket.title}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  <span className="badge b-feat">{body.ticket.type}</span>
                  {body.ticket.priority && body.ticket.priority !== '-' && <span className="badge b-high">{body.ticket.priority}</span>}
                  <span className="badge b-task">{body.ticket.assignee}</span>
                  <span className="badge b-ai">✦ Claude AI Report</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                <div className={`tsb ${body.r.fail > 0 ? 's-fail' : 's-pass'}`} style={{ fontSize: '11px', padding: '6px 12px', marginBottom: '6px' }}>
                  <span className="dot" />{body.r.fail > 0 ? 'FAILED' : 'PASSED'}
                </div>
                <div style={{ fontSize: '9px', fontFamily: 'var(--fm)', color: 'var(--muted)' }}>{body.now}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '7px', marginBottom: '12px' }}>
              {[['Total', body.r.total, 'var(--text)'], ['Passed', body.r.pass, 'var(--g)'], ['Failed', body.r.fail, body.r.fail > 0 ? 'var(--fail)' : 'var(--muted)'], ['Pass Rate', body.r.passRate + '%', 'var(--info)'], ['Duration', body.r.duration + 's', 'var(--info)']].map(([l, v, c]) => (
                <div key={l} style={{ background: 'var(--card2)', borderRadius: '8px', padding: '9px', textAlign: 'center' }}>
                  <div style={{ fontSize: '19px', fontWeight: 700, color: c, fontFamily: 'var(--fh)' }}>{v}</div>
                  <div style={{ fontSize: '8px', color: 'var(--muted)', fontFamily: 'var(--fm)', marginTop: '2px' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontFamily: 'var(--fm)', color: 'var(--muted)', marginBottom: '5px' }}>
              <span>Pass rate</span><span>{body.r.passRate}%</span>
            </div>
            <div className="pw" style={{ height: '6px' }}>
              <div className="pb" style={{ width: body.r.passRate + '%', background: body.r.passRate >= 80 ? 'var(--g)' : body.r.passRate >= 60 ? 'var(--warn)' : 'var(--fail)' }} />
            </div>
          </div>

          {/* AI Narrative Sections */}
          {body.sections.map((s, i) => s.content ? (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: '13px', padding: '18px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px' }}>
                <div style={{ width: '3px', height: '20px', background: s.color, borderRadius: '2px', flexShrink: 0 }} />
                <div style={{ fontFamily: 'var(--fh)', fontSize: '14px', letterSpacing: '1px', color: s.color }}>{s.title}</div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--dim)', lineHeight: 1.8, fontWeight: 300, whiteSpace: 'pre-wrap' }}>{s.content.trim()}</div>
            </div>
          ) : null)}

          {/* Failed Tests Detail */}
          {body.failed.length > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid rgba(255,69,69,.2)', borderRadius: '13px', padding: '18px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}>
                <div style={{ width: '3px', height: '20px', background: 'var(--fail)', borderRadius: '2px', flexShrink: 0 }} />
                <div style={{ fontFamily: 'var(--fh)', fontSize: '14px', letterSpacing: '1px', color: 'var(--fail)' }}>FAILED TEST DETAILS ({body.failed.length})</div>
              </div>
              {body.failed.map((x) => (
                <div key={x.id} style={{ background: 'rgba(255,69,69,.05)', border: '1px solid rgba(255,69,69,.15)', borderRadius: '9px', padding: '13px', marginBottom: '9px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--muted)' }}>{x.id}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{x.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge b-task" style={{ fontSize: '7px' }}>{x.type}</span>
                      <span style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--muted)' }}>{x.duration}s</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--fm)', fontSize: '10px', color: 'var(--fail)', background: 'rgba(0,0,0,.3)', padding: '8px', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>{x.error || 'Test failed'}</div>
                </div>
              ))}
            </div>
          )}

          {/* All Results Table */}
          <div className="tbl-wrap">
            <div className="tbl-head"><span style={{ fontSize: '10px', fontFamily: 'var(--fm)', color: 'var(--muted)' }}>All Test Results</span></div>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: '64px' }}>ID</th><th>Test Case</th><th style={{ width: '78px' }}>Type</th><th style={{ width: '72px' }}>Status</th><th style={{ width: '58px' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {body.tests.map((x) => (
                  <tr key={x.id}>
                    <td style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--muted)' }}>{x.id}</td>
                    <td style={{ fontSize: '10px', fontWeight: 500 }}>{x.name}</td>
                    <td><span className="badge b-task" style={{ fontSize: '7px' }}>{x.type}</span></td>
                    <td><span className={`tsb ${x.status === 'pass' ? 's-pass' : x.status === 'fail' ? 's-fail' : 's-pend'}`}><span className="dot" />{x.status}</span></td>
                    <td style={{ fontFamily: 'var(--fm)', fontSize: '9px', color: 'var(--muted)' }}>{x.duration || '—'}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
