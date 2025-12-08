# 🏦 Banking System – Software Architecture Improvements

## 1. Giới thiệu về hệ thống

## 1.1. Bối cảnh & Hệ thống gốc

Dự án ban đầu là một hệ thống **Banking Monolith** cơ bản, được xây dựng trên nền tảng **Node.js** và **Prisma ORM**. Hệ thống đã đáp ứng đầy đủ các nghiệp vụ ngân hàng cốt lõi (Functional Requirements) bao gồm:

- Đăng ký / Đăng nhập (Authentication).
- Xem số dư & Thông tin tài khoản.
- Giao dịch chuyển tiền.
- Xem lịch sử giao dịch.

Tuy nhiên, sau khi đánh giá kiến trúc, chúng tôi nhận thấy hệ thống còn khá **"ngây thơ"**. Hệ thống được thiết kế chỉ để "chạy được tính năng" trong điều kiện lý tưởng mà hoàn toàn bỏ qua các **yêu cầu phi chức năng** quan trọng như: khả năng chịu tải, tính toàn vẹn dữ liệu (Data Integrity) và các kịch bản lỗi mạng thực tế.

---

## 1.2. Các vấn đề nghiêm trọng

Trước khi tiến hành cải tiến, hệ thống tồn tại 4 vấn đề "chí mạng" có thể dẫn đến sập server hoặc sai lệch tài sản người dùng bất cứ lúc nào:

### 1. Phòng thủ thụ động

Hệ thống hoàn toàn không có cơ chế phòng vệ trước tải cao.

- **Vấn đề:** Server chấp nhận xử lý mọi request gửi đến miễn là có JWT hợp lệ. Không có **Throttling** hay **Rate Limiting**.
- **Hậu quả:** Nếu gặp đỉnh tải (High Traffic) hoặc bị tấn công Spam/Brute-force, hệ thống chắc chắn sẽ quá tải và sập (Crash 100%).

### 2. Rủi ro tranh chấp dữ liệu (Race Condition & DB Bottleneck)

Tầng Database và xử lý giao dịch được cài đặt thiếu an toàn.

- **Vấn đề Logic:** Việc tính toán số dư thực hiện ở tầng ứng dụng (`balance = balance - amount`) thay vì tầng Database.
- **Thiếu ACID:** Không cấu hình **Isolation Level** và **Transaction** chặt chẽ.
- **Quản lý kết nối kém:** Mỗi request tạo một kết nối mới tới DB thay vì dùng Pool.
- **Hậu quả:** Gây ra lỗi **Race Condition** (tranh chấp dữ liệu) dẫn đến sai lệch số dư (âm tiền, mất tiền) khi có nhiều request đồng thời. Hệ thống dễ bị lỗi _Too many connections_.

### 3. Bảo mật lỏng lẻo

- **Vấn đề:** Hệ thống chỉ dựa vào mật khẩu tĩnh được mã hóa cơ bản.
- **Hậu quả:** Thiếu lớp bảo vệ thứ 2 (2FA), tài khoản người dùng dễ dàng bị chiếm đoạt hoàn toàn nếu lộ thông tin đăng nhập.

### 4. Lỗi lặp giao dịch

- **Vấn đề:** Hệ thống xử lý request dựa trên hành động bấm của user mà không có cơ chế kiểm tra tính duy nhất (**Idempotency Key**) hay xác thực dữ liệu đầu vào chặt chẽ (**Strict Validation**).
- **Hậu quả:** Khi mạng chập chờn (Network Lag), user bấm nút "Gửi" nhiều lần sẽ dẫn đến việc **trừ tiền nhiều lần (Double Spending)** cho cùng một giao dịch. Dữ liệu rác (số âm, null) có thể lọt vào hệ thống.

### 5. Xử lý lỗi thô sơ

- **Vấn đề:** Client phản ứng rất tiêu cực trước các lỗi tạm thời như rớt mạng hoặc Server quá tải thoáng qua. Redirect thô bạo về trang Login hoặc im lặng khi request thất bại, không có cơ chế tự phục hồi.
- **Hậu quả:** Trải nghiệm người dùng (UX) đứt gãy và gây ức chế. Người dùng không biết lỗi do đâu nên thường spam nút gửi, vô tình làm trầm trọng thêm tình trạng quá tải của hệ thống.

# 1.3. Danh sách các cải tiến đã thực hiện

