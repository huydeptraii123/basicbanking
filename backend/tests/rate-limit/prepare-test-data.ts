/**
 * Prepare test data for rate limit testing
 * Creates test user and gets auth token
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { signJWT } from '../../src/utils';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface TestData {
  authToken: string;
  user1BankId: string;
  user2BankId: string;
  userId: string;
  email: string;
}

async function prepareTestData(initialBalance: number = 100_000_000): Promise<TestData> {
  console.log('🔧 Preparing rate limit test data...\n');

  const testEmail = 'ratelimit@test.com';
  const testPassword = 'RateLimit123!';

  try {
    // 1. Delete existing test user if exists
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { accounts: true },
    });

    if (existingUser) {
      console.log('🗑️  Deleting existing test user...');
      
      // Delete transactions first
      if (existingUser.accounts.length > 0) {
        const accountIds = existingUser.accounts.map(acc => acc.id);
        await prisma.transaction.deleteMany({
          where: {
            OR: [
              { senderBankId: { in: accountIds } },
              { receiverBankId: { in: accountIds } },
            ],
          },
        });
      }

      // Delete accounts
      await prisma.account.deleteMany({
        where: { userId: existingUser.id },
      });

      // Delete user
      await prisma.user.delete({
        where: { id: existingUser.id },
      });

      console.log('✓ Cleaned up existing data\n');
    }

    // 2. Create test user
    console.log('👤 Creating test user...');
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        firstName: 'Rate',
        lastName: 'Limiter',
        address1: 'Test Address',
        city: 'Test City',
        state: 'TC',
        postalCode: '12345',
        dateOfBirth: '1990-01-01',
        ssn: '1234',
      },
    });

    console.log(`✓ User created: ${user.email} (ID: ${user.id})\n`);

    // 3. Create 2 bank accounts with initial balance
    console.log('🏦 Creating bank accounts...');
    
    const bank1 = await prisma.account.create({
      data: {
        userId: user.id,
        availableBalance: initialBalance,
        currentBalance: initialBalance,
        institutionId: 'test_bank_1',
        name: 'Test Bank 1',
        officialName: 'Test Bank Account 1',
        type: 'depository',
        subtype: 'checking',
        mask: '0001',
        shareableId: `SHARE_${Date.now()}_1`,
      },
    });

    const bank2 = await prisma.account.create({
      data: {
        userId: user.id,
        availableBalance: initialBalance,
        currentBalance: initialBalance,
        institutionId: 'test_bank_2',
        name: 'Test Bank 2',
        officialName: 'Test Bank Account 2',
        type: 'depository',
        subtype: 'savings',
        mask: '0002',
        shareableId: `SHARE_${Date.now()}_2`,
      },
    });

    console.log(`✓ Bank 1: ${bank1.name} - Balance: ${initialBalance.toLocaleString()} VND`);
    console.log(`✓ Bank 2: ${bank2.name} - Balance: ${initialBalance.toLocaleString()} VND\n`);

    // 4. Generate JWT token
    console.log('🔑 Generating auth token...');
    const token = signJWT(user.id);
    const authCookie = `auth_token=${token}`;
    console.log(`✓ Token generated\n`);

    // 5. Save to JSON file
    const testData: TestData = {
      authToken: authCookie,
      user1BankId: bank1.id,
      user2BankId: bank2.id,
      userId: user.id,
      email: testEmail,
    };

    const outputPath = path.join(__dirname, 'test-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(testData, null, 2));
    console.log(`✓ Test data saved to: ${outputPath}\n`);

    // 6. Summary
    console.log('✅ Rate limit test data ready!\n');
    console.log('📋 Test Configuration:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Bank 1: ${bank1.id}`);
    console.log(`   Bank 2: ${bank2.id}`);
    console.log(`   Initial Balance: ${initialBalance.toLocaleString()} VND each\n`);

    console.log('🚀 Ready to run rate limit tests!');
    console.log('   npm run rate-limit:test:100   (100 spam requests)');
    console.log('   npm run rate-limit:test:500   (500 spam requests)');
    console.log('   npm run rate-limit:auto:100   (auto test + parse)');
    console.log('   npm run rate-limit:auto:500   (auto test + parse)\n');

    return testData;

  } catch (error) {
    console.error('❌ Error preparing test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const balance = args[0] ? parseInt(args[0]) : 100_000_000;

  prepareTestData(balance)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export { prepareTestData };
