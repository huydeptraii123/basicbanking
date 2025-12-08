import { fetchWithRetry } from "@/lib/core-fetch";

async function runBenchmark(totalAttempts: number) {
  console.log(`🚀 Bắt đầu Benchmark: ${totalAttempts} attempts...`);
  console.log("---------------------------------------------------");

  let successCount = 0;
  let failCount = 0;
  let totalLatency = 0;
  
  // URL Gốc
  const BASE_URL = 'http://localhost:4000/api/banks/user/dcbee799-dd68-400d-b781-7f4de975dbf3';
  const results = [];

  for (let i = 1; i <= totalAttempts; i++) {
    const start = Date.now();
    let status = '❌ Failed';

    try {
      // 1. Chống cache bằng tham số random
      const uniqueUrl = `${BASE_URL}?_t=${Date.now()}_${Math.random()}`;

      // 2. Gọi hàm retry
      const res = await fetchWithRetry(uniqueUrl, { cache: 'no-store' });
      
      // 🔥 FIX LOGIC ĐẾM: Phải kiểm tra res.ok
      // fetchWithRetry trả về Response object kể cả khi 503 (sau khi hết lượt retry)
      if (res.ok) {
        successCount++;
        status = '✅ Success';
      } else {
        // Nếu res.status = 503, 429, 500 -> Tính là Thất bại
        failCount++;
        status = `❌ Failed (${res.status})`; 
      }

    } catch (error) {
      // Chỉ vào đây nếu lỗi mạng (Network Error / Timeout)
      failCount++;
      status = '❌ Network Error';
    }

    const end = Date.now();
    const duration = end - start;
    
    totalLatency += duration;
    results.push({ attempt: i, status, duration });

    // In log chi tiết (Màu sắc cho dễ nhìn)
    const color = status.includes('Success') ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}Attempt #${i}: ${status} - Time: ${duration}ms\x1b[0m`);
    
    await new Promise(r => setTimeout(r, 100));
  }

  // --- TÍNH TOÁN ---
  const avgLatency = Math.round(totalLatency / totalAttempts);
  const successRate = ((successCount / totalAttempts) * 100).toFixed(2);

  console.log("\n===================================================");
  console.log("📊 KẾT QUẢ BENCHMARK RETRY (FINAL FIX)");
  console.log("===================================================");
  console.log(`🔹 Tổng số thao tác:            ${totalAttempts}`);
  console.log(`---------------------------------------------------`);
  console.log(`✅ Thành công (200 OK):         ${successCount}`);
  console.log(`❌ Thất bại (503/429/Error):    ${failCount}`);
  console.log(`---------------------------------------------------`);
  console.log(`📈 TỶ LỆ KHÔI PHỤC:             ${successRate}%`);
  console.log(`⏱️ LATENCY TRUNG BÌNH:          ${avgLatency}ms`);
  console.log("===================================================");
}

runBenchmark(100);