1. …
2. …
3. …
4. …
5. …

---

# 4. Chi tiết từng cải tiến

## 4.1 Two-Factor Authentication (2FA) - Xác thực 2 lớp

### ❗ Vấn đề ban đầu

- **Bảo mật yếu:** Hệ thống chỉ sử dụng mật khẩu tĩnh (password) duy nhất để xác thực người dùng. Nếu mật khẩu bị lộ (phishing, keylogger, data breach), tài khoản người dùng sẽ bị chiếm đoạt hoàn toàn.
- **Thiếu lớp bảo vệ thứ 2:** Không có cơ chế xác thực bổ sung nào để ngăn chặn truy cập trái phép khi thông tin đăng nhập bị rò rỉ.
- **Ảnh hưởng:**
  - Người dùng dễ bị mất tài khoản, mất tiền
  - Hệ thống mất uy tín, không đáp ứng chuẩn bảo mật ngân hàng hiện đại
  - Vi phạm các quy định về bảo mật dữ liệu tài chính

### 🧱 Pattern / Công nghệ sử dụng

**1. Two-Factor Authentication (2FA) Pattern**

- Kết hợp 2 yếu tố xác thực:
  - **Something you know:** Mật khẩu (Password)
  - **Something you have:** OTP token từ thiết bị di động (Google Authenticator/Authy)

**2. Time-based One-Time Password (TOTP) Algorithm**

- Sử dụng thuật toán **TOTP** (chuẩn RFC 6238) để sinh mã OTP 6 chữ số
- Mã OTP có thời gian hiệu lực 30 giây
- Dựa trên 2 thành phần:
  - **Secret Key:** Chuỗi bí mật duy nhất cho mỗi user (lưu trong database)
  - **Unix Timestamp:** Thời gian hiện tại (đồng bộ giữa server và client)

**3. HMAC-SHA1 Hash Function**

- Sử dụng hàm băm HMAC-SHA1 để tạo mã token an toàn
- Đảm bảo tính duy nhất và không thể đảo ngược

---

### 📊 So sánh các phương pháp xác thực

#### 🏦 **Tại sao App Ngân hàng nên dùng 2FA (QR + OTP/TOTP)?**

##### **1. Mức độ rủi ro trong ngân hàng cao hơn mọi loại ứng dụng khác**

App ngân hàng xử lý:

- 💰 **Tiền thật** - Giao dịch tài chính trực tiếp
- 🔒 **Thông tin cá nhân cực kỳ nhạy cảm** - CMND, địa chỉ, thu nhập
- 💎 **Tài khoản có giá trị cao** - Số dư lớn, quyền chuyển tiền không giới hạn

**⚠️ Hậu quả:** Nếu hacker chiếm được tài khoản = **mất tiền ngay lập tức**, không thể hoàn tác.

⇒ Vì vậy ngân hàng phải dùng cơ chế xác thực **mạnh hơn password**, **mạnh hơn cả OTP SMS**.

##### **2. Password là phương pháp yếu nhất — và dễ bị tấn công**

Nếu chỉ dùng **username + password** → Người dùng rất dễ:

| Rủi ro                 | Mô tả                                                             | Xác suất       |
| ---------------------- | ----------------------------------------------------------------- | -------------- |
| 🔓 Mật khẩu yếu        | User đặt `123456`, `password`, tên + ngày sinh                    | **Rất cao**    |
| ♻️ Dùng chung mật khẩu | 1 password cho nhiều website → 1 web bị hack = toàn bộ account lộ | **Cao**        |
| ⌨️ Keylogger           | Phần mềm độc hại ghi lại phím bấm → lộ password                   | **Trung bình** |
| 🎣 Phishing            | Trang web giả mạo đánh cắp thông tin đăng nhập                    | **Cao**        |
| 📊 Data Breach         | Database bị hack → password bị leak trên dark web                 | **Trung bình** |

**⇒ Kết luận:** Password **KHÔNG ĐỦ** để bảo vệ tài khoản ngân hàng.

##### **3. So sánh các phương pháp xác thực**

