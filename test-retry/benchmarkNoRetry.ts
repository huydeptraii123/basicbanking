// benchmark-no-retry.ts

async function runBenchmarkWithoutRetry(totalAttempts: number) {
  // --- CONFIG ---
  // Thay URL này bằng API Chaos Monkey của bạn
  const URL = 'http://localhost:4000/api/banks/user/dcbee799-dd68-400d-b781-7f4de975dbf3'; 
  
  let successCount = 0;
  let failCount = 0;
  let totalLatency = 0;

  console.log(`🚀 Starting Benchmark [NO RETRY] - ${totalAttempts} attempts...`);

  for (let i = 1; i <= totalAttempts; i++) {
    const start = Date.now();
    
    try {
      // Gọi fetch trực tiếp, không qua Retry Wrapper
      const res = await fetch(URL);

      // QUAN TRỌNG: Với No-Retry, status != 200 (vd 429, 503) là Fail ngay lập tức
      if (res.ok) {
        successCount++;
      } else {
        failCount++; 
      }
    } catch (error) {
      failCount++; // Lỗi mạng (Network Error)
    }

    const end = Date.now();
    const duration = end - start;
    totalLatency += duration;

    // Delay nhẹ 50ms để không spam quá gắt
    await new Promise(r => setTimeout(r, 50));
  }

  // --- TÍNH TOÁN ---
  const avgLatency = Math.round(totalLatency / totalAttempts);
  const successRate = ((successCount / totalAttempts) * 100).toFixed(2);

  // --- IN KẾT QUẢ (FORMAT GIỐNG Y HỆT ẢNH) ---
  console.log("\n===================================================");
  // Màu Cyan đậm cho tiêu đề
  console.log("\x1b[36m📊 KẾT QUẢ BENCHMARK WITHOUT RETRY\x1b[0m"); 
  console.log("===================================================");
  
  console.log(`🔹 Tổng số thao tác (Attempts): ${totalAttempts}`);
  // Đã bỏ dòng "Giả lập lỗi..." như bạn yêu cầu
  
  console.log("---------------------------------------------------");
  // Màu Xanh lá cho Success
  console.log(`\x1b[32m✅ Thành công (Success):        ${successCount}\x1b[0m`);
  // Màu Đỏ cho Failure
  console.log(`\x1b[31m❌ Thất bại (Final Failure):    ${failCount}\x1b[0m`);
  
  console.log("---------------------------------------------------");
  // Icon biểu đồ + đồng hồ
  console.log(`📈 TỶ LỆ KHÔI PHỤC (SUCCESS RATE): ${successRate}%`);
  console.log(`⏱️ THỜI GIAN XỬ LÝ TB (LATENCY):   ${avgLatency}ms`);
  console.log("===================================================\n");
}

// Chạy 50 lần
runBenchmarkWithoutRetry(100);