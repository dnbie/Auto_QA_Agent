import os
import re
import json
import base64
import time
import asyncio
from typing import Optional, List, Dict, Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Import test control module
from test_control import (
    PromptProcessor,
    TestExecutor,
    BugFixOrchestrator,
    TestSpec,
    TestResult,
)

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

app = FastAPI(title="AutoQA Agent Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── CONFIG ─────────────────────────────────────────────────────────────
JIRA_CLOUD = "10f23d9c-c132-4f8b-88f8-ba5f76b65142"
JIRA_SITE_BASE = os.getenv("JIRA_BASE_URL", "https://vcmanoj.atlassian.net").strip().rstrip("/")
JIRA_BASE = JIRA_SITE_BASE or f"https://api.atlassian.com/ex/jira/{JIRA_CLOUD}"
JIRA_EMAIL = os.getenv("JIRA_EMAIL", "vcmanoj2002@gmail.com")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN", "")
JIRA_PROJECT = "SCRUM"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4")
TEST_TARGET_URL = os.getenv("TEST_TARGET_URL", "")
TEST_AUTH_TOKEN = os.getenv("TEST_AUTH_TOKEN", "")
TEST_TIMEOUT = float(os.getenv("TEST_TIMEOUT", "10"))

# ── STATIC TICKET DATA ────────────────────────────────────────────────
BASE_TICKETS = [
    {
        "id": "SCRUM-5", "type": "Feature", "priority": "Medium", "status": "Idea",
        "assignee": "Manoj Chandran",
        "title": "User Login - Email and Password Authentication",
        "description": "Implement complete email and password authentication including validation, error handling, session management, account lockout, and accessibility features.",
        "ac": [
            "Login page displays email and password input fields with a \"Login\" button",
            "Users can successfully log in with valid email and password credentials",
            "Email field validates proper email format (e.g. user@domain.com)",
            "Password field masks input characters",
            "Display appropriate error message for invalid email format",
            "Display \"Invalid email or password\" for incorrect credentials (do not reveal which field is wrong)",
            "Account locks after 5 consecutive failed login attempts with a lockout message",
            "Successful login redirects the user to the dashboard/home page",
            "A valid session/token is created upon successful authentication",
            "\"Forgot Password\" link is available on the login page",
            "Login form is accessible via keyboard navigation (Tab, Enter)",
            "Password field has a show/hide toggle icon",
        ],
    },
    {"id": "SCRUM-3", "type": "Story", "priority": "-", "status": "To Do", "assignee": "Unassigned", "title": "Task 3", "description": "No description provided.", "ac": []},
    {"id": "SCRUM-2", "type": "Task", "priority": "-", "status": "To Do", "assignee": "Unassigned", "title": "Task 2", "description": "No description provided.", "ac": []},
    {"id": "SCRUM-1", "type": "Feature", "priority": "-", "status": "Idea", "assignee": "Unassigned", "title": "Task 1", "description": "No description provided.", "ac": []},
]

# In-memory store for dynamically created tickets
dynamic_tickets: list = []


def generate_fallback_report(t: dict, r: dict, passed: list, failed: list, fix_attempts: bool, all_tests: list, run_log: list, depth: str) -> str:
    pass_rate = r.get("passRate", 0)
    verdict = "PASS" if r.get("fail", 0) == 0 else "PASS WITH WARNINGS" if pass_rate >= 80 else "PARTIAL FAIL" if pass_rate >= 60 else "FAIL"

    report = "EXECUTIVE SUMMARY\n"
    report += f"The AutoQA pipeline executed {r.get('total', 0)} test cases against {t.get('id', '')} (\"{t.get('title', '')}\") in {r.get('duration', 0)}s. "
    if r.get("fail", 0) == 0:
        report += f"All {r.get('total', 0)} tests passed (100% pass rate). The feature appears to meet all acceptance criteria and is ready for review."
    else:
        report += f"{r.get('pass', 0)} of {r.get('total', 0)} tests passed ({pass_rate}% pass rate). {r.get('fail', 0)} test(s) failed. Overall verdict: {verdict}."

    type_list = ", ".join(set(x.get("type", "") for x in all_tests))
    report += f"\n\nTEST COVERAGE ANALYSIS\nTest depth: {depth}. Coverage included {type_list} test categories. "
    ac_list = t.get("ac") or []
    if ac_list:
        report += f"{len(ac_list)} acceptance criteria were mapped to test cases. {len(passed)} criteria-mapped tests passed."
    else:
        report += "No acceptance criteria were defined. Generic smoke, UI, and functional tests were used."

    if failed:
        report += "\n\nFAILURE ANALYSIS\n"
        for x in failed:
            err = (x.get("error") or "assertion failed").split("\n")[0]
            report += f"\n{x.get('id', '')}: {x.get('name', '')}\n  Type: {x.get('type', '')} | Duration: {x.get('duration', '')}s\n  Error: {err}\n  Root cause: The {x.get('type', '').lower()} check failed — likely the implementation does not match the expected spec.\n"

    if fix_attempts:
        fix_logs = [l for l in run_log if l.get("msg") and ("✓" in l["msg"] or "Attempt" in l["msg"] or "still failing" in l["msg"])]
        report += "\n\nFIX ACTIONS TAKEN\nClaude AI made automated fix attempts after the initial run:\n"
        for l in fix_logs[:12]:
            report += f"  {l.get('msg', '')}\n"
        report += "All failures were resolved." if r.get("fail", 0) == 0 else f"{r.get('fail', 0)} test(s) remain — manual review needed."

    if r.get("fail", 0) > 0:
        report += "\n\nREMAINING ISSUES\n"
        for x in failed:
            report += f"- {x.get('id', '')} ({x.get('type', '')}): \"{x.get('name', '')}\" — still failing. Review against acceptance criteria.\n"

    report += "\n\nRECOMMENDATION\n"
    if r.get("fail", 0) == 0:
        report += "All tests passed. Perform manual exploratory testing before production release. Update Jira to 'Ready for Review'."
    else:
        by_type: dict = {}
        for x in failed:
            by_type.setdefault(x.get("type", "General"), []).append(x.get("id", ""))
        action_map = {
            "Acceptance": "Review acceptance criteria implementation and ensure behaviour matches the spec exactly.",
            "Smoke": "Verify the application loads correctly on the QA environment.",
            "UI": "Check DOM selectors and ensure all UI elements render correctly.",
            "Functional": "Trace the failing user flow end-to-end and verify all API calls return expected responses.",
            "Performance": "Profile the endpoint and optimise — target sub-2s response time.",
            "Security": "Review input sanitisation and ensure all injection vectors are blocked.",
            "Negative": "Add proper error handling for invalid inputs and edge cases.",
        }
        for i, (t_type, ids) in enumerate(by_type.items()):
            action = action_map.get(t_type, "Review implementation against the failing test cases.")
            report += f"{i + 1}. [{t_type} — {', '.join(ids)}] {action}\n"
        report += "\nRe-run the AutoQA pipeline after fixes. If issues persist after 2 cycles, escalate to tech lead."

    return report


# ── HELPERS ────────────────────────────────────────────────────────────
def _jira_auth_header() -> str:
    auth = base64.b64encode(f"{JIRA_EMAIL.strip()}:{JIRA_API_TOKEN.strip()}".encode()).decode()
    return f"Basic {auth}"


def _map_jira_issue(issue: dict) -> dict:
    fields = issue.get("fields", {})
    priority = (fields.get("priority") or {}).get("name", "-")
    status = (fields.get("status") or {}).get("name", "To Do")
    assignee = fields.get("assignee") or {}
    assignee_name = assignee.get("displayName") or "Unassigned"
    assignee_id = assignee.get("accountId") or ""
    issue_type = (fields.get("issuetype") or {}).get("name", "Task")
    # Try all known story point field names across Jira versions
    story_points = (
        fields.get("customfield_10016")   # Jira Cloud classic
        or fields.get("customfield_10028") # Jira Cloud next-gen
        or fields.get("customfield_10014") # Some Jira Server variants
        or fields.get("story_points")
        or fields.get("storyPoints")
        or None
    )
    # Coerce to int if it came back as float (e.g. 3.0 → 3)
    if story_points is not None:
        try:
            story_points = int(story_points)
        except (TypeError, ValueError):
            story_points = None

    # Recursively extract all text from Atlassian Document Format (ADF)
    def _extract_adf_text(node: dict) -> str:
        """Walk any ADF node and return all text content joined by newlines."""
        if not isinstance(node, dict):
            return ""
        if node.get("type") == "text":
            return node.get("text", "")
        parts = []
        for child in node.get("content", []):
            parts.append(_extract_adf_text(child))
        sep = "\n" if node.get("type") in ("paragraph", "listItem", "orderedList", "bulletList", "heading") else " "
        return sep.join(p for p in parts if p)

    desc_adf = fields.get("description") or {}
    if isinstance(desc_adf, dict):
        desc_text = _extract_adf_text(desc_adf).strip()
    elif isinstance(desc_adf, str):
        desc_text = desc_adf.strip()
    else:
        desc_text = ""

    # Extract AC items: collect every non-empty line from the ADF list items
    ac = []
    if isinstance(desc_adf, dict):
        for block in desc_adf.get("content", []):
            # orderedList and bulletList blocks hold AC items
            if block.get("type") in ("orderedList", "bulletList"):
                for item in block.get("content", []):
                    item_text = _extract_adf_text(item).strip().lstrip("•-* ")
                    if len(item_text) > 4:
                        ac.append(item_text)

    # Fallback: if ADF had no lists, derive AC from plain-text lines
    if not ac and desc_text:
        for line in desc_text.splitlines():
            stripped = line.strip().lstrip("•-* 0123456789.")
            if len(stripped) > 8:
                ac.append(stripped)

    return {
        "id": issue.get("key", ""),
        "type": issue_type,
        "priority": priority,
        "status": status,
        "assignee": assignee_name,
        "assigneeId": assignee_id,
        "title": fields.get("summary", ""),
        "description": desc_text or fields.get("summary", ""),
        "storyPoints": story_points,  # None if not set in Jira
        "ac": ac,
        "jiraUrl": f"{JIRA_SITE_BASE}/browse/{issue.get('key', '')}",
        "fromJira": True,
    }


# ── ROUTES ─────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "AutoQA Agent Backend running", "version": "1.0.0"}


@app.get("/api/jira-tickets")
async def get_jira_tickets():
    """Fetch all issues from the SCRUM project directly from Jira Cloud."""
    if not JIRA_API_TOKEN or not JIRA_EMAIL:
        raise HTTPException(status_code=400, detail="Jira credentials not configured")

    headers = {
        "Authorization": _jira_auth_header(),
        "Accept": "application/json",
    }
    jql = f"project = {JIRA_PROJECT} ORDER BY created DESC"
    all_issues = []

    fields = "summary,description,priority,status,assignee,issuetype,customfield_10016"

    async with httpx.AsyncClient(timeout=20.0) as client:
        # Try the current POST /search/jql endpoint first (no expand to avoid 410)
        resp = await client.post(
            f"{JIRA_BASE}/rest/api/3/search/jql",
            headers={**headers, "Content-Type": "application/json"},
            json={
                "jql": jql,
                "fields": ["summary", "description", "priority", "status", "assignee", "issuetype", "customfield_10016", "story_points", "customfield_10028", "customfield_10014"],
                "maxResults": 50,
            },
        )

        # Fall back to the classic GET /search if POST /search/jql returns 4xx/410
        if resp.status_code in (404, 410):
            print(f"[Jira] POST /search/jql returned {resp.status_code}, falling back to GET /search")
            resp = await client.get(
                f"{JIRA_BASE}/rest/api/3/search",
                headers=headers,
                params={"jql": jql, "fields": "summary,description,priority,status,assignee,issuetype,customfield_10016,story_points,customfield_10028,customfield_10014", "maxResults": "50"},
            )

        if resp.status_code == 401:
            raise HTTPException(status_code=401, detail="Jira auth failed — check JIRA_EMAIL and JIRA_API_TOKEN")
        if not resp.is_success:
            raise HTTPException(status_code=resp.status_code, detail=f"Jira search failed: {resp.text[:200]}")

        data = resp.json()
        print(f"[Jira] Found {len(data.get('issues', []))} issues")
        for i, issue in enumerate(data.get("issues", [])):
            try:
                mapped = _map_jira_issue(issue)
                all_issues.append(mapped)
                print(f"[Jira] Mapped issue {i+1}: {mapped.get('id')}")
            except Exception as e:
                print(f"[Jira] Failed to map issue {i+1}: {e}")
                import traceback
                traceback.print_exc()

    print(f"[Jira] Returning {len(all_issues)} tickets")
    return all_issues


@app.get("/api/tickets")
def get_tickets():
    """Returns in-session dynamically created tickets (legacy local list)."""
    return dynamic_tickets + BASE_TICKETS


class AddTicketRequest(BaseModel):
    ticket: dict


@app.post("/api/tickets")
def add_ticket(req: AddTicketRequest):
    dynamic_tickets.insert(0, req.ticket)
    return {"ok": True}


class GenerateTicketRequest(BaseModel):
    prompt: str


@app.post("/api/generate-ticket")
async def generate_ticket(req: GenerateTicketRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    system_prompt = (
        "You are a senior QA engineer and Jira ticket writer. Given a feature description, "
        "generate a structured Jira ticket as JSON.\n"
        "Return ONLY a JSON object with these fields:\n"
        '{"title": "Brief summary (max 80 chars)", "type": "Story"|"Bug"|"Task"|"Feature", '
        '"priority": "Low"|"Medium"|"High"|"Critical", "storyPoints": 1|2|3|5|8|13, '
        '"description": "Full dev story description", "ac": ["criterion 1", ...]}\n'
        "Include 5-8 specific, testable acceptance criteria. Be concise but precise."
    )
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": OPENAI_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": req.prompt},
                    ],
                    "max_tokens": 1000,
                    "temperature": 0.7,
                },
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="OpenAI ticket generation failed")

            data = resp.json()
            content = data["choices"][0]["message"]["content"].strip()
            match = re.search(r"\{[\s\S]*\}", content)
            if not match:
                raise HTTPException(status_code=502, detail="OpenAI response did not contain valid JSON")
            return json.loads(match.group())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ticket generation error: {str(e)}")