| Phương pháp          | Mức độ bảo mật     | Ưu điểm                                                           | Nhược điểm                                                                                      | Phù hợp ngân hàng?                   |
| -------------------- | ------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Password only**    | ⭐ Rất thấp        | - Đơn giản<br>- Dễ triển khai                                     | - Dễ bị đoán/hack<br>- Không chống phishing<br>- Dễ bị keylogger                                | ❌ **KHÔNG**                         |
| **SMS OTP**          | ⭐⭐ Thấp          | - Phổ biến<br>- User quen thuộc                                   | - Bị tấn công SIM Swap<br>- Bị intercept bởi malware<br>- Delay gửi tin nhắn                    | ⚠️ **Dùng được nhưng không đủ mạnh** |
| **Email OTP**        | ⭐⭐ Thấp          | - Không tốn phí SMS                                               | - Email dễ bị hack<br>- User reuse password<br>- Email server delay                             | ❌ **Không khuyến nghị**             |
| **FaceID / Vân tay** | ⭐⭐⭐ Trung bình  | - Nhanh<br>- Tiện lợi                                             | - Chỉ là local unlock<br>- Không xác thực trên thiết bị mới<br>- Không chống clone/phishing app | ⚠️ **Cần kết hợp thêm 2FA**          |
| **TOTP (QR + OTP)**  | ⭐⭐⭐⭐⭐ Rất cao | - An toàn nhất<br>- Offline<br>- Không tốn phí<br>- Chuẩn quốc tế | - Setup hơi phức tạp<br>- Cần app Authenticator                                                 | ✅ **KHUYÊN DÙNG**                   |

**Cách hoạt động:**

1. User quét QR code bằng Google Authenticator/Authy → lưu **secret key** trên thiết bị
2. Mỗi 30s, app tạo mã OTP 6 chữ số dựa trên **secret key + timestamp**
3. Server verify mã OTP bằng cùng thuật toán → **không cần internet, không cần SMS**

**⇒ Kết luận:** TOTP là **chuẩn quốc tế** cho xác thực 2 lớp trong ngành tài chính.

---

### 🛠️ Cách giải quyết

#### **Backend Implementation (Node.js + Prisma + SQLite)**

**1. Database Schema Updates**

```prisma
model User {
  id                String   @id @default(uuid())
  email             String   @unique
  password          String
  twoFactorSecret   String?   // Secret key cho TOTP
  twoFactorEnabled  Boolean  @default(false)  // Trạng thái 2FA
  createdAt         DateTime @default(now())
}
```

**2. Thư viện sử dụng**

- **`otplib`** (v12.0.1): Generate và verify TOTP tokens
- **`qrcode`** (v1.5.4): Tạo QR code từ secret key để user quét bằng app Authenticator

**3. API Endpoints**

**a) GET /api/user/2fa/qrcode** - Lấy QR Code để setup 2FA

```typescript
// Generate secret key nếu chưa có
const secret = authenticator.generateSecret();

// Tạo OTP Auth URL theo chuẩn
const otpAuthUrl = authenticator.keyuri(
  user.email,
  "SHBank", // Service name
  secret
);

// Convert sang QR code image (base64)
const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
```

**b) POST /api/user/2fa/setup** - Xác nhận và bật 2FA

```typescript
// Verify OTP token user nhập vào
const isValid = authenticator.verify({
  token: otpToken,
  secret: user.twoFactorSecret,
});

if (isValid) {
  // Enable 2FA cho user
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true },
  });
}
```

**c) POST /api/user/2fa/verify** - Xác thực OTP khi đăng nhập

```typescript
// Kiểm tra OTP token
const isValid = authenticator.verify({
  token: otpToken,
  secret: user.twoFactorSecret,
});

// Chỉ cho phép access nếu OTP đúng
return res.json({ verified: isValid });
```

**d) POST /api/user/2fa/disable** - Tắt 2FA

```typescript
await prisma.user.update({
  where: { id: user.id },
  data: {
    twoFactorEnabled: false,
    twoFactorSecret: null,
  },
});
```

**4. Cập nhật Auth Flow**

```typescript
// POST /api/auth/signin
const user = await prisma.user.findUnique({ where: { email } });

// Check password
const match = await bcrypt.compare(password, user.password);

if (match) {
  const token = signJWT(user.id);

  // Kiểm tra nếu user đã bật 2FA
  const require2FA = user.twoFactorEnabled && user.twoFactorSecret;

  return res.json({
    ok: true,
    token,
    require2FA, // Flag để frontend biết cần verify OTP
  });
}
```

#### **Frontend Implementation (Next.js + TypeScript + React)**

**1. Component: TwoFactorSetup.tsx**

