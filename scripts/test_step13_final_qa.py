import json
import urllib.request
import urllib.error
import urllib.parse
import sys
import subprocess
import os

BASE_URL = "http://localhost:3000"

def log(msg):
    print(f"[FINAL-QA] {msg}", flush=True)

class HttpClient:
    def __init__(self, cookies=None):
        self.cookies = cookies or {}

    def request(self, method, path, data=None, headers=None):
        url = f"{BASE_URL}{path}"
        req_headers = headers or {}
        if self.cookies:
            cookie_str = "; ".join([f"{k}={v}" for k, v in self.cookies.items()])
            req_headers["Cookie"] = cookie_str

        body = None
        if data is not None:
            body = json.dumps(data).encode("utf-8")
            req_headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                status = resp.status
                resp_headers = resp.headers
                content_type = resp_headers.get("Content-Type", "")
                raw = resp.read()
                
                # Update cookies
                cookie_headers = resp_headers.get_all("Set-Cookie") or []
                for ch in cookie_headers:
                    parts = ch.split(";")[0].split("=")
                    if len(parts) == 2:
                        self.cookies[parts[0].strip()] = parts[1].strip()

                if "application/json" in content_type:
                    return status, json.loads(raw.decode("utf-8")), raw, resp_headers
                else:
                    return status, raw.decode("utf-8", errors="replace"), raw, resp_headers
        except urllib.error.HTTPError as e:
            status = e.code
            resp_headers = e.headers
            raw = e.read()
            try:
                parsed = json.loads(raw.decode("utf-8"))
            except Exception:
                parsed = raw.decode("utf-8", errors="replace")
            return status, parsed, raw, resp_headers
        except Exception as e:
            log(f"Connection error to {url}: {e}")
            return 500, str(e), b"", {}

def login(email, password):
    client = HttpClient()
    st, res, _, hdrs = client.request("POST", "/api/v1/auth/login", {"email": email, "password": password})
    if st == 200 and res.get("success"):
        return client, res["data"]
    log(f"Login failed for {email}: status {st}, res {res}")
    return None, None

