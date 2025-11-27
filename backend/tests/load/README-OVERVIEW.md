# Load Testing 🧪

Hệ thống load testing cho Banking Application với 2 loại tests chính.

## 📁 Cấu trúc

```
tests/load/
├── sign-in/              # 🔐 Sign-In load tests
│   ├── prepare-test-data.ts
│   ├── processor.js
│   ├── signin-100.yml
│   ├── signin-1000.yml
│   ├── view-results.ts
│   └── README.md
│
├── transfer/             # 💸 Transfer load tests
│   ├── prepare-test-data.ts
│   ├── processor.js
│   ├── transfer-100.yml
│   ├── transfer-1000.yml
│   ├── view-test-results.ts
│   └── README.md
│
├── README-OVERVIEW.md    # Overview (this file)
└── LOAD-TESTING-TUTORIAL.md  # Detailed tutorial
```

---

## 🔐 Sign-In Load Testing

Test khả năng chịu tải khi **nhiều users đăng nhập đồng thời**.

### Mục đích
- Test authentication performance
- Test JWT token generation
- Kiểm tra rate limiting/throttling
- Test concurrent logins

### Cách sử dụng

```bash
# 1. Tạo test users (100 users mặc định)
npm run load-test:signin:prepare 100

# 2. Khởi động backend
npm run dev

# 3. Chạy tests
npm run load-test:signin:100      # 100 sign-ins trong 10s
npm run load-test:signin:1000     # 1000 sign-ins trong 60s

# 4. Xem kết quả
npm run load-test:signin:results
```

### Tài khoản test
- **Emails:** `signin-test-1@example.com`, `signin-test-2@example.com`, ..., `signin-test-N@example.com`
- **Password:** `LoadTest123!` (chung cho tất cả)
- **Số lượng:** Tùy chỉnh khi chạy prepare (default: 100)

### Đặc điểm
- ✅ Tạo nhiều users để simulate real-world scenario
- ✅ Random chọn user để login
- ✅ Test bcrypt password hashing performance
- ✅ Test database query performance

[Chi tiết →](./sign-in/README.md)

---

## 💸 Transfer Load Testing

Test khả năng chịu tải của **chức năng chuyển khoản**.

### Mục đích
- Test transaction throughput
- Test database concurrent writes
- Kiểm tra balance integrity
- Test complex database transactions

### Cách sử dụng

```bash
# 1. Tạo test accounts (1 user với 2 banks)
npm run load-test:prepare         # Mặc định: 100 transactions
npm run load-test:prepare 500     # Tùy chỉnh: chuẩn bị cho 500 transactions
npm run load-test:prepare 1000    # Tùy chỉnh: chuẩn bị cho 1000 transactions

# 2. Khởi động backend
npm run dev

# 3. Chạy tests
npm run load-test:100             # 100 transfers trong 10s
npm run load-test:1000            # 1000 transfers trong 60s

# 4. Xem kết quả
npm run load-test:results
```

### Tài khoản test
- **Email:** `loadtest@example.com`
- **Password:** `LoadTest123!`
- **Bank 1:** 100,000,000 VND
- **Bank 2:** 100,000,000 VND

### Đặc điểm
- ✅ Test với 2 bank accounts chuyển khoản qua lại
- ✅ Tùy chỉnh số lượng transactions (mặc định: 100)
- ✅ Tự động tính toán balance phù hợp với số lượng test
- ✅ Random sender/receiver và amount
- ✅ Test database ACID transactions
- ✅ Monitor balance consistency

[Chi tiết →](./transfer/README.md)

---

## 🔄 So sánh Sign-In vs Transfer

| Tiêu chí | Sign-In | Transfer |
|----------|---------|----------|
| **Mục đích** | Test authentication | Test transactions |
| **Test accounts** | Nhiều users (100+) | 1 user với 2 banks |
| **Prepare command** | `load-test:signin:prepare [N]` | `load-test:prepare [N]` |
| **Số lượng accounts** | Tùy chỉnh (default: 100) | Fixed: 1 user, 2 banks |
| **Tùy chỉnh** | Số lượng users | Số lượng transactions |
| **Test command** | `load-test:signin:100/1000` | `load-test:100/1000` |
| **Results command** | `load-test:signin:results` | `load-test:results` |
| **Password** | `LoadTest123!` (chung) | `LoadTest123!` |
| **Use case** | Peak login traffic | Payment processing |
| **Database focus** | User queries | Transactions, balance updates |
| **Complexity** | Simple (1 table) | Complex (3 tables + ACID) |