class CreateJiraTicketRequest(BaseModel):
    ticket: dict


@app.post("/api/create-jira-ticket")
async def create_jira_ticket(req: CreateJiraTicketRequest):
    if not JIRA_API_TOKEN:
        raise HTTPException(status_code=400, detail="No Jira API token provided")
    if not JIRA_EMAIL:
        raise HTTPException(status_code=400, detail="No Jira email configured")

    ticket = req.ticket
    ac = ticket.get("ac", [])
    description = ticket.get("description", ticket.get("title", ""))

    adf = {
        "type": "doc", "version": 1,
        "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": description}]},
            {"type": "paragraph", "content": [{"type": "text", "text": "Acceptance Criteria:", "marks": [{"type": "strong"}]}]},
            {"type": "bulletList", "content": [
                {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": a}]}]}
                for a in ac
            ]},
        ],
    }
    type_map = {"Story": "Story", "Bug": "Bug", "Task": "Task", "Feature": "Feature"}
    auth = base64.b64encode(f"{JIRA_EMAIL.strip()}:{JIRA_API_TOKEN.strip()}".encode()).decode()

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Preflight auth check for clearer error feedback than issue creation alone.
            me = await client.get(
                f"{JIRA_BASE}/rest/api/3/myself",
                headers={"Authorization": f"Basic {auth}", "Accept": "application/json"},
            )
            if me.status_code == 401:
                raise HTTPException(status_code=401, detail="Jira authentication failed. Check JIRA_EMAIL and JIRA_API_TOKEN in .env and restart backend.")
            if me.status_code == 403:
                raise HTTPException(status_code=403, detail="Jira authenticated but access is forbidden for this site/project.")

            resp = await client.post(
                f"{JIRA_BASE}/rest/api/3/issue",
                headers={"Authorization": f"Basic {auth}", "Content-Type": "application/json", "Accept": "application/json"},
                json={
                    "fields": {
                        "project": {"key": JIRA_PROJECT},
                        "summary": ticket.get("title", ""),
                        "issuetype": {"name": type_map.get(ticket.get("type", "Task"), "Task")},
                        "description": adf,
                        "priority": {"name": ticket.get("priority", "Medium")},
                        "assignee": {"accountId": ticket.get("assigneeId") or "712020:daa1ca68-274c-45d2-9510-3099daa723d6"},
                        "customfield_10016": ticket.get("storyPoints", 3),
                    }
                },
            )
            if not resp.is_success:
                err = resp.json()
                raise HTTPException(status_code=resp.status_code, detail=str(err)[:200])
            data = resp.json()
            return {"key": data["key"], "id": data["id"]}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


