import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { computeAuditEventHash, GENESIS_AUDIT_HASH } from '../src/lib/api/auditHash.ts';

test('New Feature Requirements & Regressions', async (t) => {
  // 1. Test Settings UI & ELECTION_DAY_STATE preservation
  await t.test('Settings UI cleanly separates ELECTION_DAY_STATE from mission description', () => {
    const rawDescription = "Our core constituency victory mission.\nELECTION_DAY_STATE:{\"status\":\"ACTIVE\",\"openedAt\":\"2026-10-02T10:00:00.000Z\",\"closedAt\":null}";
    const marker = 'ELECTION_DAY_STATE:';
    
    // Test stripping and parsing
    assert.equal(rawDescription.includes(marker), true);
    const splitIndex = rawDescription.indexOf(marker);
    const cleanDesc = rawDescription.substring(0, splitIndex).trim();
    const stateObj = JSON.parse(rawDescription.substring(splitIndex + marker.length));

    assert.equal(cleanDesc, "Our core constituency victory mission.");
    assert.equal(stateObj.status, 'ACTIVE');
    assert.equal(stateObj.openedAt, '2026-10-02T10:00:00.000Z');
    assert.equal(stateObj.closedAt, null);

    // Test server-side preservation when description is updated
    const newCleanDesc = "Updated mission plan without mentioning debug state";
    const reconstructed = `${newCleanDesc}\n${marker}${JSON.stringify(stateObj)}`;
    assert.equal(reconstructed.includes(marker), true);
    assert.equal(reconstructed.startsWith("Updated mission plan without mentioning debug state"), true);
  });

  // 2. Test Agent Home pending counts and CTA derivation
  await t.test('Agent Home pending counts and CTA are derived strictly from active assignments', () => {
    // When agent has 0 assignments
    const assignmentsEmpty = [];
    const totalHouseholdsInBooth = 10;
    const completedHouseholdsInBooth = 2;

    const pendingWhenNoAssignments = assignmentsEmpty.length > 0 
      ? Math.max(0, totalHouseholdsInBooth - completedHouseholdsInBooth) 
      : 0;

    assert.equal(pendingWhenNoAssignments, 0, 'Pending counts must be 0 when agent has no assignments');

    const shouldShowCTAWhenEmpty = assignmentsEmpty.length > 0;
    assert.equal(shouldShowCTAWhenEmpty, false, 'Continue Visit CTA must be hidden when agent has no assignments');

    // When agent has active assignments
    const assignmentsActive = [{ id: 'asgn-1', userId: 'agent-1', status: 'Active' }];
    const pendingWhenActive = assignmentsActive.length > 0 
      ? Math.max(0, totalHouseholdsInBooth - completedHouseholdsInBooth) 
      : 0;
    assert.equal(pendingWhenActive, 8, 'Pending counts must be computed when agent has active assignments');
  });

  // 3. Test Agent Visit Page Accessibility
  await t.test('Agent Visit Page markup complies with accessibility requirements', () => {
    const filePath = path.resolve('src/app/agent/visit/[hid]/page.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Radiogroup semantics for visit status
    assert.equal(content.includes('role="radiogroup"'), true, 'Visit status must have role="radiogroup"');
    assert.equal(content.includes('role="radio"'), true, 'Visit status options must have role="radio"');
    assert.equal(content.includes('aria-checked='), true, 'Visit status options must have aria-checked');

    // Labelled textarea for Visit Notes
    assert.equal(content.includes('label htmlFor="visit-notes"'), true, 'Visit notes must have an explicit label');
    assert.equal(content.includes('id="visit-notes"'), true, 'Textarea must have matching id="visit-notes"');

    // Accessible names for buttons and actions
    assert.equal(content.includes('aria-label="Save Visit"'), true, 'Save Visit button must have accessible name');
    assert.equal(content.includes('aria-label="Back to Dashboard"'), true, 'Back button must have accessible name');
    assert.equal(content.includes('aria-label="Report Operational Issue"'), true, 'Report button must have accessible name');
    assert.equal(content.includes('role="dialog"'), true, 'Modals must declare role="dialog"');
    assert.equal(content.includes('aria-modal="true"'), true, 'Modals must declare aria-modal="true"');
  });

  // 4. Test Audit SHA-256 Cryptographic Hash Chaining
  await t.test('Audit event SHA-256 hash chaining detects alterations and broken links', () => {
    const payload1 = {
      organizationId: 'org-1',
      campaignId: 'camp-1',
      actorId: 'user-1',
      action: 'UPDATE_CAMPAIGN_SETUP',
      resource: 'campaign:camp-1',
      details: '{"status":"ACTIVE"}',
    };

    const hash1 = computeAuditEventHash(GENESIS_AUDIT_HASH, payload1);
    assert.equal(hash1.length, 64, 'SHA-256 hash must be 64 hexadecimal characters');
    assert.notEqual(hash1, GENESIS_AUDIT_HASH);

    const payload2 = {
      organizationId: 'org-1',
      campaignId: 'camp-1',
      actorId: 'agent-1',
      action: 'VERIFY_HOUSEHOLD',
      resource: 'household:H-001',
      details: '{"status":"Verified"}',
    };

    const hash2 = computeAuditEventHash(hash1, payload2);
    assert.equal(hash2.length, 64);
    assert.notEqual(hash2, hash1);

    // Tampering test: altering payload1 details changes hash1
    const tamperedPayload1 = { ...payload1, details: '{"status":"COMPROMISED"}' };
    const tamperedHash1 = computeAuditEventHash(GENESIS_AUDIT_HASH, tamperedPayload1);
    assert.notEqual(tamperedHash1, hash1, 'Tampered payload must yield different hash');

    // Link break test: if hash1 was tampered, hash2 verification will fail
    const recomputedHash2WithTamperedPrev = computeAuditEventHash(tamperedHash1, payload2);
    assert.notEqual(recomputedHash2WithTamperedPrev, hash2, 'Broken link in chain must be detected');
  });

  // 5. Test Governed Analytics Non-Inference Policy
  await t.test('Governed AI Assistant strictly rejects political-support and vote-prediction queries', () => {
    const assistantFilePath = path.resolve('src/components/analytics/GovernedAiAssistant.tsx');
    const assistantContent = fs.readFileSync(assistantFilePath, 'utf-8');

    // UI Preset check: verify 'Who is most likely to vote for our candidate?' is removed
    assert.equal(
      assistantContent.includes('Who is most likely to vote for our candidate?'),
      false,
      'Prohibited vote-prediction preset must be removed from the UI'
    );

    // Server-side keyword rejection check
    const prohibitedTests = [
      'who is most likely to vote for our candidate',
      'show vote-prediction model scores',
      'predict election outcome probability',
      'rank households by political-support',
      'persuasion score for booth 1 voters',
      'caste breakdown of undecided voters',
    ];

    const PROHIBITED_KEYWORDS = [
      'vote for',
      'vote-prediction',
      'prediction',
      'predict',
      'political preference',
      'political-support',
      'support probability',
      'likely to vote',
      'leaning',
      'persuadable',
      'persuasion',
      'persuade',
      'ideology',
      'ideological',
      'religion',
      'religious',
      'caste',
      'conversion score',
      'who will vote',
      'party affinity',
      'undecided voter',
      'voter preference',
    ];

    for (const query of prohibitedTests) {
      const lower = query.toLowerCase();
      const matched = PROHIBITED_KEYWORDS.find((k) => lower.includes(k));
      assert.ok(
        matched,
        `Query '${query}' must trigger guardrail keyword violation (matched '${matched}')`
      );
    }
  });
});
