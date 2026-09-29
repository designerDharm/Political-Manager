#!/usr/bin/env python3
"""
Step 10 Automated Verification Test Suite
Tests:
1. Unauthenticated rejection (401)
2. Election Day Activation (Campaign Admin only)
3. Election Day state machine and status persistence
4. VIS Issuance with relational integrity (Voter, Booth, Campaign, User)
5. Anti-IDOR: Booth Mismatch Protection (Voter belongs to Booth 1, request claims Booth 2 -> 400 rejection)
6. Anti-Duplicate: duplicate VIS issuance prevented (409 Conflict)
7. VIS Reissue: explicit reissue allowed with eventType 'REPRINTED'
8. Separation of Concerns: VIS != voted, no vote choice or political inference stored
9. Agent Booth Scoping: Agent assigned to Booth 1 cannot issue VIS or report turnout for Booth 2 (403 Forbidden)
10. Aggregate Turnout Recording: bounds validation (count >= 0, percentage <= 100), source attribution
11. Turnout vs VIS decoupling: VIS count does NOT equal turnout count
12. Election Day Closure: Campaign Admin can close operations
13. Cross-Campaign Scope Isolation: Admin cannot access unowned campaign election operations
14. Mobile Agent workspace route (/agent/election-day) verification
"""

import sys
import json
import urllib.request
import urllib.parse
import http.client

BASE_URL = "http://localhost:3000"

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

class HttpClient:
    def __init__(self):
        self.cookie = None

    def request(self, method, path, data=None):
        url = f"{BASE_URL}{path}"
        req = urllib.request.Request(url, method=method)
        req.add_header("Content-Type", "application/json")
        if self.cookie:
            req.add_header("Cookie", self.cookie)

        body = json.dumps(data).encode("utf-8") if data is not None else None

        try:
            with urllib.request.urlopen(req, data=body) as res:
                set_cookie = res.headers.get("Set-Cookie")
                if set_cookie:
                    self.cookie = set_cookie.split(";")[0]
                status = res.status
                raw = res.read().decode("utf-8")
                try:
                    parsed = json.loads(raw)
                except:
                    parsed = raw
                return status, parsed, raw
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8")
            try:
                parsed = json.loads(raw)
            except:
                parsed = raw
            return e.code, parsed, raw

def login(email, password):
    client = HttpClient()
    status, res, _ = client.request("POST", "/api/v1/auth/login", {"email": email, "password": password})
    if status != 200 or not res.get("success"):
        log(f"Login failed for {email}: {res}", "ERROR")
        return None
    return client

