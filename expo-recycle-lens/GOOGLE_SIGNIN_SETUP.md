# Hướng dẫn cấu hình Google Sign In cho Expo (Native Build)

## ⚠️ LƯU Ý QUAN TRỌNG CHO EXPO

Với Expo và native build, có một số điểm khác biệt quan trọng:

### Expo Go vs Native Build
- **Expo Go**: Google Sign In **KHÔNG** hoạt động với Expo Go
- **Native Build**: Cần tạo native project và build trực tiếp
- **Local Build**: Sử dụng `npx expo run:android` hoặc build manual

### Commands để tạo native project:
```bash
# Tạo native Android project (nếu chưa có)
npx expo prebuild --platform android

# Hoặc tạo cả hai platform
npx expo prebuild
```

## 1. Cấu hình Google Console

### Bước 1: Tạo project trên Google Cloud Console
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Bật Google Sign-In API

### Bước 2: Cấu hình OAuth consent screen
1. Vào **APIs & Services > OAuth consent screen**
2. Chọn **External** và điền thông tin cần thiết:
   - App name: Tên ứng dụng của bạn
   - User support email: Email hỗ trợ
   - Developer contact information: Email developer

### Bước 3: Tạo OAuth 2.0 Client IDs
1. Vào **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Tạo 3 client IDs:

#### Web Client ID (cho backend)
- Application type: **Web application**
- Name: "Web Client"
- Authorized redirect URIs: URL backend của bạn

#### iOS Client ID (cho iosUrlScheme)
- Application type: **iOS**
- Name: "iOS Client"
- Bundle ID: `com.aki.greenlens` (từ app.config.ts)
- App Store ID và Team ID có thể để trống cho development

#### Android Client ID (cho APK Build)
- Application type: **Android**
- Name: "Android Client"
- Package name: `com.aki.greenlens` (từ app.config.ts)
- SHA-1 certificate fingerprint: 

**Cho APK build (sử dụng debug keystore):**
```bash
# Lấy SHA-1 từ debug keystore mặc định của Android
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Kết quả sẽ tương tự như:**
```
SHA1: A1:B2:C3:D4:E5:F6:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12
```

Copy SHA1 này và paste vào Google Console.

## 2. Cấu hình trong ứng dụng

### Cập nhật Client IDs

#### 2.1 Web Client ID
Trong file `src/features/auth/lib/google-signin-helper.ts`, thay thế:
```typescript
webClientId: 'YOUR_WEB_CLIENT_ID.googleusercontent.com',
```
Bằng **Web Client ID** thực tế từ Google Console.

#### 2.2 iOS Client ID & URL Scheme
Trong file `google-signin-helper.ts`, thay thế:
```typescript
iosClientId: '263543007402-YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
```
Bằng **iOS Client ID** thực tế từ Google Console.

Trong file `app.config.ts`, thay thế:
```typescript
iosUrlScheme: "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID"
```
Bằng **iOS Client ID** (reversed) từ Google Console.

**Lưu ý:** iOS Client ID có dạng: `123456789-abcdef.apps.googleusercontent.com`
- `iosClientId`: `123456789-abcdef.apps.googleusercontent.com`
- `iosUrlScheme`: `com.googleusercontent.apps.123456789-abcdef`

## 3. Cấu hình Expo (Đã hoàn thành)

### ✅ Plugin đã được thêm vào app.config.ts:
```typescript
[
  "@react-native-google-signin/google-signin",
  {
    iosUrlScheme: "com.aki.greenlens"
  }
],
```

### ✅ Package đã được cài đặt:
```bash
npm install @react-native-google-signin/google-signin
```

## 4. Native Build Setup

### Tạo native Android project:
```bash
# Prebuild để tạo android folder
npx expo prebuild --platform android

# Hoặc tạo cả iOS và Android
npx expo prebuild
```

### Build commands:
```bash
# Sử dụng script helper (khuyến nghị)
npm run build:android

# Hoặc build manual
cd android && ./gradlew assembleDebug

# Hoặc sử dụng expo CLI
npx expo run:android --variant debug
```

**Lưu ý:** Chỉ build debug APK vì sử dụng debug keystore mặc định.

## 5. Testing với Native Build

### ❌ KHÔNG hoạt động với Expo Go:
```bash
expo start
# Scan QR với Expo Go → Google Sign In sẽ fail
```

### ✅ Hoạt động với Native Build:
```bash
# 1. Tạo native project (chỉ cần chạy 1 lần)
npm run prebuild:android

# 2. Build APK (sử dụng script helper)
npm run build:android

# 3. Hoặc build manual
cd android && ./gradlew assembleDebug

# APK sẽ tạo tại: android/app/build/outputs/apk/debug/app-debug.apk
```

### ✅ Testing trên Web (localhost):
```bash
expo start --web
# Google Sign In hoạt động trên web
```

## 6. Lưu ý quan trọng cho Native Build:

### 🚨 Critical:
- **Google Sign In KHÔNG hoạt động với Expo Go**
- **Bắt buộc phải dùng Native Build (prebuild + gradle)**
- Web Client ID là bắt buộc và phải được cấu hình đúng

### 🔧 Configuration:
- Package name: `com.aki.greenlens` (từ app.config.ts) 
- SHA-1 fingerprint: Từ debug keystore mặc định của Android
- Web Client ID: Từ Google Console
- Backend cần xử lý Google ID token đúng cách

### 🚀 Quick Start (3 bước đơn giản):
1. **Cấu hình Google Console:**
   - Tạo **Web Client ID** 
   - Tạo **iOS Client ID** với bundle `com.aki.greenlens`
   - Tạo **Android Client ID** với package `com.aki.greenlens` và SHA-1 từ: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`

2. **Update code:**
   - Thay `webClientId` trong `google-signin-helper.ts`
   - Thay `iosClientId` trong `google-signin-helper.ts` 
   - Thay `iosUrlScheme` trong `app.config.ts`

3. **Build & Test:**
   ```bash
   npm run prebuild:android    # Tạo native project (1 lần)
   npm run build:android       # Build APK
   ```

### 📁 APK Location:
- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Cài đặt**: Copy APK vào điện thoại và install

## 🐛 Troubleshooting

### Lỗi: `iosUrlScheme` must start with "com.googleusercontent.apps"

**Nguyên nhân:** `iosUrlScheme` phải là reversed iOS Client ID, không phải bundle ID.

**Cách fix:**
1. Tạo **iOS Client ID** trên Google Console
2. Lấy iOS Client ID (dạng: `123456789-abcdef.apps.googleusercontent.com`)
3. Chuyển thành reversed format: `com.googleusercontent.apps.123456789-abcdef`
4. Update trong `app.config.ts`:
   ```typescript
   iosUrlScheme: "com.googleusercontent.apps.123456789-abcdef"
   ```

### Lỗi: "failed to determine clientID - GoogleService-Info.plist was not found"

**Nguyên nhân:** Thiếu `iosClientId` config, Google Sign In không thể determine iOS client.

**Cách fix:**
1. Lấy **iOS Client ID** từ Google Console
2. Update trong `google-signin-helper.ts`:
   ```typescript
   GoogleSignin.configure({
     webClientId: 'YOUR_WEB_CLIENT_ID.googleusercontent.com',
     iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // ← Thêm dòng này
     // ...
   });
   ```