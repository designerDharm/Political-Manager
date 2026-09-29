import urllib.request
import urllib.parse
import json
import sys

BASE_URL = "http://localhost:3000"

def login(email, password):
    data = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/v1/auth/login",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    resp = urllib.request.urlopen(req)
    cookie = resp.headers.get("Set-Cookie").split(";")[0]
    body = json.loads(resp.read().decode("utf-8"))
    return cookie, body["data"]["user"]

def request(method, path, cookie=None, body=None):
    headers = {}
    if cookie:
        headers["Cookie"] = cookie
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except:
            return e.code, {"error": err_body}

def run_tests():
    print("=== STARTING RECOVERY STEP 6 COMPREHENSIVE VERIFICATION ===")

    # 1. Login Campaign Admin
    print("\n--- 1. Login Campaign Admin ---")
    admin_cookie, admin_user = login("campaign.admin@campaignops.ai", "password123")
    print(f"Logged in as Campaign Admin: {admin_user['displayName']} ({admin_user['email']})")

    # 2. Login Political Agent
    print("\n--- 2. Login Political Agent ---")
    agent_cookie, agent_user = login("agent@campaignops.ai", "password123")
    print(f"Logged in as Political Agent: {agent_user['displayName']} ({agent_user['email']})")

    campaign_id = "aba451f6-94bc-4bc6-9e4e-23cadf384a0c"

    # 3. Verify Team List via API
    print("\n--- 3. Verify Campaign Team List ---")
    st, team_res = request("GET", f"/api/v1/users?campaignId={campaign_id}", cookie=admin_cookie)
    assert st == 200, f"Expected 200, got {st}"
    members = team_res["data"]
    print(f"Campaign Team members count: {len(members)}")
    assert len(members) >= 1, "Must have campaign members"

    # 4. Campaign Admin assigns Booth to Agent
    print("\n--- 4. Assign Booth Work to Agent ---")
    # Get Booths for campaign
    st, camp_res = request("GET", f"/api/v1/campaigns/{campaign_id}", cookie=admin_cookie)
    booths = camp_res["data"]["booths"]
    assert len(booths) >= 2, "Need at least 2 booths for isolation testing"
    booth_1 = booths[0]
    booth_2 = booths[1]
    print(f"Booth 1 (Assigned): Booth #{booth_1['boothNumber']} ({booth_1['id']}) - {booth_1['name']}")
    print(f"Booth 2 (Unassigned): Booth #{booth_2['boothNumber']} ({booth_2['id']}) - {booth_2['name']}")

    task_payload = {
        "campaignId": campaign_id,
        "userId": agent_user["id"],
        "scopeType": "BOOTH",
        "scopeTarget": f"Booth {booth_1['boothNumber']} - {booth_1['name']}",
        "taskType": "Voter Outreach & Verification",
        "notes": "Door-to-door verification for Golden Flow verification.",
        "boothId": booth_1["id"],
    }
    st, task_res = request("POST", "/api/v1/tasks", cookie=admin_cookie, body=task_payload)
    if st == 409:
        print("Task already actively assigned. SSoT Duplicate prevention working!")
        # Fetch the active task
        st, my_tasks = request("GET", f"/api/v1/tasks?campaignId={campaign_id}&userId={agent_user['id']}", cookie=admin_cookie)
        assignment_id = my_tasks["data"][0]["id"]
    else:
        assert st == 201, f"Expected 201 created, got {st}: {task_res}"
        assignment_id = task_res["data"]["id"]
        print(f"Created Assignment: {assignment_id}")

    # Test Duplicate Task Rejection
    print("\n--- 5. Verify Duplicate Assignment Prevention ---")
    st_dup, res_dup = request("POST", "/api/v1/tasks", cookie=admin_cookie, body=task_payload)
    print(f"Duplicate assignment attempt status: {st_dup} (Expected 409)")
    assert st_dup == 409, f"Expected 409 conflict, got {st_dup}"

    # 6. Verify Agent Cannot Self-Assign / Expand Scope
    print("\n--- 6. Verify Agent Scope Protection (Agent cannot assign tasks) ---")
    agent_task_payload = {
        "campaignId": campaign_id,
        "userId": agent_user["id"],
        "scopeType": "BOOTH",
        "scopeTarget": f"Booth {booth_2['boothNumber']}",
        "taskType": "Self Assignment",
        "boothId": booth_2["id"],
    }
    st_agent_expand, res_agent_expand = request("POST", "/api/v1/tasks", cookie=agent_cookie, body=agent_task_payload)
    print(f"Agent self-assignment attempt status: {st_agent_expand} (Expected 403)")
    assert st_agent_expand == 403, f"Expected 403 Forbidden, got {st_agent_expand}"

    # 7. Agent queries their tasks
    print("\n--- 7. Agent Queries Own Tasks ---")
    st_tasks, tasks_res = request("GET", f"/api/v1/tasks?campaignId={campaign_id}", cookie=agent_cookie)
    assert st_tasks == 200, f"Expected 200, got {st_tasks}"
    agent_tasks = tasks_res["data"]
    print(f"Agent tasks count: {len(agent_tasks)}")
    for t in agent_tasks:
        assert t["userId"] == agent_user["id"], "Agent must only receive their own tasks"
        print(f"  Task: {t['taskType']} | {t['scopeTarget']} | Status: {t['status']}")

    # 8. Agent Scoped Search (Positive test on assigned Booth 1)
    print("\n--- 8. Agent Scoped Search on Assigned Booth 1 ---")
    st_search, search_res = request("GET", f"/api/v1/voters?campaignId={campaign_id}&limit=10", cookie=agent_cookie)
    assert st_search == 200, f"Expected 200, got {st_search}"
    assigned_voters = search_res["data"]
    print(f"Electors visible in Agent assigned scope: {len(assigned_voters)}")
    assert len(assigned_voters) > 0, "Agent should see voters in assigned booth"
    for v in assigned_voters:
        assert v["boothId"] == booth_1["id"], f"Leaked voter from outside booth {booth_1['id']}! Got {v['boothId']}"
    target_voter = assigned_voters[0]
    print(f"Found permitted elector: {target_voter['name']} (EPIC: {target_voter['epicNumber']}) in Household {target_voter.get('household', {}).get('code')}")

    # 9. Agent Search IDOR Test (Querying a voter from Booth 2)
    print("\n--- 9. Agent Search IDOR Test (Denied access to unassigned Booth 2) ---")
    # Get a voter from Booth 2 using admin
    st_b2_voters, b2_voters_res = request("GET", f"/api/v1/voters?campaignId={campaign_id}&booth={booth_2['boothNumber']}&limit=1", cookie=admin_cookie)
    if b2_voters_res["data"]:
        b2_voter = b2_voters_res["data"][0]
        # Agent tries direct ID lookup of b2_voter
        st_idor_voter, res_idor_voter = request("GET", f"/api/v1/voters/{b2_voter['id']}", cookie=agent_cookie)
        print(f"Agent direct lookup on out-of-scope voter: status {st_idor_voter} (Expected 403)")
        assert st_idor_voter == 403, f"Expected 403 IDOR rejection, got {st_idor_voter}"

    # 10. Agent Opens Assigned Household & Records Field Visit
    print("\n--- 10. Agent Field Visit on Permitted Household ---")
    hid = target_voter["householdId"]
    assert hid, "Target voter must belong to a household"
    st_hh, hh_res = request("GET", f"/api/v1/households/{hid}", cookie=agent_cookie)
    assert st_hh == 200, f"Expected 200, got {st_hh}"
    hh_data = hh_res["data"]
    print(f"Opened Household {hh_data['code']} at {hh_data['address']} ({len(hh_data['members'])} members)")

    visit_payload = {
        "status": "VISITED",
        "notes": "Verified household members in person. All adults registered.",
        "voterId": target_voter["id"]
    }
    st_visit, visit_res = request("POST", f"/api/v1/households/{hid}", cookie=agent_cookie, body=visit_payload)
    assert st_visit == 201, f"Expected 201, got {st_visit}: {visit_res}"
    interaction_id = visit_res["data"]["id"]
    print(f"Recorded Field Interaction: {interaction_id} (Status: VISITED)")

    # 11. Agent Reports Operational Issue
    print("\n--- 11. Agent Reports Field Issue ---")
    issue_payload = {
        "campaignId": campaign_id,
        "boothId": booth_1["id"],
        "householdId": hid,
        "title": "Address Number Discrepancy",
        "category": "Household Data",
        "priority": "LOW",
        "description": "Family noted that door plate reads 14-B instead of 14.",
    }
    st_issue, issue_res = request("POST", "/api/v1/issues", cookie=agent_cookie, body=issue_payload)
    assert st_issue == 201, f"Expected 201, got {st_issue}: {issue_res}"
    issue_code = issue_res["data"]["code"]
    print(f"Reported Field Issue: {issue_code} ({issue_res['data']['title']})")

    # 12. Agent Household IDOR Test (Attempt to visit or fetch Household in Booth 2)
    print("\n--- 12. Agent Household IDOR Protection Test ---")
    st_b2_hh, b2_hh_res = request("GET", f"/api/v1/households?campaignId={campaign_id}&boothId={booth_2['id']}&limit=1", cookie=admin_cookie)
    if b2_hh_res["data"]:
        b2_household = b2_hh_res["data"][0]
        # Agent tries GET
        st_hh_idor, res_hh_idor = request("GET", f"/api/v1/households/{b2_household['id']}", cookie=agent_cookie)
        print(f"Agent GET out-of-scope household status: {st_hh_idor} (Expected 403)")
        assert st_hh_idor == 403, f"Expected 403, got {st_hh_idor}"

        # Agent tries POST visit
        st_visit_idor, _ = request("POST", f"/api/v1/households/{b2_household['id']}", cookie=agent_cookie, body=visit_payload)
        print(f"Agent POST visit out-of-scope household status: {st_visit_idor} (Expected 403)")
        assert st_visit_idor == 403, f"Expected 403, got {st_visit_idor}"

    # 13. Campaign Admin Field Operations Visibility After Refresh
    print("\n--- 13. Campaign Admin Field Operations Verification ---")
    st_hh_check, hh_check_res = request("GET", f"/api/v1/households/{hid}", cookie=admin_cookie)
    assert st_hh_check == 200
    interactions = hh_check_res["data"]["interactions"]
    assert any(i["id"] == interaction_id for i in interactions), "Admin must see recorded interaction"
    print(f"Admin confirmed interaction {interaction_id} persisted in Household history.")

    # 14. Cross-Campaign Isolation Test
    print("\n--- 14. Cross-Campaign Isolation Test ---")
    unauthorized_camp_id = "00000000-0000-0000-0000-000000000000"
    st_cross_admin, _ = request("GET", f"/api/v1/tasks?campaignId={unauthorized_camp_id}", cookie=admin_cookie)
    print(f"Admin access to unauthorized campaign tasks status: {st_cross_admin} (Expected 403)")
    assert st_cross_admin == 403

    st_cross_agent, _ = request("GET", f"/api/v1/voters?campaignId={unauthorized_camp_id}", cookie=agent_cookie)
    print(f"Agent access to unauthorized campaign voters status: {st_cross_agent} (Expected 403)")
    assert st_cross_agent == 403

    print("\n=== ALL RECOVERY STEP 6 AUTOMATED CHECKS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
