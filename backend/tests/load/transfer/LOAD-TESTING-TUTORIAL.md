# 🚀 Load Testing Tutorial - Banking Transfer System

Hướng dẫn chi tiết cách sử dụng và cấu hình load testing cho chức năng chuyển khoản.

---

## 📋 Mục lục

1. [Giới thiệu](#giới-thiệu)
2. [Cài đặt ban đầu](#cài-đặt-ban-đầu)
3. [Cách sử dụng cơ bản](#cách-sử-dụng-cơ-bản)
4. [Cấu hình Test Scenarios](#cấu-hình-test-scenarios)
5. [Tùy chỉnh nâng cao](#tùy-chỉnh-nâng-cao)
6. [Đọc và phân tích kết quả](#đọc-và-phân-tích-kết-quả)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Giới thiệu

Load testing system này giúp bạn:
- ✅ Test khả năng chịu tải của backend server
- ✅ Đo lường performance của chức năng chuyển khoản
- ✅ Phát hiện bottlenecks và giới hạn hệ thống
- ✅ Validate database transaction integrity

### Công cụ sử dụng
- **Artillery** - Load testing framework
- **Prisma** - Database ORM
- **TypeScript** - Scripting

---

## 🛠 Cài đặt ban đầu

### Bước 1: Cài đặt dependencies

```bash
cd backend
npm install
```

Dependencies sẽ bao gồm:
- `artillery` - Load testing tool
- `ts-node` - TypeScript execution
- Các dependencies khác trong package.json

### Bước 2: Kiểm tra cấu trúc files

```
backend/tests/load/
├── transfer-100.yml          # Test 100 transfers
├── transfer-1000.yml         # Test 1000 transfers
├── processor.js              # Artillery processor
├── prepare-test-data.ts      # Script setup test data
├── view-test-results.ts      # Script xem kết quả
├── test-data.json           # Generated test data (auto)
└── README.md                # Quick reference
```

---

## 🚀 Cách sử dụng cơ bản

### 1. Chuẩn bị Test Data

**Chạy script để tạo test user và 2 bank accounts:**

```bash
npm run load-test:prepare
```

**Output:**
```
✅ Test user created: loadtest@example.com
✅ Bank Account 1 created: xxx - Balance: 100,000,000 VND
✅ Bank Account 2 created: yyy - Balance: 100,000,000 VND
✅ Test data saved to: test-data.json
```

**File `test-data.json` được tạo ra:**
```json
{
  "authToken": "token=eyJhbGc...",
  "user1BankId": "bank-id-1",
  "user2BankId": "bank-id-2",
  "userId": "user-id",
  "email": "loadtest@example.com"
}
```

### 2. Khởi động Backend Server

**Terminal riêng để chạy backend:**
```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:4000`

### 3. Chạy Load Tests

**Test 100 transfers (10 giây):**
```bash
npm run load-test:100
```

**Test 1000 transfers (60 giây):**
```bash
npm run load-test:1000
```

### 4. Xem kết quả

**Xem tổng hợp kết quả:**
```bash
npm run load-test:results
```

**Hoặc mở Prisma Studio:**
```bash
npx prisma studio
```

---

## ⚙️ Cấu hình Test Scenarios

### Config File Structure (YAML)

Mỗi test scenario có 2 phần chính: **Config** và **Scenarios**

```yaml
config:
  target: "http://localhost:4000"  # Backend URL
  phases:                          # Test phases
    - duration: 10                 # Thời gian (giây)
      arrivalRate: 10              # Requests/giây
      name: "Phase name"
  processor: "./processor.js"      # Custom logic
  variables:                       # Biến global
    authToken: ""
    senderBankId: ""
    receiverBankId: ""

scenarios:
  - name: "Scenario name"
    flow:                          # Test steps
      - function: "setAuthData"
      - post:
          url: "/api/transactions/create"
          # ... request config
```

---

## 🎨 Tùy chỉnh Test Scenarios

### 1. Thay đổi số lượng requests

#### Test 500 transfers trong 30 giây

**Tạo file mới: `transfer-500.yml`**

```yaml
config:
  target: "http://localhost:4000"
  phases:
    - duration: 30
      arrivalRate: 17              # 17 req/s × 30s ≈ 500
      name: "500 transfers in 30 seconds"
  processor: "./processor.js"
  variables:
    authToken: ""
    senderBankId: ""
    receiverBankId: ""

scenarios:
  - name: "Medium load transfer test"
    flow:
      - function: "setAuthData"
      - post:
          url: "/api/transactions/create"
          headers:
            Content-Type: "application/json"
            Cookie: "{{ authToken }}"
          json:
            senderBankId: "{{ senderBankId }}"
            receiverBankId: "{{ receiverBankId }}"
            amount: "{{ $randomNumber(10, 100) }}"
            name: "Load Test Transfer"
            channel: "online"
            category: "Transfer"
          expect:
            - statusCode: 200
```

**Thêm script vào `package.json`:**
```json
"load-test:500": "artillery run tests/load/transfer-500.yml"
```

### 2. Ramp-up Load (tăng dần)

**Tăng dần từ 5 → 20 requests/second:**

```yaml
phases:
  - duration: 20
    arrivalRate: 5
    rampTo: 20
    name: "Ramp up from 5 to 20 req/s"
```

### 3. Sustained Load (giữ ổn định)

**Giữ 15 requests/second trong 2 phút:**

```yaml
phases:
  - duration: 120
    arrivalRate: 15
    name: "Sustained 15 req/s for 2 minutes"
```

### 4. Multi-phase Test

**Kết hợp nhiều phases:**

```yaml
phases:
  # Warm-up
  - duration: 10
    arrivalRate: 5
    name: "Warm-up phase"
  
  # Ramp up
  - duration: 30
    arrivalRate: 10
    rampTo: 25
    name: "Ramp up phase"
  
  # Peak load
  - duration: 60
    arrivalRate: 25
    name: "Peak load phase"
  
  # Cool down
  - duration: 20
    arrivalRate: 25
    rampTo: 5
    name: "Cool down phase"
```

### 5. Thay đổi số tiền transfer

**Random từ 1,000 - 50,000 VND:**

```yaml
json:
  amount: "{{ $randomNumber(1000, 50000) }}"
```

**Fixed amount (10,000 VND):**

```yaml
json:
  amount: 10000
```

### 6. Thêm think time (delay giữa requests)

```yaml
flow:
  - post:
      url: "/api/transactions/create"
      # ... config
  
  - think: 2  # Đợi 2 giây trước request tiếp theo
```

### 7. Test với nhiều users

**Tạo nhiều test users:**

Chỉnh sửa `prepare-test-data.ts`:

```typescript
// Tạo 10 users, mỗi user có 2 banks
for (let i = 1; i <= 10; i++) {
  const user = await prisma.user.create({
    data: {
      email: `loadtest${i}@example.com`,
      password: hashedPassword,
      // ...
    }
  });
  
  // Tạo 2 banks cho mỗi user
  // ...
}
```

Sau đó update `processor.js` để random chọn user.

---

## 📊 Đọc và phân tích kết quả

### Artillery Output Metrics

```
Summary report @ 15:03:26(+0700)
--------------------------------

http.codes.200: ................................ 100      ✅ Requests thành công
http.codes.500: ................................ 5        ❌ Server errors
errors.ETIMEDOUT: .............................. 10       ⏱️ Timeout errors

http.request_rate: ............................. 10/sec   📈 Throughput
http.requests: ................................. 100      📊 Total requests

http.response_time:
  min: ......................................... 9        ⚡ Fastest response
  max: ......................................... 259      🐌 Slowest response
  median: ...................................... 19.9     📍 Trung bình
  p95: ......................................... 32.1     📊 95% < 32ms
  p99: ......................................... 232.8    📊 99% < 232ms

vusers.completed: .............................. 100      ✅ Virtual users hoàn thành
vusers.failed: ................................. 0        ❌ Virtual users thất bại
```

### Phân tích Performance

#### ✅ Good Performance
```
Response time median: < 100ms
P95: < 200ms
Success rate: > 95%
```

#### ⚠️ Warning Signs
```
Response time median: 100-500ms
P95: 200-1000ms
Success rate: 80-95%
```

#### ❌ Poor Performance
```
Response time median: > 500ms
P95: > 1000ms
Success rate: < 80%
Timeout errors: > 10%
```

### View Results Script

```bash
npm run load-test:results
```

**Output:**
```
👤 Test User Information:
  Email: loadtest@example.com
  Password: LoadTest123!

💳 Bank Accounts:
  Bank 1: Balance = 99,999,596 VND
  Bank 2: Balance = 100,000,404 VND

📝 Transaction History:
  Total transactions: 100
  Bank 1 → Bank 2: 50 transfers
  Bank 2 → Bank 1: 50 transfers
```

---

## 🔧 Tùy chỉnh nâng cao

### 1. Custom Processor Functions

**Thêm logic vào `processor.js`:**

```javascript
// Validate response
function validateTransfer(requestParams, response, context, ee, next) {
  if (response.body.transaction) {
    const balance = response.body.sender.balance;
    console.log(`Transfer OK, new balance: ${balance}`);
  }
  return next();
}

// Custom metrics
function trackCustomMetrics(requestParams, response, context, ee, next) {
  const transferAmount = requestParams.json.amount;
  ee.emit('customStat', 'transfer_amount', transferAmount);
  return next();
}

module.exports = {
  setAuthData,
  validateTransfer,
  trackCustomMetrics
};
```

**Sử dụng trong YAML:**

```yaml
flow:
  - post:
      url: "/api/transactions/create"
      # ... config
      afterResponse: "validateTransfer"
```

### 2. Conditional Flow

**Transfer chỉ khi balance > threshold:**

```yaml
flow:
  - function: "checkBalance"
  
  - post:
      url: "/api/transactions/create"
      ifTrue: "hasEnoughBalance"  # Chỉ chạy nếu condition = true
      # ... config
```

### 3. Capture và reuse values

```yaml
- post:
    url: "/api/transactions/create"
    capture:
      - json: "$.transaction.id"
        as: "transactionId"
      - json: "$.sender.balance"
        as: "senderBalance"

- log: "Transaction {{ transactionId }} completed, balance: {{ senderBalance }}"
```

### 4. Test với environment variables

**Tạo file `test.env`:**

```bash
BACKEND_URL=http://localhost:4000
TEST_DURATION=60
ARRIVAL_RATE=20
```

**Load trong config:**

```yaml
config:
  target: "{{ $env.BACKEND_URL }}"
  phases:
    - duration: "{{ $env.TEST_DURATION }}"
      arrivalRate: "{{ $env.ARRIVAL_RATE }}"
```

**Chạy với env:**

```bash
export $(cat test.env | xargs) && npm run load-test:100
```

### 5. Parallel Scenarios

**Test nhiều scenarios đồng thời:**

```yaml
scenarios:
  - name: "Small transfers"
    weight: 70  # 70% traffic
    flow:
      - post:
          json:
            amount: "{{ $randomNumber(10, 100) }}"
  
  - name: "Large transfers"
    weight: 30  # 30% traffic
    flow:
      - post:
          json:
            amount: "{{ $randomNumber(1000, 10000) }}"
```

---

## 🎯 Test Scenarios thực tế

### Scenario 1: Normal Daily Traffic

```yaml
# File: daily-normal.yml
config:
  target: "http://localhost:4000"
  phases:
    - duration: 300  # 5 phút
      arrivalRate: 5
      name: "Normal business hours"
```

### Scenario 2: Peak Hours

```yaml
# File: peak-hours.yml
config:
  phases:
    - duration: 10
      arrivalRate: 5
      name: "Start of peak"
    - duration: 60
      arrivalRate: 20
      name: "Peak traffic"
    - duration: 10
      arrivalRate: 5
      name: "End of peak"
```

### Scenario 3: Stress Test

```yaml
# File: stress-test.yml
config:
  phases:
    - duration: 30
      arrivalRate: 50
      name: "Stress test - find breaking point"
```

### Scenario 4: Spike Test

```yaml
# File: spike-test.yml
config:
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Normal load"
    - duration: 10
      arrivalRate: 50
      name: "Sudden spike"
    - duration: 60
      arrivalRate: 5
      name: "Recovery"
```

---

## 🔍 Troubleshooting

### ❌ Problem: test-data.json not found

**Solution:**
```bash
npm run load-test:prepare
```

### ❌ Problem: ECONNREFUSED errors

**Причины:**
- Backend server chưa chạy
- Sai port/URL

**Solution:**
```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Run test
npm run load-test:100
```

### ❌ Problem: 403 Forbidden errors

**Nguyên nhân:** Auth token expired hoặc sai format

**Solution:**
```bash
# Regenerate token
npm run load-test:prepare
```

### ❌ Problem: Insufficient funds

**Nguyên nhân:** Balance đã cạn sau nhiều tests

**Solution:**
```bash
# Reset test data với balance mới
npm run load-test:prepare
```

### ❌ Problem: High timeout rate (ETIMEDOUT)

**Nguyên nhân:**
- Load quá cao cho server
- Database connection pool quá nhỏ
- Slow queries

**Solution:**
1. Giảm `arrivalRate`
2. Tăng database connection pool
3. Optimize queries
4. Add indexes

### ❌ Problem: HTTP 500 errors

**Nguyên nhân:** Backend application errors

**Solution:**
```bash
# Check backend logs
# Fix application errors
# Test lại
```

---

## 📈 Best Practices

### 1. Test Strategy

✅ **DO:**
- Bắt đầu với load nhỏ, tăng dần
- Test trong môi trường giống production
- Chạy test nhiều lần để có kết quả ổn định
- Monitor system resources (CPU, Memory, DB)

❌ **DON'T:**
- Test trên production
- Test với load quá lớn ngay từ đầu
- Ignore errors và timeouts
- Test khi không có baseline

### 2. Test Planning

1. **Baseline test** - Xác định performance hiện tại
2. **Load test** - Test với expected traffic
3. **Stress test** - Tìm breaking point
4. **Spike test** - Test với traffic đột biến
5. **Endurance test** - Test trong thời gian dài

### 3. Cleanup After Tests

```sql
-- Xóa test transactions
DELETE FROM "Transaction" WHERE name LIKE '%Load Test%';

-- Xóa test banks
DELETE FROM "Bank" WHERE userId IN (
  SELECT id FROM "User" WHERE email LIKE 'loadtest%'
);

-- Xóa test users
DELETE FROM "User" WHERE email LIKE 'loadtest%';
```

Hoặc chạy lại prepare để reset:
```bash
npm run load-test:prepare
```

---

## 📚 Tài liệu tham khảo

### Artillery Documentation
- [Official Docs](https://www.artillery.io/docs)
- [Test Script Reference](https://www.artillery.io/docs/guides/guides/test-script-reference)
- [HTTP Engine](https://www.artillery.io/docs/guides/plugins/plugin-http)

### Examples
```bash
# Quick test
artillery quick --count 10 --num 100 http://localhost:4000/health

# Run with custom config
artillery run -e production tests/load/transfer-100.yml

# Generate report
artillery run -o report.json tests/load/transfer-100.yml
artillery report report.json
```

---

## 🎓 Ví dụ Custom Scenarios

### Test với nhiều bank accounts

**File: `multi-bank-test.yml`**

```yaml
config:
  target: "http://localhost:4000"
  phases:
    - duration: 60
      arrivalRate: 10
  processor: "./multi-bank-processor.js"

scenarios:
  - name: "Random bank transfers"
    flow:
      - function: "selectRandomBanks"
      - post:
          url: "/api/transactions/create"
          json:
            senderBankId: "{{ senderBankId }}"
            receiverBankId: "{{ receiverBankId }}"
            amount: "{{ $randomNumber(100, 1000) }}"
```

**File: `multi-bank-processor.js`**

```javascript
const banks = [
  { id: 'bank-1', userId: 'user-1' },
  { id: 'bank-2', userId: 'user-1' },
  { id: 'bank-3', userId: 'user-2' },
  { id: 'bank-4', userId: 'user-2' }
];

function selectRandomBanks(context, events, done) {
  const sender = banks[Math.floor(Math.random() * banks.length)];
  let receiver;
  do {
    receiver = banks[Math.floor(Math.random() * banks.length)];
  } while (receiver.id === sender.id);
  
  context.vars.senderBankId = sender.id;
  context.vars.receiverBankId = receiver.id;
  
  return done();
}

module.exports = { selectRandomBanks };
```

---

## ✨ Tips & Tricks

### 1. Generate HTML Report

```bash
npm install -g artillery-plugin-html-report

# Add to config
plugins:
  html-report:
    output: "./report.html"
```

### 2. Real-time Monitoring

```bash
# Monitor với Artillery Dashboard
artillery run --dotenv .env -o report.json tests/load/transfer-100.yml

# Monitor system resources
htop  # Linux/Mac
Get-Process | Sort-Object CPU -Descending | Select -First 10  # Windows PowerShell
```

### 3. Compare Results

```bash
# Run baseline
artillery run -o baseline.json tests/load/transfer-100.yml

# After optimization
artillery run -o optimized.json tests/load/transfer-100.yml

# Compare
artillery compare baseline.json optimized.json
```

---

**Happy Load Testing! 🚀💰**

*Nếu có thắc mắc, check logs hoặc tham khảo [Artillery Documentation](https://www.artillery.io/docs)*
