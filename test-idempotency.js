// test-idempotency.js
const fetch = require('node-fetch'); 

// --- CẤU HÌNH (Điền lại thông tin của bạn vào đây) ---
const API_URL = 'http://localhost:4000/api/transactions/create';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZGQyZGEwMy1kOGUyLTRhMDQtODVkNC03Mzg2OGE0Yjg5NWYiLCJpYXQiOjE3NjQzOTA0NTYsImV4cCI6MTc2NDk5NTI1Nn0.Jft1VBLSS5kDn6XA1tGmzU2Dn1DQH7jnROy2JUvRxO0'; // Lấy từ Cookie hoặc LocalStorage sau khi login
const SENDER_ID = '83a48d56-852a-4100-8739-c5f267f048e1';
const RECEIVER_ID = '7b72a592-7320-4e9c-93fd-ec99946fb0ce';


// Tạo một mã ngẫu nhiên để làm Idempotency Key
// Mỗi lần chạy script này, bạn nên đổi mã này hoặc để nó random như dưới đây
const TEST_KEY = `test-key-${Date.now()}`; 

async function testIdempotency() {
  console.log(`🔑 Sử dụng Idempotency Key: ${TEST_KEY}`);
  console.log('------------------------------------------------');

  const payload = {
    amount: 20, 
    senderBankId: SENDER_ID,
    receiverBankId: RECEIVER_ID,
    name: 'Test Idempotency',
    idempotencyKey: TEST_KEY // <--- QUAN TRỌNG NHẤT: Gửi kèm khóa này
  };

  // --- LẦN GỬI 1: HỢP LỆ ---
  console.log('1️⃣  Đang gửi Request lần 1...');
  const res1 = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify(payload)
  });
  const data1 = await res1.json();
  
  if (res1.status === 200) {
    console.log('✅ Lần 1: Thành công! (Đúng mong đợi)');
    console.log(`   -> Transaction ID: ${data1.transaction.id}`);
    console.log(`   -> Số dư mới: ${data1.senderNewBalance}`);
  } else {
    console.log('❌ Lần 1: Thất bại (Lỗi rồi, kiểm tra lại token/ID)');
    console.log('   -> Lỗi:', data1);
    return; // Dừng luôn nếu lần 1 lỗi
  }

  console.log('\n... Giả vờ mạng lag, user bấm nút gửi thêm lần nữa ...\n');

  // --- LẦN GỬI 2: TRÙNG LẶP (DÙNG LẠI KEY CŨ) ---
  console.log('2️⃣  Đang gửi Request lần 2 (Trùng Key)...');
  const res2 = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify(payload) // Gửi y nguyên payload cũ
  });
  
  // Chúng ta mong đợi server trả về lỗi 409 (Conflict) chứ không phải lỗi JSON
  const data2 = await res2.json();

  if (res2.status === 409) {
    console.log('🛡️  Lần 2: Bị chặn thành công! (Hệ thống hoạt động tốt)');
    console.log(`   -> Server báo lỗi: "${data2.error}"`);
    console.log(`   -> Ref Key: "${data2.ref}"`);
    console.log('\n=> KẾT LUẬN: Test Idempotency THÀNH CÔNG! 🎉');
  } else if (res2.status === 200) {
    console.log('❌ Lần 2: Vẫn thành công??? (LỖI: Hệ thống chưa chặn được trùng lặp)');
    console.log('   -> Bạn đang bị mất tiền 2 lần!');
  } else {
    console.log(`❓ Lần 2: Lỗi lạ (${res2.status})`);
    console.log('   ->', data2);
  }
}

testIdempotency();