const https = require('https');

const HOST = 'political-manager.vercel.app';
const QA_CAMPAIGN_ID = '3814789d-48d8-4f0d-a7bd-6ea9dd8c721e';

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
  console.log('=== VERIFYING LIVE VERCEL DEPLOYMENT FOR QA-007 ===\n');

  // Step 1: Login as Super Admin to get session cookie
  console.log('1. Authenticating as Super Admin...');
  const loginPayload = JSON.stringify({ email: 'admin@campaignops.ai', password: 'password123' });
  const loginRes = await request({
    hostname: HOST,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginPayload),
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  }, loginPayload);

  console.log(`   -> Login response status: ${loginRes.statusCode}`);
  const setCookie = loginRes.headers['set-cookie'];
  if (!setCookie) {
    console.error('Failed to get session cookie!');
    process.exit(1);
  }
  const sessionCookie = setCookie.map(c => c.split(';')[0]).join('; ');
  console.log('   -> Session cookie acquired.');

  // Step 2: Fetch voter upload page to confirm updated client UI bundle
  console.log('\n2. Inspecting voter upload page HTML & assets...');
  const uploadPageRes = await request({
    hostname: HOST,
    path: `/campaigns/${QA_CAMPAIGN_ID}/voters/upload`,
    method: 'GET',
    headers: {
      'Cookie': sessionCookie,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });

  console.log(`   -> Upload page HTTP status: ${uploadPageRes.statusCode}`);
  const html = uploadPageRes.body;
  const hasMax50 = html.includes('50MB') || html.includes('50 MB');
  console.log(`   -> Mentions 50MB size limit: ${hasMax50}`);

  // Step 3: Test Server-Side Validation: Empty file request without multipart file
  console.log('\n3. Testing Server-side validation: Empty/No file payload...');
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const emptyMultipart = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="campaignId"\r\n\r\n` +
    `${QA_CAMPAIGN_ID}\r\n` +
    `--${boundary}--\r\n`;

  const emptyRes = await request({
    hostname: HOST,
    path: '/api/v1/imports',
    method: 'POST',
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(emptyMultipart),
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  }, emptyMultipart);

  console.log(`   -> Status Code: ${emptyRes.statusCode}`);
  console.log(`   -> Response Body: ${emptyRes.body}`);
  const parsedEmpty = JSON.parse(emptyRes.body);
  const correctEmptyMsg = parsedEmpty.error?.message === 'Please select a file to import. A valid PDF file is required.';
  console.log(`   -> Returns expected validation message: ${correctEmptyMsg ? 'PASS' : 'FAIL'}`);

  // Step 4: Test Server-Side Validation: Zero byte file
  console.log('\n4. Testing Server-side validation: Zero-byte file...');
  const zeroByteMultipart = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="campaignId"\r\n\r\n` +
    `${QA_CAMPAIGN_ID}\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="empty.pdf"\r\n` +
    `Content-Type: application/pdf\r\n\r\n` +
    `\r\n` +
    `--${boundary}--\r\n`;

  const zeroRes = await request({
    hostname: HOST,
    path: '/api/v1/imports',
    method: 'POST',
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(zeroByteMultipart),
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  }, zeroByteMultipart);

  console.log(`   -> Status Code: ${zeroRes.statusCode}`);
  console.log(`   -> Response Body: ${zeroRes.body}`);
  const parsedZero = JSON.parse(zeroRes.body);
  const correctZeroMsg = parsedZero.error?.message === 'Uploaded file buffer is empty';
  console.log(`   -> Returns expected zero-byte error: ${correctZeroMsg ? 'PASS' : 'FAIL'}`);

  // Step 5: Test Server-Side Validation: Unsupported file type / Non-PDF magic bytes
  console.log('\n5. Testing Server-side validation: Unsupported non-PDF file...');
  const textContent = 'This is a plain text file, not a PDF.';
  const unsupportedMultipart = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="campaignId"\r\n\r\n` +
    `${QA_CAMPAIGN_ID}\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="test.txt"\r\n` +
    `Content-Type: text/plain\r\n\r\n` +
    `${textContent}\r\n` +
    `--${boundary}--\r\n`;

  const unsupportedRes = await request({
    hostname: HOST,
    path: '/api/v1/imports',
    method: 'POST',
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(unsupportedMultipart),
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  }, unsupportedMultipart);

  console.log(`   -> Status Code: ${unsupportedRes.statusCode}`);
  console.log(`   -> Response Body: ${unsupportedRes.body}`);
  const parsedUnsup = JSON.parse(unsupportedRes.body);
  const correctUnsup = parsedUnsup.error?.message?.includes('File must be a valid PDF document with %PDF header');
  console.log(`   -> Returns expected unsupported format error: ${correctUnsup ? 'PASS' : 'FAIL'}`);

  console.log('\n=== ALL DEPLOYED VALIDATION CHECKS COMPLETED ===');
}

run().catch(console.error);