---

## 📊 Available Commands

### Sign-In Tests
| Command | Description |
|---------|-------------|
| `npm run load-test:signin:prepare [number]` | Tạo N test users (default: 100) |
| `npm run load-test:signin:100` | 100 sign-ins trong 10s |
| `npm run load-test:signin:1000` | 1000 sign-ins trong 60s |
| `npm run load-test:signin:results` | Xem thông tin test users |

### Transfer Tests
| Command | Description |
|---------|-------------|
| `npm run load-test:prepare [number]` | Tạo 1 user + 2 bank accounts (default: 100 trans) |
| `npm run load-test:100` | 100 transfers trong 10s |
| `npm run load-test:1000` | 1000 transfers trong 60s |
| `npm run load-test:results` | Xem kết quả và balance |

---

## 🎯 Khi nào dùng test nào?

### Dùng Sign-In Load Test khi:
- ✅ Test authentication system
- ✅ Test rate limiting cho login endpoint
- ✅ Simulate nhiều users login cùng lúc (rush hour)
- ✅ Test password hashing performance
- ✅ Kiểm tra session/token generation

### Dùng Transfer Load Test khi:
- ✅ Test payment processing
- ✅ Test database transaction performance
- ✅ Kiểm tra data integrity
- ✅ Test concurrent writes vào database
- ✅ Monitor balance consistency

---

## 📚 Documentation

- **[LOAD-TESTING-TUTORIAL.md](./LOAD-TESTING-TUTORIAL.md)** - Tutorial đầy đủ về load testing
- **[sign-in/README.md](./sign-in/README.md)** - Sign-in test specifics
- **[transfer/README.md](./transfer/README.md)** - Transfer test specifics

## 🎯 Use Cases

### 1. Test Authentication Performance
```bash
npm run load-test:signin:prepare 500
npm run load-test:signin:1000
```

### 2. Test Transaction Throughput
```bash
npm run load-test:prepare 1000
npm run load-test:1000
```

### 3. Find Breaking Points
Tăng dần `arrivalRate` trong file `.yml` để tìm điểm hệ thống bắt đầu fail.

## 📈 Metrics to Watch

- **Response Time**: < 200ms (good), 200-500ms (warning), > 500ms (poor)
- **Success Rate**: > 95% (good), 80-95% (warning), < 80% (poor)
- **Throughput**: requests/second
- **Error Rate**: timeouts, 500 errors, 429 throttling

## 🔧 Troubleshooting

**Problem: ECONNREFUSED**
- Backend chưa chạy
- Solution: `npm run dev`

**Problem: 403 Forbidden** (Transfer)
- Token expired
- Solution: `npm run load-test:prepare`

**Problem: No test users** (Sign-in)
- Chưa tạo users
- Solution: `npm run load-test:signin:prepare`

**Problem: High timeout rate**
- Load quá cao
- Solution: Giảm `arrivalRate` trong file `.yml`

## 💡 Best Practices

1. ✅ Luôn test trên môi trường development
2. ✅ Bắt đầu với load nhỏ, tăng dần
3. ✅ Monitor system resources (CPU, RAM, DB)
4. ✅ Clean up test data sau khi test
5. ❌ Không test trên production

## 🧹 Cleanup

### Xóa Sign-in test users
```sql
DELETE FROM "User" WHERE email LIKE 'signin-test-%';
```

### Xóa Transfer test data
```sql
DELETE FROM "Transaction" WHERE name LIKE '%Load Test%';
DELETE FROM "Bank" WHERE userId = (SELECT id FROM "User" WHERE email = 'loadtest@example.com');
DELETE FROM "User" WHERE email = 'loadtest@example.com';
```

Hoặc đơn giản chạy lại prepare để reset.

---

**Happy Load Testing! 🚀**
