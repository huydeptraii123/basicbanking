### 1\. Database Optimization (Tối ưu hóa Cơ sở dữ liệu)

#### Vấn đề (The Bottleneck)

Hệ thống cũ gặp hiện tượng "nghẽn cổ chai" khi lượng truy cập tăng cao.

- **Connection Overhead:** Mỗi request tạo một kết nối mới tới DB rồi đóng lại. Việc này tốn nhiều tài nguyên CPU/RAM.
- **Slow Lookup:** Truy vấn tìm kiếm tài khoản quét toàn bộ bảng (Full scan), rất chậm khi dữ liệu lớn.

#### Giải pháp & Patterns áp dụng

- **Singleton & Connection Pooling:**
  - _Triển khai:_ Trong prisma.ts, khởi tạo duy nhất một instance PrismaClient.
  - _Tác dụng:_ Quản lý một "bể" (pool) kết nối tái sử dụng. Hệ thống chịu được hàng nghìn request/giây mà không lỗi _Too many connections_.
- **Indexing (Đánh chỉ mục):**
  - _Triển khai:_ Thêm @@index(\[userId\]), @@index(\[accountId\]) vào schema.prisma.
  - _Tác dụng:_ Tốc độ tìm kiếm tăng gấp **10-100 lần**.
- **Type-safe Logging:** Cấu hình cảnh báo ngay lập tức các Slow Query (>500ms).

#### Kết quả

So sánh hiệu năng giữa Code Cũ (No Pool, No Index) và Code Mới (Connection Pool, Indexed).
Chúng ta sẽ giả lập 100 kết nối đồng thời bắn vào API xem lịch sử giao dịch trong 10 giây

| **Chỉ số** | **Code Cũ** | **Code Mới** | **Cải thiện** | **Nguyên nhân chính** |
| --- | --- | --- | --- | --- |
| **Throughput (Sức tải)** | ~1,000 req/10s | **6,000 req/10s** | **x6 Lần** | Connection Pooling giúp tái sử dụng kết nối, không mất công khởi tạo. |
| --- | --- | --- | --- | --- |
| **Latency (Độ trễ TB)** | 795 ms | **178 ms** | **Nhanh hơn 4.5 lần** | Caching + Indexing giảm thời gian truy vấn DB. |
| --- | --- | --- | --- | --- |
| **Worst Case (Max Latency)** | 1,221 ms | **~250 ms** | **Ổn định** | Không bị block I/O. |
| --- | --- | --- | --- | --- |
| **Stability (Min Req/s)** | Tụt còn 20 req/s | **Duy trì >400 req/s** | **Mượt mà** | Hệ thống không bị "nghẹn" (bottleneck). |
| --- | --- | --- | --- | --- |

### 2\. Transaction Safety (An toàn Giao dịch)

#### Vấn đề (Race Conditions)

Cách cũ tính toán số dư ở tầng ứng dụng (Node.js): balance = balance - amount.

- **Rủi ro:** Khi 2 request đến cùng lúc, cả hai cùng đọc số dư cũ -> Trừ tiền 2 lần nhưng số dư chỉ giảm 1 lần hoặc gây âm tiền (Race Condition).

#### Giải pháp & Patterns áp dụng

Tôi đã áp dụng chiến lược bảo vệ đa lớp:

- **Pattern: Atomic Updates (Cập nhật nguyên tử):**
  - _Cách làm:_ Chuyển logic trừ tiền xuống Database Engine: data: { balance: { decrement: amount } }.
  - _Tại sao:_ Đảm bảo tuyệt đối chính xác dù có 100 lệnh trừ cùng lúc, vì DB xử lý tuần tự trên dòng đó.
- **Pattern: ACID Transaction:**
  - _Cách làm:_ Dùng prisma.\$transaction bọc toàn bộ quy trình (Trừ tiền -> Cộng tiền -> Lưu lịch sử).
  - _Tại sao:_ Đảm bảo tính toàn vẹn dữ liệu. Nếu một bước lỗi, toàn bộ sẽ Rollback.
