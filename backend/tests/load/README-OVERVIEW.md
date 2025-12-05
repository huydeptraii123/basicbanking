# Load Testing Transfer với Throttling 🧪

Hướng dẫn test so sánh hiệu suất chuyển tiền **có/không throttling** với tool tự động phân tích

---

## 🚦 Test Throttling Transfer

### 📊 1. Test KHÔNG có Throttling (Baseline)

Chạy test để xem server hoạt động như thế nào khi không có throttling:

```powershell
# Bước 1: Tắt throttling
Invoke-RestMethod -Uri "http://localhost:4000/api/transfer-throttle/toggle" `
  -Method Post -Body '{"enabled":false}' -ContentType "application/json"

# Bước 2: Chuẩn bị dữ liệu test (1000 giao dịch)
npm run load-test:prepare 1000

# Bước 3: Chạy load test TỰ ĐỘNG với parse kết quả
npm run load-test:auto:1000
```

**Kết quả mong đợi KHÔNG throttling:**
- Success rate: ~75% 
- Timeout: 400+ timeout
- Server error: Có lỗi 500
- Health: DEGRADED

### 📊 2. Test CÓ Throttling

Bật throttling và chạy lại test để so sánh:

```powershell
# Bước 1: Bật throttling
Invoke-RestMethod -Uri "http://localhost:4000/api/transfer-throttle/toggle" `
  -Method Post -Body '{"enabled":true}' -ContentType "application/json"

# Bước 2: Kiểm tra trạng thái
Invoke-RestMethod -Uri "http://localhost:4000/api/transfer-throttle/status"

# Bước 3: Chuẩn bị dữ liệu test
npm run load-test:prepare 1000

# Bước 4: Chạy load test TỰ ĐỘNG với parse kết quả  
npm run load-test:auto:1000
```

**Kết quả mong đợi CÓ throttling:**
- Success rate: Cao hơn cho request được xử lý
- Timeout: Ít hơn nhiều  
- Response 429: Có (throttling hoạt động)
- Server error: Ít hoặc không có
- Health: GOOD/EXCELLENT

### ⚙️ 3. Các lệnh Test tự động

**Test với các kích thước khác nhau:**
```powershell
# Test nhẹ (100 request)
npm run load-test:auto:100

# Test nặng (1000 request) 
npm run load-test:auto:1000

# Hoặc mặc định (1000 request)
npm run load-test:auto
```

### 🔧 4. Tùy chỉnh Throttling

**Kiểm tra trạng thái hiện tại:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/transfer-throttle/status"
```

**Thay đổi cấu hình throttling:**
```powershell
# Tăng giới hạn request/giây lên 15 và queue lên 150
Invoke-RestMethod -Uri "http://localhost:4000/api/transfer-throttle/config" `
  -Method Post `
  -Body '{"maxRequestsPerSecond":15,"maxQueueSize":150,"queueTimeoutMs":5000}' `
  -ContentType "application/json"
```

**Reset queue và thống kê:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/transfer-throttle/reset" -Method Post
```

### 📊 Cấu hình Test

- **Tài khoản test**: `loadtest@example.com` / `LoadTest123!`
- **Ngân hàng 1**: 100,000,000 VND
- **Ngân hàng 2**: 100,000,000 VND  
- **Giao dịch**: Random 10-100 VND, 2 chiều
- **Load**: 20 request/giây trong 60 giây

### 📈 So sánh Kết quả (Dự kiến)

| Chỉ số | KHÔNG Throttling | CÓ Throttling |
|--------|------------------|---------------|
| Success rate | ~75% (1269/1695) | ~90-95% |
| Timeout | 410+ | <50 |
| Response time | Không ổn định (8-6330ms) | Ổn định |
| Server error | 16+ lỗi 500 | Ít hoặc không |
| Health Status | DEGRADED | GOOD/EXCELLENT |

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
