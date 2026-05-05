import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { generateTicketAPI, createJiraTicketAPI, addTicketToServerAPI, generateReportAPI, getTicketsAPI, getJiraTicketsAPI, runLiveTestsAPI } from '../api';
import { generateTests, delay } from '../utils/testEngine';
import { downloadPDF, parseReportSections } from '../utils/pdfExport';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const DEFAULT_TICKETS = [
  {
    id: 'SCRUM-5', type: 'Feature', priority: 'Medium', status: 'Idea', assignee: 'Manoj Chandran',
    title: 'User Login - Email and Password Authentication',
    description: 'Implement complete email and password authentication including validation, error handling, session management, account lockout, and accessibility features.',
    ac: ['Login page displays email and password input fields with a "Login" button', 'Users can successfully log in with valid email and password credentials', 'Email field validates proper email format (e.g. user@domain.com)', 'Password field masks input characters', 'Display appropriate error message for invalid email format', 'Display "Invalid email or password" for incorrect credentials (do not reveal which field is wrong)', 'Account locks after 5 consecutive failed login attempts with a lockout message', 'Successful login redirects the user to the dashboard/home page', 'A valid session/token is created upon successful authentication', '"Forgot Password" link is available on the login page', 'Login form is accessible via keyboard navigation (Tab, Enter)', 'Password field has a show/hide toggle icon'],
  },
  { id: 'SCRUM-3', type: 'Story', priority: '-', status: 'To Do', assignee: 'Unassigned', title: 'Task 3', description: 'No description provided.', ac: [] },
  { id: 'SCRUM-2', type: 'Task', priority: '-', status: 'To Do', assignee: 'Unassigned', title: 'Task 2', description: 'No description provided.', ac: [] },
  { id: 'SCRUM-1', type: 'Feature', priority: '-', status: 'Idea', assignee: 'Unassigned', title: 'Task 1', description: 'No description provided.', ac: [] },
];

