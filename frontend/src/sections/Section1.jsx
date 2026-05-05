import { useApp } from '../context/AppContext';
import ConsoleLogs from '../components/ConsoleLogs';

const h = (s) => String(s || '');

function RecentTickets({ tickets, onRefresh }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '11px' }}>
        <span style={{ fontSize: '10px', fontFamily: 'var(--fm)', color: 'var(--muted)' }}>Live from vcmanoj.atlassian.net</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onRefresh}
            style={{ fontSize: '9px', fontFamily: 'var(--fm)', color: 'var(--g)', background: 'rgba(134,188,37,.08)', border: '1px solid rgba(134,188,37,.25)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}
          >↻ Refresh</button>
          <span style={{ fontSize: '9px', fontFamily: 'var(--fm)', color: 'rgba(134,188,37,.6)' }}>✦ Jira Live</span>
        </div>
      </div>
      {tickets.map((t) => {
        const col = t.type === 'Bug' ? 'var(--fail)' : t.type === 'Story' || t.type === 'Feature' ? 'var(--info)' : 'var(--g)';
        return (
          <div className="recent-ticket" key={t.id}>
            <div className="rt-dot" style={{ background: col }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1px' }}>
                <span className="rt-id">{t.id}</span>
                <span style={{ fontSize: '9px', fontFamily: 'var(--fm)', color: 'var(--muted)' }}>{t.status}</span>
              </div>
              <div className="rt-title">{t.title}</div>
              <div className="rt-meta">{t.assignee} · {t.type}</div>
            </div>
            <a href={`https://vcmanoj.atlassian.net/browse/${t.id}`} target="_blank" rel="noreferrer" style={{ fontSize: '9px', color: 'var(--muted)', textDecoration: 'none', flexShrink: 0 }}>↗</a>
          </div>
        );
      })}
    </div>
  );
}

export default function Section1() {
  const {
    s1State, streamTxt, ldrMsg, creatingMsg, creatingStep, prog, pvData, successData,
    aiBtnLoading, createBtnLoading, s1Tab, setS1Tab,
    form, setForm, liveTickets, con1Logs, setCon1Logs,
    generateAI, createTicket, regenerate, clearForm, createAnother, goToSection, refreshTickets,
  } = useApp();

  const tc = (type) => type === 'Bug' ? 'b-bug' : type === 'Story' ? 'b-story' : 'b-feat';

  return (
    <>
      <div className="s-hero">
        <div className="hero-tag">✦ Claude AI · Atlassian MCP · Live Jira</div>
        <h2><span className="dim">CREATE</span> <span className="acc">JIRA</span> <span className="dim">TICKET</span></h2>
        <p>Describe your feature. Claude structures it into a complete Jira ticket with acceptance criteria and creates it in your QA Bot project.</p>
      </div>

      <div className="col2">
        {/* LEFT */}
        <div>
          {/* AI Prompt Card */}
          <div className="card">
            <div className="ch"><div className="ct" style={{ color: 'var(--ai)' }}>🧠 AI Prompt</div></div>
            <div className="cb">
              <div className="field">
                <label>Describe your feature or bug</label>
                <div className="ai-wrap">
                  <textarea
                    value={form.aiPrompt}
                    onChange={(e) => setForm((f) => ({ ...f, aiPrompt: e.target.value }))}
                    placeholder="e.g. Add a forgot password flow so users can reset via email link..."
                  />
                  <span className="ai-hint">AI PROMPT</span>
                </div>
              </div>
              <button className="btn btn-ai" disabled={aiBtnLoading} onClick={generateAI}>
                <span>{aiBtnLoading ? '⏳' : '✦'}</span>
                <span>{aiBtnLoading ? 'Thinking...' : 'Generate with Claude AI'}</span>
              </button>
            </div>
          </div>

          {/* Ticket Config Card */}
          <div className="card">
            <div className="ch">
              <div className="ct">⚡ Ticket Config</div>
              <button className="btn-sm" onClick={clearForm}>Clear</button>
            </div>
            <div className="cb">
              <div className="field">
                <label>Summary</label>
                <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Brief description..." />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Type</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                    <option>Story</option><option>Bug</option><option>Task</option><option>Feature</option>
                  </select>
                </div>
                <div className="field">
                  <label>Priority</label>
                  <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                    <option>Medium</option><option>High</option><option>Critical</option><option>Low</option>
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Story Points</label>
                  <select value={form.storyPoints} onChange={(e) => setForm((f) => ({ ...f, storyPoints: e.target.value }))}>
                    <option value="1">1 — Trivial</option><option value="2">2 — Small</option>
                    <option value="3">3 — Medium</option><option value="5">5 — Large</option>
                    <option value="8">8 — Very Large</option><option value="13">13 — Epic</option>
                  </select>
                </div>
                <div className="field">
                  <label>Assignee</label>
                  <select value={form.assignee} onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}>
                    <option value="712020:daa1ca68-274c-45d2-9510-3099daa723d6">Manoj Chandran</option>
                    <option value="">Unassigned</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Detailed description..." />
              </div>
              <div className="field">
                <label>Acceptance Criteria</label>
                <textarea
                  value={form.ac}
                  onChange={(e) => setForm((f) => ({ ...f, ac: e.target.value }))}
                  placeholder={'• Criterion 1\n• Criterion 2'}
                  style={{ minHeight: '100px' }}
                />
              </div>
              <hr className="divider" />
              {prog.visible && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontFamily: 'var(--fm)', color: 'var(--muted)', marginBottom: '4px' }}>
                    <span>{prog.msg}</span><span>{prog.pct}%</span>
                  </div>
                  <div className="pw"><div className="pb" style={{ width: prog.pct + '%' }} /></div>
                </div>
              )}
              <button className="btn btn-g" disabled={createBtnLoading} onClick={createTicket}>
                <span>{createBtnLoading ? '⏳' : '▶'}</span>
                <span>{createBtnLoading ? 'Creating...' : 'Create Ticket in Jira'}</span>
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="card">
            <div className="ch"><div className="ct">⚙ Settings</div></div>
            <div className="cb" style={{ padding: '12px 17px' }}>
              <div className="sr">
                <span>Notify Slack on creation</span>
                <label className="tog"><input type="checkbox" /><div className="tog-bg" /><div className="tog-dot" /></label>
              </div>
              <div className="sr" style={{ border: 'none' }}>
                <span>AI generate acceptance criteria</span>
                <label className="tog"><input type="checkbox" defaultChecked /><div className="tog-bg" /><div className="tog-dot" /></label>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div>
          <div className="card" style={{ minHeight: '520px' }}>
            <div className="tabs">
              {['preview', 'console', 'recent'].map((tab) => (
                <div key={tab} className={`tab${s1Tab === tab ? ' active' : ''}`} onClick={() => setS1Tab(tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </div>
              ))}
            </div>

            {/* Preview tab */}
            <div className={`tp${s1Tab === 'preview' ? ' active' : ''}`}>
              <div className="cb">
                {s1State === 's1Empty' && (
                  <div>
                    <div className="empty">
                      <div className="ei">🤖</div>
                      <p>Describe your feature and click<br /><strong style={{ color: 'var(--text)' }}>Generate with Claude AI</strong></p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px 0', flexWrap: 'wrap' }}>
                      {[['🧠', 'Claude AI', 'rgba(167,139,250,.1)', 'rgba(167,139,250,.25)'], ['⚡', 'MCP', 'rgba(134,188,37,.08)', 'var(--border)'], ['🎯', 'Jira', 'rgba(56,189,248,.08)', 'rgba(56,189,248,.2)']].map(([icon, lbl, bg, border], i) => (
                        <span key={lbl} style={{ display: 'contents' }}>
                          {i > 0 && <div style={{ color: 'var(--border2)', fontSize: '14px' }}>→</div>}
                          <div style={{ textAlign: 'center', fontSize: '10px', fontFamily: 'var(--fm)', color: 'var(--muted)' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', margin: '0 auto 5px' }}>{icon}</div>
                            {lbl}
                          </div>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {s1State === 's1Generating' && (
                  <div>
                    <div className="ai-stream">
                      <div className="ai-lbl"><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ai)', display: 'inline-block' }} />Claude AI · Generating</div>
                      <div className="stream-text">{streamTxt}</div>
                      <span className="cursor" />
                    </div>
                    <div className="ldr">
                      <div className="dots"><div className="da" /><div className="da" /><div className="da" /></div>
                      <span>{ldrMsg}</span>
                    </div>
                  </div>
                )}

                {s1State === 's1Ticket' && (
                  <div>
                    <div className="ticket-preview">
                      <div className="tp-id">SCRUM-NEXT · QA Bot</div>
                      <div className="tp-title">{pvData.title}</div>
                      <div className="tp-badges">
                        {pvData.badges && pvData.badges.map((b, i) => (
                          <span key={i} className={`badge ${b.cls}`}>{b.label}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--dim)', marginBottom: '9px', fontWeight: 300 }}>{pvData.desc}</div>
                      <div style={{ fontSize: '9px', fontFamily: 'var(--fm)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '5px' }}>Acceptance Criteria</div>
                      <ul className="ac-list">
                        {pvData.ac && pvData.ac.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
                      <button className="btn btn-g" onClick={createTicket}><span>▶</span> Create in Jira</button>
                      <button className="btn-sm" style={{ justifyContent: 'center' }} onClick={regenerate}>↻ Regenerate</button>
                    </div>
                  </div>
                )}

                {s1State === 's1Creating' && (
                  <div style={{ textAlign: 'center', padding: '28px 0' }}>
                    <svg width="44" height="44" viewBox="0 0 48 48" style={{ animation: 'spin 1s linear infinite', marginBottom: '14px' }}>
                      <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(134,188,37,.2)" strokeWidth="3" />
                      <path d="M24 4 A20 20 0 0 1 44 24" fill="none" stroke="var(--g)" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <div style={{ fontFamily: 'var(--fh)', fontSize: '16px', letterSpacing: '2px', color: 'var(--g)', marginBottom: '4px' }}>{creatingMsg}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--fm)' }}>{creatingStep}</div>
                  </div>
                )}

                {s1State === 's1Success' && (
                  <div>
                    <div className="success-card">
                      <div className="si">✓</div>
                      <div className="st">TICKET CREATED</div>
                      <div className="ss">{successData.msg}</div>
                      <a href={successData.link} className="ticket-link" target="_blank" rel="noreferrer">
                        <span>🎯</span><span>{successData.linkTxt}</span><span>{successData.link === '#' ? '' : '↗'}</span>
                      </a>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px', marginTop: '13px' }}>
                      <button className="btn btn-g" onClick={() => goToSection(2)}><span>▶</span> Run AutoQA Tests</button>
                      <button className="btn-sm" style={{ justifyContent: 'center' }} onClick={createAnother}>+ Create Another</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Console tab */}
            <div className={`tp${s1Tab === 'console' ? ' active' : ''}`}>
              <div className="cb">
                <ConsoleLogs logs={con1Logs} onClear={() => setCon1Logs([])} />
              </div>
            </div>

            {/* Recent tab */}
            <div className={`tp${s1Tab === 'recent' ? ' active' : ''}`}>
              <div className="cb">
                <RecentTickets tickets={liveTickets} onRefresh={refreshTickets} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