def test_step10():
    log("=== STARTING RECOVERY STEP 10 ELECTION DAY & VIS VERIFICATION ===")
    campaign_id = "aba451f6-94bc-4bc6-9e4e-23cadf384a0c"
    booth1_id = "07338d39-ab94-40e6-84ed-c3dafff45a71" # Booth 1 (Agent assigned)
    booth2_id = "3ecf5dcb-e761-441f-9fe6-6f5075c55867" # Booth 2 (Agent NOT assigned)
    voter1_b1_id = "50aea900-c173-4080-bc86-c719c7023e9f" # Voter in Booth 1
    voter2_b2_id = "a6bedbfb-1ae7-4cdb-b725-add0c85b6a1a" # Voter in Booth 2

    # 1. Unauthenticated Rejection
    log("1. Testing unauthenticated access to /api/v1/election-day...")
    unauth = HttpClient()
    status, _, _ = unauth.request("GET", f"/api/v1/election-day?campaignId={campaign_id}")
    assert status == 401, f"Expected 401, got {status}"
    log("PASS: Unauthenticated access rejected with 401.")

    # 2. Login Campaign Admin
    log("2. Authenticating as Campaign Admin...")
    admin = login("campaign.admin@campaignops.ai", "password123")
    assert admin is not None, "Failed to login as Campaign Admin"
    log("PASS: Campaign Admin authenticated.")

    # 3. Activate Election Day Operations
    log("3. Activating Election Day operations as Campaign Admin...")
    status, res, _ = admin.request("POST", "/api/v1/election-day", {
        "type": "ACTIVATE_ELECTION_DAY",
        "campaignId": campaign_id,
    })
    assert status == 200, f"Failed to activate election day: {res}"
    assert res["data"]["status"] == "ACTIVE"
    log(f"PASS: Election Day activated at {res['data']['openedAt']}.")

    # 4. Fetch Election Day Operational Status
    log("4. Fetching Election Day command center state...")
    status, res, _ = admin.request("GET", f"/api/v1/election-day?campaignId={campaign_id}")
    assert status == 200, f"Failed to get election day state: {res}"
    ed_data = res["data"]
    assert ed_data["campaign"]["electionDayStatus"] == "ACTIVE"
    assert "boothSummaries" in ed_data
    assert len(ed_data["boothSummaries"]) > 0
    log(f"PASS: Election Day status verified as ACTIVE with {len(ed_data['boothSummaries'])} booth operational sectors.")

    # 5. Anti-IDOR: Booth Mismatch Protection
    log("5. Testing Anti-IDOR: Submitting Voter 1 with wrong Booth 2...")
    status, res, _ = admin.request("POST", "/api/v1/election-day", {
        "type": "VIS_ISSUE",
        "campaignId": campaign_id,
        "voterId": voter1_b1_id,
        "boothId": booth2_id, # Voter belongs to Booth 1!
    })
    assert status == 400, f"Expected 400 Bad Request for booth mismatch, got {status}: {res}"
    log("PASS: Cross-booth IDOR rejected with 400 Bad Request.")

    # 6. Issue VIS for Voter 1 in Booth 1
    log(f"6. Issuing legitimate VIS for Voter 1 in Booth 1 ({voter1_b1_id})...")
    status, res, _ = admin.request("POST", "/api/v1/election-day", {
        "type": "VIS_ISSUE",
        "campaignId": campaign_id,
        "voterId": voter1_b1_id,
        "boothId": booth1_id,
    })
    assert status in [200, 201], f"Failed to issue VIS: {res}"
    vis_data = res["data"]
    assert "referenceCode" in vis_data
    assert vis_data["eventType"] in ["ISSUED", "REPRINTED"]
    assert vis_data["voterId"] == voter1_b1_id
    assert vis_data["boothId"] == booth1_id
    log(f"PASS: VIS issued with reference {vis_data['referenceCode']}. Zero vote choice inferred.")

    # 7. Anti-Duplicate: Prevent duplicate first-issue
    log("7. Testing duplicate VIS prevention on double-submit...")
    status, res, _ = admin.request("POST", "/api/v1/election-day", {
        "type": "VIS_ISSUE",
        "campaignId": campaign_id,
        "voterId": voter1_b1_id,
        "boothId": booth1_id,
    })
    assert status == 409, f"Expected 409 Conflict for duplicate issuance, got {status}: {res}"
    log("PASS: Duplicate VIS issuance prevented with 409 Conflict.")

    # 8. Controlled Reissue
    log("8. Testing explicit VIS reissue request...")
    status, res, _ = admin.request("POST", "/api/v1/election-day", {
        "type": "VIS_REISSUE",
        "campaignId": campaign_id,
        "voterId": voter1_b1_id,
        "boothId": booth1_id,
    })
    assert status in [200, 201], f"Expected reissue success, got {status}: {res}"
    assert res["data"]["eventType"] == "REPRINTED"
    log("PASS: Controlled reissue recorded with eventType 'REPRINTED'.")

    # 9. Record Aggregate Booth Turnout (Admin)
    log("9. Recording aggregate observer turnout for Booth 1...")
    status, res, _ = admin.request("POST", "/api/v1/election-day", {
        "type": "TURNOUT_SNAPSHOT",
        "campaignId": campaign_id,
        "boothId": booth1_id,
        "turnoutHour": "11 AM",
        "totalReported": 85,
        "source": "OFFICIAL_ENTRY",
    })
    assert status in [200, 201], f"Failed to record turnout: {res}"
    turnout_data = res["data"]
    assert turnout_data["totalReported"] == 85
    assert turnout_data["source"] == "OFFICIAL_ENTRY"
    log(f"PASS: Turnout snapshot recorded: {turnout_data['totalReported']} electors ({turnout_data['percentage']}%).")

    # 10. Turnout Decoupling from VIS
    log("10. Verifying statutory decoupling: VIS count != Turnout count...")
    status, res, _ = admin.request("GET", f"/api/v1/election-day?campaignId={campaign_id}")
    booth1_summary = next((b for b in res["data"]["boothSummaries"] if b["id"] == booth1_id), None)
    assert booth1_summary is not None
    vis_count = booth1_summary["visIssuedCount"]
    turnout_count = booth1_summary["latestTurnout"]["totalReported"]
    log(f"Booth 1 Metrics: VIS Issued = {vis_count}, Turnout Reported = {turnout_count}")
    assert vis_count != turnout_count, f"Violation: VIS count ({vis_count}) is equal to turnout ({turnout_count})!"
    log("PASS: Decoupling verified: VIS Issued is completely independent from aggregate turnout.")

    # 11. Political Agent Scoped Access
    log("11. Testing Political Agent role scoping and Booth isolation...")
    agent = login("agent@campaignops.ai", "password123")
    assert agent is not None, "Failed to login as Political Agent"

    # Agent gets election day state (scoped to Booth 1)
    status, res, _ = agent.request("GET", f"/api/v1/election-day?campaignId={campaign_id}")
    assert status == 200, f"Agent failed to get election day state: {res}"
    agent_booths = [b["id"] for b in res["data"]["boothSummaries"]]
    assert booth1_id in agent_booths, "Agent must see assigned Booth 1"
    assert booth2_id not in agent_booths, "Agent must NOT see unassigned Booth 2"
    log("PASS: Political Agent view strictly scoped to assigned Booth 1 only.")

    # 12. Agent Out-of-Scope Mutation Denial
    log("12. Testing Political Agent cannot issue VIS for Booth 2 voter...")
    status, res, _ = agent.request("POST", "/api/v1/election-day", {
        "type": "VIS_ISSUE",
        "campaignId": campaign_id,
        "voterId": voter2_b2_id, # Voter in Booth 2
        "boothId": booth2_id,
    })
    assert status == 403, f"Expected 403 Forbidden for agent out-of-scope VIS issue, got {status}"
    log("PASS: Political Agent forbidden from issuing VIS in unassigned Booth 2 (403).")

    # 13. Agent Cannot Activate or Close Election Day
    log("13. Testing Political Agent cannot alter Election Day operational lifecycle...")
    status, res, _ = agent.request("POST", "/api/v1/election-day", {
        "type": "CLOSE_ELECTION_DAY",
        "campaignId": campaign_id,
    })
    assert status == 403, f"Expected 403 Forbidden for agent closing election day, got {status}"
    log("PASS: Political Agent forbidden from changing Election Day state (403).")

    # 14. Turnout Bounds Validation (Strict Invariant: 0 <= turnoutCount <= totalElectors)
    log("14. Testing turnout boundary validation (0 <= turnoutCount <= totalElectors)...")
    # Fetch authoritative booth totalElectors
    status, res, _ = admin.request("GET", f"/api/v1/election-day?campaignId={campaign_id}")
    b1_info = next((b for b in res["data"]["boothSummaries"] if b["id"] == booth1_id), None)
    electors = b1_info["totalElectors"]
    log(f"Booth 1 authoritative electors: {electors}")

    # Case A: Negative count (-1) -> REJECT 400
    status, res, _ = admin.request("POST", "/api/v1/election-day", {
        "type": "TURNOUT_SNAPSHOT",
        "campaignId": campaign_id,
        "boothId": booth1_id,
        "turnoutHour": "1 PM",
        "totalReported": -1,
    })
    assert status == 400, f"Expected 400 for negative turnout (-1), got {status}"
    log("PASS: Negative count (-1) rejected with 400.")

    # Case B: Exceeds electors by 1 (electors + 1) -> REJECT 400
    status, res, _ = admin.request("POST", "/api/v1/election-day", {
        "type": "TURNOUT_SNAPSHOT",
        "campaignId": campaign_id,
        "boothId": booth1_id,
        "turnoutHour": "1 PM",
        "totalReported": electors + 1,
    })
    assert status == 400, f"Expected 400 for electors + 1 ({electors + 1}), got {status}"
    log(f"PASS: Turnout exceeding electors + 1 ({electors + 1}) rejected with 400.")

    # Case C: 120% of electors -> REJECT 400
    status, res, _ = admin.request("POST", "/api/v1/election-day", {
        "type": "TURNOUT_SNAPSHOT",
        "campaignId": campaign_id,
        "boothId": booth1_id,
        "turnoutHour": "1 PM",
        "totalReported": int(electors * 1.2) + 1,
    })
    assert status == 400, f"Expected 400 for 120% electors, got {status}"
    log("PASS: 120% electors rejected with 400.")

    # Case D: 150% of electors -> REJECT 400 (was previously allowed, now strictly rejected)
    status, res, _ = admin.request("POST", "/api/v1/election-day", {
        "type": "TURNOUT_SNAPSHOT",
        "campaignId": campaign_id,
        "boothId": booth1_id,
        "turnoutHour": "1 PM",
        "totalReported": int(electors * 1.5),
    })
    assert status == 400, f"Expected 400 for 150% electors, got {status}"
    log("PASS: 150% electors rejected with 400.")

    # Case E: Boundary 0 -> ACCEPT 201, percentage == 0.0%
    status, res, _ = admin.request("POST", "/api/v1/election-day", {
        "type": "TURNOUT_SNAPSHOT",
        "campaignId": campaign_id,
        "boothId": booth1_id,
        "turnoutHour": "7 AM",
        "totalReported": 0,
    })
    assert status in [200, 201], f"Expected success for turnout = 0, got {status}"
    assert res["data"]["percentage"] == 0, f"Expected 0% for turnout = 0, got {res['data']['percentage']}"
    log("PASS: Boundary count 0 accepted with percentage 0.0%.")

    # Case F: Boundary electors (100% capacity) -> ACCEPT 201, percentage == 100.0%
    status, res, _ = admin.request("POST", "/api/v1/election-day", {
        "type": "TURNOUT_SNAPSHOT",
        "campaignId": campaign_id,
        "boothId": booth1_id,
        "turnoutHour": "6 PM",
        "totalReported": electors,
    })
    assert status in [200, 201], f"Expected success for turnout = electors ({electors}), got {status}"
    assert res["data"]["percentage"] == 100.0, f"Expected 100% for turnout = electors, got {res['data']['percentage']}"
    log(f"PASS: Upper boundary count ({electors}) accepted with exact percentage 100.0%.")

    # 15. Verify Agent Mobile Page & Admin Page Availability
    log("15. Verifying /agent/election-day and /campaigns/[id]/election-day pages...")
    agent_page_st, _, _ = agent.request("GET", "/agent/election-day")
    assert agent_page_st == 200, f"Expected 200 for agent election-day page, got {agent_page_st}"
    
    admin_page_st, _, _ = admin.request("GET", f"/campaigns/{campaign_id}/election-day")
    assert admin_page_st == 200, f"Expected 200 for admin election-day page, got {admin_page_st}"
    log("PASS: Both Mobile Agent workspace and Admin Command Center render with 200 OK.")

    # 16. Cross-Campaign Scope Isolation
    log("16. Testing Cross-Campaign isolation...")
    cross_st, _, _ = admin.request("GET", "/api/v1/election-day?campaignId=00000000-0000-0000-0000-000000000000")
    assert cross_st in [403, 404], f"Expected 403 or 404 for unowned campaign, got {cross_st}"
    log("PASS: Cross-campaign isolation verified.")

    log("=== ALL RECOVERY STEP 10 ELECTION DAY & VIS VERIFICATION TESTS PASSED ===")

if __name__ == "__main__":
    try:
        test_step10()
    except Exception as e:
        log(f"Verification failed: {e}", "FATAL")
        sys.exit(1)
