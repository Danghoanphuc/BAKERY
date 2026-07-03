# 🔥 Hướng Dẫn Setup Firebase cho Bakery App

## 📋 Bước 1: Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** hoặc **"Tạo dự án"**
3. Đặt tên project (ví dụ: `bakery-app`)
4. Tắt Google Analytics nếu không cần
5. Click **"Create project"**

## 🔧 Bước 2: Tạo Web App

1. Trong Firebase Console, chọn project vừa tạo
2. Click vào icon **Web** (`</>`) để thêm ứng dụng web
3. Đặt tên app (ví dụ: `Bakery Web`)
4. **KHÔNG** chọn Firebase Hosting
5. Click **"Register app"**
6. Copy toàn bộ config object (bao gồm các key: `apiKey`, `authDomain`, `projectId`, v.v.)

## 📁 Bước 3: Cấu Hình Environment Variables

1. Copy file `.env.local.example` thành `.env.local`:

   ```bash
   copy .env.local.example .env.local
   ```

2. Mở file `.env.local` và điền thông tin Firebase config vừa copy:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=bakery-app-xxxxx.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=bakery-app-xxxxx
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=bakery-app-xxxxx.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:xxxxxxxxxxxxx
   ```

## 🗄️ Bước 4: Tạo Firestore Database

1. Trong Firebase Console, vào **"Build" > "Firestore Database"**
2. Click **"Create database"**
3. Chọn **"Start in production mode"** (sẽ cấu hình rules sau)
4. Chọn location gần bạn nhất (ví dụ: `asia-southeast1` cho Singapore)
5. Click **"Enable"**

## 🔐 Bước 5: Cấu Hình Firestore Rules

1. Vào **"Firestore Database" > "Rules"**
2. Paste rules sau (cho phép đọc public, ghi cần auth):

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Cho phép đọc categories và products công khai
    match /categories/{document=**} {
      allow read: if true;
      allow write: if request.auth != null; // Chỉ admin mới được ghi
    }

    match /products/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Orders cần authentication
    match /orders/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **"Publish"**

## 📦 Bước 6: Seed Dữ Liệu

Sau khi cấu hình xong, chạy script để import dữ liệu mẫu:

```bash
npm run seed
```

Kết quả sẽ hiển thị:

```
🚀 Bắt đầu seed dữ liệu vào Firebase...

🔥 Bắt đầu seed danh mục...
✅ Đã seed 8 danh mục thành công!
🔥 Bắt đầu seed sản phẩm...
✅ Đã seed 25 sản phẩm thành công!

🎉 Seed dữ liệu hoàn tất!
📊 Tổng kết:
   - 8 danh mục
   - 25 sản phẩm
```

## ✅ Bước 7: Kiểm Tra

1. Vào Firebase Console > Firestore Database
2. Kiểm tra 2 collections:
   - `categories` (8 documents)
   - `products` (25 documents)

3. Chạy dev server:

   ```bash
   npm run dev
   ```

4. Mở trình duyệt: `http://localhost:3000`
5. Trang chủ sẽ hiển thị danh mục và sản phẩm từ Firebase

## 🎨 Dữ Liệu Có Sẵn

### Danh Mục (8):

- Bánh Sinh Nhật 🎂
- Bánh Mì Ngọt 🥐
- Bánh Kem Lạnh 🍰
- Bánh Quy 🍪
- Bánh Tart & Pie 🥧
- Đồ Uống ☕
- Phụ Kiện Tiệc 🎈
- Combo Ưu Đãi 🎁

### Sản Phẩm (25):

- 4 bánh sinh nhật cao cấp
- 4 bánh mì ngọt
- 3 bánh kem lạnh
- 3 bánh quy
- 3 bánh tart/pie
- 3 đồ uống
- 3 phụ kiện
- 3 combo ưu đãi

## 📝 Lưu Ý Quan Trọng

1. **File `.env.local` không được commit lên Git** (đã có trong `.gitignore`)
2. **Giữ bí mật API keys**, không share public
3. Nếu làm việc nhóm, mỗi người cần tạo file `.env.local` riêng
4. Firestore có **free tier 50K reads/day**, đủ cho development

## 🚨 Troubleshooting

### Lỗi: "Firebase App named '[DEFAULT]' already exists"

- Restart dev server: `Ctrl+C` rồi `npm run dev` lại

### Lỗi: "Missing or insufficient permissions"

- Kiểm tra Firestore Rules đã cấu hình đúng chưa
- Đảm bảo rules cho phép `allow read: if true;` cho categories/products

### Lỗi: "Cannot find module 'firebase'"

- Chạy: `npm install firebase`

### Seed script bị lỗi

- Kiểm tra file `.env.local` đã điền đầy đủ thông tin chưa
- Đảm bảo Firestore Database đã được enable

## 📚 Tài Liệu Tham Khảo

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Get Started](https://firebase.google.com/docs/firestore/quickstart)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

**Chúc bạn setup thành công! 🎉**
