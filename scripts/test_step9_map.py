#!/usr/bin/env python3
"""
Recovery Step 9 Automated Verification Test Suite
Tests:
1. Unauthenticated rejection (401)
2. Campaign Admin map retrieval (GeoJSON FeatureCollection)
3. Data minimization (zero voter names, zero EPIC IDs)
4. Coordinate boundary validation (-90..90 lat, -180..180 lng)
5. Admin coordinate update persistence to PostgreSQL
6. GeoJSON Point feature projection and metric computation
7. Political Agent role-based scope isolation (Booth 1 only)
8. Political Agent mutation prevention (403 Forbidden)
9. Cross-campaign access prohibition (403/404)
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

def test_step9():
    log("=== STARTING RECOVERY STEP 9 MAP VERIFICATION ===")

    # 1. Test Unauthenticated Access
    log("1. Testing unauthenticated access to /api/v1/campaigns/[id]/map...")
    fake_camp = "aba451f6-94bc-4bc6-9e4e-23cadf384a0c"
    unauth_client = HttpClient()
    status, _, _ = unauth_client.request("GET", f"/api/v1/campaigns/{fake_camp}/map")
    assert status == 401, f"Expected 401 Unauthenticated, got {status}"
    log("PASS: Unauthenticated access rejected with 401.")

    # 2. Login as Campaign Admin
    log("2. Authenticating as Campaign Admin (campaign.admin@campaignops.ai)...")
    admin = login("campaign.admin@campaignops.ai", "password123")
    assert admin is not None, "Failed to login as Campaign Admin"
    log("PASS: Campaign Admin session established.")

    # 3. Fetch Map Data for Campaign
    log("3. Fetching map data as Campaign Admin...")
    status, res, raw = admin.request("GET", f"/api/v1/campaigns/{fake_camp}/map")
    assert status == 200, f"Expected 200, got {status}: {res}"
    map_data = res["data"]
    assert map_data["type"] == "FeatureCollection"
    assert "summary" in map_data
    assert "features" in map_data
    assert "unmappedBooths" in map_data
    summary = map_data["summary"]
    log(f"PASS: Map FeatureCollection returned. Total: {summary['totalBooths']}, Mapped: {summary['mappedBoothsCount']}, Unmapped: {summary['unmappedBoothsCount']}")

    # 4. Check Data Minimization (No Voter Names/EPIC in Map GeoJSON)
    log("4. Verifying data minimization on map endpoint...")
    assert "epicNumber" not in raw, "Data leak: epicNumber found in map response!"
    assert "voterName" not in raw, "Data leak: voterName found in map response!"
    log("PASS: Data minimization verified. Zero voter names or EPIC identifiers exposed.")

    # 5. Find Booth 1 and Booth 2
    all_booths = map_data["features"] + [{"properties": b} for b in map_data["unmappedBooths"]]
    booth1 = next((b["properties"] for b in all_booths if b["properties"]["boothNumber"] == 1), None)
    booth2 = next((b["properties"] for b in all_booths if b["properties"]["boothNumber"] == 2), None)
    assert booth1 is not None, "Booth 1 not found in test campaign"
    assert booth2 is not None, "Booth 2 not found in test campaign"

    # 6. Test Invalid Coordinate Validation
    log("6. Testing coordinate bounds validation (-90 to 90 lat, -180 to 180 lng)...")
    bad_status, _, _ = admin.request(
        "PATCH",
        f"/api/v1/campaigns/{fake_camp}/booths/{booth1['id']}",
        {"latitude": 150.0, "longitude": 77.0}
    )
    assert bad_status == 400, f"Expected 400 for out of bounds lat, got {bad_status}"

    bad_status2, _, _ = admin.request(
        "PATCH",
        f"/api/v1/campaigns/{fake_camp}/booths/{booth1['id']}",
        {"latitude": 12.0, "longitude": -200.0}
    )
    assert bad_status2 == 400, f"Expected 400 for out of bounds lng, got {bad_status2}"
    log("PASS: Coordinate validation correctly rejected invalid lat/lng.")

    # 7. Update Booth 1 and Booth 2 with Valid Coordinates
    log(f"7. Setting GPS coordinates for Booth 1 ({booth1['id']}) and Booth 2 ({booth2['id']})...")
    up_status1, up_res1, _ = admin.request(
        "PATCH",
        f"/api/v1/campaigns/{fake_camp}/booths/{booth1['id']}",
        {"latitude": 12.971600, "longitude": 77.594600}
    )
    assert up_status1 == 200, f"Failed to set Booth 1 coords: {up_res1}"

    up_status2, up_res2, _ = admin.request(
        "PATCH",
        f"/api/v1/campaigns/{fake_camp}/booths/{booth2['id']}",
        {"latitude": 12.972500, "longitude": 77.596000}
    )
    assert up_status2 == 200, f"Failed to set Booth 2 coords: {up_res2}"
    log("PASS: Booth coordinates successfully updated and persisted to PostgreSQL.")

    # 8. Re-fetch Map Data as Campaign Admin & Verify GeoJSON Features
    log("8. Re-fetching map data to verify GeoJSON Point features...")
    status, res, _ = admin.request("GET", f"/api/v1/campaigns/{fake_camp}/map")
    updated_map = res["data"]
    assert updated_map["summary"]["mappedBoothsCount"] >= 2, "Expected at least 2 mapped booths"
    
    mapped_b1 = next((f for f in updated_map["features"] if f["properties"]["boothNumber"] == 1), None)
    assert mapped_b1 is not None, "Booth 1 not found in features array"
    assert mapped_b1["geometry"]["coordinates"] == [77.594600, 12.971600], f"Coordinates mismatch: {mapped_b1['geometry']['coordinates']}"
    log(f"PASS: Booth 1 verified as GeoJSON Point at [77.5946, 12.9716]. Coverage: {mapped_b1['properties']['coveragePct']}%")

    # 9. Test Political Agent Scoped Access
    log("9. Testing Political Agent role-based scope isolation...")
    agent = login("agent@campaignops.ai", "password123")
    assert agent is not None, "Failed to login as Political Agent"

    # Agent is assigned to Booth 1 only (from Step 6/7)
    agent_status, agent_res, _ = agent.request("GET", f"/api/v1/campaigns/{fake_camp}/map")
    assert agent_status == 200, f"Agent map request failed: {agent_res}"
    agent_map = agent_res["data"]

    # Verify Agent only receives their assigned booth(s)
    agent_booth_numbers = [f["properties"]["boothNumber"] for f in agent_map["features"]] + \
                          [b["boothNumber"] for b in agent_map["unmappedBooths"]]
    log(f"Agent visible booth numbers: {agent_booth_numbers}")
    assert 1 in agent_booth_numbers, "Agent must see assigned Booth 1"
    assert 2 not in agent_booth_numbers, "Agent must NOT see unassigned Booth 2 (Scope leak!)"
    assert len(agent_booth_numbers) == 1, f"Expected 1 assigned booth for agent, got {len(agent_booth_numbers)}"
    log("PASS: Political Agent strictly scoped to assigned Booth 1 only.")

    # 10. Test Political Agent Mutation Prohibition
    log("10. Testing Political Agent cannot edit booth coordinates...")
    agent_patch_status, _, _ = agent.request(
        "PATCH",
        f"/api/v1/campaigns/{fake_camp}/booths/{booth1['id']}",
        {"latitude": 13.0, "longitude": 78.0}
    )
    assert agent_patch_status == 403, f"Expected 403 Forbidden for agent booth patch, got {agent_patch_status}"
    log("PASS: Political Agent forbidden from updating coordinates (403).")

    # 11. Cross-Campaign Scope Isolation
    log("11. Testing Cross-Campaign Scope Isolation...")
    cross_status, _, _ = admin.request("GET", "/api/v1/campaigns/00000000-0000-0000-0000-000000000000/map")
    assert cross_status in [403, 404], f"Expected 403 or 404 for unowned campaign, got {cross_status}"
    log("PASS: Cross-campaign isolation verified.")

    # 12. Mobile Agent Map Page Availability
    log("12. Verifying Agent mobile map route...")
    agent_page_status, _, _ = agent.request("GET", "/agent/map")
    assert agent_page_status == 200, f"Expected 200 for /agent/map, got {agent_page_status}"
    log("PASS: /agent/map page rendered successfully.")

    log("=== ALL RECOVERY STEP 9 MAP VERIFICATION TESTS PASSED ===")

if __name__ == "__main__":
    try:
        test_step9()
    except Exception as e:
        log(f"Verification failed: {e}", "FATAL")
        sys.exit(1)
