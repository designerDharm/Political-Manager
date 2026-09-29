import json
import urllib.request
import urllib.error
import urllib.parse
import sys
import subprocess
import os

BASE_URL = "http://localhost:3000"

def log(msg):
    print(f"[STEP12-TEST] {msg}", flush=True)

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

def run_tests():
    log("=== STARTING RECOVERY STEP 12 SECURITY, BACKUP & RESTORE GOLDEN VERIFICATION ===")
    campaign_id = "aba451f6-94bc-4bc6-9e4e-23cadf384a0c"
    booth1_id = "07338d39-ab94-40e6-84ed-c3dafff45a71" # Assigned to agent
    booth2_id = "3ecf5dcb-e761-441f-9fe6-6f5075c55867" # Unassigned to agent

    # 1. Unauthenticated sensitive endpoint checks
    log("1. Testing unauthenticated rejection on backups & exports...")
    unauth = HttpClient()
    st, _, _, _ = unauth.request("GET", "/api/v1/admin/backups")
    assert st == 401, f"Expected 401 for unauth backups list, got {st}"
    st, _, _, _ = unauth.request("POST", "/api/v1/admin/backups")
    assert st == 401, f"Expected 401 for unauth backup trigger, got {st}"
    st, _, _, _ = unauth.request("POST", "/api/v1/organizations", {"name": "Hacked Org"})
    assert st == 401, f"Expected 401 for unauth organization creation, got {st}"
    st, _, _, _ = unauth.request("POST", "/api/v1/parties", {"name": "Hacked Party"})
    assert st == 401, f"Expected 401 for unauth party creation, got {st}"
    log("PASS: Unauthenticated requests rejected with 401.")

    # 2. Authentication of actors
    log("2. Authenticating Super Admin, Campaign Admin, and Political Agent...")
    super_admin, sa_data = login("admin@campaignops.ai", "password123")
    assert super_admin is not None, "Failed to login as Super Admin"

    camp_admin, ca_data = login("campaign.admin@campaignops.ai", "password123")
    assert camp_admin is not None, "Failed to login as Campaign Admin"

    agent, ag_data = login("agent@campaignops.ai", "password123")
    assert agent is not None, "Failed to login as Political Agent"
    log("PASS: All 3 roles authenticated successfully.")

    # 3. RBAC on Super Admin backup endpoints
    log("3. Testing RBAC authorization on backups (Campaign Admin & Agent must get 403)...")
    st, _, _, _ = camp_admin.request("GET", "/api/v1/admin/backups")
    assert st == 403, f"Campaign admin should get 403 on backup list, got {st}"
    st, _, _, _ = camp_admin.request("POST", "/api/v1/admin/backups")
    assert st == 403, f"Campaign admin should get 403 on backup trigger, got {st}"
    st, _, _, _ = agent.request("GET", "/api/v1/admin/backups")
    assert st == 403, f"Agent should get 403 on backup list, got {st}"
    st, _, _, _ = agent.request("POST", "/api/v1/admin/backups")
    assert st == 403, f"Agent should get 403 on backup trigger, got {st}"
    log("PASS: Backup APIs strictly isolated to Super Admin.")

    # 4. Super Admin triggers real PostgreSQL dump
    log("4. Super Admin triggering on-demand PostgreSQL backup (pg_dump)...")
    st, res, _, _ = super_admin.request("POST", "/api/v1/admin/backups")
    assert st == 201, f"Expected 201 backup created, got {st}: {res}"
    assert res.get("success") is True
    backup_data = res["data"]
    backup_id = backup_data["id"]
    filename = backup_data["filename"]
    sha256 = backup_data["sha256"]
    log(f"PASS: PostgreSQL backup created: {filename} (ID: {backup_id}, SHA-256: {sha256[:16]}...)")

    # 5. Backup Download & Path Traversal Prevention
    log("5. Testing backup download and path traversal prevention...")
    # Legitimate download by Super Admin
    st, content, raw, hdrs = super_admin.request("GET", f"/api/v1/admin/backups/{backup_id}/download")
    assert st == 200, f"Expected 200 for backup download, got {st}"
    assert len(raw) > 0, "Downloaded backup file was empty"
    assert "attachment" in hdrs.get("Content-Disposition", "")
    # Unauthorized download by Campaign Admin
    st, _, _, _ = camp_admin.request("GET", f"/api/v1/admin/backups/{backup_id}/download")
    assert st == 403, f"Campaign Admin should get 403 on download, got {st}"
    # Path traversal injection attempt
    st, _, _, _ = super_admin.request("GET", "/api/v1/admin/backups/..%2F..%2Fetc%2Fpasswd/download")
    assert st in [400, 404], f"Path traversal should be rejected with 400/404, got {st}"
    log("PASS: Backup download authorized and path traversal blocked.")

    # 6. Isolated PostgreSQL Restore Test (Golden Round-Trip)
    log("6. Testing isolated PostgreSQL restore into temporary database 'campaignops_restore_test'...")
    # First test rejection without explicit confirmation phrase
    st, res, _, _ = super_admin.request("POST", f"/api/v1/admin/backups/{backup_id}/restore", {
        "confirmationPhrase": "wrong_phrase",
        "targetDatabase": "campaignops_restore_test"
    })
    assert st == 400, f"Expected 400 for invalid confirmation phrase, got {st}"
    log("PASS: Destructive restore rejected without exact confirmation phrase.")

    # Drop & create isolated test database
    pg_env = {**os.environ, "PGPASSWORD": "campaignops_dev_secret"}
    subprocess.run(["/opt/homebrew/bin/dropdb", "-h", "localhost", "-p", "5432", "-U", "campaignops", "--if-exists", "campaignops_restore_test"], env=pg_env, check=True)
    subprocess.run(["/opt/homebrew/bin/createdb", "-h", "localhost", "-p", "5432", "-U", "campaignops", "campaignops_restore_test"], env=pg_env, check=True)

    # Perform legitimate restore into temporary test database
    st, res, _, _ = super_admin.request("POST", f"/api/v1/admin/backups/{backup_id}/restore", {
        "confirmationPhrase": f"RESTORE_{backup_id}",
        "targetDatabase": "campaignops_restore_test"
    })
    assert st == 200, f"Expected 200 restore success, got {st}: {res}"
    assert res.get("success") is True
    assert res["data"]["checksumVerified"] is True

    # Compare table counts between active database and restored test database
    active_query = subprocess.check_output(["/opt/homebrew/bin/psql", "-h", "localhost", "-p", "5432", "-U", "campaignops", "-d", "campaignops", "-t", "-c", "SELECT count(*) FROM \"Voter\";"], env=pg_env).decode().strip()
    test_query = subprocess.check_output(["/opt/homebrew/bin/psql", "-h", "localhost", "-p", "5432", "-U", "campaignops", "-d", "campaignops_restore_test", "-t", "-c", "SELECT count(*) FROM \"Voter\";"], env=pg_env).decode().strip()
    assert active_query == test_query and int(active_query) > 0, f"Voter count mismatch: active={active_query}, restored={test_query}"
    log(f"PASS: Restored database integrity verified. Voter counts match perfectly ({active_query}).")

    # Clean up test database
    subprocess.run(["/opt/homebrew/bin/dropdb", "-h", "localhost", "-p", "5432", "-U", "campaignops", "campaignops_restore_test"], env=pg_env, check=True)
    log("PASS: Isolated temporary restore test database dropped cleanly.")

    # 7. Privilege Escalation Defense on User Creation
    log("7. Testing privilege escalation prevention on user creation...")
    st, res, _, _ = camp_admin.request("POST", "/api/v1/users", {
        "email": "attacker_super_admin@campaignops.ai",
        "displayName": "Attacker Admin",
        "role": "SUPER_ADMIN",
        "campaignId": campaign_id
    })
    assert st in [200, 201], f"Expected 201, got {st}: {res}"
    created_user = res["data"]
    assert created_user["role"] != "SUPER_ADMIN", f"Privilege escalation vulnerability! Role was granted as: {created_user['role']}"
    assert created_user["role"] == "POLITICAL_AGENT", f"Expected capped role POLITICAL_AGENT, got {created_user['role']}"
    log("PASS: Role escalation to SUPER_ADMIN denied for non-super-admins.")

    # 8. Agent Booth Scope IDOR Regression
    log("8. Testing Political Agent Booth Scope IDOR defense...")
    # Agent tries to report issue for unassigned booth
    st, res, _, _ = agent.request("POST", "/api/v1/issues", {
        "campaignId": campaign_id,
        "boothId": booth2_id,
        "title": "Unauthorized Booth Issue",
        "category": "ELECTRICITY",
        "description": "Agent probing unassigned booth"
    })
    assert st == 403, f"Agent should receive 403 reporting issue in unassigned booth, got {st}"

    # Agent records issue in assigned booth
    st, res, _, _ = agent.request("POST", "/api/v1/issues", {
        "campaignId": campaign_id,
        "boothId": booth1_id,
        "title": "Permitted Booth Issue",
        "category": "WATER",
        "description": "Agent reporting for assigned booth"
    })
    assert st == 201, f"Agent should be able to report issue in assigned booth, got {st}"
    log("PASS: Agent booth scoping enforced on issue creation.")

    # 9. Source PDF Protection
    log("9. Testing electoral-roll source document access protection...")
    st, imports_res, _, _ = camp_admin.request("GET", f"/api/v1/imports?campaignId={campaign_id}")
    assert st == 200
    if len(imports_res["data"]) > 0:
        import_id = imports_res["data"][0]["id"]
        # Unauthenticated request
        st, _, _, _ = unauth.request("GET", f"/api/v1/imports/{import_id}/document")
        assert st == 401, f"Expected 401 for unauth source PDF download, got {st}"
        # Authorized Campaign Admin
        st, _, _, hdrs = camp_admin.request("GET", f"/api/v1/imports/{import_id}/document")
        assert st == 200, f"Expected 200 for authorized source PDF download, got {st}"
        assert "application/pdf" in hdrs.get("Content-Type", "")
        log("PASS: Source electoral-roll PDF protected with campaign RBAC.")

    # 10. Session Revocation & Disabled User Authorization
    log("10. Testing session revocation upon logout...")
    temp_client, _ = login("campaign.admin@campaignops.ai", "password123")
    st, res, _, _ = temp_client.request("GET", "/api/v1/auth/me")
    assert st == 200, "Session should be active"
    # Logout
    st, _, _, _ = temp_client.request("POST", "/api/v1/auth/logout")
    assert st == 200, "Logout request failed"
    # Reuse old token
    st, _, _, _ = temp_client.request("GET", "/api/v1/auth/me")
    assert st == 401, f"Reused revoked session token should return 401, got {st}"
    log("PASS: Revoked session tokens immediately rejected.")

    # 11. Health endpoint sanitization
    log("11. Verifying health endpoint does not leak stack traces or internal secrets...")
    st, res, _, _ = unauth.request("GET", "/api/health")
    assert st == 200, f"Expected 200 from /api/health, got {st}"
    assert res.get("status") == "healthy"
    assert "password" not in str(res).lower()
    assert "postgresql://" not in str(res).lower()
    log("PASS: Health check sanitized and connected.")

    log("=== ALL RECOVERY STEP 12 SECURITY, BACKUP & RESTORE TESTS PASSED ===")

if __name__ == "__main__":
    run_tests()