class GenerateReportRequest(BaseModel):
    ticket: dict
    results: dict
    tests: List[dict]
    runLog: List[dict]
    depth: str


class RunTestsRequest(BaseModel):
    ticket: dict
    tests: List[dict]
    depth: Optional[str] = None
    targetUrl: Optional[str] = None
    authToken: Optional[str] = None


def _normalize_target_url(url: str) -> str:
    u = (url or "").strip()
    if not u:
        return ""
    if not re.match(r"^https?://", u, re.IGNORECASE):
        u = "https://" + u
    return u.rstrip("/")


def _auth_headers(token: str) -> dict:
    t = (token or "").strip()
    if not t:
        return {}
    if t.lower().startswith("bearer "):
        return {"Authorization": t}
    return {"Authorization": f"Bearer {t}"}


def _candidate_paths(ticket: dict, test: dict) -> List[str]:
    text = f"{ticket.get('title', '')} {test.get('name', '')} {test.get('desc', '')}".lower()
    paths = ["/"]
    if "login" in text or "auth" in text:
        paths.insert(0, "/login")
    if "dashboard" in text:
        paths.insert(0, "/dashboard")
    if "register" in text or "signup" in text:
        paths.insert(0, "/register")
    return paths


async def _run_live_test(client: httpx.AsyncClient, base_url: str, headers: dict, ticket: dict, test: dict) -> dict:
    t_id = str(test.get("id", ""))
    t_type = str(test.get("type", "General"))
    t_name = str(test.get("name", ""))
    start = time.perf_counter()
    status = "pass"
    err = None

    try:
        if t_type in ("Smoke", "UI", "Functional", "Acceptance"):
            paths = _candidate_paths(ticket, test)
            ok = False
            fail_reason = "No candidate endpoint returned success"
            for p in paths:
                url = f"{base_url}{p}"
                r = await client.get(url, headers=headers)
                if 200 <= r.status_code < 400:
                    if t_type == "UI":
                        body = (r.text or "").lower()
                        if "<html" not in body and len(body) < 60:
                            fail_reason = f"UI response from {p} does not look like HTML"
                            continue
                    ok = True
                    break
                fail_reason = f"{p} returned HTTP {r.status_code}"
            if not ok:
                status = "fail"
                err = fail_reason

        elif t_type == "Performance":
            url = f"{base_url}/"
            r = await client.get(url, headers=headers)
            elapsed = time.perf_counter() - start
            if not (200 <= r.status_code < 400):
                status = "fail"
                err = f"Performance target returned HTTP {r.status_code}"
            elif elapsed > 2.0:
                status = "fail"
                err = f"Response too slow: {elapsed:.2f}s (>2.00s)"

        elif t_type == "Negative":
            url = f"{base_url}/__autoqa_invalid_route__"
            r = await client.get(url, headers=headers)
            if r.status_code in (404, 400, 401, 403):
                status = "pass"
            else:
                status = "fail"
                err = f"Expected 4xx on invalid route, got HTTP {r.status_code}"

        elif t_type == "Security":
            probe = "<script>alert(1)</script> OR 1=1"
            url = f"{base_url}/"
            r = await client.get(url, headers=headers, params={"q": probe})
            body = (r.text or "").lower()
            if r.status_code >= 500:
                status = "fail"
                err = f"Server error HTTP {r.status_code} under malicious probe"
            elif "<script>alert(1)</script>" in body:
                status = "fail"
                err = "Probe payload reflected unsanitized in response"
        else:
            # Unknown test types default to a basic reachability check.
            url = f"{base_url}/"
            r = await client.get(url, headers=headers)
            if not (200 <= r.status_code < 400):
                status = "fail"
                err = f"Health check failed: HTTP {r.status_code}"

    except Exception as e:
        status = "fail"
        err = str(e)

    duration = f"{(time.perf_counter() - start):.2f}"
    return {
        "id": t_id,
        "name": t_name,
        "type": t_type,
        "status": status,
        "duration": duration,
        "error": err,
    }


