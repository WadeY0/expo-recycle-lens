// app.config.ts
import { ConfigContext, ExpoConfig } from "expo/config";

const googleIosScheme = process.env.EXPO_PUBLIC_KEY_GOOGLE_IOS?.endsWith(
  ".apps.googleusercontent.com"
)
  ? `com.googleusercontent.apps.${process.env.EXPO_PUBLIC_KEY_GOOGLE_IOS.replace(".apps.googleusercontent.com", "")}`
  : undefined;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,

  name: "Recycle Lens",
  slug: "recycle-lens",
  version: "1.0.0",
  orientation: "portrait",

  icon: "./assets/images/systems/icon.png",
  scheme: "recyclelens",

  userInterfaceStyle: "automatic",

  android: {
    package: "com.quangakiyama.recyclelens",
  },
  ios: {
    bundleIdentifier: "com.quangakiyama.recyclelens",
  },
  web: {
    output: "static",
    favicon: "./assets/images/systems/favicon.png",
    bundler: "metro",
  },

  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
        android: {
          image: "./assets/images/systems/splash-icon.png",
          imageWidth: 76,
        },
      },
    ],
    [
      "expo-secure-store",
      {
        configureAndroidBackup: true,
      },
    ],
    ...(googleIosScheme
      ? [
          [
            "@react-native-google-signin/google-signin",
            { iosUrlScheme: googleIosScheme },
          ] as [string, { iosUrlScheme: string }],
        ]
      : []),
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    APP_ENV: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
    API_URL: process.env.EXPO_PUBLIC_API_URL ?? "https://api.example.com",
    APP_TENANT_ID: process.env.EXPO_PUBLIC_TENANT_ID ?? "RECYCLELENS",
    APP_CLOUDINARY:
      process.env.EXPO_PUBLIC_CLOUDINARY ??
      "https://res.cloudinary.com/dk0w90uw9/image/upload/",
  },
});
