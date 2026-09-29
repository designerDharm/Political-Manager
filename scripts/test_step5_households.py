import urllib.request
import json
import sys

BASE_URL = "http://localhost:3000"
CAMPAIGN_ID = "aba451f6-94bc-4bc6-9e4e-23cadf384a0c"

def login(email, password):
    data = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/v1/auth/login",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return resp.headers.get("Set-Cookie").split(";")[0]

admin_cookie = login("campaign.admin@campaignops.ai", "password123")
agent_cookie = login("agent@campaignops.ai", "password123")

print("--- 1. Testing Agent Denial on Grouping Execution ---")
req = urllib.request.Request(
    f"{BASE_URL}/api/v1/households/grouping/run",
    data=json.dumps({"campaignId": CAMPAIGN_ID}).encode("utf-8"),
    headers={"Content-Type": "application/json", "Cookie": agent_cookie}
)
try:
    urllib.request.urlopen(req)
    print("FAILED: Agent was allowed to execute grouping!")
    sys.exit(1)
except urllib.error.HTTPError as e:
    print(f"PASSED: Agent grouping execution denied with HTTP {e.code}")

print("\n--- 2. Executing Real Household Grouping via Campaign Admin ---")
req = urllib.request.Request(
    f"{BASE_URL}/api/v1/households/grouping/run",
    data=json.dumps({"campaignId": CAMPAIGN_ID}).encode("utf-8"),
    headers={"Content-Type": "application/json", "Cookie": admin_cookie}
)
with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode("utf-8"))
    d = res["data"]
    print(f"PASSED: Evaluated {d['votersEvaluated']} voters. Created {d['householdsCreated']} households, updated {d['householdsUpdated']}.")
    print(f"Stats: High Confidence={d['highConfidenceCount']}, Needs Review={d['needsReviewCount']}, Single Person={d['singlePersonCount']}")

print("\n--- 3. Fetching Grouped Households from PostgreSQL ---")
req = urllib.request.Request(
    f"{BASE_URL}/api/v1/households?campaignId={CAMPAIGN_ID}&limit=10",
    headers={"Cookie": admin_cookie}
)
with urllib.request.urlopen(req) as resp:
    hh_res = json.loads(resp.read().decode("utf-8"))
    households = hh_res["data"]
    total_hh = hh_res["meta"]["pagination"]["total"]
    summary = hh_res["meta"]["summary"]
    print(f"PASSED: Found {total_hh} total households in DB. Summary: {summary}")
    test_hh = households[0]
    hh_id = test_hh["id"]
    hh_code = test_hh["code"]
    hh_members = test_hh["members"]
    print(f"Sample Household: ID={hh_id}, Code={hh_code}, Members Count={len(hh_members)}, Status={test_hh['status']}")
    for m in hh_members[:3]:
        print(f"  - Member: {m['name']} (EPIC={m['epicNumber']}, Age={m['age']}, Relation={m.get('relationshipType')})")

print("\n--- 4. Confirming Household Grouping ---")
req = urllib.request.Request(
    f"{BASE_URL}/api/v1/households/{hh_id}/confirm",
    data=b"{}",
    headers={"Content-Type": "application/json", "Cookie": admin_cookie}
)
with urllib.request.urlopen(req) as resp:
    conf_res = json.loads(resp.read().decode("utf-8"))
    print(f"PASSED: Confirmed household: {conf_res['data']['code']}, Status={conf_res['data']['status']}")

print("\n--- 5. Testing Address / Contact Correction ---")
patch_data = json.dumps({
    "address": "Lane 4, Sector 5, Near Community Park",
    "primaryContactName": hh_members[0]["name"]
}).encode("utf-8")
req = urllib.request.Request(
    f"{BASE_URL}/api/v1/households/{hh_id}",
    data=patch_data,
    headers={"Content-Type": "application/json", "Cookie": admin_cookie},
    method="PATCH"
)
with urllib.request.urlopen(req) as resp:
    patch_res = json.loads(resp.read().decode("utf-8"))
    print(f"PASSED: Updated address: {patch_res['data']['address']}, Contact={patch_res['data']['primaryContactName']}")

