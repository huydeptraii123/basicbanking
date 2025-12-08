# Rate Limiting - Anti-Spam Protection 🛡️

Hướng dẫn test và so sánh hiệu quả của **Rate Limiting** trong việc chặn spam/abuse

---

## 🎯 Mục đích

**Rate Limiting** khác với **Throttling**:

| Feature | Throttling | Rate Limiting |
|---------|-----------|---------------|
| **Mục đích** | Bảo vệ server khỏi quá tải | Chặn user spam/abuse |
| **Cơ chế** | Queue system + xử lý tuần tự | Track requests + block user |
| **Response** | 429 (queue timeout), 503 (queue full) | 429 (rate limit exceeded) + block |
| **Use case** | High traffic, nhiều user cùng lúc | 1 user spam quá nhiều requests |

---

## 🚦 Test Rate Limiting

### 📊 1. Test KHÔNG có Rate Limiting (Baseline)

Tắt rate limiting để xem server xử lý spam như thế nào:

```powershell
# Bước 1: Tắt rate limiting
Invoke-RestMethod -Uri "http://localhost:4000/api/rate-limit/toggle" `
  -Method Post -Body '{"enabled":false}' -ContentType "application/json"

# Bước 2: Chuẩn bị dữ liệu test
cd backend
npm run rate-limit:prepare

# Bước 3: Chạy spam test TỰ ĐỘNG (100 requests)
npm run rate-limit:auto:100
```

**Kết quả mong đợi KHÔNG rate limiting:**
- Success rate: ~100% (mọi request đều pass)
- Response 429: 0 (không có blocking)
- Server: Xử lý tất cả spam requests
- Risk: User có thể spam không giới hạn

### 📊 2. Test CÓ Rate Limiting

Bật rate limiting và xem hiệu quả chặn spam:

```powershell
# Bước 1: Bật rate limiting
Invoke-RestMethod -Uri "http://localhost:4000/api/rate-limit/toggle" `
  -Method Post -Body '{"enabled":true}' -ContentType "application/json"

# Bước 2: Kiểm tra trạng thái
Invoke-RestMethod -Uri "http://localhost:4000/api/rate-limit/status"

# Bước 3: Chuẩn bị dữ liệu test
npm run rate-limit:prepare

# Bước 4: Chạy spam test TỰ ĐỘNG
npm run rate-limit:auto:100
```

**Kết quả mong đợi CÓ rate limiting:**
- Success rate: ~30% (chỉ 30 requests đầu được phép)
- Response 429: ~70% (70 requests bị chặn)
- Blocked duration: 5 phút
- Protection: ✅ User spam bị block

### ⚙️ 3. Các lệnh Test

**Test với các kịch bản khác nhau:**

```powershell
# Test spam nhẹ (100 requests trong 10 giây)
npm run rate-limit:auto:100

# Test spam nặng (500 requests trong 20 giây)
npm run rate-limit:auto:500

# Hoặc chạy manual
npm run rate-limit:test:100
npm run rate-limit:test:500
```

### 🔧 4. Quản lý Rate Limiting

**Kiểm tra trạng thái:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/rate-limit/status"
```

**Xem danh sách user bị block:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/rate-limit/blocked-users"
```

**Unblock một user:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/rate-limit/unblock/user:USER_ID" -Method Post
```

**Cấu hình rate limiting:**
```powershell
# Cho phép 50 requests/phút, block 10 phút
Invoke-RestMethod -Uri "http://localhost:4000/api/rate-limit/config" `
  -Method Post `
  -Body '{"maxRequests":50,"windowMs":60000,"blockDurationMs":600000}' `
  -ContentType "application/json"
```