@app.post("/api/run-tests")
async def run_tests(req: RunTestsRequest):
    base_url = _normalize_target_url(req.targetUrl or TEST_TARGET_URL)
    if not base_url:
        raise HTTPException(status_code=400, detail="No test target URL configured. Set TEST_TARGET_URL or provide targetUrl.")

    token = (req.authToken or TEST_AUTH_TOKEN or "").strip()
    headers = {"User-Agent": "AutoQA-Agent/1.0", **_auth_headers(token)}

    async with httpx.AsyncClient(timeout=TEST_TIMEOUT, follow_redirects=True) as client:
        try:
            probe = await client.get(f"{base_url}/", headers=headers)
            if probe.status_code >= 500:
                raise HTTPException(status_code=502, detail=f"Target base URL unhealthy: HTTP {probe.status_code}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Cannot reach target URL: {str(e)}")

        results = []
        for t in req.tests:
            results.append(await _run_live_test(client, base_url, headers, req.ticket, t))

    total = len(results)
    passed = len([x for x in results if x["status"] == "pass"])
    failed = total - passed
    pass_rate = round((passed / total) * 100) if total else 0
    return {
        "targetUrl": base_url,
        "summary": {"total": total, "pass": passed, "fail": failed, "passRate": pass_rate},
        "tests": results,
    }


