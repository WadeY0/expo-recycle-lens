# ** GreenLens - Smart Environmental App ** 🌱📱

GreenLens – Ứng dụng môi trường thông minh, giúp bạn nhận diện rác thải, học cách tái chế và góp phần bảo vệ hành tinh xanh! ♻️🌍

Quét nhận diện rác thải bằng AI, tra cứu thư viện môi trường, đọc bài viết xanh và xây dựng lối sống bền vững! 🔍✨

![alt text](https://res.cloudinary.com/dks2uuwb6/image/upload/v1777285222/thumbnail_wrkc3j.jpg)

## [DEMO-VIDEO - DRIVE LINK](https://res.cloudinary.com/dks2uuwb6/video/upload/v1777218594/ScreenRecording_04-26-2026_22-45-00_1_mq7e1u.mov)

## 🚀 Tính năng chính

### **📷 Quét nhận diện rác thải AI**
- Chụp ảnh để nhận diện loại rác thải
- Phân loại tự động bằng công nghệ AI
- Hướng dẫn cách xử lý và tái chế
- Lưu lịch sử quét để theo dõi

![alt text](https://res.cloudinary.com/dks2uuwb6/image/upload/v1777217699/1_ya3486.png)

### **📚 Thư viện môi trường**
- Tra cứu thông tin về các loại rác thải
- Danh mục đầy đủ về tái chế
- Hướng dẫn phân loại rác chi tiết
- Cập nhật kiến thức môi trường mới

![alt text](https://res.cloudinary.com/dks2uuwb6/image/upload/v1777217698/8_ozxssj.png)

### **📰 Bài viết môi trường**
- Đọc tin tức về bảo vệ môi trường
- Mẹo vặt sống xanh hàng ngày
- Lọc bài viết theo danh mục
- Sắp xếp và tìm kiếm dễ dàng

![alt text](https://res.cloudinary.com/dks2uuwb6/image/upload/v1777217699/9_sk9jqe.png)

### **❤️ Quản lý yêu thích**
- Lưu bài viết yêu thích
- Bookmark thông tin hữu ích
- Truy cập nhanh nội dung đã lưu
- Chia sẻ kiến thức với bạn bè

![alt text](https://res.cloudinary.com/dks2uuwb6/image/upload/v1777217698/10_da8tbz.png)

### **👤 Quản lý tài khoản**
- Đăng nhập với Google
- Theo dõi lịch sử hoạt động
- Cập nhật thông tin cá nhân
- Thiết lập tùy chọn ứng dụng

![alt text](https://res.cloudinary.com/dks2uuwb6/image/upload/v1777217697/11_hfrxay.png)

## 🛠️ Công nghệ sử dụng

- **Framework:** React Native với Expo
- **Navigation:** Expo Router
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **Styling:** NativeWind (Tailwind CSS)
- **AI Vision:** Expo Camera + Vision API
- **Authentication:** Google Sign-In
- **Forms:** React Hook Form + Zod validation
- **Storage:** AsyncStorage + Expo SecureStore
- **Icons:** Iconsax React Native
- **Image Processing:** Expo Image Picker

## 📱 Cài đặt và chạy dự án

### Yêu cầu hệ thống
- Node.js >= 18.0.0
- npm hoặc yarn
- Expo CLI
- Android Studio (cho Android)
- Xcode (cho iOS)

### Cài đặt
```bash
# Clone repository
git clone <repository-url>
cd expo-green-lens

# Cài đặt dependencies
npm install

# Khởi động development server
npm start

# Chạy trên Android
npm run android

# Chạy trên iOS
npm run ios

# Chạy trên Web
npm run web
```

### Scripts có sẵn
```bash
npm start              # Khởi động Expo development server
npm run android        # Chạy trên Android
npm run ios            # Chạy trên iOS  
npm run web            # Chạy trên Web
npm run lint           # Kiểm tra code style
npm run prebuild       # Tạo native code
npm run build:android  # Build APK cho Android
npm run reset-project  # Reset dự án về trạng thái ban đầu
```

## 📁 Cấu trúc dự án

```
src/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   ├── (protected)/       # Protected app screens
│   └── (tabs)/            # Tab navigation screens
├── features/              # Feature modules
│   ├── auth/              # Xác thực người dùng
│   ├── scan/              # Quét nhận diện rác thải
│   ├── articles/          # Bài viết môi trường
│   ├── waste-library/     # Thư viện rác thải
│   ├── home/              # Trang chủ
│   ├── profile/           # Hồ sơ người dùng
│   └── onboarding/        # Giới thiệu ứng dụng
├── shared/                # Shared utilities
│   ├── api/               # API configuration
│   ├── components/        # Common UI components
│   ├── constants/         # App constants
│   ├── hooks/             # Custom hooks
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
└── styles/                # Global styles
```

## 🌱 Tính năng nổi bật

- **AI Vision**: Công nghệ nhận diện hình ảnh tiên tiến
- **Thư viện đầy đủ**: Hàng ngàn loại rác thải và cách xử lý
- **Nội dung chất lượng**: Bài viết từ các chuyên gia môi trường
- **Giao diện thân thiện**: Thiết kế hiện đại, dễ sử dụng
- **Hoạt động offline**: Một số tính năng hoạt động không cần internet

**GreenLens** - Ứng dụng môi trường thông minh, cùng bảo vệ hành tinh xanh! 🌍✨
