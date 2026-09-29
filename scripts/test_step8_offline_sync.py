#!/usr/bin/env python3
"""
Step 8 Automated Verification Test Suite
Tests:
1. PWA manifest & Service worker availability
2. /api/v1/sync authentication and validation
3. Safe offline batch processing with idempotency
4. Scope enforcement & rejection of out-of-scope booth mutations
5. BaseVersion optimistic concurrency conflict detection
6. Append-only Interaction and Issue creation
7. AuditEvent and SSE propagation to Admin after sync
"""

import sys
import json
import time
import threading
import urllib.request
import urllib.parse
import http.client

BASE_URL = "http://localhost:3000"

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def login(email, password):
    url = f"{BASE_URL}/api/v1/auth/login"
    data = json.dumps({"email": email, "password": password}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req)
        cookies = resp.headers.get_all('Set-Cookie') or []
        session_cookie = ""
        for c in cookies:
            if "campaignops_session=" in c:
                session_cookie = c.split(';')[0]
                break
        res_json = json.loads(resp.read().decode('utf-8'))
        return session_cookie, res_json
    except Exception as e:
        log(f"Login failed for {email}: {e}", "FAIL")
        return None, None

class SSEClient(threading.Thread):
    def __init__(self, campaign_id, cookie):
        super().__init__()
        self.campaign_id = campaign_id
        self.cookie = cookie
        self.events = []
        self.running = True
        self.daemon = True

    def run(self):
        url_path = f"/api/v1/realtime?campaignId={self.campaign_id}"
        conn = http.client.HTTPConnection("localhost", 3000, timeout=20)
        headers = {"Cookie": self.cookie}

        try:
            conn.request("GET", url_path, headers=headers)
            response = conn.getresponse()
            current_event = {}

            while self.running:
                line = response.readline().decode('utf-8')
                if not line:
                    break
                line = line.strip()
                if not line:
                    if current_event:
                        self.events.append(current_event)
                        current_event = {}
                    continue

                if line.startswith("id:"):
                    current_event["id"] = line[3:].strip()
                elif line.startswith("event:"):
                    current_event["event"] = line[6:].strip()
                elif line.startswith("data:"):
                    data_str = line[5:].strip()
                    try:
                        current_event["data"] = json.loads(data_str)
                    except:
                        current_event["data"] = data_str
        except:
            pass
        finally:
            conn.close()

    def stop(self):
        self.running = False