@app.post("/api/generate-report")
async def generate_report(req: GenerateReportRequest):
    t = req.ticket
    r = req.results
    passed = [x for x in req.tests if x.get("status") == "pass"]
    failed = [x for x in req.tests if x.get("status") == "fail"]
    fix_attempts = any("Attempt" in (l.get("msg") or "") for l in req.runLog)

    if not OPENAI_API_KEY:
        return {"report": generate_fallback_report(t, r, passed, failed, fix_attempts, req.tests, req.runLog, req.depth)}

    nl = "\n"
    passed_lines = nl.join([
        f"✓ {x.get('id', '')}: {x.get('name', '')} ({x.get('type', '')}, {x.get('duration', '')}s)"
        for x in passed
    ])
    failed_lines = nl.join([
        f"✗ {x.get('id', '')}: {x.get('name', '')} ({x.get('type', '')})"
        + nl
        + f"   Error: {(x.get('error') or '').split(nl)[0]}"
        for x in failed
    ])

    prompt = (
        f"You are a senior QA engineer writing a formal test report.\n\n"
        f"TICKET: {t.get('id', '')} — {t.get('title', '')}\n"
        f"Type: {t.get('type', '')} | Priority: {t.get('priority', '')} | Assignee: {t.get('assignee', '')}\n"
        f"Description: {t.get('description', 'Not provided')}\n\n"
        f"ACCEPTANCE CRITERIA:\n{nl.join(f'{i+1}. {a}' for i, a in enumerate(t.get('ac') or ['No AC provided']))}\n\n"
        f"TEST EXECUTION SUMMARY:\n- Total: {r.get('total', 0)}\n- Passed: {r.get('pass', 0)} ({r.get('passRate', 0)}%)\n- Failed: {r.get('fail', 0)}\n- Duration: {r.get('duration', 0)}s\n- Depth: {req.depth}\n\n"
        + (f"PASSED TESTS:\n{passed_lines}\n\n" if passed_lines else "")
        + (f"FAILED TESTS:\n{failed_lines}\n\n" if failed_lines else "")
        + "Write a detailed professional QA report with sections:\n"
        + "1. EXECUTIVE SUMMARY\n2. TEST COVERAGE ANALYSIS\n3. FAILURE ANALYSIS\n"
        + "4. FIX ACTIONS TAKEN\n5. REMAINING ISSUES\n6. RECOMMENDATION\n\n"
        + "Be specific, technical, and actionable. Use real test IDs."
    )

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                json={"model": OPENAI_MODEL, "messages": [{"role": "user", "content": prompt}], "max_tokens": 1500},
            )
            if resp.status_code == 200:
                data = resp.json()
                return {"report": data["choices"][0]["message"]["content"].strip()}
    except Exception:
        pass
    return {"report": generate_fallback_report(t, r, passed, failed, fix_attempts, req.tests, req.runLog, req.depth)}


