# Load Testing Transfer với Throttling 🧪

Hướng dẫn test so sánh hiệu suất chuyển tiền **có/không throttling** với tool tự động phân tích

---

## 🚦 Test Throttling Transfer - Extreme Load (10000 requests)

Mục tiêu: Chứng minh throttling bảo vệ hệ thống khỏi sập dưới tải cao

### 📊 1. Test KHÔNG có Throttling (Hệ thống sập)

Chạy test với **50-100 req/giây** để làm sập hệ thống:

```powershell
# Bước 1: Tắt throttling
Invoke-RestMethod -Uri "http://localhost:4000/api/transfer-throttle/toggle" `
  -Method Post -Body '{"enabled":false}' -ContentType "application/json"

# Bước 2: Chuẩn bị dữ liệu test (10000 giao dịch)
npm run load-test:prepare 10000

# Bước 3: Chạy load test EXTREME (9000 requests trong 2 phút)
npm run load-test:auto:10000
```

**Kết quả mong đợi KHÔNG throttling:**
- Success rate: < 30%
- Timeout: > 5000
- Server error: Nhiều lỗi 500
- Response time: Tăng chóng mặt
- Health: CRITICAL
- **Hệ thống sập hoặc không phản hồi**

### 📊 2. Test CÓ Throttling (Hệ thống ổn định)

Bật throttling với config phù hợp để xử lý được tất cả requests:

```powershell
# Bước 1: Bật throttling với config cao
Invoke-RestMethod -Uri "http://localhost:4000/api/transfer-throttle/toggle" `
  -Method Post -Body '{"enabled":true}' -ContentType "application/json"

Invoke-RestMethod -Uri "http://localhost:4000/api/transfer-throttle/config" `
  -Method Post `
  -Body '{"maxRequestsPerSecond":50,"maxQueueSize":500,"queueTimeoutMs":3000}' `
  -ContentType "application/json"

# Bước 2: Kiểm tra config
Invoke-RestMethod -Uri "http://localhost:4000/api/transfer-throttle/status"

# Bước 3: Chuẩn bị dữ liệu test
npm run load-test:prepare 10000

# Bước 4: Chạy load test với throttling
npm run load-test:auto:10000
```

**Kết quả mong đợi CÓ throttling:**
- Success rate: > 80% (200 + một số 429)
- Timeout: < 500
- Server error: Rất ít hoặc không
- Response time: Ổn định
- Health: GOOD/EXCELLENT
- **Tất cả request được xử lý (200) hoặc throttled gracefully (429)**

### ⚙️ 3. Các lệnh Test tự động

**Test với các mức độ tải:**
```powershell
# Test nhẹ (100 request - 10 req/s)
npm run load-test:auto:100

# Test trung bình (1000 request - 20 req/s) 
npm run load-test:auto:1000

# Test cực nặng (9000 request - 50-100 req/s)
npm run load-test:auto:10000
```

### 🔧 4. Cấu hình Throttling theo tải

**Config cho test 1000 (20 req/s):**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/transfer-throttle/config" `
  -Method Post `
  -Body '{"maxRequestsPerSecond":20,"maxQueueSize":200,"queueTimeoutMs":3000}' `
  -ContentType "application/json"
```

**Config cho test 10000 (50-100 req/s):**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/transfer-throttle/config" `
  -Method Post `
  -Body '{"maxRequestsPerSecond":50,"maxQueueSize":500,"queueTimeoutMs":3000}' `
  -ContentType "application/json"
```

**Kiểm tra trạng thái:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/transfer-throttle/status"
```

**Reset queue:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/transfer-throttle/reset" -Method Post
```

### 📊 Cấu hình Test

**Test 100 (Nhẹ):**
- Load: 10 request/giây trong 10 giây
- Total: ~100 requests
- Mục đích: Test cơ bản

**Test 1000 (Trung bình):**
- Load: 20 request/giây trong 60 giây
- Total: ~1200 requests  
- Mục đích: Test production load bình thường

**Test 10000 (Cực nặng):**
- Phase 1: 50 request/giây trong 60 giây (~3000 requests)
- Phase 2: 100 request/giây trong 60 giây (~6000 requests)
- Total: ~9000 requests
- Mục đích: Chứng minh throttling bảo vệ hệ thống

### 📈 So sánh Kết quả (Test 10000)

| Chỉ số | KHÔNG Throttling | CÓ Throttling (50 RPS) |
|--------|------------------|------------------------|
| Success rate | < 30% | > 80% |
| Timeout | > 5000 | < 500 |
| Response time | Tăng vọt (>10s) | Ổn định (<5s) |
| Server error | Nhiều lỗi 500 | Rất ít |
| Health Status | CRITICAL (sập) | GOOD/EXCELLENT |
| Kết luận | **Hệ thống sập** | **Ổn định, xử lý hết** |

### 📊 Mã Response

- **200** - Thành công
- **429** - Request bị timeout trong queue
- **503** - Queue đã đầy
- **500** - Lỗi server (database lock, etc.)

---

## 🎯 Workflow Test đơn giản

**Quy trình test hoàn chỉnh:**
1. **Tắt throttling** → `npm run load-test:auto:1000` → Xem kết quả DEGRADED
2. **Bật throttling** → `npm run load-test:auto:1000` → So sánh cải thiện

## 📊 Tool Phân tích Tự động

Lệnh `npm run load-test:auto:1000` sẽ tự động:
- Chạy Artillery load test
- Parse kết quả thành bảng dễ đọc
- Hiển thị **REQUEST SUMMARY**, **RESPONSE TIME**, **VIRTUAL USERS**
- Đánh giá **HEALTH STATUS**: CRITICAL/DEGRADED/GOOD/EXCELLENT
- Lưu kết quả vào file timestamp

## ✅ Lợi ích Throttling

Throttling giúp:
✅ Giảm timeout và server error  
✅ Tăng success rate cho request được xử lý  
✅ Ổn định response time  
✅ Bảo vệ server khỏi quá tải  
✅ Chuyển từ DEGRADED → GOOD/EXCELLENT

---

**Test ngay để thấy sự khác biệt! 🚀**