**Reset tất cả logs:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/rate-limit/reset" -Method Post
```

---

## 📊 Cấu hình Test

### Spam Test Scenarios

**1. Spam 100 (spam-100.yml)**
- Duration: 10 giây
- Arrival rate: 10 requests/giây
- Total: ~100 requests
- Pattern: 1 user spamming rapidly

**2. Spam 500 (spam-500.yml)**
- Duration: 20 giây  
- Arrival rate: 25 requests/giây
- Total: ~500 requests
- Pattern: Aggressive spam attack

### Default Rate Limit Config

```typescript
{
  enabled: true,
  windowMs: 60000,           // 1 minute window
  maxRequests: 30,           // 30 requests per minute
  blockDurationMs: 300000,   // Block for 5 minutes
  trackByUser: true,         // Track by userId (JWT)
}
```

### Test Account

- **Email**: `ratelimit@test.com`
- **Password**: `RateLimit123!`
- **Bank 1**: 100,000,000 VND
- **Bank 2**: 100,000,000 VND

---

## 📈 So sánh Kết quả (Dự kiến)

### Test với 100 Spam Requests

| Chỉ số | KHÔNG Rate Limiting | CÓ Rate Limiting |
|--------|---------------------|------------------|
| Success (200) | ~100 (100%) | ~30 (30%) |
| Blocked (429) | 0 (0%) | ~70 (70%) |
| Server Load | Xử lý tất cả spam | Chặn spam sau ngưỡng |
| User Experience | Spam unlimited | Blocked after limit |
| Security | ❌ Vulnerable | ✅ Protected |

### Test với 500 Spam Requests

| Chỉ số | KHÔNG Rate Limiting | CÓ Rate Limiting |
|--------|---------------------|------------------|
| Success (200) | ~500 (100%) | ~30 (6%) |
| Blocked (429) | 0 (0%) | ~470 (94%) |
| Protection | None | Excellent |

---

## 📊 Response Codes

- **200** - Request thành công
- **429** - Rate limit exceeded (blocked)
- **500** - Server error (nếu có)

---

## 🎯 Workflow Test đơn giản

**Quy trình test hoàn chỉnh:**

1. **Tắt rate limiting** → `npm run rate-limit:auto:100` → Xem 100% success (vulnerable)
2. **Bật rate limiting** → `npm run rate-limit:auto:100` → Xem ~70% blocked (protected)

---

## 📊 Tool Phân tích Tự động

Lệnh `npm run rate-limit:auto:100` sẽ tự động:

- ✅ Chạy Artillery spam test
- ✅ Parse kết quả thành bảng dễ đọc
- ✅ Hiển thị **REQUEST SUMMARY**
- ✅ Hiển thị **RATE LIMIT EFFECTIVENESS**
- ✅ Hiển thị **RESPONSE TIME**
- ✅ Đánh giá **SYSTEM HEALTH**
- ✅ Lưu kết quả vào file timestamp

---

## ✅ Lợi ích Rate Limiting

Rate limiting giúp:

✅ **Chặn spam/abuse** từ single user  
✅ **Bảo vệ business logic** khỏi bị exploit  
✅ **Ngăn brute-force attacks**  
✅ **Giảm chi phí server** (không xử lý spam)  
✅ **Cải thiện trải nghiệm** cho user hợp lệ  
✅ **Tuân thủ best practices** API security

---

## 🔥 Use Cases Thực tế

**1. E-commerce Flash Sale**
- Giới hạn mỗi user chỉ đặt 5 đơn hàng/phút
- Chặn bot tự động mua hàng

**2. Banking Transfer**
- Giới hạn 30 giao dịch/phút
- Ngăn money laundering attempts

**3. API Public**
- Giới hạn 100 requests/giờ cho free tier
- Chặn abuse từ third-party apps

**4. Login/Authentication**
- Giới hạn 5 lần đăng nhập sai/10 phút
- Ngăn brute-force password

---

## ⚖️ So sánh với Throttling

### Khi nào dùng Rate Limiting?

- ✅ Phát hiện và chặn **spam từ 1 user**
- ✅ Bảo vệ **business endpoints** (payment, transfer, etc.)
- ✅ Enforce **usage quotas** (free tier vs paid)
- ✅ Ngăn **brute-force attacks**

### Khi nào dùng Throttling?

- ✅ **High traffic** từ nhiều user hợp lệ
- ✅ Bảo vệ server khỏi **overload**
- ✅ **Queue system** để xử lý tuần tự
- ✅ Maintain **system stability**

### Dùng cả hai?

**YES!** Rate limiting và throttling nên được dùng **song song**:

```typescript
// Order matters:
router.post('/transfer', 
  authMiddleware,              // 1. Authenticate
  rateLimiter.middleware(),    // 2. Block spam users
  transferThrottle,            // 3. Queue high traffic
  transferHandler              // 4. Process
);
```

---

## 🚀 Quick Start

```powershell
# 1. Khởi động backend
cd backend
npm run dev

# 2. Chuẩn bị test data
npm run rate-limit:prepare

# 3. Test KHÔNG có rate limiting
Invoke-RestMethod -Uri "http://localhost:4000/api/rate-limit/toggle" -Method Post -Body '{"enabled":false}' -ContentType "application/json"
npm run rate-limit:auto:100

# 4. Test CÓ rate limiting
Invoke-RestMethod -Uri "http://localhost:4000/api/rate-limit/toggle" -Method Post -Body '{"enabled":true}' -ContentType "application/json"
npm run rate-limit:auto:100

# 5. So sánh kết quả!
```

---

**Test ngay để thấy sự khác biệt! 🚀**

**Rate limiting = Spam protection ✅**
