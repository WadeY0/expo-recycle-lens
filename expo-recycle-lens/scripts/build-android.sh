#!/bin/bash

echo "🚀 Starting Android APK build process..."

# Check if android folder exists
if [ ! -d "android" ]; then
    echo "📁 Android folder not found. Creating native project..."
    npx expo prebuild --platform android
    echo "✅ Native Android project created!"
else
    echo "📁 Android folder found!"
fi

# Navigate to android directory
cd android

echo "🔨 Building Debug APK..."

# Check if gradlew exists
if [ ! -f "./gradlew" ]; then
    echo "❌ gradlew not found in android directory"
    exit 1
fi

# Make gradlew executable
chmod +x ./gradlew

# Build debug APK (for distribution without Play Store)
echo "🐛 Building DEBUG APK for distribution..."
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo "✅ Debug APK built successfully!"
    echo "📍 Location: android/app/build/outputs/apk/debug/app-debug.apk"
    echo "📱 You can now install this APK on any device"
    echo "🎉 Build complete!"
else
    echo "❌ Build failed!"
    exit 1
fi