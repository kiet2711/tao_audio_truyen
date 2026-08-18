# CapCut Text-to-Speech (TTS) Web Studio
Web: https://tao-audio-truyen.onrender.com
Ứng dụng Web chuyển đổi văn bản thành giọng nói (Text-to-Speech) chuẩn CapCut tự nhiên, hỗ trợ văn bản dài, tự động tách đoạn thông minh & xử lý đa luồng siêu tốc, sẵn sàng triển khai miễn phí lên nền tảng **Render.com**.

---

## 🌟 Tính Năng Nổi Bật
- **Xử lý Văn bản dài không giới hạn**: Tự động nhận diện và phân tách các câu văn, đoạn truyện dài thành các phần nhỏ thông minh theo dấu ngắt câu (`.`, `!`, `?`, `\n`) mà không bị lỗi giới hạn ký tự của CapCut.
- **Đa luồng Siêu Tốc (Multi-threading)**: Cho phép tùy chỉnh từ **1 đến 50 luồng** (`ThreadPoolExecutor`), gửi và xử lý song song các đoạn văn cùng lúc, tự động ghép lại thành **1 file MP3 duy nhất hoàn chỉnh**.
- **Giao diện Web UI cao cấp**: Thiết kế Dark Mode hiện đại, hiệu ứng sóng âm sống động, tương thích hoàn hảo trên cả Máy tính & Điện thoại.
- **Thư viện Giọng đọc phong phú**: Hỗ trợ đầy đủ các giọng đọc tiếng Việt (Nhỏ Ngọt Ngào, Cô Gái Hoạt Ngôn, Giọng Bé...) cùng các ngôn ngữ phổ biến (Anh, Trung, Nhật...).
- **Tùy chỉnh Tốc độ (Speed Rate)**: Thanh trượt từ `0.5x` đến `2.0x` cùng các nút chọn nhanh tiện lợi.
- **Trình phát Audio tích hợp**: Nghe trực tiếp ngay trên trình duyệt và tải file MP3 chất lượng cao với 1 click.
- **Cơ chế Gỡ Ban / Đổi Device ID**: Tự động hoặc thủ công đổi Device ID với thread-safety để tránh bị rate-limit hoặc chặn API.
- **Lưu lịch sử tác vụ**: Lưu danh sách các câu đã tạo trong phiên làm việc để nghe lại hoặc tái sử dụng nội dung.

---

## 🚀 Hướng Dẫn Deploy Lên Render.com (Miễn Phí 100%)

### Cách 1: Deploy Web Service thông thường (Khuyên Dùng)

#### Bước 1: Đẩy thư mục này lên GitHub
1. Tạo một repository mới trên GitHub (ví dụ đặt tên `capcut-tts-web`).
2. Khởi tạo và đẩy code trong thư mục `capcut_tts_web` lên GitHub:
   ```bash
   cd capcut_tts_web
   git init
   git add .
   git commit -m "Initial commit for CapCut TTS Web"
   git branch -M main
   git remote add origin https://github.com/<username-cua-ban>/capcut-tts-web.git
   git push -u origin main
   ```

#### Bước 2: Tạo Web Service trên Render
1. Truy cập [dashboard.render.com](https://dashboard.render.com/) và đăng nhập (bằng tài khoản GitHub).
2. Bấm nút **New +** ở góc trên bên phải $\rightarrow$ chọn **Web Service**.
3. Chọn repository `capcut-tts-web` bạn vừa đẩy lên ở Bước 1.
4. Điền các thông số cấu hình như sau:
   - **Name**: `capcut-tts-web` (hoặc tên tùy thích)
   - **Language / Runtime**: `Python 3`
   - **Branch**: `main`
   - **Region**: `Singapore` hoặc `Oregon`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free` (0$/tháng)
5. Bấm nút **Create Web Service**.

#### Bước 3: Hoàn tất & Trải nghiệm
- Quá trình build và deploy sẽ diễn ra tự động trong khoảng 1-2 phút.
- Sau khi hoàn tất, Render sẽ cấp cho bạn một đường link công khai (ví dụ: `https://capcut-tts-web.onrender.com`).
- Bạn có thể mở link này trên bất kỳ thiết bị nào (máy tính, điện thoại, máy tính bảng) để sử dụng!

---

### Cách 2: Deploy bằng Render Blueprint (File `render.yaml`)

Nếu bạn sử dụng tính năng **Blueprints** của Render:
1. Bấm **New +** $\rightarrow$ chọn **Blueprint**.
2. Chọn repo GitHub chứa mã nguồn.
3. Render sẽ tự động đọc file `render.yaml` và thiết lập mọi thứ từ cổng mạng đến lệnh chạy mà bạn không cần điền tay.

---

## 💻 Hướng Dẫn Chạy & Kiểm Thử Cục Bộ (Local)

Nếu muốn chạy thử trên máy tính của bạn trước khi đưa lên mạng:

1. Mở Terminal / PowerShell và chuyển vào thư mục `capcut_tts_web`:
   ```bash
   cd capcut_tts_web
   ```

2. Cài đặt các thư viện cần thiết:
   ```bash
   pip install -r requirements.txt
   ```

3. Khởi chạy server:
   ```bash
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

4. Mở trình duyệt và truy cập:
   ```
   http://127.0.0.1:8000
   ```
   Tài liệu Swagger API tự động tại: `http://127.0.0.1:8000/docs`
