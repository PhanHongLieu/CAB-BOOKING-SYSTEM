# Hướng dẫn Kiểm thử với Postman


## 1. Import Collection
1.  Mở Postman.
2.  Nhấn nút **Import** (thường ở góc trên bên trái).
3.  Kéo thả file `services/auth-service/postman_collection.json` vào cửa sổ Import.
4.  Bạn sẽ thấy collection **"CAB Booking - Auth Service"** xuất hiện.

## 2. Các API có sẵn
Collection này đã được cấu hình sẵn biến `base_url` là `http://localhost:3001`.

Bạn có thể chạy các request theo thứ tự sau:

1.  **Register**: Tạo tài khoản mới. Email và phone mặc định có thể cần thay đổi nếu bạn chạy nhiều lần để tránh trùng lặp.
2.  **Login**: Đăng nhập với tài khoản vừa tạo.
    *   *Tự động*: Script trong Postman sẽ tự động lưu `accessToken` và `refreshToken` vào Environment Variables sau khi đăng nhập thành công. Bạn không cần copy paste thủ công.
3.  **Verify Token**: Kiểm tra token hiện tại (sử dụng biến `{{access_token}}`).
4.  **Get Current User (Me)**: Lấy thông tin user hiện tại (sử dụng biến `{{access_token}}`).
5.  **Refresh Token**: Lấy token mới bằng refresh token (sử dụng biến `{{refresh_token}}`).
    *   *Tự động*: Script cũng sẽ cập nhật lại token mới vào biến môi trường.
6.  **Logout**: Đăng xuất tài khoản.

## Lưu ý
Nếu bạn muốn test thông qua **API Gateway** thay vì gọi trực tiếp vào service, hãy sửa biến `base_url` trong Collection Variable từ `http://localhost:3001` thành `http://localhost:8000`.
