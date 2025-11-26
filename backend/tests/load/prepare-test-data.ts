/**
 * Script để chuẩn bị test data cho load testing
 * 
 * Script này sẽ:
 * 1. Tạo 2 bank accounts với balance lớn (100,000,000 VND mỗi account)
 * 2. Login và lấy auth token
 * 3. Lưu thông tin vào test-data.json để Artillery sử dụng
 * 
 * Chạy: npm run load-test:prepare
 */

import dotenv from 'dotenv';
import prisma from '../../src/prisma';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

dotenv.config();

interface TestData {
  authToken: string;
  user1BankId: string;
  user2BankId: string;
  userId: string;
  email: string;
}

async function prepareTestData() {
  console.log('🚀 Starting test data preparation...\n');

  try {
    // 1. Tạo hoặc tìm test user
    const testEmail = 'loadtest@example.com';
    const testPassword = 'LoadTest123!';
    
    let user = await prisma.user.findUnique({
      where: { email: testEmail }
    });

    if (!user) {
      console.log('📝 Creating test user...');
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      user = await prisma.user.create({
        data: {
          email: testEmail,
          password: hashedPassword,
          firstName: 'Load',
          lastName: 'Test'
        }
      });
      console.log('✅ Test user created:', testEmail);
    } else {
      console.log('✅ Test user found:', testEmail);
    }

    // 2. Tạo hoặc update 2 bank accounts với balance lớn
    console.log('\n💰 Setting up bank accounts...');
    
    const initialBalance = 100000000; // 100 triệu VND
    
    // Xóa các bank accounts cũ của user này
    await prisma.bank.deleteMany({
      where: { userId: user.id }
    });

    // Tạo 2 bank accounts mới
    const bank1 = await prisma.bank.create({
      data: {
        userId: user.id,
        bankId: 'test_bank_1',
        accountId: `TEST_ACC_1_${Date.now()}`,
        accessToken: 'test_access_token_1',
        balance: initialBalance,
        sharableId: 'sharable_1'
      }
    });

    const bank2 = await prisma.bank.create({
      data: {
        userId: user.id,
        bankId: 'test_bank_2',
        accountId: `TEST_ACC_2_${Date.now()}`,
        accessToken: 'test_access_token_2',
        balance: initialBalance,
        sharableId: 'sharable_2'
      }
    });

    console.log('✅ Bank Account 1 created:', bank1.id, '- Balance:', bank1.balance);
    console.log('✅ Bank Account 2 created:', bank2.id, '- Balance:', bank2.balance);

    // 3. Tạo JWT token (giả lập login)
    // Bạn cần import JWT library và tạo token giống như trong auth route
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    // 4. Lưu test data vào file JSON
    const testData: TestData = {
      authToken: `token=${token}`,
      user1BankId: bank1.id,
      user2BankId: bank2.id,
      userId: user.id,
      email: testEmail
    };

    const outputPath = path.join(__dirname, 'test-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(testData, null, 2));

    console.log('\n✅ Test data saved to:', outputPath);
    console.log('\n📊 Test Configuration:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('User ID:', user.id);
    console.log('Bank 1 ID:', bank1.id);
    console.log('Bank 2 ID:', bank2.id);
    console.log('Initial Balance:', initialBalance.toLocaleString(), 'VND');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🎯 Ready for load testing!');
    console.log('\nRun load tests:');
    console.log('  npm run load-test:100   (100 transfers in 10 seconds)');
    console.log('  npm run load-test:1000  (1000 transfers in 60 seconds)');

  } catch (error) {
    console.error('❌ Error preparing test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
prepareTestData()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
