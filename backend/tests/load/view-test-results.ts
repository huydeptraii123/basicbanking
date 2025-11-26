/**
 * Script để xem kết quả load test
 * - Hiển thị thông tin 2 bank accounts
 * - Hiển thị lịch sử transactions
 * - Thống kê số lượng và tổng giá trị
 */

import dotenv from 'dotenv';
import prisma from '../../src/prisma';
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

async function viewTestResults() {
  console.log('📊 Load Test Results Viewer\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Load test data
    const dataPath = path.join(__dirname, 'test-data.json');
    const testData: TestData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: testData.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true
      }
    });

    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log('👤 Test User Information:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email: ${user.email}`);
    console.log(`Password: LoadTest123!`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`User ID: ${user.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get bank accounts
    const banks = await prisma.bank.findMany({
      where: {
        id: { in: [testData.user1BankId, testData.user2BankId] }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('💳 Bank Accounts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    banks.forEach((bank, index) => {
      console.log(`\nBank ${index + 1}:`);
      console.log(`  ID: ${bank.id}`);
      console.log(`  Account: ${bank.accountId}`);
      console.log(`  Balance: ${(bank.balance || 0).toLocaleString()} VND`);
    });
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { senderBankId: { in: [testData.user1BankId, testData.user2BankId] } },
          { receiverBankId: { in: [testData.user1BankId, testData.user2BankId] } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Get total count
    const totalCount = await prisma.transaction.count({
      where: {
        OR: [
          { senderBankId: { in: [testData.user1BankId, testData.user2BankId] } },
          { receiverBankId: { in: [testData.user1BankId, testData.user2BankId] } }
        ]
      }
    });

    console.log('📝 Transaction History:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total transactions: ${totalCount}`);
    console.log(`Showing latest: ${Math.min(20, transactions.length)}\n`);

    // Calculate statistics
    let totalAmount = 0;
    const bank1Sent = transactions.filter(t => t.senderBankId === testData.user1BankId);
    const bank1Received = transactions.filter(t => t.receiverBankId === testData.user1BankId);
    const bank2Sent = transactions.filter(t => t.senderBankId === testData.user2BankId);
    const bank2Received = transactions.filter(t => t.receiverBankId === testData.user2BankId);

    transactions.forEach(tx => {
      totalAmount += tx.amount || 0;
    });

    console.log('📊 Statistics:');
    console.log(`  Total volume: ${totalAmount.toLocaleString()} VND`);
    console.log(`  Bank 1 → Bank 2: ${bank1Sent.length} transfers`);
    console.log(`  Bank 2 → Bank 1: ${bank2Sent.length} transfers`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Show recent transactions
    console.log('🔄 Recent Transactions (latest 20):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    transactions.slice(0, 20).forEach((tx, index) => {
      const direction = tx.senderBankId === testData.user1BankId ? 'Bank 1 → Bank 2' : 'Bank 2 → Bank 1';
      const time = new Date(tx.createdAt).toLocaleTimeString('vi-VN');
      console.log(`${index + 1}. ${direction} | ${(tx.amount || 0).toLocaleString()} VND | ${time}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🌐 Access Frontend:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('URL: http://localhost:3000/sign-in');
    console.log(`Email: ${user.email}`);
    console.log('Password: LoadTest123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 Tips:');
    console.log('  - Đăng nhập vào frontend để xem giao diện');
    console.log('  - Vào Transaction History để xem lịch sử chi tiết');
    console.log('  - Hoặc dùng: npx prisma studio (xem database trực tiếp)');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
viewTestResults()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