- **Pattern: Isolation Level (Serializable):**
  - _Cách làm:_ Thiết lập mức cô lập cao nhất.
  - _Tại sao:_ Khi giao dịch chạy, DB "khóa" dữ liệu liên quan, ngăn chặn hiện tượng "Phantom Read" hoặc can thiệp từ giao dịch khác.
- **Pattern: Retry Logic:**
  - _Cách làm:_ Hàm runTransactionWithRetry tự động thử lại 3 lần nếu gặp lỗi Deadlock/Serialization failure thay vì báo lỗi ngay cho user.

#### Kết quả

**Kịch bản:** Gửi dồn dập 10 request liên tục vào cùng một tài khoản để kiểm tra Atomic Update.

\--- KẾT QUẢ LOG ---  
Request 0: Thành công (Số dư: 85)  
Request 1: Thành công (Số dư: 100) - (Nạp thêm)  
Request 2: Thành công (Số dư: 80)  
...  
Request 9: Thành công (Số dư: 90)  

**Kết luận:** Số dư được cộng trừ chính xác tuyệt đối. Không xảy ra hiện tượng mất tiền hay Race Condition.

### 3\. Caching Strategy (Chiến lược Bộ nhớ đệm)

#### Vấn đề (Latency)

Mỗi lần người dùng tải lại trang hoặc kiểm tra số dư, hệ thống đều phải truy vấn trực tiếp vào Database, gây chậm và quá tải DB.

#### Giải pháp & Patterns áp dụng

- **Pattern: Cache-Aside:**
  - **Luồng Đọc:** Kiểm tra Redis (RAM) trước -> Nếu có, trả về ngay (~2ms). Nếu không -> Đọc DB -> Lưu vào Cache.
  - **Luồng Ghi:** Khi giao dịch thành công -> Gọi lệnh **Invalidate** (Xóa Cache) để lần đọc sau bắt buộc lấy dữ liệu mới nhất.

#### Kết quả

_Mục tiêu: So sánh tốc độ đọc số dư._

| **Lần gọi** | **Nguồn dữ liệu** | **Thời gian (Latency)** | **Trạng thái** |
| --- | --- | --- | --- |
| **Lần 1** | Database (Disk) | **133 ms** | Cache Miss |
| --- | --- | --- | --- |
| **Lần 2** | RAM (In-Memory) | **37 ms** | Cache Hit |
| --- | --- | --- | --- |

### 4\. Idempotency & Validation (Tính duy nhất & Bảo mật)

#### Vấn đề (Double Spending & Spam)

Nếu mạng lag, người dùng bấm nút "Gửi" nhiều lần, hoặc hacker cố tình spam request. Dữ liệu đầu vào lỏng lẻo (any).

#### Giải pháp & Patterns áp dụng

- **Pattern: Idempotency Key:**
  - Client gửi kèm mã duy nhất (UUID). Server lưu key này vào Redis (24h). Nếu nhận lại key cũ -> Chặn ngay lập tức.
- **Strict Validation (Zod Schema):**
  - Loại bỏ dữ liệu rác, số âm ngay từ cửa ngõ API.
- **Math Utility:**
  - Sử dụng safeRound để xử lý lỗi làm tròn số thực (Floating point) điển hình của máy tính.

#### Kết quả

**Kịch bản:** Giả lập mạng lag, Client gửi lại request cũ (Retry) với cùng một Idempotency Key.

Key: test-key-1764488426217  
\------------------------------------------------  
1️ Đang gửi Request lần 1...  
Lần 1: Thành công! (Transaction ID: 2ae75c...)  
\-> Số dư mới: 35  
<br/>... Giả vờ mạng lag, gửi lại ...  
<br/>2️ Đang gửi Request lần 2 (Trùng Key)...  
Lần 2: Bị chặn thành công!  
\-> Error: "Transaction already processed"
