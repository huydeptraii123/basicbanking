// test-spam.js
// Script này sẽ bắn 10 request chuyển tiền CÙNG LÚC vào server
// Để xem server có bị trừ tiền sai hay không.

const fetch = require('node-fetch'); // Hoặc dùng native fetch nếu Node > 18
// Nếu chưa có node-fetch: npm install node-fetch

// --- CẤU HÌNH ---
const API_URL = 'http://localhost:4000/api/transactions/create';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZGQyZGEwMy1kOGUyLTRhMDQtODVkNC03Mzg2OGE0Yjg5NWYiLCJpYXQiOjE3NjQzOTA0NTYsImV4cCI6MTc2NDk5NTI1Nn0.Jft1VBLSS5kDn6XA1tGmzU2Dn1DQH7jnROy2JUvRxO0'; // Lấy từ Cookie hoặc LocalStorage sau khi login
const SENDER_ID = '83a48d56-852a-4100-8739-c5f267f048e1';
const RECEIVER_ID = '7b72a592-7320-4e9c-93fd-ec99946fb0ce';

async function attack() {
  console.log('🚀 Bắt đầu tấn công SPAM transaction...');
  
  // Tạo 10 request giống hệt nhau
  const requests = [];
  for (let i = 0; i < 10; i++) {
    const payload = {
      amount: 5, // Chuyển 10 đồng mỗi lần
      senderBankId: SENDER_ID,
      receiverBankId: RECEIVER_ID,
      name: `Spam Attack ${i}`,
      // KHÔNG GỬI idempotencyKey ĐỂ TEST RACE CONDITION
      // Nếu gửi idempotencyKey thì 9 cái sẽ fail (đúng logic chống lặp)
      // Ở đây ta muốn test xem DB có chịu nổi 10 lệnh trừ tiền cùng lúc ko.
    };

    requests.push(
      fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}` // Nếu dùng Bearer, hoặc chỉnh lại theo cách auth của bạn
        },
        body: JSON.stringify(payload)
      }).then(res => res.json())
    );
  }

  // Bắn 10 request cùng lúc (Parallel)
  const results = await Promise.all(requests);
  
  console.log('--- KẾT QUẢ ---');
  let successCount = 0;
  let failCount = 0;
  
  results.forEach((res, index) => {
    if (res.success) {
      console.log(`Request ${index}: ✅ Thành công (Số dư mới: ${res.senderNewBalance})`);
      successCount++;
    } else {
      console.log(`Request ${index}: ❌ Thất bại (${JSON.stringify(res.error)})`);
      failCount++;
    }
  });
  
  console.log(`\nTổng: ${successCount} thành công, ${failCount} thất bại.`);
  console.log('-> Nếu Code CŨ: Số dư có thể chỉ bị trừ 1 lần dù báo thành công nhiều lần.');
  console.log('-> Nếu Code MỚI: Số dư phải bị trừ chính xác (Success * 10).');
}

attack();