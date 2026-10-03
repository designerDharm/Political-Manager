const puppeteer = require('puppeteer-core');

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const BASE = 'https://campaignops-qa-staging.loca.lt';
  console.log('[BROWSER] Connected to Chrome DevTools');

  // Test 1: Load login form
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('[BROWSER] Loaded URL:', page.url());

  const formExists = await page.$('form');
  const emailInput = await page.$('input[type="email"], input[name="email"], input#email');
  console.log('[BROWSER] Login form found:', !!formExists, '| Email field:', !!emailInput);

  async function testRole(email, password, expectedPath) {
    const rolePage = await browser.newPage();
    await rolePage.setViewport({ width: 1280, height: 800 });
    await rolePage.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 });

    await rolePage.type('input[type="email"], input[name="email"], input#email', email);
    await rolePage.type('input[type="password"], input[name="password"], input#password', password);
    
    // Click submit and wait for navigation
    await Promise.all([
      rolePage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(e => console.log('Nav error/timeout:', e.message)),
      rolePage.click('button[type="submit"]')
    ]);

    await new Promise(r => setTimeout(r, 2000));
    const landedUrl = rolePage.url();
    console.log(`[BROWSER] Sign in ${email} -> Landed on: ${landedUrl} (Expected prefix: ${expectedPath})`);
    const success = landedUrl.includes(expectedPath);
    await rolePage.close();
    return success;
  }

  const superOk = await testRole('admin@campaignops.ai', 'password123', '/super-admin');
  const campOk = await testRole('campaign.admin@campaignops.ai', 'password123', '/campaigns');
  const agentOk = await testRole('agent@campaignops.ai', 'password123', '/agent');

  // Test unauthenticated redirect
  const unauthPage = await browser.newPage();
  await unauthPage.goto(`${BASE}/campaigns`, { waitUntil: 'networkidle2', timeout: 30000 });
  const unauthUrl = unauthPage.url();
  console.log('[BROWSER] Unauthenticated /campaigns redirected to:', unauthUrl);
  await unauthPage.close();

  await page.close();
  await browser.disconnect();
}

run().catch(console.error);
