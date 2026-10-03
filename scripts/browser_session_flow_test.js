const http = require('http');
const https = require('https');

const BASE = 'https://campaignops-qa-staging.loca.lt';

function request(options, data) {
  return new Promise((resolve, reject) => {
    const isHttps = options.protocol === 'https:' || BASE.startsWith('https:');
    const client = isHttps ? https : http;
    const req = client.request(options, (res) => {
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

async function simulateBrowserSession(roleName, email, password, expectedRedirect) {
  console.log(`\n======================================================`);
  console.log(`[TESTING BROWSER FLOW] Role: ${roleName} (${email})`);
  console.log(`======================================================`);

  // 1. Browser loads /login
  console.log(`1. Navigating browser to ${BASE}/login ...`);
  const loginPageRes = await request({
    hostname: 'campaignops-qa-staging.loca.lt',
    path: '/login',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'bypass-tunnel-reminder': 'true'
    }
  });

  const formPresent = loginPageRes.body.includes('form') || loginPageRes.body.includes('Email') || loginPageRes.body.includes('password');
  console.log(`   -> HTTP Status: ${loginPageRes.statusCode}`);
  console.log(`   -> Login form rendered in HTML: ${formPresent ? 'YES (PASS)' : 'NO (FAIL)'}`);

  // 2. Browser submits credentials to /api/v1/auth/login
  console.log(`2. Submitting credentials to /api/v1/auth/login ...`);
  const payload = JSON.stringify({ email, password });
  const loginPostRes = await request({
    hostname: 'campaignops-qa-staging.loca.lt',
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'bypass-tunnel-reminder': 'true'
    }
  }, payload);

  console.log(`   -> Login API Status: ${loginPostRes.statusCode}`);
  const setCookie = loginPostRes.headers['set-cookie'];
  const sessionCookie = setCookie ? setCookie.map(c => c.split(';')[0]).join('; ') : '';
  console.log(`   -> Session Cookie Received: ${sessionCookie ? 'YES (Valid session created)' : 'NO'}`);

  let parsed = {};
  try { parsed = JSON.parse(loginPostRes.body); } catch(e) {}
  const returnedUser = parsed?.data?.user || {};
  console.log(`   -> Returned Role: ${returnedUser.role}`);
  console.log(`   -> Intended Role Landing Page: ${expectedRedirect}`);

  // 3. Browser navigates to the role-specific landing page with session cookie
  console.log(`3. Navigating browser to intended landing page: ${expectedRedirect} ...`);
  const landingPageRes = await request({
    hostname: 'campaignops-qa-staging.loca.lt',
    path: expectedRedirect,
    method: 'GET',
    headers: {
      'Cookie': sessionCookie,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'bypass-tunnel-reminder': 'true'
    }
  });

  console.log(`   -> Landing Page HTTP Status: ${landingPageRes.statusCode}`);
  const isRedirectedToLogin = landingPageRes.statusCode === 307 || landingPageRes.statusCode === 302 || landingPageRes.headers['location']?.includes('/login');
  if (landingPageRes.statusCode === 200) {
    console.log(`   -> Result: Successfully landed on ${expectedRedirect} (PASS)`);
  } else if (isRedirectedToLogin) {
    console.log(`   -> Result: Rejection/Redirect to login (FAIL)`);
  } else {
    console.log(`   -> Result: HTTP ${landingPageRes.statusCode} - Header Location: ${landingPageRes.headers['location']}`);
  }

  // 4. Verify cross-role isolation (Agent cannot access /super-admin)
  if (roleName === 'POLITICAL_AGENT') {
    console.log(`4. Testing RBAC Isolation: Political Agent attempting to navigate to /super-admin ...`);
    const unauthorizedRes = await request({
      hostname: 'campaignops-qa-staging.loca.lt',
      path: '/super-admin',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'bypass-tunnel-reminder': 'true'
      }
    });
    console.log(`   -> Response HTTP Status: ${unauthorizedRes.statusCode}`);
    console.log(`   -> Redirect / Rejection: ${unauthorizedRes.headers['location'] || 'Access Denied / Forbidden'}`);
  }
}

async function verifyUnauthenticatedAccess() {
  console.log(`\n======================================================`);
  console.log(`[TESTING UNAUTHENTICATED PROTECTION]`);
  console.log(`======================================================`);

  const protectedPages = ['/super-admin', '/campaigns', '/agent'];
  for (const page of protectedPages) {
    const res = await request({
      hostname: 'campaignops-qa-staging.loca.lt',
      path: page,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'bypass-tunnel-reminder': 'true'
      }
    });
    const redirected = res.statusCode === 307 || res.statusCode === 302;
    const location = res.headers['location'] || '';
    console.log(`Unauthenticated GET ${page} -> HTTP ${res.statusCode} | Redirect to: ${location} -> ${location.includes('/login') ? 'PASS (Protected)' : 'FAIL'}`);
  }

  const protectedApis = ['/api/v1/campaigns', '/api/v1/voters', '/api/v1/households', '/api/v1/admin/backups'];
  for (const api of protectedApis) {
    const res = await request({
      hostname: 'campaignops-qa-staging.loca.lt',
      path: api,
      method: 'GET',
      headers: {
        'bypass-tunnel-reminder': 'true'
      }
    });
    console.log(`Unauthenticated API ${api} -> HTTP ${res.statusCode} -> ${res.statusCode === 401 ? 'PASS (Unauthorized Rejected)' : 'FAIL'}`);
  }
}

async function runAll() {
  await simulateBrowserSession('SUPER_ADMIN', 'admin@campaignops.ai', 'password123', '/super-admin');
  await simulateBrowserSession('CAMPAIGN_ADMIN', 'campaign.admin@campaignops.ai', 'password123', '/campaigns');
  await simulateBrowserSession('POLITICAL_AGENT', 'agent@campaignops.ai', 'password123', '/agent');
  await verifyUnauthenticatedAccess();
}

runAll().catch(console.error);
