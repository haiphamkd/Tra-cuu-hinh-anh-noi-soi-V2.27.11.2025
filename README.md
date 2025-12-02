# Hệ thống Tra cứu Hồ sơ Nội soi

Dự án này là một ứng dụng Web App (React/Vite) giúp tra cứu và quản lý hồ sơ bệnh nhân từ Google Drive một cách trực quan, nhanh chóng.

## Hướng dẫn cài đặt Logo (Quan trọng)

Để thay đổi logo và giữ cho nó không bị mất mỗi khi cập nhật code, bạn **BẮT BUỘC** phải làm như sau trên máy tính:

1.  Chuẩn bị file logo của bạn, đổi tên thành `logo.png`.
2.  Copy file đó vào thư mục `public/` **trên máy tính của bạn**.
3.  Sau đó mới thực hiện các lệnh git (`git add`, `git commit`, `git push`).

**Lưu ý:** Nếu bạn chỉ upload logo trên trang web GitHub, lần sau bạn đẩy code từ máy tính lên, logo sẽ bị xóa mất do cơ chế đồng bộ của Git.

## Cài đặt & Chạy thử

1.  Cài đặt thư viện:
    ```bash
    npm install
    ```

2.  Chạy thử (Local):
    ```bash
    npm run dev
    ```

3.  Đóng gói (Build) để deploy:
    ```bash
    npm run build
    ```

## Cấu hình Biến môi trường (Trên Netlify)

Để bảo mật và tiện lợi, hãy cấu hình các biến sau trên Netlify (Site settings > Environment variables):

*   `VITE_GOOGLE_API_KEY`: API Key của Google Drive.
*   `VITE_ROOT_FOLDER_ID`: ID thư mục gốc chứa hồ sơ.
*   `VITE_ADMIN_PASSWORD`: Mật khẩu để vào trang cấu hình (Mặc định: admin123).
