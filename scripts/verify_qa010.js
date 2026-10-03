const https = require('https');

function login() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: 'admin@campaignops.ai', password: 'password123' });
    const req = https.request({
      hostname: 'political-manager.vercel.app',
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const cookies = res.headers['set-cookie'];
        const sessionCookie = cookies ? cookies.find(c => c.startsWith('campaignops_session=')) : null;
        resolve(sessionCookie ? sessionCookie.split(';')[0] : null);
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function fetchPage(cookie, path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'political-manager.vercel.app',
      path,
      method: 'GET',
      headers: {
        'Cookie': cookie,
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function postGrouping(cookie, campaignId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ campaignId });
    const req = https.request({
      hostname: 'political-manager.vercel.app',
      path: '/api/v1/households/grouping/run',
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  const cookie = await login();
  const campaignId = '3814789d-48d8-4f0d-a7bd-6ea9dd8c721e';

  console.log('--- Step 1: Run grouping engine ---');
  const groupRes = await postGrouping(cookie, campaignId);
  console.log('Grouping status:', groupRes.status);
  console.log('Grouping result:', groupRes.data);

  console.log('\n--- Step 2: Fetch voters list page ---');
  const votersPage = await fetchPage(cookie, `/campaigns/${campaignId}/voters`);
  console.log('Voter list status:', votersPage.status);
  console.log('Contains QAONLY0001:', votersPage.body.includes('QAONLY0001'));
  console.log('Contains QAONLY0002:', votersPage.body.includes('QAONLY0002'));

  console.log('\n--- Step 3: Fetch households from API ---');
  const hhApi = await fetchPage(cookie, `/api/v1/households?campaignId=${campaignId}`);
  const hhJson = JSON.parse(hhApi.body);
  console.log('Households found count:', hhJson.data.length);
  for (const h of hhJson.data) {
    console.log(`Household Code: ${h.code}, ID: ${h.id}, Address: ${h.address}, Members: ${h.members?.length}`);
  }

  if (hhJson.data.length > 0) {
    const h = hhJson.data[0];
    console.log(`\n--- Step 4: Verify Authorized Household Detail Route by ID (/campaigns/${campaignId}/households/${h.id}) ---`);
    const detailById = await fetchPage(cookie, `/campaigns/${campaignId}/households/${h.id}`);
    console.log('Detail route by ID status:', detailById.status);
    console.log('Contains household code:', detailById.body.includes(h.code));

    console.log(`\n--- Step 5: Verify Authorized Household Detail Route by Code (/campaigns/${campaignId}/households/${h.code}) ---`);
    const detailByCode = await fetchPage(cookie, `/campaigns/${campaignId}/households/${h.code}`);
    console.log('Detail route by Code status:', detailByCode.status);
    console.log('Contains household code:', detailByCode.body.includes(h.code));

    console.log('\n--- Step 6: Verify Campaign Isolation on Detail Route ---');
    const wrongCamp = await fetchPage(cookie, `/campaigns/00000000-0000-0000-0000-000000000000/households/${h.id}`);
    console.log('Cross-campaign detail route status (expected 404):', wrongCamp.status);

    console.log('\n--- Step 7: Check link rendered in voters table ---');
    const hasLinkToHousehold = votersPage.body.includes(`/campaigns/${campaignId}/households/${h.id}`) || votersPage.body.includes(`/campaigns/${campaignId}/households/${h.code}`);
    console.log('Voter table contains direct link to assigned household:', hasLinkToHousehold);
  }

  console.log('\n--- Step 8: Verify Non-existent household ID returns 404 ---');
  const notFoundRes = await fetchPage(cookie, `/campaigns/${campaignId}/households/non-existent-id`);
  console.log('Non-existent ID route status (expected 404):', notFoundRes.status);
}

run().catch(console.error);
