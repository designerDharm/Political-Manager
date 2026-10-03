const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

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

function buildMultipartPayload(boundary, fields, fileField) {
  const parts = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
      )
    );
  }
  if (fileField) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"\r\nContent-Type: ${fileField.contentType}\r\n\r\n`
      )
    );
    parts.push(fileField.buffer);
    parts.push(Buffer.from('\r\n'));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(parts);
}

// Minimal valid XLSX builder using native zlib & buffers
function buildMinimalXlsx(rows) {
  // Build sharedStrings and sheetData
  const sharedStrings = [];
  const stringMap = new Map();

  function getStringId(str) {
    if (stringMap.has(str)) return stringMap.get(str);
    const id = sharedStrings.length;
    sharedStrings.push(str);
    stringMap.set(str, id);
    return id;
  }

  let sheetDataXml = '';
  for (let r = 0; r < rows.length; r++) {
    sheetDataXml += `<row r="${r + 1}">`;
    for (let c = 0; c < rows[r].length; c++) {
      const colLetter = String.fromCharCode(65 + c);
      const val = rows[r][c];
      const isNum = typeof val === 'number' || (/^\d+$/.test(val) && c !== 1 && c !== 5); // serial or age
      if (isNum) {
        sheetDataXml += `<c r="${colLetter}${r + 1}"><v>${val}</v></c>`;
      } else {
        const sId = getStringId(String(val));
        sheetDataXml += `<c r="${colLetter}${r + 1}" t="s"><v>${sId}</v></c>`;
      }
    }
    sheetDataXml += `</row>`;
  }

  let sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">`;
  for (const s of sharedStrings) {
    sharedStringsXml += `<si><t>${s}</t></si>`;
  }
  sharedStringsXml += `</sst>`;

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n<sheetData>${sheetDataXml}</sheetData>\n</worksheet>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n<Default Extension="xml" ContentType="application/xml"/>\n<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\n<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>\n</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\n</Relationships>`;

  const wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>\n<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>\n</Relationships>`;

  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>\n</workbook>`;

  const files = [
    { name: '[Content_Types].xml', content: Buffer.from(contentTypesXml) },
    { name: '_rels/.rels', content: Buffer.from(relsXml) },
    { name: 'xl/_rels/workbook.xml.rels', content: Buffer.from(wbRelsXml) },
    { name: 'xl/workbook.xml', content: Buffer.from(wbXml) },
    { name: 'xl/sharedStrings.xml', content: Buffer.from(sharedStringsXml) },
    { name: 'xl/worksheets/sheet1.xml', content: Buffer.from(sheet1Xml) },
  ];

  // Assemble zip archive
  const fileRecords = [];
  let currentOffset = 0;
  const parts = [];

  for (const f of files) {
    const compressed = zlib.deflateRawSync(f.content);
    const nameBuf = Buffer.from(f.name);
    
    // Local header
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // general flags
    localHeader.writeUInt16LE(8, 8); // deflate
    localHeader.writeUInt16LE(0, 10); // time
    localHeader.writeUInt16LE(0, 12); // date
    localHeader.writeUInt32LE(0, 14); // crc32 placeholder
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(f.content.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra len

    fileRecords.push({
      nameBuf,
      compressedLen: compressed.length,
      uncompressedLen: f.content.length,
      offset: currentOffset,
    });

    parts.push(localHeader, nameBuf, compressed);
    currentOffset += 30 + nameBuf.length + compressed.length;
  }

  const centralDirStart = currentOffset;
  let centralDirSize = 0;

  for (const rec of fileRecords) {
    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0);
    cdHeader.writeUInt16LE(20, 4); // version made by
    cdHeader.writeUInt16LE(20, 6); // version needed
    cdHeader.writeUInt16LE(0, 8); // flags
    cdHeader.writeUInt16LE(8, 10); // compression
    cdHeader.writeUInt16LE(0, 12); // time
    cdHeader.writeUInt16LE(0, 14); // date
    cdHeader.writeUInt32LE(0, 16); // crc32
    cdHeader.writeUInt32LE(rec.compressedLen, 20);
    cdHeader.writeUInt32LE(rec.uncompressedLen, 24);
    cdHeader.writeUInt16LE(rec.nameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30); // extra
    cdHeader.writeUInt16LE(0, 32); // comment
    cdHeader.writeUInt16LE(0, 34); // disk start
    cdHeader.writeUInt16LE(0, 36); // internal attr
    cdHeader.writeUInt32LE(0, 38); // external attr
    cdHeader.writeUInt32LE(rec.offset, 42); // relative offset

    parts.push(cdHeader, rec.nameBuf);
    centralDirSize += 46 + rec.nameBuf.length;
  }

  // End of central directory record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk cd start
  eocd.writeUInt16LE(fileRecords.length, 8); // total entries on disk
  eocd.writeUInt16LE(fileRecords.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirStart, 16);
  eocd.writeUInt16LE(0, 20); // comment len

  parts.push(eocd);
  return Buffer.concat(parts);
}

async function run() {
  console.log('=== VERIFYING LIVE VERCEL DEPLOYMENT FOR QA-008 ===\n');

  // Step 1: Login as Super Admin
  console.log('1. Authenticating as Super Admin...');
  const loginPayload = JSON.stringify({ email: 'admin@campaignops.ai', password: 'password123' });
  const loginRes = await request({
    hostname: HOST,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginPayload),
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    }
  }, loginPayload);

  console.log(`   -> Login response status: ${loginRes.statusCode}`);
  const setCookie = loginRes.headers['set-cookie'];
  if (!setCookie) {
    console.error('Failed to get session cookie!');
    process.exit(1);
  }
  const sessionCookie = setCookie.map(c => c.split(';')[0]).join('; ');

  // Step 2: Test Download CSV Template endpoint
  console.log('\n2. Testing /api/v1/imports/template endpoint...');
  const templateRes = await request({
    hostname: HOST,
    path: '/api/v1/imports/template',
    method: 'GET',
    headers: {
      'Cookie': sessionCookie,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    }
  });

  console.log(`   -> Template HTTP status: ${templateRes.statusCode}`);
  console.log(`   -> Content-Type: ${templateRes.headers['content-type']}`);
  console.log(`   -> Content-Disposition: ${templateRes.headers['content-disposition']}`);
  const hasTemplateHeaders = templateRes.body.includes('EPIC Number') && templateRes.body.includes('Full Name');
  console.log(`   -> Contains standard column headers: ${hasTemplateHeaders ? 'PASS' : 'FAIL'}`);

  // Step 3: Test Invalid Columns CSV (missing required column)
  console.log('\n3. Testing CSV with missing required columns...');
  const boundary = '----WebKitFormBoundaryQA008Test' + Date.now();
  const invalidCsvContent = 'Serial Number,Full Name,Age\n1,Rohan Gupta,30';
  const invalidCsvPayload = buildMultipartPayload(boundary, { campaignId: QA_CAMPAIGN_ID }, {
    name: 'file',
    filename: 'invalid_columns.csv',
    contentType: 'text/csv',
    buffer: Buffer.from(invalidCsvContent)
  });

  const invalidRes = await request({
    hostname: HOST,
    path: '/api/v1/imports',
    method: 'POST',
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': invalidCsvPayload.length,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    }
  }, invalidCsvPayload);

  console.log(`   -> Status Code: ${invalidRes.statusCode}`);
  console.log(`   -> Response Body: ${invalidRes.body}`);
  const invalidJson = JSON.parse(invalidRes.body);
  const returnsMissingColumnsError = invalidJson.error?.message?.includes('Missing required column(s)');
  console.log(`   -> Actionable missing column error returned: ${returnsMissingColumnsError ? 'PASS' : 'FAIL'}`);

  // Step 4: Test Valid Synthetic CSV
  console.log('\n4. Testing Valid Synthetic CSV Upload...');
  const syntheticEpic = `SYNTH${Date.now().toString().slice(-7)}`;
  const validCsvContent = `Serial Number,EPIC Number,Full Name,Relation Name,Relation Type,House Number,Age,Gender\n1,${syntheticEpic},Kavita Krishnan,Sundar Krishnan,FATHER,44-C,28,F`;
  const validCsvPayload = buildMultipartPayload(boundary, { campaignId: QA_CAMPAIGN_ID }, {
    name: 'file',
    filename: 'synthetic_voters.csv',
    contentType: 'text/csv',
    buffer: Buffer.from(validCsvContent)
  });

  const validCsvRes = await request({
    hostname: HOST,
    path: '/api/v1/imports',
    method: 'POST',
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': validCsvPayload.length,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    }
  }, validCsvPayload);

  console.log(`   -> Status Code: ${validCsvRes.statusCode}`);
  console.log(`   -> Response Body: ${validCsvRes.body}`);
  const validCsvJson = JSON.parse(validCsvRes.body);
  const csvJobId = validCsvJson.data?.id;
  const csvSuccess = validCsvRes.statusCode === 201 && validCsvJson.data?.extractedVotersCount === 1;
  console.log(`   -> CSV Import Created with 1 voter: ${csvSuccess ? 'PASS' : 'FAIL'}`);

  // Verify staged record in review endpoint
  if (csvJobId) {
    const reviewRes = await request({
      hostname: HOST,
      path: `/api/v1/imports/${csvJobId}`,
      method: 'GET',
      headers: {
        'Cookie': sessionCookie,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    });
    const reviewJson = JSON.parse(reviewRes.body);
    const stagedRecord = reviewJson.data?.records?.[0];
    const exactMatch = stagedRecord?.epicNumber === syntheticEpic && stagedRecord?.fullName === 'Kavita Krishnan';
    console.log(`   -> Review center verified staged record (EPIC: ${stagedRecord?.epicNumber}, Name: ${stagedRecord?.fullName}): ${exactMatch ? 'PASS' : 'FAIL'}`);
  }

  // Step 5: Test Valid Synthetic XLSX
  console.log('\n5. Testing Valid Synthetic XLSX Upload...');
  const syntheticXlsxEpic = `XLSX${Date.now().toString().slice(-6)}`;
  const xlsxRows = [
    ['Serial Number', 'EPIC Number', 'Full Name', 'Relation Name', 'Relation Type', 'House Number', 'Age', 'Gender'],
    [1, syntheticXlsxEpic, 'Manish Tiwari', 'Harish Tiwari', 'FATHER', '77-A', 36, 'M']
  ];
  const xlsxBuffer = buildMinimalXlsx(xlsxRows);

  const validXlsxPayload = buildMultipartPayload(boundary, { campaignId: QA_CAMPAIGN_ID }, {
    name: 'file',
    filename: 'synthetic_voters.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: xlsxBuffer
  });

  const validXlsxRes = await request({
    hostname: HOST,
    path: '/api/v1/imports',
    method: 'POST',
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': validXlsxPayload.length,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    }
  }, validXlsxPayload);

  console.log(`   -> Status Code: ${validXlsxRes.statusCode}`);
  console.log(`   -> Response Body: ${validXlsxRes.body}`);
  const validXlsxJson = JSON.parse(validXlsxRes.body);
  const xlsxJobId = validXlsxJson.data?.id;
  const xlsxSuccess = validXlsxRes.statusCode === 201 && validXlsxJson.data?.extractedVotersCount === 1;
  console.log(`   -> XLSX Import Created with 1 voter: ${xlsxSuccess ? 'PASS' : 'FAIL'}`);

  // Verify staged record in review endpoint
  if (xlsxJobId) {
    const reviewXlsxRes = await request({
      hostname: HOST,
      path: `/api/v1/imports/${xlsxJobId}`,
      method: 'GET',
      headers: {
        'Cookie': sessionCookie,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    });
    const reviewXlsxJson = JSON.parse(reviewXlsxRes.body);
    const stagedXlsxRecord = reviewXlsxJson.data?.records?.[0];
    const exactXlsxMatch = stagedXlsxRecord?.epicNumber === syntheticXlsxEpic && stagedXlsxRecord?.fullName === 'Manish Tiwari';
    console.log(`   -> Review center verified staged record (EPIC: ${stagedXlsxRecord?.epicNumber}, Name: ${stagedXlsxRecord?.fullName}): ${exactXlsxMatch ? 'PASS' : 'FAIL'}`);
  }

  // Step 6: Verify PDF upload still works
  console.log('\n6. Testing PDF Upload Regression...');
  const samplePdfPath = path.join(process.cwd(), 'UI:UX screens/KITHANA-Ward No-001.pdf');
  if (fs.existsSync(samplePdfPath)) {
    const pdfBuf = fs.readFileSync(samplePdfPath);
    const pdfPayload = buildMultipartPayload(boundary, { campaignId: QA_CAMPAIGN_ID }, {
      name: 'file',
      filename: 'KITHANA-Ward No-001.pdf',
      contentType: 'application/pdf',
      buffer: pdfBuf
    });

    const pdfRes = await request({
      hostname: HOST,
      path: '/api/v1/imports',
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': pdfPayload.length,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    }, pdfPayload);

    console.log(`   -> Status Code: ${pdfRes.statusCode}`);
    const pdfJson = JSON.parse(pdfRes.body);
    const pdfSuccess = pdfRes.statusCode === 201 && (pdfJson.data?.extractedVotersCount || 0) > 0;
    console.log(`   -> PDF OCR Pipeline functioning: ${pdfSuccess ? 'PASS' : 'FAIL'}`);
  }

  console.log('\n=== ALL DEPLOYED QA-008 CHECKS COMPLETED ===');
}

run().catch(console.error);
