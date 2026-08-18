# CapCut Text-to-Speech (TTS) Web Studio

Ứng dụng Web chuyển đổi văn bản thành giọng nói (Text-to-Speech) chuẩn CapCut tự nhiên, sẵn sàng triển khai miễn phí lên nền tảng **Render.com**.

---

## 🌟 Tính Năng Nổi Bật
- **Giao diện Web UI cao cấp**: Thiết kế Dark Mode hiện đại, hiệu ứng sóng âm sống động, tương thích hoàn hảo trên cả Máy tính & Điện thoại.
- **Thư viện Giọng đọc phong phú**: Hỗ trợ đầy đủ các giọng đọc tiếng Việt (Nhỏ Ngọt Ngào, Cô Gái Hoạt Ngôn, Giọng Bé...) cùng các ngôn ngữ phổ biến (Anh, Trung, Nhật...).
- **Tùy chỉnh Tốc độ (Speed Rate)**: Thanh trượt từ `0.5x` đến `2.0x` cùng các nút chọn nhanh tiện lợi.
- **Trình phát Audio tích hợp**: Nghe trực tiếp ngay trên trình duyệt và tải file MP3 chất lượng cao với 1 click.
- **Cơ chế Gỡ Ban / Đổi Device ID**: Tự động hoặc thủ công đổi Device ID để tránh bị rate-limit hoặc chặn API.
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
   - **Region**: `Singapore` hoặc `Frankfurt` (khuyên chọn Singapore hoặc Oregon cho tốc độ tốt)
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

---

## 📁 Cấu Trúc Mã Nguồn

```
capcut_tts_web/
├── capcut_tts_api/           # Core SDK xử lý mã hóa chữ ký và gọi API CapCut
├── Voice.json                # Danh sách đầy đủ toàn bộ giọng đọc CapCut
├── main.py                   # Server FastAPI xử lý API TTS và phục vụ giao diện
├── requirements.txt          # Thư viện Python phụ thuộc
├── render.yaml               # Cấu hình tự động triển khai Render Blueprint
├── Dockerfile                # Cấu hình Docker container
├── .gitignore                # Bỏ qua file rác và bộ nhớ đệm
├── README.md                 # Hướng dẫn sử dụng & triển khai
└── static/                   # Giao diện người dùng (Frontend)
    ├── index.html            # Cấu trúc trang web
    ├── style.css             # Giao diện Dark Theme hiện đại
    └── app.js                # Logic phát âm thanh, bộ lọc giọng, lưu lịch sử
```

---

## ❓ Câu Hỏi Thường Gặp & Khắc Phục Lỗi (Troubleshooting)

**1. Render báo service bị sleep (ngủ đông) sau một thời gian không dùng?**
> Gói Free của Render sẽ tạm dừng sau 15 phút không có lượt truy cập để tiết kiệm tài nguyên. Khi có người truy cập lại, web sẽ mất khoảng 30-50 giây để khởi động lại. Nếu muốn ứng dụng chạy 24/7 không bao giờ sleep, bạn có thể dùng dịch vụ ping miễn phí như [UptimeRobot](https://uptimerobot.com) để ping endpoint `https://<ten-app>.onrender.com/health` mỗi 10 phút.

**2. Gặp lỗi "CapCut Task Error" hoặc tạo giọng bị chậm?**
> Bấm nút **Đổi ID (Gỡ Ban)** ở góc phải màn hình Web để tạo một Device ID hoàn toàn mới và tiếp tục sử dụng.