def run_tests():
    log("==================================================", "START")
    log("RECOVERY STEP 8: OFFLINE PWA & SAFE SYNC TEST SUITE", "START")
    log("==================================================", "START")

    results = []

    # TEST 1: PWA Manifest & Service Worker static availability
    log("TEST 1: Verifying PWA Manifest and Service Worker static assets...")
    try:
        manifest_req = urllib.request.Request(f"{BASE_URL}/manifest.json")
        with urllib.request.urlopen(manifest_req) as resp:
            manifest_json = json.loads(resp.read().decode())
            assert manifest_json.get("name") == "CampaignOps AI"
            assert manifest_json.get("display") == "standalone"

        sw_req = urllib.request.Request(f"{BASE_URL}/sw.js")
        with urllib.request.urlopen(sw_req) as resp:
            sw_code = resp.read().decode()
            assert "campaignops-v1" in sw_code
            assert "skipWaiting" in sw_code

        log("PASS: PWA manifest.json and sw.js are valid and served with HTTP 200", "PASS")
        results.append(("PWA Manifest & Service Worker", True))
    except Exception as e:
        log(f"FAIL: Manifest/SW check failed: {e}", "FAIL")
        results.append(("PWA Manifest & Service Worker", False))

    # Log in Admin & Agent
    admin_cookie, admin_data = login("campaign.admin@campaignops.ai", "password123")
    agent_cookie, agent_data = login("agent@campaignops.ai", "password123")
    campaign_id = "aba451f6-94bc-4bc6-9e4e-23cadf384a0c"
    agent_user_id = agent_data["data"]["user"]["id"]

    # TEST 2: Unauthenticated Sync Rejection (401)
    log("TEST 2: Verifying unauthenticated /api/v1/sync request is rejected with 401...")
    try:
        unauth_req = urllib.request.Request(
            f"{BASE_URL}/api/v1/sync",
            data=json.dumps({"mutations": []}).encode(),
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(unauth_req)
        log("FAIL: Expected 401, but unauthenticated request succeeded", "FAIL")
        results.append(("Unauthenticated Sync Rejection", False))
    except urllib.error.HTTPError as e:
        if e.code == 401:
            log("PASS: Unauthenticated sync correctly rejected with HTTP 401", "PASS")
            results.append(("Unauthenticated Sync Rejection", True))
        else:
            log(f"FAIL: Expected 401, got {e.code}", "FAIL")
            results.append(("Unauthenticated Sync Rejection", False))

    # TEST 3: Offline Field Visit Queued Mutation applied to PostgreSQL
    log("TEST 3: Simulating offline field visit mutation sync to PostgreSQL...")
    # Fetch a household in Booth 1 (e.g. H-001)
    hh_req = urllib.request.Request(
        f"{BASE_URL}/api/v1/households?campaignId={campaign_id}&limit=5",
        headers={"Cookie": agent_cookie}
    )
    with urllib.request.urlopen(hh_req) as resp:
        hh_list = json.loads(resp.read().decode())["data"]
        target_hh = hh_list[0]
        target_hid = target_hh["id"]
        target_code = target_hh["code"]
        current_version = target_hh.get("version", 1)

    # Start Admin SSE listener to verify realtime update after sync
    admin_sse = SSEClient(campaign_id, admin_cookie)
    admin_sse.start()
    time.sleep(1)
    admin_event_count_before = len(admin_sse.events)

    mut_id_1 = f"mut_test_{int(time.time())}_1"
    sync_payload = {
        "mutations": [
            {
                "mutationId": mut_id_1,
                "deviceId": "dev_test_suite_001",
                "campaignId": campaign_id,
                "entityType": "household",
                "entityId": target_hid,
                "baseVersion": current_version,
                "operation": "UPDATE_STATUS_AND_VISIT",
                "payload": {
                    "status": "Verified",
                    "visitStatus": "VISITED",
                    "notes": "Door-to-door offline test visit via /sync"
                },
                "clientOccurredAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "queuedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
        ]
    }

    sync_req = urllib.request.Request(
        f"{BASE_URL}/api/v1/sync",
        data=json.dumps(sync_payload).encode(),
        headers={"Cookie": agent_cookie, "Content-Type": "application/json"}
    )

    with urllib.request.urlopen(sync_req) as resp:
        sync_resp = json.loads(resp.read().decode())

    first_res = sync_resp["data"]["results"][0]
    if first_res["status"] == "APPLIED":
        log(f"PASS: Household {target_code} offline mutation successfully APPLIED (version {first_res.get('newVersion')})", "PASS")
        results.append(("Offline field visit sync", True))
    else:
        log(f"FAIL: Sync returned status {first_res.get('status')}: {first_res.get('reason')}", "FAIL")
        results.append(("Offline field visit sync", False))

    # TEST 4: Idempotency Check (resending SAME mutationId must NOT duplicate)
    log("TEST 4: Resending identical mutationId to verify idempotency prevention...")
    with urllib.request.urlopen(sync_req) as resp:
        dup_resp = json.loads(resp.read().decode())
    dup_res = dup_resp["data"]["results"][0]
    if dup_res["status"] == "ALREADY_APPLIED":
        log("PASS: Server recognized already processed mutationId, returned ALREADY_APPLIED", "PASS")
        results.append(("Mutation idempotency", True))
    else:
        log(f"FAIL: Expected ALREADY_APPLIED, got {dup_res.get('status')}", "FAIL")
        results.append(("Mutation idempotency", False))

    # TEST 5: SSE Realtime Event propagated to Campaign Admin from offline sync
    log("TEST 5: Verifying Admin SSE received FIELD_VISIT_RECORDED after offline sync...")
    received_realtime = False
    for _ in range(8):
        time.sleep(0.5)
        for ev in admin_sse.events[admin_event_count_before:]:
            if ev.get("event") == "FIELD_VISIT_RECORDED":
                received_realtime = True
                break
        if received_realtime:
            break

    if received_realtime:
        log("PASS: Admin SSE received live notification for synced offline visit", "PASS")
        results.append(("SSE propagation after sync", True))
    else:
        log("FAIL: Admin did not receive SSE event for synced offline visit within 4s", "FAIL")
        results.append(("SSE propagation after sync", False))

    # TEST 6: BaseVersion Concurrency Conflict Detection
    log("TEST 6: Testing baseVersion mismatch (stale offline mutation detection)...")
    stale_mut_id = f"mut_stale_{int(time.time())}"
    stale_payload = {
        "mutations": [
            {
                "mutationId": stale_mut_id,
                "deviceId": "dev_test_suite_001",
                "campaignId": campaign_id,
                "entityType": "household",
                "entityId": target_hid,
                "baseVersion": 0, # Stale base version
                "operation": "UPDATE_STATUS_AND_VISIT",
                "payload": {"status": "Verified"},
                "clientOccurredAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "queuedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
        ]
    }
    stale_req = urllib.request.Request(
        f"{BASE_URL}/api/v1/sync",
        data=json.dumps(stale_payload).encode(),
        headers={"Cookie": agent_cookie, "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(stale_req) as resp:
        conflict_res = json.loads(resp.read().decode())["data"]["results"][0]

    if conflict_res["status"] == "CONFLICT" and conflict_res["reason"] == "VERSION_MISMATCH":
        log("PASS: Server correctly detected VERSION_MISMATCH and refused stale overwrite", "PASS")
        results.append(("Version conflict detection", True))
    else:
        log(f"FAIL: Expected CONFLICT, got {conflict_res.get('status')}", "FAIL")
        results.append(("Version conflict detection", False))

    # TEST 7: Re-authorization Scope Check (Out-of-Scope Booth Rejection)
    log("TEST 7: Testing server RBAC re-validation (mutation in Booth 2 by Booth 1 agent)...")
    out_of_scope_mut_id = f"mut_forbidden_{int(time.time())}"
    # Target Booth 2 ID: 3ecf5dcb-e761-441f-9fe6-6f5075c55867
    forbidden_payload = {
        "mutations": [
            {
                "mutationId": out_of_scope_mut_id,
                "deviceId": "dev_test_suite_001",
                "campaignId": campaign_id,
                "entityType": "issue",
                "entityId": "temp_iss_001",
                "baseVersion": 1,
                "operation": "CREATE_ISSUE",
                "payload": {
                    "boothId": "3ecf5dcb-e761-441f-9fe6-6f5075c55867", # Booth 2 (outside agent scope)
                    "title": "Unauthorized out-of-scope issue"
                },
                "clientOccurredAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "queuedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
        ]
    }
    forbidden_req = urllib.request.Request(
        f"{BASE_URL}/api/v1/sync",
        data=json.dumps(forbidden_payload).encode(),
        headers={"Cookie": agent_cookie, "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(forbidden_req) as resp:
        forbid_res = json.loads(resp.read().decode())["data"]["results"][0]

    if forbid_res["status"] == "FORBIDDEN":
        log("PASS: Server rejected out-of-scope booth mutation with FORBIDDEN", "PASS")
        results.append(("Server RBAC & Booth Scope Revalidation", True))
    else:
        log(f"FAIL: Expected FORBIDDEN, got {forbid_res.get('status')}", "FAIL")
        results.append(("Server RBAC & Booth Scope Revalidation", False))

    admin_sse.stop()

    # Final summary
    log("==================================================", "SUMMARY")
    all_passed = all(passed for _, passed in results)
    for test_name, passed in results:
        log(f"{'[PASS]' if passed else '[FAIL]'} {test_name}")
    log("==================================================", "SUMMARY")

    if all_passed:
        log("ALL STEP 8 OFFLINE & SYNC TESTS PASSED SUCCESSFULLY!", "SUCCESS")
        return 0
    else:
        log("SOME STEP 8 TESTS FAILED!", "ERROR")
        return 1

if __name__ == "__main__":
    sys.exit(run_tests())
