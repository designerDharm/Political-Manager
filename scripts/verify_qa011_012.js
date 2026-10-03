const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Login
  console.log('Logging in...');
  await page.goto('https://political-manager.vercel.app/login');
  await page.fill('input[type="email"]', 'superadmin@campaignops.internal');
  await page.fill('input[type="password"]', 'SuperAdmin@Secure2026!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  const campaignId = '3814789d-48d8-4f0d-a7bd-6ea9dd8c721e';
  const booth1Id = '97c83c51-eaab-4479-ac5d-3f080550f8c0'; // Booth 1: 2 voters
  const booth2Id = '1ccac0ac-24f7-41a3-aab3-ad90c1d98ce2'; // Booth 2: 0 voters

  // 2. Test All voters
  console.log('Testing Campaign All Voters...');
  await page.goto(`https://political-manager.vercel.app/campaigns/${campaignId}/voters`);
  await page.waitForLoadState('networkidle');
  const allTitle = await page.textContent('h1');
  const allRows = await page.$$eval('tbody tr', trs => trs.length);
  const allText = await page.textContent('body');
  console.log({ allTitle, allRows, hasVoter1: allText.includes('QA Synthetic Person A'), hasVoter2: allText.includes('QA Synthetic Person B') });

  // 3. Test Booth 1
  console.log('Testing Booth 1 (2 voters)...');
  await page.goto(`https://political-manager.vercel.app/campaigns/${campaignId}/voters?boothId=${booth1Id}`);
  await page.waitForLoadState('networkidle');
  const b1Title = await page.textContent('h1');
  const b1Rows = await page.$$eval('tbody tr', trs => trs.length);
  const b1Text = await page.textContent('body');
  console.log({ b1Title, b1Rows, hasVoter1: b1Text.includes('QA Synthetic Person A'), hasVoter2: b1Text.includes('QA Synthetic Person B') });

  // 4. Test Booth 2
  console.log('Testing Booth 2 (0 voters)...');
  await page.goto(`https://political-manager.vercel.app/campaigns/${campaignId}/voters?boothId=${booth2Id}`);
  await page.waitForLoadState('networkidle');
  const b2Title = await page.textContent('h1');
  const b2Rows = await page.$$eval('tbody tr', trs => trs.length);
  const b2Text = await page.textContent('body');
  console.log({ b2Title, b2Rows, hasVoter1: b2Text.includes('QA Synthetic Person A'), hasEmptyMessage: b2Text.includes('No voters matching query') });

  // 5. Check QA-010: Household links & unassigned
  console.log('Testing household rendering on Booth 1...');
  const householdLinks = await page.$$eval('tbody tr a[href*="/households/"]', els => els.map(e => ({ text: e.textContent.trim(), href: e.getAttribute('href') })));
  const unassignedBadges = await page.$$eval('tbody tr span', els => els.filter(e => e.textContent.includes('Unassigned')).map(e => e.textContent.trim()));
  console.log({ householdLinks, unassignedBadges });

  await browser.close();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