class TableauConnectRequest(BaseModel):
    url: str
    token: Optional[str] = None
    site: Optional[str] = None
    workbook: Optional[str] = "AutoQA Metrics"


@app.post("/api/tableau/connect")
async def tableau_connect(req: TableauConnectRequest):
    if not req.token:
        return {"status": "warning", "message": "No API token — enter your Tableau Personal Access Token to authenticate."}
    return {"status": "success", "message": f"Connected to {req.url} — ready to push to \"{req.workbook or 'AutoQA Metrics'}\""}


@app.post("/api/tableau/push")
async def tableau_push(data: dict):
    return {"status": "success", "pushed": len(data.get("runs", []))}


@app.get("/api/jira-health")
async def jira_health():
    if not JIRA_EMAIL or not JIRA_API_TOKEN:
        raise HTTPException(status_code=400, detail="Missing JIRA_EMAIL or JIRA_API_TOKEN in .env")

    auth = base64.b64encode(f"{JIRA_EMAIL.strip()}:{JIRA_API_TOKEN.strip()}".encode()).decode()
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(
            f"{JIRA_BASE}/rest/api/3/myself",
            headers={"Authorization": f"Basic {auth}", "Accept": "application/json"},
        )
        if resp.status_code == 200:
            me = resp.json()
            return {
                "ok": True,
                "jiraBase": JIRA_BASE,
                "accountId": me.get("accountId"),
                "displayName": me.get("displayName"),
            }
        if resp.status_code == 401:
            raise HTTPException(status_code=401, detail="Unauthorized: invalid Jira email/token combination")
        if resp.status_code == 403:
            raise HTTPException(status_code=403, detail="Forbidden: authenticated but no permission for this Jira site")
        raise HTTPException(status_code=resp.status_code, detail=f"Jira auth probe failed: {resp.text[:220]}")


