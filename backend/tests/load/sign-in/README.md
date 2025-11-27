# Sign-In Load Testing 🔐

Test khả năng chịu tải của chức năng đăng nhập.

## 📁 Files

```
sign-in/
├── prepare-test-data.ts   # Tạo test users
├── processor.js           # Artillery processor
├── signin-100.yml         # Test 100 sign-ins
├── signin-1000.yml        # Test 1000 sign-ins
├── view-results.ts        # Xem kết quả
└── test-data.json         # Generated data
```

## 🚀 Quick Start

### 1. Tạo test users
```bash
npm run load-test:signin:prepare          # 100 users (default)
npm run load-test:signin:prepare 500     # 500 users
```

**Tài khoản được tạo:**
- **Email:** `signin-test-1@example.com`, `signin-test-2@example.com`, ..., `signin-test-N@example.com`
- **Password:** `LoadTest123!` (tất cả accounts đều dùng chung password này)

### 2. Khởi động backend
```bash
npm run dev
```

### 3. Chạy load test
```bash
npm run load-test:signin:100    # 100 sign-ins trong 10s
npm run load-test:signin:1000   # 1000 sign-ins trong 60s
```

### 4. Xem kết quả
```bash
npm run load-test:signin:results
```

## 📊 Test Scenarios

### signin-100.yml
- Duration: 10 giây
- Rate: 10 requests/giây
- Total: ~100 sign-ins

### signin-1000.yml
- Phase 1: Ramp up 10→25 req/s (30s)
- Phase 2: Sustained 25 req/s (30s)
- Total: ~1000 sign-ins

## ⚙️ Customization

### Thay đổi số lượng users
```bash
npm run load-test:signin:prepare 1000
```

### Tùy chỉnh test scenario
Edit `signin-100.yml` hoặc `signin-1000.yml`:
```yaml
phases:
## 👤 Test Account Info

Tất cả test accounts đều sử dụng:
- **Password:** `LoadTest123!`
- **Email pattern:** `signin-test-{number}@example.com`

**Ví dụ:**
```
signin-test-1@example.com   / LoadTest123!
signin-test-2@example.com   / LoadTest123!
signin-test-3@example.com   / LoadTest123!
...
signin-test-100@example.com / LoadTest123!
```

**Đăng nhập thủ công để test:**
1. Mở: http://localhost:3000/sign-in
2. Nhập bất kỳ email nào: `signin-test-1@example.com`
3. Password: `LoadTest123!`

## 💡 Tips
- Artillery tự động random chọn user từ pool
- Test authentication performance và JWT generation
- Check throttling limits (xem 429 errors)
- Tất cả users dùng chung password để đơn giản hóa testing
## 💡 Tips
- Artillery tự động random chọn user từ pool
- Test authentication performance và JWT generation
- Check throttling limits (xem 429 errors)
