/**
 * Xem kết quả Sign-In Load Test
 */

import dotenv from 'dotenv';
import prisma from '../../../src/prisma';
import fs from 'fs';
import path from 'path';

dotenv.config();

interface TestUser {
  email: string;
  password: string;
  userId: string;
}

interface SignInTestData {
  users: TestUser[];
  totalUsers: number;
  testPassword: string;
}

async function viewResults() {
  console.log('📊 Sign-In Load Test Results\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const dataPath = path.join(__dirname, 'test-data.json');
    
    if (!fs.existsSync(dataPath)) {
      console.log('❌ No test data found!');
      console.log('Run: npm run load-test:signin:prepare');
      return;
    }

    const testData: SignInTestData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Get users from DB
    const users = await prisma.user.findMany({
      where: {
        email: { startsWith: 'signin-test-' }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true
      },
      orderBy: { email: 'asc' }
    });

    console.log('👥 Test Users:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total: ${testData.totalUsers}`);
    console.log(`In Database: ${users.length}`);
    console.log(`Password: ${testData.testPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Sample Users (first 10):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    users.slice(0, 10).forEach((user, idx) => {
      console.log(`  ${idx + 1}. ${user.email}`);
    });
    if (users.length > 10) {
      console.log(`  ... and ${users.length - 10} more`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🧪 Manual Test:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('POST http://localhost:4000/api/auth/signin');
    console.log('{');
    console.log(`  "email": "${users[0]?.email || 'signin-test-1@example.com'}",`);
    console.log(`  "password": "${testData.testPassword}"`);
    console.log('}');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🌐 Frontend Test:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('http://localhost:3000/sign-in');
    console.log(`Email: ${users[0]?.email || 'signin-test-1@example.com'}`);
    console.log(`Password: ${testData.testPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🚀 Run Load Tests:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('npm run load-test:signin:100');
    console.log('npm run load-test:signin:1000');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

viewResults()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
