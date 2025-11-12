const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const dataDir = path.join(__dirname, '..', '..', 'appwrite_data');
  if (!fs.existsSync(dataDir)) {
    console.log('No appwrite_data directory found, skipping seed.');
    return;
  }

  // Example: look for users.json, banks.json, transactions.json
  const usersFile = path.join(dataDir, 'users.json');
  if (fs.existsSync(usersFile)) {
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    for (const u of users) {
      try {
        await prisma.user.create({ data: {
          email: u.email,
          password: u.password || 'seed-pass',
          firstName: u.firstName || null,
          lastName: u.lastName || null,
          dwollaCustomerId: u.dwollaCustomerId || null,
          dwollaCustomerUrl: u.dwollaCustomerUrl || null,
        } });
      } catch (e) {
        console.warn('User seed skipped or duplicate:', e.message);
      }
    }
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