- Hiển thị giao diện setup 2FA
- Gọi API lấy QR code
- Cho phép user nhập OTP để xác nhận
- Hiển thị trạng thái 2FA (enabled/disabled)

**2. Component: TwoFactorVerify.tsx**

- Modal popup yêu cầu nhập OTP khi đăng nhập
- Tự động hiển thị nếu `require2FA = true`
- Verify OTP trước khi cho phép access vào hệ thống

**3. Page: /activate-2fa**

- Trang riêng để quản lý 2FA
- Menu item mới trong Sidebar: "Activate 2FA"

**4. Cập nhật AuthForm**

```typescript
const response = await fetch("/api/auth/signin", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});

const data = await response.json();

if (data.require2FA) {
  // Hiển thị modal verify OTP
  setShowTwoFactorVerify(true);
} else {
  // Redirect vào dashboard
  router.push("/");
}
```

### 📈 Kết quả đạt được

**1. Bảo mật được tăng cường đáng kể**

- Tài khoản được bảo vệ bởi 2 lớp xác thực
- Ngay cả khi password bị lộ, hacker vẫn không thể truy cập nếu không có OTP token
- Mã OTP thay đổi mỗi 30 giây, không thể tái sử dụng

**2. Tuân thủ chuẩn quốc tế**

- Sử dụng thuật toán TOTP (RFC 6238)
- Tương thích với Google Authenticator, Authy, Microsoft Authenticator...
- Đáp ứng yêu cầu bảo mật của các tổ chức tài chính

**3. Trải nghiệm người dùng**

- Setup 1 lần duy nhất bằng cách quét QR code
- Tốc độ verify nhanh (< 1 giây)
- Có thể tắt 2FA nếu không muốn sử dụng

**4. Workflow hoàn chỉnh**

![2FA Workflow Diagram](./public/images/2fa-workflow-diagram.png)
Sơ đồ mô tả quy trình xác thực 2 lớp từ đăng nhập đến xác minh OTP\_

**Kịch bản 1: Setup 2FA lần đầu**

1. User đăng nhập bình thường → Truy cập "Activate 2FA"
2. Click "Get QR Code" → Server generate secret key và QR code
3. Mở app Google Authenticator/Authy → Quét QR code
4. Nhập mã OTP 6 số → Server verify → 2FA enabled

**Kịch bản 2: Đăng nhập khi đã bật 2FA**

1. User nhập email + password → Server check credentials
2. Server trả về `require2FA = true`
3. Frontend hiển thị modal yêu cầu OTP
4. User nhập mã OTP từ Authenticator app
5. Server verify OTP → Cho phép access vào dashboard

**Kịch bản 3: OTP sai**

1. User nhập OTP sai → Server trả về lỗi "Invalid OTP token"
2. User phải nhập lại mã mới (30 giây thay đổi 1 lần)

### Testing & Benchmark

**1. Security Analysis **

**Khả năng chống brute-force:**

- Không gian tìm kiếm: 10^6 = 1,000,000 khả năng (mã OTP 6 chữ số)
- Thời gian hiệu lực: 30 giây/mã
- Xác suất đoán đúng trong 1 lần: 1/1,000,000 = 0.0001%
- **Kết luận:** Gần như không thể brute-force trong thời gian ngắn

**Time-based security:**

- Mã OTP dựa trên Unix Timestamp, thay đổi mỗi 30 giây
- Mã cũ không thể tái sử dụng (replay attack không khả thi)
- Server và client đồng bộ thời gian qua Unix Timestamp (không phụ thuộc múi giờ)

**Secret key protection:**

- Secret key lưu trong database (encrypted at rest)
- Nếu database bị breach, attacker vẫn cần thiết bị vật lý của user để tạo OTP
- Tuân thủ nguyên tắc "Something you know + Something you have"

**2. Functional Testing **

| Test Case             | Kết quả | Ghi chú                                   |
| --------------------- | ------- | ----------------------------------------- |
| Setup 2FA với QR code | Pass    | Quét thành công bằng Google Authenticator |
| Verify OTP đúng       | Pass    | Đăng nhập thành công                      |
| Verify OTP sai        | Pass    | Hiển thị lỗi "Invalid OTP token"          |
| Verify OTP đã hết hạn | Pass    | Yêu cầu nhập mã mới                       |
| Disable 2FA           | Pass    | Đăng nhập không cần OTP                   |
| Logout và login lại   | Pass    | Modal verify OTP hiển thị đúng            |

