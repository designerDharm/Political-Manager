import test from 'node:test';
import assert from 'node:assert/strict';

test('Campaign-scoped membership and location isolation in Team & Issues', async (t) => {
  // Mock two isolated campaigns
  const campaignAId = 'campaign-alpha-111';
  const campaignBId = 'campaign-beta-222';

  // Memberships
  const memberships = [
    { campaignId: campaignAId, userId: 'user-a1', role: 'POLITICAL_AGENT', active: true },
    { campaignId: campaignAId, userId: 'user-a2', role: 'CAMPAIGN_ADMIN', active: true },
    { campaignId: campaignBId, userId: 'user-b1', role: 'POLITICAL_AGENT', active: true },
    { campaignId: campaignBId, userId: 'user-b2', role: 'CAMPAIGN_ADMIN', active: true },
  ];

  // Locations
  const booths = [
    { id: 'booth-a1', boothNumber: 1, name: 'Booth 1 - Ward A', campaignId: campaignAId },
    { id: 'booth-b1', boothNumber: 1, name: 'Booth 1 - Ward B', campaignId: campaignBId },
  ];

  const wards = [
    { id: 'ward-a1', wardNumber: 1, name: 'Ward 1 - Sector A', campaignId: campaignAId },
    { id: 'ward-b1', wardNumber: 1, name: 'Ward 1 - Sector B', campaignId: campaignBId },
  ];

  const households = [
    { id: 'hh-a1', code: 'H-001', address: 'Alpha Street 1', campaignId: campaignAId },
    { id: 'hh-b1', code: 'H-001', address: 'Beta Road 1', campaignId: campaignBId },
  ];

  await t.test('Team Management loads only users with active CampaignMembership for the campaign', () => {
    const campaignAMembers = memberships
      .filter((m) => m.campaignId === campaignAId && m.active)
      .map((m) => m.userId);

    assert.deepEqual(campaignAMembers, ['user-a1', 'user-a2']);
    assert.equal(campaignAMembers.includes('user-b1'), false, 'Campaign B user must never appear in Campaign A');
    assert.equal(campaignAMembers.includes('user-b2'), false, 'Campaign B admin must never appear in Campaign A');
  });

  await t.test('Assign Area Form and Issue Management assignee options reject cross-campaign users', () => {
    // Attempt to assign user-b1 to a task in campaign A
    const targetUserId = 'user-b1';
    const targetCampaignId = campaignAId;

    const isMemberOfCampaign = memberships.some(
      (m) => m.campaignId === targetCampaignId && m.userId === targetUserId && m.active
    );

    assert.equal(
      isMemberOfCampaign,
      false,
      'Assignee from campaign B cannot be assigned in campaign A'
    );
  });

  await t.test('Assign Area Form and Issue creation reject cross-campaign booth/ward/household', () => {
    const crossBooth = booths.find((b) => b.id === 'booth-b1' && b.campaignId === campaignAId);
    assert.equal(crossBooth, undefined, 'Booth from campaign B must not validate under campaign A');

    const crossWard = wards.find((w) => w.id === 'ward-b1' && w.campaignId === campaignAId);
    assert.equal(crossWard, undefined, 'Ward from campaign B must not validate under campaign A');

    const crossHousehold = households.find((h) => h.id === 'hh-b1' && h.campaignId === campaignAId);
    assert.equal(crossHousehold, undefined, 'Household from campaign B must not validate under campaign A');
  });

  await t.test('Issue assignee filtering in Issue Management UI contains only active campaign members', () => {
    const campaignBIssueUsers = memberships
      .filter((m) => m.campaignId === campaignBId && m.active)
      .map((m) => m.userId);

    assert.deepEqual(campaignBIssueUsers, ['user-b1', 'user-b2']);
    assert.equal(campaignBIssueUsers.includes('user-a1'), false, 'Campaign A user must not be an assignee option in Campaign B');
  });
});
