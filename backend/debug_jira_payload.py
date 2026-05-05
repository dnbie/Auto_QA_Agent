import os
import base64
import requests
import json
from dotenv import load_dotenv

load_dotenv('../.env')
base = os.getenv('JIRA_BASE_URL', '').strip().rstrip('/')
email = os.getenv('JIRA_EMAIL', '').strip()
token = os.getenv('JIRA_API_TOKEN', '').strip()
auth = base64.b64encode(f'{email}:{token}'.encode()).decode()

# Test 1: Just JQL, no startAt or maxResults
print('Test 1: Just JQL')
payload1 = {'jql': 'project = SCRUM ORDER BY created DESC'}
r1 = requests.post(f'{base}/rest/api/3/search/jql', 
    headers={'Authorization': f'Basic {auth}', 'Accept': 'application/json'}, 
    json=payload1, timeout=15)
print(f'Status: {r1.status_code}')
if r1.status_code == 200:
    print(f'Issues: {len(r1.json().get("issues", []))}')
else:
    print(f'Error: {r1.text[:200]}')

# Test 2: With startAt and maxResults (Content-Type header)
print('\nTest 2: JQL + startAt + maxResults')
payload2 = {'jql': 'project = SCRUM ORDER BY created DESC', 'startAt': 0, 'maxResults': 50}
r2 = requests.post(f'{base}/rest/api/3/search/jql',
    headers={'Authorization': f'Basic {auth}', 'Accept': 'application/json', 'Content-Type': 'application/json'},
    json=payload2, timeout=15)
print(f'Status: {r2.status_code}')
if r2.status_code == 200:
    print(f'Issues: {len(r2.json().get("issues", []))}')
else:
    print(f'Error: {r2.text[:200]}')