**3. User Experience Testing**

⏱️ **Thời gian thực hiện:**

- Setup 2FA lần đầu: ~90 giây (quét QR + nhập OTP xác nhận)
- Verify OTP khi đăng nhập: ~5 giây (mở app + nhập 6 số)

📱 **Tương thích:**

- Google Authenticator (iOS/Android)
- Microsoft Authenticator
- Authy

**4. Performance Testing **

**Phương pháp:** Chạy script test tự động trong Console, mỗi API test 3 lần, lấy trung bình.

| Endpoint                   | Lần 1  | Lần 2  | Lần 3  | Trung bình  | Ghi chú                   |
| -------------------------- | ------ | ------ | ------ | ----------- | ------------------------- |
| GET /api/user/2fa/qrcode   | 30ms   | 26.1ms | 21.7ms | **~26ms**   | Generate secret + QR code |
| POST /api/user/2fa/setup   | 13.1ms | 13.4ms | 11.1ms | **~12.5ms** | Verify OTP + update DB    |
| POST /api/user/2fa/verify  | 14.7ms | 10.3ms | 11.3ms | **~12ms**   | Chỉ verify token          |
| POST /api/user/2fa/disable | 17.7ms | 10.7ms | 12.5ms | **~13.6ms** | Update DB                 |

**Kết luận:** Tất cả API đều response dưới 30ms, performance rất tốt!

**5. Công cụ & Phương pháp test**

- **Postman:** Test API endpoints với các test cases khác nhau
- **Chrome DevTools:** Đo response time và network performance
- **Google Authenticator:** Test tích hợp thực tế với authenticator app
- **Manual Testing:** Test toàn bộ user flow từ setup đến verify

**6. Kết quả tổng quát**
| Metric | Before | After |
|--------|--------|-------|
| Security Layers | 1 (Password only) | 2 (Password + OTP) |
| Account Takeover Risk | High | Very Low |
| Compliance | ❌ | RFC 6238 |
| User Trust | Medium | High |

---

## 4.2 Retry - Thử lại khi gặp lỗi tạm thời

### ❗ Vấn đề ban đầu

- **Client xử lý lỗi thô sơ:**
  - Trước đây, khi request gặp lỗi mạng hoặc Server quá tải, Client phản ứng tiêu cực bằng cách redirect người dùng về trang Login (gây hiểu nhầm là hết phiên) hoặc "im lặng" không báo lỗi.
  - Điều này khiến người dùng bối rối, thậm chí bực mình khi vừa gặp lỗi vừa phải mất công đăng nhập lại. Trải nghiệm người dùng rất tệ.
- **Mất đồng bộ với Server (Throttling Mismatch):**
  - Khi Server áp dụng **Throttling**, nếu hàng đợi đầy, Server trả về mã `429 Too Many Requests hoặc 503 Server Too Busy`.
  - Client cũ không hiểu mã này, coi là lỗi hệ thống và hủy thao tác ngay lập tức, trong khi thực tế chỉ cần đợi một chút là có thể xử lý được.

### 🧱 Pattern / Công nghệ sử dụng

- **Retry Pattern** kết hợp **Exponential Backoff** (Lùi lũy thừa) và **Jitter** (Độ trễ ngẫu nhiên). Khi request tới server gặp các lỗi tạm thời như mã lỗi 429, 503, 408, request timeout sẽ tự động thử lại tối đa 3 lần theo chiến lược lùi lũy thừa cộng với một độ trễ ngẫu nhiên.

### 🛠️ Cách giải quyết

- **Chiến lược cộng sinh:**

  - Retry ở Client được thiết kế để kết hợp chặt chẽ với Throttling ở Server.
  - Khi Server trả về `429` (Bận/Quá tải tạm thời) -> Client tự động lùi lại và thử lại sau. Client đóng vai trò như bộ đệm (buffer) giúp giảm tải cho Server mà không làm gián đoạn trải nghiệm người dùng.

- **Tại sao cần Jitter?**

  - Nếu chỉ dùng **Exponential Backoff** (1s, 2s, 4s), khi Server hồi phục, hàng nghìn Client sẽ retry **cùng một lúc** chính xác từng mili-giây. Điều này gây ra làn sóng tấn công thứ 2 làm sập Server lần nữa.
  - **Jitter** thêm một khoảng thời gian ngẫu nhiên (0-1000ms) để phân tán các request, giúp Server "dễ thở" hơn. Tránh trường hợp phản tác dụng của retry khi một loại request retry đến cùng lúc dẫn tới hệ thống tiếp tục quá tải ngay khi vừa phục hồi.