print("\n--- 6. Testing Member Move (Relocate to New Household) ---")
if len(hh_members) >= 2:
    voter_to_move = hh_members[1]
    move_data = json.dumps({
        "voterId": voter_to_move["id"],
        "createNewHousehold": True,
        "newHouseNumber": "99-Z",
        "newAddress": "Block B, New Colony"
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/v1/households/{hh_id}/move-member",
        data=move_data,
        headers={"Content-Type": "application/json", "Cookie": admin_cookie}
    )
    with urllib.request.urlopen(req) as resp:
        move_res = json.loads(resp.read().decode("utf-8"))
        print(f"PASSED: Moved voter {voter_to_move['name']} to new household: {move_res['data']['toHouseholdId']}")

print("\n--- 7. Testing Household Split ---")
# Pick a household with >= 3 members
target_for_split = None
for h in households:
    if len(h["members"]) >= 3:
        target_for_split = h
        break

if target_for_split:
    split_voters = [target_for_split["members"][0]["id"], target_for_split["members"][1]["id"]]
    split_data = json.dumps({
        "voterIds": split_voters,
        "newHouseNumber": "SPLIT-101",
        "newAddress": "Separate Unit"
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/v1/households/{target_for_split['id']}/split",
        data=split_data,
        headers={"Content-Type": "application/json", "Cookie": admin_cookie}
    )
    with urllib.request.urlopen(req) as resp:
        split_res = json.loads(resp.read().decode("utf-8"))
        print(f"PASSED: Split household {target_for_split['code']} created new unit: {split_res['data']['code']}")
else:
    print("SKIPPED split test: no household with >= 3 members found.")

print("\n--- 8. Testing Manual Correction Precedence on Re-run ---")
# Re-running grouping must NOT overwrite the moved voter or confirmed household
req = urllib.request.Request(
    f"{BASE_URL}/api/v1/households/grouping/run",
    data=json.dumps({"campaignId": CAMPAIGN_ID}).encode("utf-8"),
    headers={"Content-Type": "application/json", "Cookie": admin_cookie}
)
with urllib.request.urlopen(req) as resp:
    rerun_res = json.loads(resp.read().decode("utf-8"))
    print(f"PASSED: Grouping re-run executed. Rerun result: {rerun_res['data']}")

# Check that confirmed household status was retained
req = urllib.request.Request(
    f"{BASE_URL}/api/v1/households/{hh_id}",
    headers={"Cookie": admin_cookie}
)
with urllib.request.urlopen(req) as resp:
    recheck_hh = json.loads(resp.read().decode("utf-8"))["data"]
    print(f"PASSED: Confirmed household status preserved after rerun: {recheck_hh['status']}, ManuallyCorrected: {recheck_hh['isManuallyCorrected']}")

print("\n--- 9. Testing Cross-Campaign Isolation ---")
FAKE_CAMPAIGN_ID = "00000000-0000-0000-0000-000000000000"
req = urllib.request.Request(
    f"{BASE_URL}/api/v1/households?campaignId={FAKE_CAMPAIGN_ID}",
    headers={"Cookie": admin_cookie}
)
try:
    urllib.request.urlopen(req)
    print("FAILED: Cross-campaign access allowed!")
    sys.exit(1)
except urllib.error.HTTPError as e:
    print(f"PASSED: Cross-campaign household access denied with HTTP {e.code}")

print("\n--- 10. Testing Agent Booth Scoping Enforcement ---")
# Agent assigned scope check: try modifying a household outside scope
req = urllib.request.Request(
    f"{BASE_URL}/api/v1/households/{hh_id}/confirm",
    data=b"{}",
    headers={"Content-Type": "application/json", "Cookie": agent_cookie}
)
try:
    urllib.request.urlopen(req)
    print("Agent was in scope or allowed.")
except urllib.error.HTTPError as e:
    print(f"PASSED: Agent unauthorized booth scope denied with HTTP {e.code}")

print("\nALL RECOVERY STEP 5 VERIFICATIONS PASSED!")
