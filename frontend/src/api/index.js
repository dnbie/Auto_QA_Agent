const BASE = '/api';

export async function getTicketsAPI() {
  const res = await fetch(`${BASE}/tickets`);
  if (!res.ok) throw new Error('Failed to fetch tickets');
  return res.json();
}

export async function getJiraTicketsAPI() {
  const res = await fetch(`${BASE}/jira-tickets`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Jira fetch failed (${res.status}): ${err.detail || 'Unknown error'}`);
  }
  return res.json();
}

export async function generateTicketAPI(prompt) {
  const res = await fetch(`${BASE}/generate-ticket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Generate ticket failed (${res.status}): ${err.detail || 'Unknown error'}`);
  }
  return res.json();
}

export async function createJiraTicketAPI(ticket) {
  const res = await fetch(`${BASE}/create-jira-ticket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Jira create failed (${res.status}): ${err.detail || 'Unknown error'}`);
  }
  return res.json();
}

export async function addTicketToServerAPI(ticket) {
  await fetch(`${BASE}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket }),
  });
}

export async function generateReportAPI(payload) {
  const res = await fetch(`${BASE}/generate-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to generate report');
  return res.json();
}

export async function runLiveTestsAPI(payload) {
  const res = await fetch(`${BASE}/run-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Run tests failed (${res.status}): ${err.detail || 'Unknown error'}`);
  }
  return res.json();
}

export async function connectTableauAPI(data) {
  const res = await fetch(`${BASE}/tableau/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function pushTableauAPI(data) {
  const res = await fetch(`${BASE}/tableau/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}
