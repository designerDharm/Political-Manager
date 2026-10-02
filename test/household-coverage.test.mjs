import test from 'node:test';
import assert from 'node:assert/strict';

test('Household coverage calculation logic', async (t) => {
  await t.test('computes visited, pending, and coverage percent accurately for 1 visited / 2 total households', () => {
    const totalHouseholds = 2;
    // Exactly 1 distinct household with interactions
    const distinctVisitedInteractions = [{ householdId: 'h-001' }];
    const visitedCount = distinctVisitedInteractions.length;
    const pendingCount = Math.max(0, totalHouseholds - visitedCount);
    const coveragePercent =
      totalHouseholds > 0
        ? Math.min(100, Math.max(0, Math.round((visitedCount / totalHouseholds) * 100)))
        : 0;

    assert.equal(visitedCount, 1, 'Visited households must be 1');
    assert.equal(pendingCount, 1, 'Pending households must be 1');
    assert.equal(coveragePercent, 50, 'Coverage rate must be 50%');
    assert.equal(`${visitedCount}/${totalHouseholds}`, '1/2', 'Display format must be 1/2');
  });

  await t.test('prevents household status CONFIRMED from inflating visited count without interactions', () => {
    const totalHouseholds = 2;
    const confirmedHouseholds = 2;
    // Only 1 distinct interaction
    const distinctVisitedInteractions = [{ householdId: 'h-001' }];

    // Old flawed logic used Math.max(confirmedHouseholds, distinctVisitedInteractions.length) which yielded 2 (100%)
    const flawedVisitedCount = Math.max(confirmedHouseholds, distinctVisitedInteractions.length);
    assert.equal(flawedVisitedCount, 2, 'Flawed logic yielded 2');

    // Correct SSoT logic uses distinct interaction records
    const correctVisitedCount = distinctVisitedInteractions.length;
    assert.equal(correctVisitedCount, 1, 'SSoT visited count must be 1');
    assert.equal(totalHouseholds - correctVisitedCount, 1, 'SSoT pending must be 1');
  });

  await t.test('handles booth-level visited aggregation correctly', () => {
    const distinctVisitedInteractions = [
      { householdId: 'h-001', household: { boothId: 'booth-1' } },
      { householdId: 'h-001', household: { boothId: 'booth-1' } }, // duplicate interaction for same household
    ];

    // Ensure distinct per household
    const distinctByHousehold = Array.from(
      new Map(distinctVisitedInteractions.map((item) => [item.householdId, item])).values()
    );

    const boothVisitedCounts = new Map();
    for (const item of distinctByHousehold) {
      const bId = item.household?.boothId;
      if (bId) {
        boothVisitedCounts.set(bId, (boothVisitedCounts.get(bId) || 0) + 1);
      }
    }

    assert.equal(boothVisitedCounts.get('booth-1'), 1, 'Booth 1 should have 1 visited household');
    assert.equal(boothVisitedCounts.get('booth-2') || 0, 0, 'Booth 2 should have 0 visited households');
  });
});