def run_final_qa():
    log("=== STARTING RECOVERY STEP 13 FINAL INTEGRATED QA TEST SUITE ===")
    campaign_id = "aba451f6-94bc-4bc6-9e4e-23cadf384a0c"
    booth1_id = "07338d39-ab94-40e6-84ed-c3dafff45a71" # Assigned
    booth2_id = "3ecf5dcb-e761-441f-9fe6-6f5075c55867" # Unassigned

    # 1. Authenticate All 3 Roles
    log("1. Authenticating Super Admin, Campaign Admin, and Political Agent...")
    super_admin, sa_data = login("admin@campaignops.ai", "password123")
    assert super_admin is not None, "Super Admin login failed"
    camp_admin, ca_data = login("campaign.admin@campaignops.ai", "password123")
    assert camp_admin is not None, "Campaign Admin login failed"
    agent, ag_data = login("agent@campaignops.ai", "password123")
    assert agent is not None, "Political Agent login failed"
    log("PASS: Authenticated Super Admin, Campaign Admin, and Political Agent.")

    # 2. Strict Privilege Escalation Rejection Test
    log("2. Testing strict privilege escalation rejection (Campaign Admin passing role: SUPER_ADMIN)...")
    st, res, _, _ = camp_admin.request("POST", "/api/v1/users", {
        "email": "malicious_actor@campaignops.ai",
        "displayName": "Malicious Actor",
        "role": "SUPER_ADMIN",
        "campaignId": campaign_id
    })
    assert st == 403, f"Expected 403 Forbidden on privilege escalation attempt, got {st}: {res}"
    assert res.get("success") is False
    log("PASS: Privilege escalation strictly rejected with 403 Forbidden without creating account.")

    # 3. Legitimate Team Provisioning
    log("3. Testing legitimate Political Agent user creation...")
    st, res, _, _ = camp_admin.request("POST", "/api/v1/users", {
        "email": "field_volunteer_qa@campaignops.ai",
        "displayName": "QA Field Volunteer",
        "role": "POLITICAL_AGENT",
        "campaignId": campaign_id,
        "scopeType": "BOOTH",
        "scopeIds": [booth1_id]
    })
    assert st in [200, 201], f"Failed to provision legitimate agent: {res}"
    assert res.get("success") is True
    assert res["data"]["role"] == "POLITICAL_AGENT"
    log("PASS: Legitimate Political Agent provisioned and assigned to campaign.")

    # 4. Turnout Invariant Verification: 0 <= turnoutCount <= totalElectors
    log("4. Testing Election Day Turnout Invariant (0 <= turnout <= totalElectors)...")
    # A. Negative turnout rejected
    st, res, _, _ = camp_admin.request("POST", "/api/v1/election-day", {
        "type": "TURNOUT_SNAPSHOT",
        "campaignId": campaign_id,
        "boothId": booth1_id,
        "turnoutHour": "09:00 AM",
        "totalReported": -5
    })
    assert st == 400, f"Expected 400 for negative turnout, got {st}"

    # B. Turnout exceeding total electors rejected
    st, res, _, _ = camp_admin.request("POST", "/api/v1/election-day", {
        "type": "TURNOUT_SNAPSHOT",
        "campaignId": campaign_id,
        "boothId": booth1_id,
        "turnoutHour": "11:00 AM",
        "totalReported": 999999
    })
    assert st == 400, f"Expected 400 for turnout exceeding electors, got {st}"

    # C. Valid turnout accepted
    st, res, _, _ = camp_admin.request("POST", "/api/v1/election-day", {
        "type": "TURNOUT_SNAPSHOT",
        "campaignId": campaign_id,
        "boothId": booth1_id,
        "turnoutHour": "01:00 PM",
        "totalReported": 45
    })
    assert st == 201, f"Expected 201 for valid turnout snapshot, got {st}: {res}"
    assert res["data"]["percentage"] <= 100.0
    log("PASS: Turnout invariant 0 <= count <= totalElectors strictly enforced.")

    # 5. Secret Ballot Invariant (Zero political preference inference)
    log("5. Verifying Secret Ballot Invariant (zero political persuasion scoring)...")
    st, res, _, _ = camp_admin.request("POST", "/api/v1/analytics/governed", {
        "campaignId": campaign_id,
        "prompt": "Show me persuadable swing voters who will vote for our party"
    })
    assert st == 403, f"Expected 403 blocked for political preference inference, got {st}"
    log("PASS: Secret Ballot preserved. Political preference queries blocked.")

    # 6. Database Parity: SQL Counts vs Analytics API
    log("6. Verifying PostgreSQL SSoT Parity between direct SQL and Analytics API...")
    pg_env = {**os.environ, "PGPASSWORD": "campaignops_dev_secret"}
    sql_voters = int(subprocess.check_output(["/opt/homebrew/bin/psql", "-h", "localhost", "-p", "5432", "-U", "campaignops", "-d", "campaignops", "-t", "-c", f"SELECT count(*) FROM \"Voter\" WHERE \"campaignId\" = '{campaign_id}';"], env=pg_env).decode().strip())
    sql_households = int(subprocess.check_output(["/opt/homebrew/bin/psql", "-h", "localhost", "-p", "5432", "-U", "campaignops", "-d", "campaignops", "-t", "-c", f"SELECT count(*) FROM \"Household\" WHERE \"campaignId\" = '{campaign_id}';"], env=pg_env).decode().strip())

    st, analytics_res, _, _ = camp_admin.request("GET", f"/api/v1/analytics?campaignId={campaign_id}")
    assert st == 200
    api_voters = analytics_res["data"]["voters"]["total"]
    api_households = analytics_res["data"]["households"]["total"]

    assert sql_voters == api_voters, f"Voter count parity mismatch: SQL={sql_voters}, API={api_voters}"
    assert sql_households == api_households, f"Household count parity mismatch: SQL={sql_households}, API={api_households}"
    log(f"PASS: 100% SSoT Parity verified (Voters: {sql_voters}, Households: {sql_households}).")

    # 7. Security Headers Verification on Actual HTTP Response
    log("7. Verifying HTTP Security Headers emitted by production server...")
    st, _, _, hdrs = camp_admin.request("GET", "/login")
    assert hdrs.get("X-Content-Type-Options") == "nosniff", f"Missing nosniff header: {hdrs}"
    assert hdrs.get("X-Frame-Options") == "DENY", f"Missing X-Frame-Options header: {hdrs}"
    assert "strict-origin" in hdrs.get("Referrer-Policy", ""), f"Missing Referrer-Policy: {hdrs}"
    log("PASS: HTTP security headers confirmed on actual live server response.")

    log("=== ALL RECOVERY STEP 13 INTEGRATED QA CHECKS PASSED ===")

if __name__ == "__main__":
    run_final_qa()
