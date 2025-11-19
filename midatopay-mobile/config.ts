/**
 * Aegis SDK Configuration
 *
 * This file contains the configuration settings for the Aegis SDK integration.
 * It loads configuration from environment variables for security.
 *
 * REQUIRED: You must set the following environment variables:
 * - AEGIS_APP_ID: Your Aegis App ID from https://aegis.cavos.xyz
 * - AEGIS_API_SECRET: Your Aegis API Secret from https://aegis.cavos.xyz
 *
 * Create a .env file in the project root with these variables.
 * See .env.example for reference.
 *
 * IMPORTANT: Never commit sensitive values like API secrets to public repositories.
 * Use environment variables or secure configuration management in production.
 */

import Constants from "expo-constants";

// Validate required environment variables
if (!Constants.expoConfig?.extra?.aegisAppId) {
  throw new Error(
    "AEGIS_APP_ID environment variable is required. Please set it in your .env file or environment."
  );
}

if (!Constants.expoConfig?.extra?.aegisApiSecret) {
  console.warn("AEGIS_API_SECRET not configured - using demo mode");
}

export const AEGIS_CONFIG = {
  /**
   * App ID - Required for Aegis SDK authentication
   *
   * This is your unique application identifier obtained from https://aegis.cavos.xyz
   * Each app needs its own App ID to interact with the Aegis platform.
   *
   * Must be set via environment variable AEGIS_APP_ID
   */
  appId: Constants.expoConfig?.extra?.aegisAppId,

  /**
   * API Secret - Required for server-side operations
   *
   * This secret key is used for authenticating API requests to the Aegis platform.
   * Keep this value secure and never expose it in client-side code or public repositories.
   *
   * Must be set via environment variable AEGIS_API_SECRET
   */
  apiSecret: Constants.expoConfig?.extra?.aegisApiSecret,

  /**
   * Application Configuration
   */

  // Display name for your application (shown in wallet connections)
  appName: Constants.expoConfig?.extra?.aegisAppName || "MidatoPay",

  // Starknet network to connect to
  // Options: 'SN_SEPOLIA' (testnet) or 'SN_MAINNET' (mainnet)
  network:
    (Constants.expoConfig?.extra?.aegisNetwork as
      | "SN_SEPOLIA"
      | "SN_MAINNET") || "SN_SEPOLIA",

  /**
   * Optional Configuration
   */

  // Enable debug logging for development
  // Set to false in production to reduce console output
  enableLogging:
    Constants.expoConfig?.extra?.aegisEnableLogging === "true" || true,

  /**
   * AVNU Paymaster API Key - For gasless transactions
   *
   * This optional key enables gasless transactions using AVNU's paymaster service.
   * Get your API key from https://avnu.fi/
   *
   * When provided, users won't need ETH to pay for transaction fees.
   * This is especially useful for onboarding new users to Starknet.
   */
  paymasterApiKey:
    Constants.expoConfig?.extra?.aegisPaymasterApiKey || undefined,

  /**
   * Custom Tracking API URL - For analytics and monitoring
   *
   * Optional URL for sending analytics data about wallet operations.
   * Useful for monitoring user behavior and transaction success rates.
   */
  trackingApiUrl: Constants.expoConfig?.extra?.aegisTrackingApiUrl || undefined,
};

/**
 * Security Best Practices:
 *
 * 1. Environment Variables: Always use environment variables for sensitive data
 * 2. Never Commit Secrets: Never commit API secrets or private keys to version control
 * 3. Use .env file: Create a .env file with your actual values (see .env.example)
 * 4. Production Security: Consider using a secrets management service in production
 * 5. Regular Rotation: Regularly rotate API keys and secrets
 * 6. Access Control: Limit access to configuration files to authorized developers only
 * 7. Validation: Required environment variables are validated at startup
 *
 * Setup Instructions:
 * 1. Copy .env.example to .env
 * 2. Fill in your actual Aegis App ID and API Secret
 * 3. Optionally configure other settings
 * 4. Never commit the .env file to version control
 */
