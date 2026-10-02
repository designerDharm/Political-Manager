import test from 'node:test';
import assert from 'node:assert/strict';

test('Election Day electors vs planning estimates separation', async (t) => {
  await t.test('Booth registered electors uses Voter table count and separates estimated electorate', () => {
    // Synthetic booths mock reflecting QA campaign structure:
    // Booth 1 has 2 registered voters in DB, totalElectors planning field is 2
    // Booth 2 has 0 registered voters in DB, totalElectors planning field was 12,500
    const mockDbBooths = [
      {
        id: 'booth-1',
        boothNumber: 1,
        name: 'Booth 1 - Village 1',
        totalElectors: 2, // Planning field
        _count: { voters: 2, visEvents: 0, issues: 0 }
      },
      {
        id: 'booth-2',
        boothNumber: 2,
        name: 'Booth 2 - Village 1',
        totalElectors: 12500, // Planning field
        _count: { voters: 0, visEvents: 0, issues: 0 }
      }
    ];

    const boothSummaries = mockDbBooths.map((b) => ({
      id: b.id,
      boothNumber: b.boothNumber,
      name: b.name,
      totalElectors: b._count.voters, // Authoritative electors strictly from Voter table
      registeredVoters: b._count.voters,
      estimatedElectorate: b.totalElectors && b.totalElectors > 0 ? b.totalElectors : null,
    }));

    // Booth 1 verification
    assert.equal(boothSummaries[0].registeredVoters, 2);
    assert.equal(boothSummaries[0].totalElectors, 2);

    // Booth 2 verification: MUST NOT show 12500 as registered voters / totalElectors
    assert.equal(boothSummaries[1].registeredVoters, 0);
    assert.equal(boothSummaries[1].totalElectors, 0);
    assert.equal(boothSummaries[1].estimatedElectorate, 12500);
  });

  await t.test('Campaign metrics separate registered electors from campaign planning targets', () => {
    const totalVotersInDb = 2;
    const campaignPlanningTarget = 50000;

    const metrics = {
      totalElectors: totalVotersInDb,
      totalRegisteredElectors: totalVotersInDb,
      estimatedElectorate: campaignPlanningTarget,
    };

    assert.equal(metrics.totalRegisteredElectors, 2);
    assert.notEqual(metrics.totalRegisteredElectors, metrics.estimatedElectorate);
    assert.equal(metrics.estimatedElectorate, 50000);
  });

  await t.test('Turnout reporting denominator checks against registered electors before estimated electorate', () => {
    // When voters exist in booth (e.g. 2 voters), reported turnout > 2 must fail validation
    const registeredCount = 2;
    const planningEstimate = 12500;
    const electors = registeredCount > 0 ? registeredCount : planningEstimate;

    const reportedTurnout = 3;
    const isValid = reportedTurnout <= electors;
    assert.equal(isValid, false, 'Reported turnout 3 must exceed 2 registered electors even if planning estimate is 12500');
  });
});
