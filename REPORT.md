# 🏦 Banking System – Software Architecture Improvements
## 1. Giới thiệu về hệ thống 
## 1.1. Bối cảnh & Hệ thống gốc

Dự án ban đầu là một hệ thống **Banking Monolith** cơ bản, được xây dựng trên nền tảng **Node.js** và **Prisma ORM**. Hệ thống đã đáp ứng đầy đủ các nghiệp vụ ngân hàng cốt lõi (Functional Requirements) bao gồm:
* Đăng ký / Đăng nhập (Authentication).
* Xem số dư & Thông tin tài khoản.
* Giao dịch chuyển tiền.
* Xem lịch sử giao dịch.

Tuy nhiên, sau khi đánh giá kiến trúc, chúng tôi nhận thấy hệ thống còn khá **"ngây thơ"**. Hệ thống được thiết kế chỉ để "chạy được tính năng" trong điều kiện lý tưởng mà hoàn toàn bỏ qua các **yêu cầu phi chức năng** quan trọng như: khả năng chịu tải, tính toàn vẹn dữ liệu (Data Integrity) và các kịch bản lỗi mạng thực tế.

---

## 1.2. Các vấn đề nghiêm trọng

Trước khi tiến hành cải tiến, hệ thống tồn tại 4 vấn đề "chí mạng" có thể dẫn đến sập server hoặc sai lệch tài sản người dùng bất cứ lúc nào:

### 1. Phòng thủ thụ động
Hệ thống hoàn toàn không có cơ chế phòng vệ trước tải cao.
* **Vấn đề:** Server chấp nhận xử lý mọi request gửi đến miễn là có JWT hợp lệ. Không có **Throttling** hay **Rate Limiting**.
* **Hậu quả:** Nếu gặp đỉnh tải (High Traffic) hoặc bị tấn công Spam/Brute-force, hệ thống chắc chắn sẽ quá tải và sập (Crash 100%).

###  2. Rủi ro tranh chấp dữ liệu (Race Condition & DB Bottleneck)
Tầng Database và xử lý giao dịch được cài đặt thiếu an toàn.
* **Vấn đề Logic:** Việc tính toán số dư thực hiện ở tầng ứng dụng (`balance = balance - amount`) thay vì tầng Database.
* **Thiếu ACID:** Không cấu hình **Isolation Level** và **Transaction** chặt chẽ.
* **Quản lý kết nối kém:** Mỗi request tạo một kết nối mới tới DB thay vì dùng Pool.
* **Hậu quả:** Gây ra lỗi **Race Condition** (tranh chấp dữ liệu) dẫn đến sai lệch số dư (âm tiền, mất tiền) khi có nhiều request đồng thời. Hệ thống dễ bị lỗi *Too many connections*.

### 3. Bảo mật lỏng lẻo 
* **Vấn đề:** Hệ thống chỉ dựa vào mật khẩu tĩnh được mã hóa cơ bản.
* **Hậu quả:** Thiếu lớp bảo vệ thứ 2 (2FA), tài khoản người dùng dễ dàng bị chiếm đoạt hoàn toàn nếu lộ thông tin đăng nhập.

###  4. Lỗi lặp giao dịch 
* **Vấn đề:** Hệ thống xử lý request dựa trên hành động bấm của user mà không có cơ chế kiểm tra tính duy nhất (**Idempotency Key**) hay xác thực dữ liệu đầu vào chặt chẽ (**Strict Validation**).
* **Hậu quả:** Khi mạng chập chờn (Network Lag), user bấm nút "Gửi" nhiều lần sẽ dẫn đến việc **trừ tiền nhiều lần (Double Spending)** cho cùng một giao dịch. Dữ liệu rác (số âm, null) có thể lọt vào hệ thống.

# 1.3. Danh sách các cải tiến đã thực hiện


1. …
2. …
3. …
4. …
5. …

---

# 4. Chi tiết từng cải tiến

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

| MSSV | Họ Tên | 
| :--- | :--- | 
| ... | [Tên Bạn] | 
| ... | [Tên Bạn] | 
| ... | [Tên Bạn] | 
| 23021666 | [Bùi Hải Phương] | 

---