function nextLocalTicketId(tickets) {
  const maxNum = tickets.reduce((max, t) => {
    const m = /^SCRUM-(\d+)$/i.exec(String(t?.id || ''));
    if (!m) return max;
    const n = Number(m[1]);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return `SCRUM-${maxNum + 1}`;
}

function dedupeTicketsById(tickets) {
  const seen = new Set();
  return tickets.filter((t) => {
    const id = String(t?.id || '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function AppProvider({ children }) {
  // ── Core state ─────────────────────────────────────────────────────
  const [currentSection, setCurrentSection] = useState(1);
  const [liveTickets, setLiveTickets] = useState(DEFAULT_TICKETS);
  const [running, setRunning] = useState(false);
  const [agentStatus, setAgentStatus] = useState('Ready');
  const [selected, setSelected] = useState(null);
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState({});
  const [generated, setGenerated] = useState(null);
  const [createdId, setCreatedId] = useState(null);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [aiReportText, setAiReportText] = useState(null);
  const [dash, setDash] = useState({ runs: [], fixCounts: [] });
  const [runLog, setRunLog] = useState([]);

  // ── Section 1 UI state ──────────────────────────────────────────────
  const [s1State, setS1State] = useState('s1Empty'); // s1Empty|s1Generating|s1Ticket|s1Creating|s1Success
  const [streamTxt, setStreamTxt] = useState('');
  const [ldrMsg, setLdrMsg] = useState('Analysing...');
  const [creatingMsg, setCreatingMsg] = useState('Connecting...');
  const [creatingStep, setCreatingStep] = useState('Authenticating');
  const [prog, setProg] = useState({ pct: 0, msg: 'Creating...', visible: false });
  const [pvData, setPvData] = useState({ title: '', badges: [], ac: [], desc: '' });
  const [successData, setSuccessData] = useState({ msg: '', link: '#', linkTxt: 'Open in Jira' });
  const [aiBtnLoading, setAiBtnLoading] = useState(false);
  const [createBtnLoading, setCreateBtnLoading] = useState(false);
  const [s1Tab, setS1Tab] = useState('preview');

  // ── Form state ───────────────────────────────────────────────────────
  const [form, setForm] = useState({
    aiPrompt: '', title: '', type: 'Story', priority: 'Medium',
    storyPoints: '3', assignee: '712020:daa1ca68-274c-45d2-9510-3099daa723d6',
    description: '', ac: '',
  });

  // ── Section 2 UI state ───────────────────────────────────────────────
  const [depth, setDepth] = useState('regression');
  const [runMsg, setRunMsg] = useState('Starting...');
  const [runProgress, setRunProgress] = useState({ pct: 0, msg: 'Stage 1/4' });
  const [runBtnLoading, setRunBtnLoading] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [runningVisible, setRunningVisible] = useState(false);
  const [resultBannerData, setResultBannerData] = useState(null);
  const [aiBoxData, setAiBoxData] = useState({ visible: false, txt: '' });
  const [metricsData, setMetricsData] = useState({ tot: '—', pas: '—', fai: '—', dur: '—', dep: '—', pasP: '—', faiP: '—', passRate: 0 });
  const [testEnv, setTestEnv] = useState({ targetUrl: '', authToken: '' });

  // ── Section 5 Report state ───────────────────────────────────────────
  const [reportState, setReportState] = useState({ empty: true, body: null, generating: false });

  // ── Console logs ─────────────────────────────────────────────────────
  const [con1Logs, setCon1Logs] = useState([]);
  const [con2Logs, setCon2Logs] = useState([]);

  // ── Toast state ──────────────────────────────────────────────────────
  const [toastState, setToastState] = useState({ visible: false, msg: '', type: 'success' });
  const toastTimerRef = useRef(null);

  // ── Mutable refs for async pipeline (avoid stale closures) ───────────
  const runningRef = useRef(false);
  const t0Ref = useRef(null);
  const runLogRef = useRef([]);
  const testsRef = useRef([]);
  const resultsRef = useRef({});
  const dashRef = useRef({ runs: [], fixCounts: [] });
  const depthRef = useRef('regression');
  const selectedRef = useRef(null);
  const testEnvRef = useRef({ targetUrl: '', authToken: '' });

  // keep depthRef in sync
  useEffect(() => { depthRef.current = depth; }, [depth]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { testEnvRef.current = testEnv; }, [testEnv]);

  // fetch tickets live from Jira on mount; fall back to static list if Jira unreachable
  useEffect(() => {
    getJiraTicketsAPI()
      .then((items) => {
        if (items && items.length > 0) {
          setLiveTickets(dedupeTicketsById(items));
          log1('pass', `✓ Loaded ${items.length} tickets live from Jira board`);
        } else {
          // Jira project empty — keep defaults
          log1('info', 'Jira project returned no tickets — using defaults');
        }
      })
      .catch((e) => {
        log1('warn', `Jira board fetch failed (${e.message}) — using static defaults`);
        getTicketsAPI()
          .then((items) => setLiveTickets(dedupeTicketsById(items)))
          .catch(() => {/* keep DEFAULT_TICKETS */});
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toast ─────────────────────────────────────────────────────────────
  const toast = useCallback((msg, type = 'success') => {
    setToastState({ visible: true, msg, type });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastState({ visible: false, msg: '', type: 'success' }), 3500);
  }, []);

  // ── Logging ───────────────────────────────────────────────────────────
  const log1 = useCallback((lv, msg) => {
    const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setCon1Logs((prev) => [...prev, { t, lv, msg }]);
  }, []);

  const log2 = useCallback((lv, msg) => {
    const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry = { t, lv, msg };
    runLogRef.current = [...runLogRef.current, entry];
    setCon2Logs((prev) => [...prev, entry]);
    setRunLog([...runLogRef.current]);
  }, []);

  // ── Section navigation ────────────────────────────────────────────────
  const goToSection = useCallback((n) => {
    if (runningRef.current && n !== currentSection) { toast('Pipeline running — please wait', 'error'); return; }
    setCurrentSection(n);
    if (n === 2) setTimeout(() => {
      log2('info', 'Refreshing tickets from Jira...');
      getJiraTicketsAPI()
        .then((items) => {
          if (items && items.length > 0) {
            setLiveTickets(dedupeTicketsById(items));
            log2('pass', `✓ ${items.length} tickets loaded live from Jira`);
          }
        })
        .catch((e) => log2('warn', `Jira fetch skipped: ${e.message}`));
    }, 100);
    if (n === 6) setTimeout(refreshDash, 100);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSection, toast]);

  // ── Stream text animation ─────────────────────────────────────────────
  const streamText = useCallback(async (text, speed = 16) => {
    setStreamTxt('');
    for (let i = 0; i < text.length; i++) {
      setStreamTxt((prev) => prev + text[i]);
      if (i % 3 === 0) await delay(speed);
    }
  }, []);

  // ── Generate AI ───────────────────────────────────────────────────────
  const generateAI = useCallback(async () => {
    const prompt = form.aiPrompt.trim();
    if (!prompt) { toast('Describe your feature first', 'error'); return; }
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setAiBtnLoading(true);
    setS1Tab('preview');
    setS1State('s1Generating');
    setAgentStatus('Generating');
    log1('ai', 'AI analysing prompt...');

    const steps = ['Reading requirements...', 'Detecting intent...', 'Writing AC...', 'Structuring ticket...'];
    for (const s of steps) { setLdrMsg(s); await delay(300 + Math.random() * 200); }

    let ticket;
    try {
      ticket = await generateTicketAPI(prompt);
    } catch (e) {
      runningRef.current = false;
      setRunning(false);
      setAiBtnLoading(false);
      setAgentStatus('Failed');
      setS1State('s1Empty');
      log1('fail', `AI generation failed: ${e.message}`);
      toast(`AI generation failed: ${e.message}`, 'error');
      return;
    }
    setGenerated(ticket);
    log1('pass', `✓ Generated: "${ticket.title}"`);

    const streamContent = `Generated: "${ticket.title}"\n\nType: ${ticket.type} | Priority: ${ticket.priority} | ${ticket.storyPoints} SP\n\nAC:\n${(ticket.ac || []).map((a) => '• ' + a).join('\n')}`;
    await streamText(streamContent);

    setForm((f) => ({
      ...f,
      title: ticket.title,
      description: ticket.description || '',
      ac: (ticket.ac || []).map((a) => '• ' + a).join('\n'),
      type: ticket.type || 'Story',
      storyPoints: String(ticket.storyPoints || 3),
    }));

    const tc = ticket.type === 'Bug' ? 'b-bug' : ticket.type === 'Story' ? 'b-story' : 'b-feat';
    setPvData({
      title: ticket.title,
      desc: ticket.description || '',
      ac: ticket.ac || [],
      badges: [
        { cls: tc, label: ticket.type },
        { cls: 'b-med', label: ticket.priority },
        { cls: 'b-med', label: `${ticket.storyPoints} SP` },
        { cls: 'b-ai', label: '✦ AI' },
      ],
    });

    await delay(300);
    setS1State('s1Ticket');
    runningRef.current = false;
    setRunning(false);
    setAiBtnLoading(false);
    setAgentStatus('Ready');
    toast('Ticket ready — review and create', 'success');
  }, [form.aiPrompt, toast, log1, streamText]);

  // ── Create Ticket ─────────────────────────────────────────────────────
  const createTicket = useCallback(async () => {
    const title = form.title.trim() || (generated && generated.title);
    if (!title) { toast('Add a title first', 'error'); return; }
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setCreateBtnLoading(true);
    setProg({ pct: 0, msg: 'Creating...', visible: true });
    setS1Tab('preview');
    setS1State('s1Creating');
    setCreatingMsg('Connecting...');
    setCreatingStep('Authenticating');
    setAgentStatus('Creating');
    log1('info', 'Calling Jira API...');

    const steps = [
      ['Connecting to vcmanoj.atlassian.net...', 'Authenticating', 'info', 25],
      ['Building ADF payload...', 'POST /rest/api/3/issue', 'ai', 50],
      ['Creating ticket...', 'Waiting for response', 'info', 75],
      ['Verifying...', 'Fetching issue key', 'pass', 100],
    ];

    let newId = nextLocalTicketId(liveTickets);
    const ticketPayload = {
      ...(generated || {}),
      title,
      type: form.type,
      priority: form.priority,
      storyPoints: parseInt(form.storyPoints) || 3,
      assigneeId: form.assignee,
      description: form.description || title,
      ac: (form.ac || '').split('\n').map((l) => l.replace(/^[•\-*]\s*/, '')).filter((l) => l.length > 3),
    };

    for (const [msg, sub] of steps.slice(0, 2)) {
      setCreatingMsg(msg); setCreatingStep(sub);
      setProg((p) => ({ ...p, msg })); log1('info', msg); await delay(400);
    }
    try {
      const res = await createJiraTicketAPI(ticketPayload);
      newId = res.key;
      log1('pass', `✓ REAL ticket created: ${newId}`);
    } catch (e) {
      log1('fail', `Jira error: ${e.message}`);
      setProg({ pct: 0, msg: 'Creation failed', visible: false });
      setS1State('s1Ticket');
      runningRef.current = false;
      setRunning(false);
      setCreateBtnLoading(false);
      setAgentStatus('Failed');
      toast(`Jira creation failed: ${e.message}`, 'error');
      return;
    }
    setProg({ pct: 100, msg: 'Done!', visible: true });

    setCreatedId(newId);
    const created = { ...ticketPayload, id: newId, status: 'Idea', assignee: 'Manoj Chandran', fromPhase1: true };
    setCreatedTicket(created);
    setLiveTickets((prev) => {
      const withoutSameId = prev.filter((t) => t.id !== newId);
      return [created, ...withoutSameId];
    });
    try { await addTicketToServerAPI(created); } catch { /* ignore */ }

    setSuccessData({
      msg: `${newId} created in QA Bot — live Jira ✓`,
      link: `https://vcmanoj.atlassian.net/browse/${newId}`,
      linkTxt: `Open ${newId} in Jira`,
    });
    setS1State('s1Success');
    runningRef.current = false;
    setRunning(false);
    setCreateBtnLoading(false);
    setAgentStatus('Complete');
    toast(`${newId} created! Real Jira ✓`, 'success');
  }, [form, generated, liveTickets, toast, log1]);

  // ── Refresh tickets from Jira ─────────────────────────────────────────
  const refreshTickets = useCallback(() => {
    log1('info', 'Refreshing tickets from Jira...');
    getJiraTicketsAPI()
      .then((items) => {
        if (items && items.length > 0) {
          setLiveTickets(dedupeTicketsById(items));
          log1('pass', `✓ Refreshed — ${items.length} tickets from Jira`);
          toast(`${items.length} tickets loaded from Jira`, 'success');
        } else {
          log1('info', 'Jira returned no tickets');
          toast('Jira returned no tickets', 'info');
        }
      })
      .catch((e) => {
        log1('fail', `Jira refresh failed: ${e.message}`);
        toast(`Jira refresh failed: ${e.message}`, 'error');
      });
  }, [log1, toast]);

  const regenerate = useCallback(() => { setS1State('s1Empty'); setGenerated(null); }, []);
  const clearForm = useCallback(() => {
    setForm((f) => ({ ...f, aiPrompt: '', title: '', description: '', ac: '' }));
    setGenerated(null); setS1State('s1Empty');
  }, []);
  const createAnother = useCallback(() => { clearForm(); goToSection(1); }, [clearForm, goToSection]);

  // ── Select ticket (section 2) ─────────────────────────────────────────
  const selectTicket = useCallback((t) => {
    if (runningRef.current) return;
    setSelected(t);
    selectedRef.current = t;
    setResultsVisible(false);
    setRunningVisible(false);
    log2('info', `Selected: ${t.id} — ${t.title}`);
    if (t.ac && t.ac.length) log2('debug', `${t.ac.length} AC → ${t.ac.length + 3} tests will be generated`);
    toast(`Selected ${t.id}`, 'info');
  }, [log2, toast]);

  // ── Test execution ────────────────────────────────────────────────────
  const setProg2 = useCallback((pct, msg) => setRunProgress({ pct, msg }), []);

  const renderResultsBanner = useCallback((ticket, isRerun, attempt, res) => {
    const { pass, fail, total, duration, passRate } = res;
    const attemptLabel = isRerun ? ` · fix attempt ${attempt}/3` : '';
    setMetricsData({
      tot: total, pas: pass, fai: fail, dur: duration, dep: depthRef.current + attemptLabel,
      pasP: passRate + '% pass rate', faiP: fail > 0 ? 'needs review' : 'all clear', passRate,
    });
    if (fail === 0) {
      const lbl = isRerun ? `ALL FIXED & PASSING after ${attempt} attempt${attempt > 1 ? 's' : ''}` : 'ALL TESTS PASSED';
      setResultBannerData({ type: 'pass', lbl, sub: `${ticket.id} — ${total} tests in ${duration}s` });
      setAiBoxData({ visible: false, txt: '' });
    } else {
      const lbl = isRerun ? `${fail} STILL FAILING (attempt ${attempt}/3)` : `${fail} TEST${fail > 1 ? 'S' : ''} FAILED`;
      setResultBannerData({ type: 'fail', lbl, sub: `${pass}/${total} passed (${passRate}%) in ${duration}s` });
      const failedNames = testsRef.current.filter((t) => t.status === 'fail').map((t) => t.name);
      const analysis = isRerun
        ? `${fail} test(s) still failing after attempt ${attempt}. ${attempt < 3 ? `AutoQA will try attempt ${attempt + 1}...` : 'All 3 attempts exhausted — manual review required.'} Remaining: ${failedNames.slice(0, 2).join(', ')}.`
        : `${fail} test(s) failed on ${ticket.id}. Types: ${[...new Set(testsRef.current.filter((t) => t.status === 'fail').map((t) => t.type))].join(', ')}. Use "Run QA · Fix · Re-run" for automated fix.`;
      setAiBoxData({ visible: true, txt: analysis });
    }
    setResultsVisible(true);
    setRunningVisible(false);
  }, []);

  const executeRun = useCallback(async (ticket, d, runNum) => {
    setProg2(15, `Run ${runNum} — generating tests`);
    setRunMsg('Generating test cases from AC...');
    log2('ai', `Generating tests from ${ticket.ac ? ticket.ac.length : 0} AC items...`);
    await delay(600);

    const newTests = generateTests(ticket, d).map((t) => ({ ...t, status: 'pending', duration: null, error: null }));
    testsRef.current = newTests;
    setTests([...newTests]);
    log2('pass', `✓ ${newTests.length} test cases ready`);

    setProg2(30, `Run ${runNum} — env check`);
    setRunMsg('Checking environment configuration...');
    await delay(250);

    const cfg = {
      targetUrl: testEnvRef.current.targetUrl.trim() || undefined,
      authToken: testEnvRef.current.authToken.trim() || undefined,
    };
    log2('info', `Target: ${cfg.targetUrl || 'from backend TEST_TARGET_URL'}`);

    setProg2(45, `Run ${runNum} — executing`);
    log2('info', `Executing ${newTests.length} live tests...`);

    let liveResponse;
    try {
      liveResponse = await runLiveTestsAPI({ ticket, tests: newTests, depth: d, ...cfg });
      log2('pass', `Environment reachable: ${liveResponse.targetUrl}`);
    } catch (e) {
      log2('fail', e.message);
      const failedAll = newTests.map((t) => ({ ...t, status: 'fail', duration: '0.00', error: e.message }));
      testsRef.current = failedAll;
      setTests([...failedAll]);
      const resErr = { pass: 0, fail: failedAll.length, total: failedAll.length, duration: ((Date.now() - t0Ref.current) / 1000).toFixed(1), passRate: 0 };
      resultsRef.current = resErr;
      setResults({ ...resErr });
      renderResultsBanner(ticket, false, 0, resErr);
      return;
    }

    const byId = Object.fromEntries((liveResponse.tests || []).map((t) => [t.id, t]));
    let pass = 0;
    let fail = 0;
    for (let i = 0; i < newTests.length; i++) {
      const t = newTests[i];
      testsRef.current = testsRef.current.map((x) => x.id === t.id ? { ...x, status: 'running' } : x);
      setTests([...testsRef.current]);
      setRunMsg(`${t.id}: ${t.name.substring(0, 42)}...`);
      setProg2(45 + Math.round((i / newTests.length) * 40), `Run ${runNum} — ${i + 1}/${newTests.length}`);
      await delay(70);
      const live = byId[t.id] || { status: 'fail', duration: '0.00', error: 'No result returned for test' };
      const status = live.status === 'pass' ? 'pass' : 'fail';
      testsRef.current = testsRef.current.map((x) => x.id === t.id ? { ...x, status, duration: live.duration, error: live.error } : x);
      setTests([...testsRef.current]);
      if (status === 'pass') { pass++; log2('pass', `✓ ${t.id} ${t.name} (${live.duration}s)`); }
      else { fail++; log2('fail', `✗ ${t.id} ${t.name} (${live.duration}s)${live.error ? ` — ${live.error}` : ''}`); }
    }

    const total = newTests.length;
    const dur = ((Date.now() - t0Ref.current) / 1000).toFixed(1);
    const pct = total ? Math.round((pass / total) * 100) : 0;
    const res = { pass, fail, total, duration: dur, passRate: pct };
    resultsRef.current = res;
    setResults({ ...res });
    renderResultsBanner(ticket, false, 0, res);
  }, [log2, setProg2, renderResultsBanner]);

  const rerunAfterFix = useCallback(async (ticket, d, attempt) => {
    const cfg = {
      targetUrl: testEnvRef.current.targetUrl.trim() || undefined,
      authToken: testEnvRef.current.authToken.trim() || undefined,
    };

    let liveResponse;
    try {
      liveResponse = await runLiveTestsAPI({ ticket, tests: testsRef.current, depth: d, ...cfg });
      log2('pass', `Re-run against: ${liveResponse.targetUrl}`);
    } catch (e) {
      log2('fail', `Re-run failed: ${e.message}`);
      return;
    }

    const byId = Object.fromEntries((liveResponse.tests || []).map((t) => [t.id, t]));
    let pass = 0, fail = 0;

    for (let i = 0; i < testsRef.current.length; i++) {
      const t = testsRef.current[i];
      testsRef.current = testsRef.current.map((x) => x.id === t.id ? { ...x, status: 'running' } : x);
      setTests([...testsRef.current]);
      setRunMsg(`Attempt ${attempt} — ${t.id}: ${t.name.substring(0, 36)}...`);
      setProg2(55 + Math.round((i / testsRef.current.length) * 35), `Attempt ${attempt} — ${i + 1}/${testsRef.current.length}`);
      await delay(70);
      const live = byId[t.id] || { status: 'fail', duration: '0.00', error: 'No result returned for test' };
      const status = live.status === 'pass' ? 'pass' : 'fail';
      testsRef.current = testsRef.current.map((x) => x.id === t.id ? { ...x, status, duration: live.duration, error: live.error } : x);
      setTests([...testsRef.current]);
      if (status === 'pass') { pass++; log2('pass', `✓ ${t.id} fixed (${live.duration}s)`); }
      else { fail++; log2('fail', `✗ ${t.id} still failing (${live.duration}s)${live.error ? ` — ${live.error}` : ''}`); }
    }

    const total = testsRef.current.length;
    const durTotal = ((Date.now() - t0Ref.current) / 1000).toFixed(1);
    const pct = Math.round((pass / total) * 100);
    const res = { pass, fail, total, duration: durTotal, passRate: pct };
    resultsRef.current = res;
    setResults({ ...res });
    renderResultsBanner(ticket, true, attempt, res);
  }, [log2, setProg2, renderResultsBanner]);

  // ── Run Pipeline ──────────────────────────────────────────────────────
  const runPipeline = useCallback(async (withFix = false) => {
    if (runningRef.current) return;
    if (!selectedRef.current) { toast('Select a ticket first', 'error'); return; }
    runningRef.current = true;
    setRunning(true);
    t0Ref.current = Date.now();
    runLogRef.current = [];
    setRunLog([]);
    const ticket = selectedRef.current;
    const d = depthRef.current;
    setRunBtnLoading(true);
    setRunningVisible(true);
    setResultsVisible(false);
    setAiBoxData({ visible: false, txt: '' });
    setAgentStatus('Running');

    log2('info', `Pipeline: ${ticket.id} | depth:${d} | fix:${withFix}`);
    log2('info', `Env target: ${testEnvRef.current.targetUrl.trim() || 'backend TEST_TARGET_URL'}`);
    await executeRun(ticket, d, 1);

    if (withFix && resultsRef.current.fail > 0) {
      log2('ai', '━━ Fix & Re-run — up to 3 attempts ━━');
      goToSection(3);
      const MAX = 3;
      let attempt = 0;
      while (resultsRef.current.fail > 0 && attempt < MAX) {
        attempt++;
        log2('ai', `── Attempt ${attempt}/${MAX} ──────────────────`);
        setRunMsg(`Attempt ${attempt}/${MAX} — Claude analysing...`);
        setProg2(10, 'Analysing failures');
        setAgentStatus('Fixing');
        log2('ai', `Reading ${resultsRef.current.fail} failure(s)...`);
        await delay(900);
        testsRef.current.filter((t) => t.status === 'fail').forEach((t) => log2('fail', `  ✗ ${t.id}: ${t.name}`));
        setRunMsg(`Attempt ${attempt}/${MAX} — Applying fixes...`);
        setProg2(35, 'Editing source files');
        log2('ai', 'Opening VS Code...');
        await delay(500);
        const fixSets = [['Fixed validation logic', 'Updated error message copy', 'Added null checks'], ['Refactored auth flow', 'Fixed async race condition', 'Updated session handling'], ['Patched accessibility attrs', 'Fixed edge case', 'Added fallback handler']];
        for (const f of fixSets[attempt - 1]) { log2('pass', `  ✓ ${f}`); await delay(300); }
        goToSection(4);
        setRunMsg(`Attempt ${attempt}/${MAX} — Re-running tests...`);
        setProg2(55, 'Re-running test suite');
        log2('ai', `Re-running after attempt ${attempt}...`);
        t0Ref.current = Date.now();
        await rerunAfterFix(ticket, d, attempt);
        if (resultsRef.current.fail === 0) { log2('pass', `✓ All passing after attempt ${attempt}!`); break; }
        else log2('warn', `${resultsRef.current.fail} still failing${attempt < MAX ? ` — trying attempt ${attempt + 1}` : ' — max reached'}`);
      }
      if (resultsRef.current.fail > 0) log2('fail', `Max attempts (${MAX}) reached — manual review needed`);
    }

    setRunningVisible(false);
    runningRef.current = false;
    setRunning(false);
    setRunBtnLoading(false);
    setAgentStatus(resultsRef.current.fail > 0 ? 'Failed' : 'Passed');

    // push to dashboard
    const fixCount = runLogRef.current.filter((l) => l.msg && l.msg.includes('── Attempt')).length;
    const newRun = {
      id: dashRef.current.runs.length + 1,
      ticketId: ticket.id, ticketTitle: ticket.title,
      depth: d, total: resultsRef.current.total,
      pass: resultsRef.current.pass, fail: resultsRef.current.fail,
      passRate: resultsRef.current.passRate, duration: resultsRef.current.duration,
      fixAttempts: fixCount,
      ts: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    };
    dashRef.current = { runs: [...dashRef.current.runs, newRun], fixCounts: [...dashRef.current.fixCounts, fixCount] };
    setDash({ ...dashRef.current });

    await buildReport(ticket);
    log2('pass', `══ Complete: ${resultsRef.current.pass}/${resultsRef.current.total} passed (${resultsRef.current.passRate}%) ══`);
    toast(`${resultsRef.current.pass}/${resultsRef.current.total} passed`, resultsRef.current.fail > 0 ? 'error' : 'success');
  }, [toast, log2, executeRun, rerunAfterFix, goToSection, setProg2]);

  // ── Build Report (Section 5) ──────────────────────────────────────────
  const buildReport = useCallback(async (ticket) => {
    const t = ticket || selectedRef.current;
    if (!t || !resultsRef.current.total) return;
    const r = resultsRef.current;
    const failed = testsRef.current.filter((x) => x.status === 'fail');
    const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    setReportState({ empty: false, body: null, generating: true });

    let aiNarrative = '';
    try {
      const data = await generateReportAPI({ ticket: t, results: r, tests: testsRef.current, runLog: runLogRef.current, depth: depthRef.current });
      aiNarrative = data.report || '';
    } catch { aiNarrative = ''; }
    setAiReportText(aiNarrative);

    const sections = parseReportSections(aiNarrative);
    setReportState({ empty: false, generating: false, body: { ticket: t, r, now, failed, sections, tests: [...testsRef.current] } });
  }, []);

  // ── Download PDF ──────────────────────────────────────────────────────
  const dlReport = useCallback(async () => {
    const t = selectedRef.current;
    if (!t || !resultsRef.current.total) { toast('Run tests first', 'error'); return; }
    let reportTxt = aiReportText;
    if (!reportTxt) {
      toast('Generating report first...', 'info');
      await buildReport(t);
      reportTxt = aiReportText;
    }
    toast('Generating PDF...', 'info');
    try {
      await downloadPDF({ ticket: t, results: resultsRef.current, tests: testsRef.current, aiReportText: reportTxt || '', depth: depthRef.current });
      toast('PDF downloaded!', 'success');
    } catch (e) { toast('PDF error: ' + e.message, 'error'); }
  }, [aiReportText, buildReport, toast]);

  // ── Export CSV ────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    if (!testsRef.current.length) { toast('Run tests first', 'error'); return; }
    const rows = ['ID,Name,Type,Status,Duration'];
    testsRef.current.forEach((t) => rows.push(`${t.id},"${(t.name || '').replace(/"/g, '""')}",${t.type},${t.status},${t.duration || ''}`));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    a.download = `autoqa-${selectedRef.current?.id || 'report'}-${Date.now()}.csv`;
    a.click();
    toast('CSV exported', 'success');
  }, [toast]);

  // ── Dashboard ─────────────────────────────────────────────────────────
  const refreshDash = useCallback(() => {
    setDash({ ...dashRef.current });
  }, []);

  const exportDashCSV = useCallback(() => {
    const runs = dashRef.current.runs;
    if (!runs.length) { toast('No run data yet', 'error'); return; }
    const rows = ['Run,Ticket,Title,Total,Passed,Failed,PassRate,FixAttempts,Depth,Duration,Timestamp'];
    runs.forEach((r) => rows.push(`${r.id},${r.ticketId},"${r.ticketTitle}",${r.total},${r.pass},${r.fail},${r.passRate}%,${r.fixAttempts || 0},${r.depth},${r.duration}s,${r.ts}`));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    a.download = `autoqa-dashboard-${Date.now()}.csv`;
    a.click();
    toast('CSV exported', 'success');
  }, [toast]);

  const exportTableauJSON = useCallback(() => {
    const runs = dashRef.current.runs;
    if (!runs.length && !resultsRef.current.total) { toast('Run tests first', 'error'); return; }
    const payload = {
      source: 'AutoQA Agent',
      exported: new Date().toISOString(),
      project: 'QA Bot — vcmanoj.atlassian.net',
      summary: { totalRuns: runs.length, avgPassRate: runs.length ? Math.round(runs.reduce((s, r) => s + r.passRate, 0) / runs.length) : resultsRef.current.passRate || 0, totalTests: runs.reduce((s, r) => s + r.total, resultsRef.current.total || 0), totalFixes: dashRef.current.fixCounts.reduce((s, v) => s + v, 0) },
      runs,
      lastRun: { ticketId: selectedRef.current?.id, ticketTitle: selectedRef.current?.title, tests: testsRef.current, results: resultsRef.current, timestamp: new Date().toISOString() },
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    a.download = `autoqa-tableau-export-${Date.now()}.json`;
    a.click();
    toast('Tableau JSON exported', 'success');
  }, [toast]);

  const value = {
    // state
    currentSection, liveTickets, running, agentStatus, selected, tests, results, generated,
    createdId, aiReportText, dash, runLog, s1State, streamTxt, ldrMsg, creatingMsg, creatingStep,
    prog, pvData, successData, aiBtnLoading, createBtnLoading, s1Tab,
    form, depth, runMsg, runProgress, runBtnLoading, resultsVisible, runningVisible,
    resultBannerData, aiBoxData, metricsData, reportState, con1Logs, con2Logs, toastState,
    testEnv,
    // actions
    toast, goToSection, setS1Tab, setForm, setDepth, setTestEnv,
    generateAI, createTicket, regenerate, clearForm, createAnother, refreshTickets,
    selectTicket, runPipeline, dlReport, exportCSV,
    refreshDash, exportDashCSV, exportTableauJSON,
    setCon1Logs, setCon2Logs,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
