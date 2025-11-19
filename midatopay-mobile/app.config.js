// Expo App Configuration
// This file handles environment variables and app configuration

import "dotenv/config";

export default {
  expo: {
    name: "MidatoPay",
    slug: "midatopay",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/cavos-icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/images/cavos-icon.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/cavos-icon.png",
        backgroundColor: "#000000",
      },
    },
    web: {
      favicon: "./assets/images/cavos-icon.png",
    },
    scheme: "midatopay",
    extra: {
      // Aegis SDK Configuration
      aegisAppId: process.env.AEGIS_APP_ID || "app-a5b17a105d604090e051a297a8fad33d",
      aegisApiSecret: process.env.AEGIS_API_SECRET || "demo-secret-key",
      aegisAppName: process.env.AEGIS_APP_NAME || "MidatoPay",
      aegisNetwork: process.env.AEGIS_NETWORK || "SN_SEPOLIA",
      aegisEnableLogging: process.env.AEGIS_ENABLE_LOGGING || "true",
      aegisPaymasterApiKey: process.env.AEGIS_PAYMASTER_API_KEY,
      aegisTrackingApiUrl: process.env.AEGIS_TRACKING_API_URL,
    },
  },
};
