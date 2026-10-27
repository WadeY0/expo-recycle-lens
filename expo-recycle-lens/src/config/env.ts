import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

const env = {
  APP_ENV: extra.APP_ENV ?? "development",
  API_URL: extra.API_URL ?? "",
  API_TENANT_ID: String(extra.APP_TENANT_ID || "RECYCLELENS").toUpperCase(),
  APP_CLOUDINARY: extra.APP_CLOUDINARY ?? "",
};

if (!env.API_URL) {
  throw new Error("Missing API_URL");
}

if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(env.API_TENANT_ID)) {
  throw new Error("Invalid EXPO_PUBLIC_TENANT_ID");
}

export default env;
