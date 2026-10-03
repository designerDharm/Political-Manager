const https = require('https');

const HOST = 'political-manager.vercel.app';
const QA_CAMPAIGN_ID = '3814789d-48d8-4f0d-a7bd-6ea9dd8c721e';
const BOOTH_1_ID = '97c83c51-eaab-4479-ac5d-3f080550f8c0'; // Booth 1
const BOOTH_2_ID = '1ccac0ac-24f7-41a3-aab3-ad90c1d98ce2'; // Booth 2

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('=== VERIFYING QA-010, QA-011, AND QA-012 ON LIVE DEPLOYMENT ===\n');

  // 1. Authenticate as Super Admin
  console.log('1. Authenticating as Super Admin...');
  const loginPayload = JSON.stringify({ email: 'admin@campaignops.ai', password: 'password123' });
  const loginRes = await request({
    hostname: HOST,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginPayload),
    }
  }, loginPayload);

  console.log(`   -> Login response status: ${loginRes.statusCode}`);
  const setCookie = loginRes.headers['set-cookie'];
  if (!setCookie) {
    console.error('Failed to get session cookie!');
    process.exit(1);
  }
  const sessionCookie = setCookie.map(c => c.split(';')[0]).join('; ');

  // 2. Fetch HTML of Campaign-wide voters page
  console.log('\n2. Testing Campaign Wide Voters page: /campaigns/' + QA_CAMPAIGN_ID + '/voters');
  const allRes = await request({
    hostname: HOST,
    path: `/campaigns/${QA_CAMPAIGN_ID}/voters`,
    method: 'GET',
    headers: {
      Cookie: sessionCookie,
    }
  });
  console.log(`   -> Status: ${allRes.statusCode}`);
  const allTitleMatch = allRes.body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  console.log(`   -> Heading: ${allTitleMatch ? allTitleMatch[1].replace(/<[^>]+>/g, '').trim() : 'NOT FOUND'}`);
  const hasA_all = allRes.body.includes('QA Synthetic Person A');
  const hasB_all = allRes.body.includes('QA Synthetic Person B');
  console.log(`   -> Contains QA Synthetic Person A: ${hasA_all}`);
  console.log(`   -> Contains QA Synthetic Person B: ${hasB_all}`);

  // 3. Fetch HTML of Booth 1 voters page
  console.log(`\n3. Testing Booth 1 Scope page: /campaigns/${QA_CAMPAIGN_ID}/voters?boothId=${BOOTH_1_ID}`);
  const b1Res = await request({
    hostname: HOST,
    path: `/campaigns/${QA_CAMPAIGN_ID}/voters?boothId=${BOOTH_1_ID}`,
    method: 'GET',
    headers: {
      Cookie: sessionCookie,
    }
  });
  console.log(`   -> Status: ${b1Res.statusCode}`);
  const b1TitleMatch = b1Res.body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  console.log(`   -> Heading: ${b1TitleMatch ? b1TitleMatch[1].replace(/<[^>]+>/g, '').trim() : 'NOT FOUND'}`);
  const hasA_b1 = b1Res.body.includes('QA Synthetic Person A');
  const hasB_b1 = b1Res.body.includes('QA Synthetic Person B');
  console.log(`   -> Contains QA Synthetic Person A: ${hasA_b1}`);
  console.log(`   -> Contains QA Synthetic Person B: ${hasB_b1}`);

  // 4. Fetch HTML of Booth 2 voters page
  console.log(`\n4. Testing Booth 2 Scope page: /campaigns/${QA_CAMPAIGN_ID}/voters?boothId=${BOOTH_2_ID}`);
  const b2Res = await request({
    hostname: HOST,
    path: `/campaigns/${QA_CAMPAIGN_ID}/voters?boothId=${BOOTH_2_ID}`,
    method: 'GET',
    headers: {
      Cookie: sessionCookie,
    }
  });
  console.log(`   -> Status: ${b2Res.statusCode}`);
  const b2TitleMatch = b2Res.body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  console.log(`   -> Heading: ${b2TitleMatch ? b2TitleMatch[1].replace(/<[^>]+>/g, '').trim() : 'NOT FOUND'}`);
  const hasA_b2 = b2Res.body.includes('QA Synthetic Person A');
  const hasB_b2 = b2Res.body.includes('QA Synthetic Person B');
  const hasEmpty_b2 = b2Res.body.includes('No voters matching query');
  console.log(`   -> Contains QA Synthetic Person A: ${hasA_b2}`);
  console.log(`   -> Contains QA Synthetic Person B: ${hasB_b2}`);
  console.log(`   -> Displays empty state "No voters matching query": ${hasEmpty_b2}`);

  // 5. Test Voters API directly with boothId parameter
  console.log(`\n5. Testing /api/v1/voters?campaignId=${QA_CAMPAIGN_ID}&boothId=${BOOTH_1_ID}`);
  const apiB1Res = await request({
    hostname: HOST,
    path: `/api/v1/voters?campaignId=${QA_CAMPAIGN_ID}&boothId=${BOOTH_1_ID}`,
    method: 'GET',
    headers: {
      Cookie: sessionCookie,
    }
  });
  const apiB1Data = JSON.parse(apiB1Res.body);
  console.log(`   -> Status: ${apiB1Res.statusCode}, Total: ${apiB1Data.meta?.pagination?.total}, Voters returned: ${apiB1Data.data?.length}`);

  console.log(`\n6. Testing /api/v1/voters?campaignId=${QA_CAMPAIGN_ID}&boothId=${BOOTH_2_ID}`);
  const apiB2Res = await request({
    hostname: HOST,
    path: `/api/v1/voters?campaignId=${QA_CAMPAIGN_ID}&boothId=${BOOTH_2_ID}`,
    method: 'GET',
    headers: {
      Cookie: sessionCookie,
    }
  });
  const apiB2Data = JSON.parse(apiB2Res.body);
  console.log(`   -> Status: ${apiB2Res.statusCode}, Total: ${apiB2Data.meta?.pagination?.total}, Voters returned: ${apiB2Data.data?.length}`);

  // 7. Test QA-010 Household links & Unassigned handling
  console.log(`\n7. Testing QA-010: Household links and unassigned handling in Booth 1 HTML...`);
  const unassignedMatches = b1Res.body.match(/Unassigned/g) || [];
  const householdLinkMatches = b1Res.body.match(/\/households\/[a-zA-Z0-9_-]+/g) || [];
  console.log(`   -> 'Unassigned' occurrences: ${unassignedMatches.length}`);
  console.log(`   -> Working household link hrefs: ${JSON.stringify(householdLinkMatches)}`);

  console.log('\n=== VERIFICATION FINISHED ===');
}

run().catch(console.error);
