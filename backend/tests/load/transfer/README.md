# Transfer Load Testing 💸

Test khả năng chịu tải của chức năng chuyển khoản.

## 📁 Files

```
transfer/
├── prepare-test-data.ts   # Tạo 2 bank accounts
├── processor.js           # Artillery processor  
├── transfer-100.yml       # Test 100 transfers
├── transfer-1000.yml      # Test 1000 transfers
├── view-test-results.ts   # Xem kết quả
└── test-data.json         # Generated data
```

## 🚀 Quick Start

### 1. Chuẩn bị test data
```bash
cd backend
npm run load-test:prepare          # Mặc định: 100 transactions
npm run load-test:prepare 500      # Tùy chỉnh: 500 transactions
npm run load-test:prepare 1000     # Tùy chỉnh: 1000 transactions
```
Tạo user `loadtest@example.com` với 2 bank accounts. 

**Balance tự động:**
- Script tự động tính balance cần thiết dựa trên số lượng transactions
- Công thức: `số_transactions × 50 VND × 2` (hoặc tối thiểu 100 triệu VND)
- VD: 500 transactions → 100 triệu VND (min)
- VD: 10000 transactions → 1 tỷ VND

### 2. Khởi động backend
```bash
npm run dev
```

### 3. Chạy load test
```bash
npm run load-test:100     # 100 transfers trong 10s
npm run load-test:1000    # 1000 transfers trong 60s
```

### 4. Xem kết quả
```bash
npm run load-test:results
```

## 📊 Test Scenarios

### transfer-100.yml
- Duration: 10 giây
- Rate: 10 requests/giây
- Total: ~100 transfers
- Transfer amount: Random 10-100 VND

### transfer-1000.yml
- Phase 1: Ramp up 10→20 req/s (30s)
- Phase 2: Sustained 20 req/s (30s)
- Total: ~1000 transfers
- Bidirectional: A→B và B→A để balance cân bằng

## 💳 Test Account

**Tài khoản được tạo:**
- **Email:** `loadtest@example.com`
- **Password:** `LoadTest123!`
- **Bank Account 1:** 100,000,000 VND
- **Bank Account 2:** 100,000,000 VND

**Đăng nhập để xem transactions:**
1. URL: http://localhost:3000/sign-in
2. Email: `loadtest@example.com`
3. Password: `LoadTest123!`
4. Vào **Transaction History** để xem tất cả giao dịch

**Hoặc dùng Prisma Studio:**
```bash
npx prisma studio
```
Xem trực tiếp trong database: bảng `Transaction`, `Bank`, `User`

## ⚙️ Customization

### Thay đổi số tiền transfer
Edit yml file:
```yaml
json:
  amount: "{{ $randomNumber(1000, 5000) }}"  # 1k-5k VND
```

### Tùy chỉnh test load
```yaml
phases:
  - duration: 20
    arrivalRate: 15
```

### Thay đổi balance ban đầu
Edit `prepare-test-data.ts`:
```typescript
const initialBalance = 500000000; // 500 triệu VND
```

## 💡 Tips
- Processor tự động random chọn sender/receiver giữa 2 banks
- Test database transactions và balance updates
- Monitor database performance (SQLite có giới hạn concurrent writes)
- Artillery load config từ: `tests/load/transfer/transfer-*.yml`
- Test data lưu tại: `tests/load/transfer/test-data.json`
- 2 banks chuyển khoản qua lại để giữ balance cân bằng

## 📈 Expected Performance

### Good Performance
- Response time median: < 100ms
- P95: < 200ms
- Success rate: > 95%

### Warning Signs
- Response time median: 100-500ms
- P95: 200-1000ms
- Success rate: 80-95%

### Poor Performance
- Response time median: > 500ms
- P95: > 1000ms
- Success rate: < 80%
- Timeout errors: > 10%

## 🧹 Cleanup

Reset test data (xóa và tạo lại):
```bash
npm run load-test:prepare
```

Hoặc xóa thủ công trong database:
```sql
DELETE FROM "Transaction" WHERE name LIKE '%Load Test%';
DELETE FROM "Bank" WHERE userId = (SELECT id FROM "User" WHERE email = 'loadtest@example.com');
DELETE FROM "User" WHERE email = 'loadtest@example.com';
```
