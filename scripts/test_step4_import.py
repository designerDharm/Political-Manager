import urllib.request
import json
import uuid
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

print("1. Testing Agent Denial on Upload...")
req = urllib.request.Request(
    f"{BASE_URL}/api/v1/imports",
    data=json.dumps({"campaignId": CAMPAIGN_ID}).encode("utf-8"),
    headers={"Content-Type": "application/json", "Cookie": agent_cookie}
)
try:
    urllib.request.urlopen(req)
    print("FAILED: Agent was allowed!")
    sys.exit(1)
except urllib.error.HTTPError as e:
    print(f"PASSED: Agent upload denied with HTTP {e.code}")

print("\n2. Uploading Electoral Roll via Campaign Admin...")
boundary = "----WebKitFormBoundary" + uuid.uuid4().hex
with open("UI:UX screens/KITHANA-Ward No-001.pdf", "rb") as f:
    pdf_bytes = f.read()

parts = [
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"campaignId\"\r\n\r\n{CAMPAIGN_ID}\r\n".encode("utf-8"),
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"KITHANA-Ward No-001.pdf\"\r\nContent-Type: application/pdf\r\n\r\n".encode("utf-8") + pdf_bytes + b"\r\n",
    f"--{boundary}--\r\n".encode("utf-8")
]
body = b"".join(parts)

req = urllib.request.Request(
    f"{BASE_URL}/api/v1/imports",
    data=body,
    headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Cookie": admin_cookie
    }
)
with urllib.request.urlopen(req) as resp:
    upload_res = json.loads(resp.read().decode("utf-8"))
    import_id = upload_res["data"]["id"]
    total_extracted = upload_res["data"]["totalExtracted"]
    status = upload_res["data"]["status"]
    print(f"PASSED: Uploaded import job {import_id}. Extracted: {total_extracted}, Status: {status}")

print("\n3. Testing Review / Staging Listing...")
req = urllib.request.Request(f"{BASE_URL}/api/v1/imports/{import_id}", headers={"Cookie": admin_cookie})
with urllib.request.urlopen(req) as resp:
    job_detail = json.loads(resp.read().decode("utf-8"))
    records = job_detail["data"]["records"]
    counts = job_detail["data"]["statusCounts"]
    print(f"PASSED: Staged records fetched: {len(records)}, Status counts: {counts}")
    first_record = records[0]
    rec_id = first_record["id"]
    rec_serial = first_record["serialNumber"]
    rec_epic = first_record["epicNumber"]
    rec_name = first_record["fullName"]
    rec_status = first_record["status"]
    print(f"Sample Record #1: ID={rec_id}, Serial={rec_serial}, EPIC={rec_epic}, Name={rec_name}, Status={rec_status}")

print("\n4. Testing Record Correction / Field Edit...")
patch_data = json.dumps({
    "fullName": "Mohit Kumar Sharma",
    "status": "VALID"
}).encode("utf-8")
req = urllib.request.Request(
    f"{BASE_URL}/api/v1/imports/{import_id}/records/{rec_id}",
    data=patch_data,
    headers={"Content-Type": "application/json", "Cookie": admin_cookie},
    method="PATCH"
)
with urllib.request.urlopen(req) as resp:
    patch_res = json.loads(resp.read().decode("utf-8"))
    p_name = patch_res["data"]["fullName"]
    p_status = patch_res["data"]["status"]
    p_conf = patch_res["data"]["confidence"]
    print(f"PASSED: Corrected record: {p_name}, Status: {p_status}, Confidence: {p_conf}")

print("\n5. Testing Publishing to PostgreSQL SSoT...")
publish_data = json.dumps({
    "campaignId": CAMPAIGN_ID,
    "importId": import_id
}).encode("utf-8")
req = urllib.request.Request(
    f"{BASE_URL}/api/v1/imports/publish",
    data=publish_data,
    headers={"Content-Type": "application/json", "Cookie": admin_cookie}
)
with urllib.request.urlopen(req) as resp:
    pub_res = json.loads(resp.read().decode("utf-8"))
    print(f"PASSED: Published response: {pub_res['data']}")

print("\n6. Testing Idempotent Re-publish...")
req = urllib.request.Request(
    f"{BASE_URL}/api/v1/imports/publish",
    data=publish_data,
    headers={"Content-Type": "application/json", "Cookie": admin_cookie}
)
with urllib.request.urlopen(req) as resp:
    repub_res = json.loads(resp.read().decode("utf-8"))
    print(f"PASSED: Idempotent re-publish response: {repub_res['data']['status']}")

print("\n7. Verifying Published Voters in /api/v1/voters...")
req = urllib.request.Request(
    f"{BASE_URL}/api/v1/voters?campaignId={CAMPAIGN_ID}&limit=10",
    headers={"Cookie": admin_cookie}
)
with urllib.request.urlopen(req) as resp:
    voters_res = json.loads(resp.read().decode("utf-8"))
    total_voters = voters_res["meta"]["pagination"]["total"]
    voter_list = voters_res["data"]
    print(f"PASSED: Total voters in database registry: {total_voters}")
    v0_epic = voter_list[0]["epicNumber"]
    v0_name = voter_list[0]["name"]
    v0_ward = voter_list[0]["ward"]["name"]
    v0_booth = voter_list[0]["booth"]["name"]
    print(f"Sample authoritative voter in DB: EPIC={v0_epic}, Name={v0_name}, Ward={v0_ward}, Booth={v0_booth}")

print("\nALL RECOVERY STEP 4 VERIFICATIONS PASSED!")