# ── ADVANCED TESTING WITH PLAYWRIGHT & SELENIUM ──────────────────────

class GenerateTestsRequest(BaseModel):
    """Request to generate tests from natural language prompt."""
    prompt: str
    ticket_ac: List[str]
    test_depth: str = "regression"


@app.post("/api/generate-tests-from-prompt")
async def generate_tests_from_prompt(req: GenerateTestsRequest):
    """Generate test cases from natural language prompt using AI."""
    processor = PromptProcessor(openai_api_key=OPENAI_API_KEY, openai_model=OPENAI_MODEL)
    
    try:
        tests = await processor.generate_tests_from_prompt(
            prompt=req.prompt,
            ticket_ac=req.ticket_ac,
            test_depth=req.test_depth,
        )
        
        return {
            "generated": len(tests),
            "depth": req.test_depth,
            "tests": [
                {
                    "id": t.id,
                    "name": t.name,
                    "type": t.type,
                    "browser": t.browser,
                    "url_path": t.url_path,
                    "assertions": t.assertions,
                }
                for t in tests
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test generation failed: {str(e)}")


class RunAdvancedTestsRequest(BaseModel):
    """Request to run advanced tests with Playwright/Selenium."""
    ticket: Dict[str, Any]
    tests: List[Dict[str, Any]]
    target_url: str
    auth_token: Optional[str] = None


@app.post("/api/run-tests-advanced")
async def run_tests_advanced(req: RunAdvancedTestsRequest):
    """Execute tests using HTTP, Playwright (Chrome, Firefox, Safari, Edge), and Selenium."""
    if not req.target_url:
        raise HTTPException(status_code=400, detail="target_url is required")

    # Convert dict tests to TestSpec objects
    test_specs = []
    for test_data in req.tests:
        test_specs.append(TestSpec(**test_data))

    executor = TestExecutor(
        base_url=req.target_url,
        auth_token=req.auth_token or TEST_AUTH_TOKEN,
    )

    try:
        # Validate target is reachable
        async with httpx.AsyncClient(timeout=10.0) as client:
            probe = await client.get(f"{req.target_url}/", follow_redirects=True)
            if probe.status_code >= 500:
                raise HTTPException(
                    status_code=502,
                    detail=f"Target URL unhealthy: HTTP {probe.status_code}",
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502, detail=f"Cannot reach target URL: {str(e)}"
        )

    # Execute tests
    start_time = time.time()
    results = await executor.execute_tests(test_specs)
    duration = time.time() - start_time

    # Process results
    total = len(results)
    passed = len([r for r in results if r.status == "pass"])
    failed = len([r for r in results if r.status == "fail"])
    skipped = len([r for r in results if r.status == "skipped"])
    pass_rate = round((passed / total) * 100) if total else 0

    return {
        "targetUrl": req.target_url,
        "summary": {
            "total": total,
            "pass": passed,
            "fail": failed,
            "skipped": skipped,
            "passRate": pass_rate,
            "duration": round(duration, 2),
        },
        "tests": [
            {
                "id": r.test_id,
                "name": r.test_name,
                "type": r.test_type,
                "browser": r.browser,
                "status": r.status,
                "duration": round(r.duration, 2),
                "error": r.error_message,
                "assertions_failed": r.assertion_failures,
                "logs": r.logs,
            }
            for r in results
        ],
    }


class AnalyzeFailuresRequest(BaseModel):
    """Request to analyze test failures."""
    ticket: Dict[str, Any]
    failed_tests: List[Dict[str, Any]]


@app.post("/api/analyze-failures")
async def analyze_failures(req: AnalyzeFailuresRequest):
    """Analyze test failures and provide AI-powered root cause analysis."""
    # Convert failed tests to TestResult objects
    failed_results = []
    for test_data in req.failed_tests:
        failed_results.append(
            TestResult(
                test_id=test_data.get("id", ""),
                test_name=test_data.get("name", ""),
                test_type=test_data.get("type", ""),
                browser=test_data.get("browser"),
                status="fail",
                duration=test_data.get("duration", 0),
                error_message=test_data.get("error"),
                assertion_failures=test_data.get("assertions_failed", []),
                logs=test_data.get("logs", []),
            )
        )

    orchestrator = BugFixOrchestrator(
        openai_api_key=OPENAI_API_KEY,
        openai_model=OPENAI_MODEL,
    )

    try:
        analysis = await orchestrator.analyze_failures(failed_results)
        return {"analysis": analysis, "failed_count": len(failed_results)}
    except Exception as e:
        return {
            "analysis": f"Error during analysis: {str(e)}",
            "failed_count": len(failed_results),
        }


class GenerateFixPromptRequest(BaseModel):
    """Request to generate a fix prompt for Claude."""
    ticket: Dict[str, Any]
    failed_tests: List[Dict[str, Any]]
    attempt: int = 1


@app.post("/api/generate-fix-prompt")
async def generate_fix_prompt(req: GenerateFixPromptRequest):
    """Generate a detailed fix prompt based on test failures."""
    # Convert failed tests to TestResult objects
    failed_results = []
    for test_data in req.failed_tests:
        failed_results.append(
            TestResult(
                test_id=test_data.get("id", ""),
                test_name=test_data.get("name", ""),
                test_type=test_data.get("type", ""),
                browser=test_data.get("browser"),
                status="fail",
                duration=test_data.get("duration", 0),
                error_message=test_data.get("error"),
                assertion_failures=test_data.get("assertions_failed", []),
            )
        )

    orchestrator = BugFixOrchestrator(
        openai_api_key=OPENAI_API_KEY,
        openai_model=OPENAI_MODEL,
    )

    try:
        prompt = await orchestrator.generate_fix_prompt(
            ticket=req.ticket,
            failed_tests=failed_results,
            attempt=req.attempt,
        )
        return {"prompt": prompt, "attempt": req.attempt}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate fix prompt: {str(e)}",
        )


@app.get("/api/test-capabilities")
def test_capabilities():
    """Return information about available test capabilities."""
    return {
        "testTypes": [
            {"name": "Smoke", "description": "Basic reachability checks", "live": True},
            {
                "name": "UI",
                "description": "HTML element validation",
                "live": True,
            },
            {
                "name": "Functional",
                "description": "User flow testing",
                "live": True,
            },
            {
                "name": "Acceptance",
                "description": "AC criteria mapping",
                "live": True,
            },
            {
                "name": "Performance",
                "description": "Response time validation (<2.0s)",
                "live": True,
            },
            {
                "name": "Security",
                "description": "XSS/SQL injection probes",
                "live": True,
            },
            {
                "name": "Negative",
                "description": "Error handling validation",
                "live": True,
            },
            {
                "name": "Cross-browser",
                "description": "Chrome, Firefox, Safari, Edge rendering",
                "live": True,
                "engines": ["Playwright", "Selenium"],
            },
        ],
        "testDepths": [
            {"id": "smoke", "name": "🔥 Smoke", "tests": 3},
            {"id": "regression", "name": "🔁 Regression", "tests": 12},
            {"id": "full", "name": "⚡ Full", "tests": 25},
        ],
        "browsers": ["chrome", "firefox", "safari", "edge"],
        "engines": ["HTTP", "Playwright", "Selenium"],
        "aiEnabled": bool(OPENAI_API_KEY),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
