# Swagger API Testing Guide

Hướng dẫn chi tiết cách test Auth Service API sử dụng Swagger UI.

## 1. Truy cập Swagger UI

1.  Đảm bảo server đang chạy: `npm run dev`
2.  Mở browser truy cập: `http://localhost:3001/api-docs`

## 2. Quy trình Test Cơ Bản (Authentication Flow)

Thực hiện theo thứ tự các bước sau để test luồng đăng ký và đăng nhập.

### Bước 1: Register (Đăng ký)

1.  Tìm section **Authentication** > **POST /api/v1/auth/register**.
2.  Click **Try it out**.
3.  Nhập thông tin mẫu:
    ```json
    {
      "email": "testuser@example.com",
      "password": "Password123!",
      "firstName": "Test",
      "lastName": "User",
      "phoneNumber": "+1234567890",
      "role": "CUSTOMER"
    }
    ```
4.  Active nút **Execute**.
5.  Kiểm tra Response: `201 Created`. Lưu lại `userId` nếu cần.
    *   *Lưu ý*: Email verification token sẽ được log ra terminal của server (do chưa setup SMTP thật).

### Bước 2: Login (Đăng nhập)

1.  Tìm section **Authentication** > **POST /api/v1/auth/login**.
2.  Click **Try it out**.
3.  Nhập thông tin vừa đăng ký:
    ```json
    {
      "email": "testuser@example.com",
      "password": "Password123!"
    }
    ```
4.  Click **Execute**.
5.  Response `200 OK` trả về `accessToken` và `refreshToken`.
6.  **Copy chuỗi `accessToken`** (không bao gồm dấu ngoặc kép).

### Bước 3: Authorize (Xác thực)

Để test các API bảo mật (có biểu tượng ổ khóa 🔒), bạn cần nhập token.

1.  Scroll lên đầu trang Swagger.
2.  Click nút **Authorize** (màu xanh lá/ổ khóa).
3.  Trong ô Value, nhập: `Bearer <access_token_vua_copy>`
    *   Ví dụ: `Bearer eyJhbGciOiJIUzI1NiIs...`
4.  Click **Authorize** -> **Close**.

### Bước 4: Test Protected Endpoints

1.  Tìm section **Authentication** > **GET /api/v1/auth/me**.
2.  Click **Try it out** -> **Execute**.
3.  Nếu Authorize thành công, bạn sẽ nhận được `200 OK` với thông tin user.
4.  Nếu nhận `401 Unauthorized`, token có thể sai hoặc hết hạn.

### Bước 5: Refresh Token (Làm mới token)

1.  Tìm **Authentication** > **POST /api/v1/auth/refresh-token**.
2.  Nhập `refreshToken` nhận được từ bước Login.
3.  **Execute**.
4.  Nhận cặp token mới.

## 3. Quy trình Test 2FA (Two-Factor Authentication)

### Bước 1: Setup 2FA

1.  Đảm bảo đã Authorize (Bước 3 ở trên).
2.  Tìm section **Two-Factor Authentication** > **POST /api/v1/auth/2fa/setup**.
3.  **Execute**.
4.  Response trả về `secret` và `qrCodeUrl`.
5.  Copy `secret`.

### Bước 2: Enable 2FA

1.  Tìm **POST /api/v1/auth/2fa/enable**.
2.  Dùng ứng dụng Authenticator (Google Auth/Authy) hoặc tool online để tạo mã TOTP từ `secret`.
3.  Nhập body:
    ```json
    {
      "secret": "<secret_from_setup>",
      "token": "<6_digit_code>",
      "backupCodes": ["CODE1", "CODE2"] // Copy từ response setup
    }
    ```
4.  **Execute**. Nhận `200 OK`.

### Bước 3: Verify Login with 2FA

1.  Logout hoặc Login lại.
2.  Khi Login (`POST /login`), nếu nhập đúng password, server sẽ trả về:
    ```json
    {
      "requires2FA": true,
      "message": "2FA code required"
      // tempToken (nếu có implementation trả về tempToken)
    }
    ```
    *   *Note*: Trong implementation hiện tại, endpoint login yêu cầu `twoFactorCode` ngay trong body nếu user đã bật 2FA.
3.  Gọi lại Login với code:
    ```json
    {
      "email": "testuser@example.com",
      "password": "Password123!",
      "twoFactorCode": "<current_6_digit_code>"
    }
    ```
4.  Nhận Token.

## Common Issues

-   **401 Unauthorized**: Quên bấm nút Authorize hoặc token hết hạn.
-   **403 Forbidden**: User không có quyền (Role không đúng).
-   **Email Verification**: Check console log server để lấy token verify nếu cần test flow `verify-email`.