- **Tại sao lại là Exponential Backoff?**
  - Chúng tôi lựa chọn Exponential Backoff vì khả năng vượt trội trong việc "cứu" hệ thống đang hấp hối so với các phương pháp khác như thủ lại ngay lập tức hay thử lại với thời gian chờ cố định (Fixed delay).
  1.  **Giả định về sự cố (Failure Assumption):** Chiến lược này dựa trên giả định: "Nếu request vừa thất bại, khả năng cao là hệ thống đang quá tải. Việc thử lại ngay lập tức chỉ làm tình hình tồi tệ hơn." Do đó, lùi lại càng xa như một cách vừa thử lại vừa thăm dò. Đây là một cách hành xử "lịch sự" nhất với Server.
  2.  **Tránh hiệu ứng "Bầy đàn" (Thundering Herd):**
      - **Cách cũ (Fixed Delay):** Nếu Server sập và 10.000 user cùng thử lại sau đúng 2 giây, Server sẽ chịu 10.000 request cùng lúc ngay khi vừa khởi động lại -> Sập tiếp.
      - **Exponential Backoff:** Giãn cách thời gian thử lại ra rất nhanh (1s -> 2s -> 4s -> 8s). Điều này giúp giảm mật độ request theo thời gian, cho phép Server có "khoảng lặng" để xả bớt hàng đợi và phục hồi tài nguyên.

### 📈 Tổng kết hiệu quả đạt dược

Việc triển khai **Retry** đã mang lại những lợi về độ ổn định của hệ thống và trải nghiệm của người dùng:

- **Tự động phục hồi (Transparent Recovery):** Khôi phục thành công các giao dịch gặp lỗi mạng thoáng qua hoặc lỗi quá tải tạm thời (`429`, `503`). Người dùng không còn gặp phải các thông báo lỗi gây ức chế hay phải thao tác lại thủ công.
- **Biến lỗi thành độ trễ (Hard Failures → Latency):** Thay vì trả về lỗi ngay lập tức làm đứt gãy luồng nghiệp vụ, hệ thống chấp nhận độ trễ hợp lý để xử lý ngầm, đảm bảo các yêu cầu chức năng được hoàn tất trọn vẹn.
- **Bảo vệ hạ tầng:** Cơ chế **Exponential Backoff + Jitter** giúp triệt tiêu hoàn toàn hiệu ứng cộng hưởng (Thundering Herd). Việc thử lại diễn ra có trật tự và rải rác, giúp Server hồi phục an toàn mà không bị "đánh úp" bởi các request retry ồ ạt.

---

## 4.x [Tên cải tiến]

**Người thực hiện:** …

### ❗ Vấn đề ban đầu

- Hệ thống gặp vấn đề gì?
- Khi nào thì vấn đề xuất hiện?
- Ảnh hưởng đến người dùng/hệ thống?

### 🧱 Pattern / Công nghệ sử dụng

- Pattern gì?
- Vì sao chọn nó mà không chọn giải pháp khác?

### 🛠️ Cách giải quyết

- Nhóm đã làm gì?
- Triển khai theo cách nào?
- Có dùng thư viện/framework có sẵn không? (Hãy nêu rõ)

### 📈 Kết quả đạt được

- Con số trước → sau
- Thử nghiệm thực tế (case thực tế)
- Hệ thống được cải thiện ra sao?

### Testing & Benchmark

- Mô tả phương pháp test (load test, unit test, scenario thực tế)
- Công cụ sử dụng
- Kết quả test tổng quát

---

# 5. Tổng kết chung

- Những vấn đề chính của hệ thống cũ
- Những pattern nhóm đã áp dụng
- Mức độ cải thiện của hệ thống sau khi nâng cấp
- Các bài học rút ra

---

# 6. Thành viên thực hiện

## 👥 Thành viên thực hiện

| MSSV     | Họ Tên            |
| :------- | :---------------- |
| 2302001  | [Nguyễn Ngọc Tài] |
| ...      | [Tên Bạn]         |
| ...      | [Tên Bạn]         |
| 23021666 | [Bùi Hải Phương]  |

---
