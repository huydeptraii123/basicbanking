
async function testAll2FAApis() {
  console.log('🚀 Bắt đầu test tất cả API 2FA...\n');
  
  const results = [];
  
  // Test 1: GET QR Code
  console.log('📋 Test 1: GET /api/user/2fa/qrcode');
  for (let i = 1; i <= 3; i++) {
    const start = performance.now();
    try {
      const res = await fetch('http://localhost:4000/api/user/2fa/qrcode', {
        credentials: 'include'
      });
      await res.json();
      const time = (performance.now() - start).toFixed(2);
      console.log(`  Lần ${i}: ${time}ms`);
      if (!results[0]) results[0] = [];
      results[0].push(parseFloat(time));
    } catch (err) {
      console.error(`  Lần ${i}: Lỗi - ${err.message}`);
    }
  }
  
  // Test 2: POST Setup 2FA
  console.log('\n📋 Test 2: POST /api/user/2fa/setup');
  for (let i = 1; i <= 3; i++) {
    const start = performance.now();
    try {
      const res = await fetch('http://localhost:4000/api/user/2fa/setup', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({ otpToken: '123456' })
      });
      await res.json();
      const time = (performance.now() - start).toFixed(2);
      console.log(`  Lần ${i}: ${time}ms`);
      if (!results[1]) results[1] = [];
      results[1].push(parseFloat(time));
    } catch (err) {
      console.error(`  Lần ${i}: Lỗi - ${err.message}`);
    }
  }
  
  // Test 3: POST Verify 2FA
  console.log('\n📋 Test 3: POST /api/user/2fa/verify');
  for (let i = 1; i <= 3; i++) {
    const start = performance.now();
    try {
      const res = await fetch('http://localhost:4000/api/user/2fa/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({ otpToken: '123456' })
      });
      await res.json();
      const time = (performance.now() - start).toFixed(2);
      console.log(`  Lần ${i}: ${time}ms`);
      if (!results[2]) results[2] = [];
      results[2].push(parseFloat(time));
    } catch (err) {
      console.error(`  Lần ${i}: Lỗi - ${err.message}`);
    }
  }
  
  // Test 4: POST Disable 2FA
  console.log('\n📋 Test 4: POST /api/user/2fa/disable');
  for (let i = 1; i <= 3; i++) {
    const start = performance.now();
    try {
      const res = await fetch('http://localhost:4000/api/user/2fa/disable', {
        method: 'POST',
        credentials: 'include'
      });
      await res.json();
      const time = (performance.now() - start).toFixed(2);
      console.log(`  Lần ${i}: ${time}ms`);
      if (!results[3]) results[3] = [];
      results[3].push(parseFloat(time));
    } catch (err) {
      console.error(`  Lần ${i}: Lỗi - ${err.message}`);
    }
  }
  
  // Tính trung bình và hiển thị kết quả
  console.log('\n📊 KẾT QUẢ TỔNG HỢP:');
  console.log('═'.repeat(60));
  
  const apis = [
    'GET /api/user/2fa/qrcode',
    'POST /api/user/2fa/setup',
    'POST /api/user/2fa/verify',
    'POST /api/user/2fa/disable'
  ];
  
  results.forEach((times, index) => {
    if (times && times.length > 0) {
      const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
      console.log(`${apis[index]}`);
      console.log(`  Lần 1: ${times[0]}ms | Lần 2: ${times[1]}ms | Lần 3: ${times[2]}ms`);
      console.log(`  ⭐ Trung bình: ~${avg}ms\n`);
    }
  });
  
  console.log('✅ Hoàn thành test!');
}

// Chạy test
testAll2FAApis();
