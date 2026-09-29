# CURRENT BROKEN FLOW EVIDENCE
**Audit Date:** 2026-09-28  

### 1. Login Page UI Client-Side Short-Circuit
- **File:** `src/app/login/page.tsx`
- **Line:** 15-28
- **Evidence:**
  ```typescript
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (email.includes('admin') || email.includes('super')) {
        router.push('/super-admin');
      } else if (email.includes('agent') || email.includes('rakesh')) {
        router.push('/agent');
      } else {
        router.push('/campaigns/sharma-assembly-2026');
      }
    }, 400);
  };
  ```
- **Problem:** Form bypasses `/api/v1/auth/login`, doesn't check password hash in PostgreSQL, and sets no session cookie.

---

### 2. Database Backup Endpoint References SQLite `dev.db`
- **File:** `src/app/api/v1/admin/backups/route.ts`
- **Line:** 49-57
- **Evidence:**
  ```typescript
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  let sizeStr = '0 KB';
  if (fs.existsSync(dbPath)) {
    const destPath = path.join(backupsDir, filename);
    fs.copyFileSync(dbPath, destPath);
    ...
  }
  ```
- **Problem:** Step 2 migrated runtime to PostgreSQL; copying SQLite `dev.db` creates stale backups of inactive data. Needs `pg_dump` or PostgreSQL snapshot.

---

### 3. Voter Roll Import Returns Synthetic Stub Data
- **File:** `src/app/api/v1/imports/route.ts`
- **Line:** 55-76
- **Evidence:**
  ```typescript
  const importJob = await prisma.electoralRollImport.create({
    data: {
      campaignId: campaign.id,
      originalFilename: filename || 'Ward_12_Part_1.pdf',
      fileSize: fileSize || '12.4 MB',
      status: 'LowConfidenceReview',
      totalExtracted: 2840,
      totalHouseholds: 892,
      confidenceAvg: 0.964,
      ...
    }
  });
  ```
- **Problem:** The PDF parsing pipeline does not run an actual OCR model or extract real text; it populates preset counts.

---

### 4. Agent Search Screen Uses In-Memory Array
- **File:** `src/app/agent/search/page.tsx`
- **Line:** 14-22
- **Evidence:** Renders hardcoded sample contacts and does not issue a query to `/api/v1/voters?campaignId=...&q=...`.

---

### 5. Missing Test Runner Script
- **File:** `package.json`
- **Evidence:** `npm test` fails with `npm error Missing script: "test"`. There are no automated Vitest/Jest test suites configured.
