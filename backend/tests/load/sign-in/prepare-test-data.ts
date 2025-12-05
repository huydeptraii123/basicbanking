/**
 * Script chuẩn bị test data cho Sign-In Load Testing
 * 
 * Tạo nhiều test users để test khả năng chịu tải của sign-in endpoint
 * 
 * Usage:
 *   npm run load-test:signin:prepare [số_lượng_users]
 *   
 * Example:
 *   npm run load-test:signin:prepare 100   # Tạo 100 users
 *   npm run load-test:signin:prepare 500   # Tạo 500 users
 */

import dotenv from 'dotenv';
import prisma from '../../../src/prisma';
import bcrypt from 'bcrypt';
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

async function prepareSignInTestData(numberOfUsers: number = 100) {
  console.log('🚀 Sign-In Load Test - Data Preparation\n');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`📝 Creating ${numberOfUsers} test users...\n`);

  try {
    const testPassword = 'LoadTest123!';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const users: TestUser[] = [];

    // Xóa test users cũ
    console.log('🗑️  Cleaning up old test users...');
    const deleted = await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'signin-test-'
        }
      }
    });
    console.log(`✅ Deleted ${deleted.count} old test users\n`);

    // Tạo users mới (batch processing để tăng tốc)
    console.log(`👥 Creating ${numberOfUsers} new test users...`);
    const batchSize = 20;
    
    for (let i = 0; i < numberOfUsers; i += batchSize) {
      const batch = [];
      const currentBatchSize = Math.min(batchSize, numberOfUsers - i);
      
      for (let j = 0; j < currentBatchSize; j++) {
        const userIndex = i + j + 1;
        batch.push({
          email: `signin-test-${userIndex}@example.com`,
          password: hashedPassword,
          firstName: `SignIn`,
          lastName: `Test${userIndex}`
        });
      }

      // Create users in parallel
      const createdUsers = await Promise.all(
        batch.map(data => prisma.user.create({ data }))
      );

      createdUsers.forEach((user, index) => {
        const userIndex = i + index + 1;
        users.push({
          email: user.email,
          password: testPassword,
          userId: user.id
        });
      });

      // Progress
      const progress = Math.min(i + batchSize, numberOfUsers);
      const percentage = Math.round((progress / numberOfUsers) * 100);
      process.stdout.write(`\r  Progress: ${progress}/${numberOfUsers} (${percentage}%)`);
    }

    console.log('\n\n✅ All test users created successfully!\n');

    // Lưu vào JSON
    const testData: SignInTestData = {
      users,
      totalUsers: numberOfUsers,
      testPassword
    };

    const outputPath = path.join(__dirname, 'test-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(testData, null, 2));

    console.log('✅ Test data saved to:', outputPath);
    console.log('\n📊 Configuration:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Users: ${numberOfUsers}`);
    console.log(`Email Pattern: signin-test-{1..${numberOfUsers}}@example.com`);
    console.log(`Password (all): ${testPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📋 Sample Users:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    users.slice(0, 5).forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email}`);
    });
    if (numberOfUsers > 5) {
      console.log(`  ... and ${numberOfUsers - 5} more users`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🎯 Ready for load testing!');
    console.log('\n📦 Next steps:');
    console.log('  1. Start backend: npm run dev');
    console.log('  2. Run tests:');
    console.log('     npm run load-test:signin:100   (100 sign-ins)');
    console.log('     npm run load-test:signin:1000  (1000 sign-ins)');
    console.log('  3. View results: npm run load-test:signin:results');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const numberOfUsers = args[0] ? parseInt(args[0], 10) : 100;

if (isNaN(numberOfUsers) || numberOfUsers <= 0) {
  console.error('❌ Invalid number. Usage: npm run load-test:signin:prepare [number]');
  console.error('Example: npm run load-test:signin:prepare 100');
  process.exit(1);
}

// Run
prepareSignInTestData(numberOfUsers)
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
