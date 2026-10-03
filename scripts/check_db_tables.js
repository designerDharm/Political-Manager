const fs = require('fs');
const envContent = fs.readFileSync('.env.qa.local', 'utf8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[match[1].trim()] = val;
  }
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  console.log('Total tables in QA DB:', tables.length);
  console.log(tables.map(t => t.table_name));

  const usersCount = await prisma.user.count();
  const orgCount = await prisma.organization.count();
  console.log('Users count:', usersCount, '| Organizations count:', orgCount);
}
main().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
