# Load Testing - Transfer Funds 🚀

Load testing cho chức năng chuyển khoản giữa 2 bank accounts.

## 📋 Mục đích

Test khả năng chịu tải của backend server khi thực hiện:
- ✅ 100 giao dịch chuyển khoản trong 10 giây
- ✅ 1000 giao dịch chuyển khoản trong 60 giây
- ✅ Chuyển khoản qua lại giữa 2 bank accounts

## 🛠 Công cụ sử dụng

- **Artillery** - Load testing framework mạnh mẽ
- **Prisma** - Database ORM
- **TypeScript** - Scripting language

## 📁 Cấu trúc files

```
tests/load/
├── transfer-100.yml          # Config cho test 100 transfers
├── transfer-1000.yml         # Config cho test 1000 transfers
├── processor.js              # Artillery processor (load auth & bank IDs)
├── prepare-test-data.ts      # Script chuẩn bị test data
└── test-data.json           # Test data (generated - DO NOT commit)
```

## 🚀 Hướng dẫn sử dụng

### Bước 1: Cài đặt dependencies

```bash
cd backend
npm install
```

### Bước 2: Chuẩn bị test data

Script này sẽ:
- Tạo test user với email `loadtest@example.com`
- Tạo 2 bank accounts với balance **100,000,000 VND** mỗi account
- Generate JWT token cho authentication
- Lưu thông tin vào `test-data.json`

```bash
npm run load-test:prepare
```

**Output:**
```
✅ Test user created: loadtest@example.com
✅ Bank Account 1 created: xxx - Balance: 100000000
✅ Bank Account 2 created: yyy - Balance: 100000000
✅ Test data saved to: tests/load/test-data.json
```

### Bước 3: Khởi động backend server

```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:4000`

### Bước 4: Chạy load tests

#### Test 100 transfers (10 giây)
```bash
npm run load-test:100
```

**Config:**
- Duration: 10 seconds
- Arrival rate: 10 requests/second
- Total requests: ~100 transfers

#### Test 1000 transfers (60 giây)
```bash
npm run load-test:1000
```

**Config:**
- Phase 1 (30s): Ramp up từ 10 → 20 requests/second
- Phase 2 (30s): Sustained 20 requests/second
- Total requests: ~1000 transfers
- **Đặc biệt:** Mỗi virtual user sẽ chuyển khoản 2 chiều để giữ balance cân bằng

## 📊 Kết quả Load Test

Artillery sẽ hiển thị metrics:

```
Summary report:
  http.codes.200: ............................ 1000   (số requests thành công)
  http.request_rate: ......................... 17/sec (requests per second)
  http.requests: ............................. 1000   (tổng số requests)
  http.response_time:
    min: ..................................... 45     (latency nhỏ nhất)
    max: ..................................... 523    (latency lớn nhất)
    median: .................................. 89     (latency trung bình)
    p95: ..................................... 234    (95% requests < 234ms)
    p99: ..................................... 412    (99% requests < 412ms)
  vusers.created: ............................ 1000   (virtual users)
  vusers.completed: .......................... 1000   (hoàn thành)
```

## 🎯 Các scenarios test

### 1. Transfer-100 (`transfer-100.yml`)
- **Mục tiêu:** Test throughput cơ bản
- **Thời gian:** 10 giây
- **Load:** 10 requests/second
- **Tổng:** ~100 transfers
- **Use case:** Daily operations, normal traffic

### 2. Transfer-1000 (`transfer-1000.yml`)
- **Mục tiêu:** Test high volume với ramp-up
- **Thời gian:** 60 giây
- **Load:** Ramp 10→20 requests/second, sustain 20 req/s
- **Tổng:** ~1000 transfers
- **Đặc biệt:** Bidirectional transfers (A→B, B→A)
- **Use case:** Peak hours, promotional campaigns

## 🔧 Customization

### Thay đổi số lượng transfers

Chỉnh sửa file `.yml`:

```yaml
phases:
  - duration: 30        # Thời gian (giây)
    arrivalRate: 20     # Số requests/giây
    rampTo: 50          # Tăng dần lên 50 req/s
```

### Thay đổi số tiền transfer

Trong `processor.js` hoặc `.yml`:

```yaml
amount: "{{ $randomNumber(10, 100) }}"  # Random 10-100 VND
amount: "{{ $randomNumber(1000, 10000) }}"  # Random 1k-10k VND
```

### Thêm nhiều bank accounts

Chỉnh sửa `prepare-test-data.ts` để tạo thêm banks, sau đó update `processor.js` để random chọn banks.

## 📈 Monitoring

Trong quá trình test, bạn có thể monitor:

1. **Backend logs** - Xem requests đang được xử lý
2. **Database** - Check số lượng transactions trong DB
3. **System resources** - CPU, Memory, Network

```bash
# Check số transactions trong DB
npx prisma studio

# Hoặc query trực tiếp
SELECT COUNT(*) FROM "Transaction" WHERE name LIKE '%Load Test%';
```

## ⚠️ Lưu ý

1. **Không commit `test-data.json`** - File này chứa auth token
2. **Chạy test trên môi trường development** - Không test trên production
3. **Balance check** - Đảm bảo 2 accounts có đủ balance trước khi test
4. **Database cleanup** - Sau khi test, có thể xóa test transactions:

```sql
DELETE FROM "Transaction" WHERE name LIKE '%Load Test%';
DELETE FROM "Bank" WHERE userId = 'TEST_USER_ID';
DELETE FROM "User" WHERE email = 'loadtest@example.com';
```

## 🐛 Troubleshooting

### Lỗi: "test-data.json not found"
```bash
npm run load-test:prepare
```

### Lỗi: "Insufficient funds"
- Check balance trong database
- Chạy lại prepare script để reset balance

### Lỗi: "401 Unauthorized"
- Token có thể đã expired (24h)
- Chạy lại prepare script để generate token mới

### Test bị fail với 500 errors
- Check backend logs
- Verify database connection
- Ensure backend server đang chạy

## 📚 Tài liệu tham khảo

- [Artillery Documentation](https://www.artillery.io/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Load Testing Best Practices](https://www.artillery.io/docs/guides/guides/load-testing-best-practices)

---

**Happy Load Testing! 🚀💰**
