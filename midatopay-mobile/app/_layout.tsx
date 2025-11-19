/**
 * Root Layout Component
 *
 * This is the main layout component that wraps the entire application with the Aegis SDK.
 * The AegisProvider is essential for making the SDK functionality available throughout
 * the app via React Context.
 */

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AegisProvider } from "@cavos/aegis";
import { AEGIS_CONFIG } from "../config";

export default function RootLayout() {
  return (
    /**
     * AegisProvider - SDK Context Provider
     *
     * This provider makes the Aegis SDK functionality available to all child components
     * through React Context. It must wrap your entire app to enable wallet operations,
     * authentication, and transaction management.
     *
     * Key Features:
     * - Provides wallet management context
     * - Handles authentication state
     * - Manages network connections
     * - Enables transaction execution
     * - Provides balance querying capabilities
     */
    <AegisProvider
      config={{
        // Starknet network to connect to (testnet for development)
        network: AEGIS_CONFIG.network,

        // Application name displayed in wallet connections
        appName: AEGIS_CONFIG.appName,

        // Required: Your App ID from https://aegis.cavos.xyz
        appId: AEGIS_CONFIG.appId,

        // Enable debug logging for development
        enableLogging: AEGIS_CONFIG.enableLogging,

        // Optional: AVNU Paymaster API key for gasless transactions
        paymasterApiKey: AEGIS_CONFIG.paymasterApiKey,

        // Optional: Custom tracking URL for analytics
        trackingApiUrl: AEGIS_CONFIG.trackingApiUrl,
      }}
    >
      {/* Status bar configuration for dark theme */}
      <StatusBar style="light" backgroundColor="#000000" />

      {/* Navigation stack with custom styling */}
      <Stack
        screenOptions={{
          // Hide default headers (we use custom headers in each screen)
          headerShown: false,

          // Set dark background for all screens
          contentStyle: { backgroundColor: "#000000" },
        }}
      />
    </AegisProvider>
  );
}

/**
 * Usage in Child Components:
 *
 * To access the Aegis SDK functionality in any component, use the useAegis hook:
 *
 * ```typescript
 * import { useAegis } from "@cavos/aegis";
 *
 * function MyComponent() {
 *   const {
 *     aegisAccount,     // Account manager for wallet operations
 *     currentAddress,   // Current wallet address
 *     signUp,          // User registration function
 *     signIn,          // User authentication function
 *     signOut,         // User logout function
 *     getSocialWallet  // Get social wallet data
 *   } = useAegis();
 *
 *   // Use the SDK functions...
 * }
 * ```
 *
 * Available SDK Methods:
 * - aegisAccount.deployAccount() - Deploy new Starknet wallet
 * - aegisAccount.connectAccount(privateKey) - Connect existing wallet
 * - aegisAccount.getETHBalance() - Get ETH balance
 * - aegisAccount.getTokenBalance(address, decimals) - Get token balance
 * - aegisAccount.execute(contract, method, calldata) - Execute single transaction
 * - aegisAccount.executeBatch(calls) - Execute multiple transactions
 * - aegisAccount.getAppleOAuthUrl(redirectUri) - Get Apple OAuth URL
 * - aegisAccount.getGoogleOAuthUrl(redirectUri) - Get Google OAuth URL
 * - aegisAccount.handleOAuthCallback(url) - Handle OAuth callback
 */
