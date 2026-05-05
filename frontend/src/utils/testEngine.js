export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ── BUILT-IN AI (client-side fallback) ───────────────────────────────
export function builtInAI(prompt) {
  const p = prompt.toLowerCase();
  const isBug = /\b(bug|fix|broken|error|crash|fail|issue|defect|wrong|not work)\b/.test(p);
  const isUI = /\b(ui|ux|dashboard|display|screen|page|form|button|layout|modal|dropdown|filter|table)\b/.test(p);
  const isAPI = /\b(api|endpoint|backend|server|service|rest|integration|webhook|database)\b/.test(p);
  const isAuth = /\b(login|logout|auth|password|token|session|oauth|register|signup|permission)\b/.test(p);
  const isPerf = /\b(slow|performance|speed|optimis|cache|latency|load|timeout)\b/.test(p);
  const isSecurity = /\b(security|vulnerabil|xss|csrf|inject|encrypt|ssl)\b/.test(p);

  const type = isBug ? 'Bug' : 'Story';
  const priority = isBug && isPerf ? 'Critical' : isBug ? 'High' : isPerf || isSecurity ? 'High' : 'Medium';

  const skipWords = new Set(['want','need','make','have','with','that','this','will','should','would','could','from','into']);
  const words = prompt.replace(/[^\w\s]/g, '').trim().split(/\s+/).filter((w) => w.length > 3 && !skipWords.has(w.toLowerCase())).slice(0, 7);

  const verb = isBug ? 'Fix' : isUI ? 'Implement' : isAPI ? 'Add' : isAuth ? 'Implement' : 'Add';
  const title = `${verb} ${words.slice(0, 6).join(' ')}`.substring(0, 78);

  const persona = isAPI ? 'backend developer' : isUI ? 'frontend developer' : 'developer';
  const benefit = isPerf ? 'improve application performance' : isSecurity ? 'ensure security compliance' : isUI ? 'provide intuitive UI' : isAPI ? 'enable reliable data access' : isAuth ? 'ensure secure authentication' : 'improve application quality';
  const description = `As a ${persona}, I want to ${prompt.substring(0, 180)} so that we can ${benefit}. This work should follow existing code patterns, include error handling, and be validated in QA.`;

  const acSets = {
    auth: ['Login page renders correctly with all required fields', 'Valid credentials authenticate and redirect to dashboard', 'Invalid credentials show "Invalid email or password" without revealing which field', 'Account locks after 5 consecutive failed attempts with lockout message', 'Successful authentication creates a valid session/token', 'Keyboard navigation (Tab/Enter) works on all form elements'],
    ui: ['Component renders correctly across Chrome, Firefox, and Edge', 'Layout is responsive at mobile (375px) and desktop (1280px)', 'All interactive elements have visible focus states', 'Loading states shown during async operations', 'Error states handled with user-friendly messages'],
    api: ['Endpoint returns correct HTTP status codes (200, 400, 401, 404, 500)', 'Request validation rejects malformed input with descriptive errors', 'Unauthenticated requests return 401', 'Response payload matches API contract', 'Response time under 2 seconds'],
    bug: ['Root cause identified and documented', 'Bug no longer reproducible after fix', 'No regression in related functionality', 'Unit test added to cover the fixed scenario'],
    general: ['Feature works as described in acceptance criteria', 'No console errors during normal usage', 'No regression in existing functionality', 'Unit tests written and passing'],
  };

  const domain = isAuth ? 'auth' : isBug ? 'bug' : isUI ? 'ui' : isAPI ? 'api' : 'general';
  const ac = [...acSets[domain], 'Code reviewed and approved before merge'];

  return { title, type, priority, description, ac, storyPoints: isBug ? 3 : isPerf ? 5 : isAPI ? 5 : 3, domain };
}

// ── TEST GENERATION ───────────────────────────────────────────────────
export function generateTests(ticket, depth) {
  const ac = ticket.ac && ticket.ac.length ? ticket.ac : [];
  const acTests = ac.map((a, i) => ({
    id: `TC-A${String(i + 1).padStart(2, '0')}`,
    name: a.substring(0, 65),
    desc: `Verify: ${a}`,
    type: 'Acceptance',
    priority: 'High',
  }));
  const base = [
    { id: 'TC-S01', name: 'Page loads without errors', desc: 'HTTP 200, no console errors', type: 'Smoke', priority: 'Critical' },
    { id: 'TC-S02', name: 'Core UI elements render correctly', desc: 'Primary components visible and interactive', type: 'UI', priority: 'High' },
    { id: 'TC-S03', name: 'No regression in existing features', desc: 'Previously working features still function', type: 'Functional', priority: 'High' },
  ];
  const extra = [
    { id: 'TC-E01', name: 'API response time < 2s', desc: 'Key endpoints respond within threshold', type: 'Performance', priority: 'Medium' },
    { id: 'TC-E02', name: 'Error states handled gracefully', desc: 'Network failure shows proper error UI', type: 'Negative', priority: 'Medium' },
  ];
  const sec = [
    { id: 'TC-B01', name: 'SQL injection attempt blocked', desc: 'Malicious input sanitised', type: 'Security', priority: 'Critical' },
    { id: 'TC-B02', name: 'XSS payload rejected', desc: 'Script tags in inputs do not execute', type: 'Security', priority: 'Critical' },
  ];
  if (depth === 'smoke') return [...acTests.slice(0, 3), ...base];
  if (depth === 'full') return [...acTests, ...base, ...extra, ...sec];
  return [...acTests, ...base, ...extra.slice(0, 1)];
}

// ── SINGLE TEST EXECUTION (simulated) ────────────────────────────────
export async function execTest(t) {
  const dur = 200 + Math.random() * 700;
  await delay(dur);
  const rates = { Smoke: 0.95, Acceptance: 0.83, UI: 0.86, Functional: 0.84, Performance: 0.74, Negative: 0.88, Security: 0.96 };
  const pass = Math.random() < (rates[t.type] || 0.84);
  const error = pass ? null : `AssertionError: ${t.name}\n  Expected: condition met\n  URL: https://vcmanoj.atlassian.net`;
  return { pass, duration: (dur / 1000).toFixed(2), error };
}
