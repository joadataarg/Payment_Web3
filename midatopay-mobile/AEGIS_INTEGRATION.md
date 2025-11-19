# Aegis SDK Integration Guide

This comprehensive integration guide demonstrates how to implement the Aegis SDK for Starknet wallet functionality in a React Native application. The example includes complete wallet management, authentication, balance queries, and transaction execution capabilities.

## Implementation Overview

This example application successfully implements the following core features:

**Core Infrastructure**

- AegisProvider Setup: Complete SDK integration with comprehensive configuration
- Multiple Authentication Methods: Email/password, Apple Sign-In, Google Sign-In, and in-app wallet creation
- Wallet Deployment: Create new Starknet wallets with gasless deployment using AVNU
- Secure Storage: Private keys stored securely using Expo SecureStore
- Wallet Persistence: Automatic wallet loading on application startup

**User Functionality**

- Balance Queries: Real-time ETH and STRK token balance checking
- Transaction Execution: Execute approve transactions using SDK methods
- Batch Transactions: Execute multiple calls in a single transaction
- Error Handling: Comprehensive error handling with user-friendly alerts
- Loading States: Visual feedback during all operations
- Voyager Integration: View transactions on Starknet explorer
- Address Management: Copy wallet addresses to clipboard

## Key Features

### Authentication and Wallet Management

**Multiple Authentication Methods**

- In-App Wallet Creation: Deploy new Starknet wallets directly within the application
- Email/Password Authentication: Traditional authentication with automatic wallet creation
- Apple Sign-In: OAuth authentication using Apple ID
- Google Sign-In: OAuth authentication using Google account
- Wallet Persistence: Automatic wallet loading on application restart

**Security and Storage**

- Uses Expo SecureStore for private key storage (device keychain/keystore)
- No private keys stored in plain text or transmitted over network
- Secure OAuth flow handling
- Comprehensive error handling and validation

### Transaction and Balance Management

**Transaction Execution**

- Execute single transactions using SDK methods
- Batch transaction support for multiple calls in one transaction
- Real-time transaction hash display and tracking
- Voyager explorer integration for transaction viewing
- Gasless transactions support (with AVNU paymaster)

**Balance Management**

- Real-time ETH balance queries
- STRK token balance checking
- Support for custom token balance queries
- Balance display with proper formatting

### User Interface and Experience

**User Experience Design**

- Clean, modern interface with dark theme
- Loading indicators for all operations
- Success/error alerts with detailed information
- Address copying functionality
- Input validation and user feedback
- Responsive design for different screen sizes

## Setup Instructions

### Prerequisites

Before setting up the application, ensure you have the following requirements:

- Node.js (version 16 or higher)
- npm or yarn package manager
- Expo CLI installed globally
- A mobile device or emulator for testing
- An Aegis account and App ID from https://aegis.cavos.xyz

### Installation Process

**Step 1: Install Dependencies**

Navigate to the project directory and install all required packages:

```bash
cd aegis-sdk-example
npm install
```

**Step 2: Environment Configuration**

The application uses environment variables for secure configuration management:

1. **Environment Variables Setup**:

   - Copy `.env.example` to `.env` if it exists
   - Configure your credentials in the environment file
   - Never commit `.env` files to version control

2. **Required Configuration**:
   - **App ID**: Set `AEGIS_APP_ID` in your `.env` file
   - **API Secret**: Set `AEGIS_API_SECRET` in your `.env` file
   - **Network**: SN_SEPOLIA (testnet) - configurable via `AEGIS_NETWORK`

Configuration is managed in `config.ts` and loaded from environment variables.

**Step 3: Launch the Application**

Start the development server:

```bash
npm start
```

The application will be available for testing on your chosen platform.

## Technical Implementation

### Application Initialization

The application initializes the Aegis SDK by wrapping the entire app with the `AegisProvider` component in `app/_layout.tsx`. This provides access to wallet functionality throughout the application.

**Configuration Setup**

```typescript
<AegisProvider
  config={{
    network: 'SN_SEPOLIA',                    // Starknet network
    appName: 'Aegis SDK Example',             // Application display name
    appId: 'your-app-id',                     // Obtained from https://aegis.cavos.xyz
    enableLogging: true,                      // Debug logging enabled
    paymasterApiKey: 'your-paymaster-key',    // Optional: AVNU paymaster for gasless transactions
    trackingApiUrl: 'your-tracking-url'       // Optional: Analytics tracking
  }}
>
```

### Wallet Deployment

The application creates new Starknet wallets using the `handleDeployWallet` function in `app/account.tsx`. This process uses gasless deployment, meaning users don't need ETH to create a wallet.

**Wallet Creation Process**

```typescript
const handleDeployWallet = async () => {
  // Deploy new wallet using gasless deployment
  const privateKey = await aegisAccount.deployAccount();

  // Save private key securely to device storage
  await SecureStore.setItemAsync("wallet_private_key", privateKey);

  // Update UI with new wallet address
  setWalletAddress(aegisAccount.address);
};
```

### Authentication Methods

The application supports multiple authentication methods to accommodate different user preferences and security requirements.

**Email/Password Authentication**

```typescript
const handleSignUp = async () => {
  // Register new user with automatic wallet creation
  const walletData = await signUp(email, password);

  // Handle wallet data and update UI
  setSocialWalletData(walletData);
  setWalletAddress(walletData.wallet?.address);
};
```

**Apple Sign-In Integration**

```typescript
const handleAppleLogin = async () => {
  // Get Apple OAuth URL
  const url = await aegisAccount.getAppleOAuthUrl(redirectUri);

  // Open browser for authentication
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);

  // Handle OAuth callback
  if (result.type === "success") {
    await aegisAccount.handleOAuthCallback(result.url);
    const walletData = await getSocialWallet();
    // Update UI with user data
  }
};
```

### Wallet Persistence

The application automatically loads existing wallets when the user returns to the app, providing a seamless user experience.

**Automatic Wallet Loading**

```typescript
const loadExistingWallet = async () => {
  const savedPrivateKey = await SecureStore.getItemAsync("wallet_private_key");
  if (savedPrivateKey && aegisAccount) {
    await aegisAccount.connectAccount(savedPrivateKey);
    setWalletAddress(aegisAccount.address);
  }
};
```

### Balance Management

Users can query their wallet balances for both ETH and token assets in real-time.

**Balance Query Implementation**

```typescript
// Get ETH balance
const ethBalance = await aegisAccount.getETHBalance();

// Get STRK token balance
const strkTokenAddress =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const tokenBalance = await aegisAccount.getTokenBalance(strkTokenAddress, 18);
```

### Transaction Execution

The application supports both single and batch transaction execution for various blockchain operations.

**Single Transaction Execution**

```typescript
const handleExecuteApprove = async () => {
  const result = await aegisAccount.executeBatch([
    {
      contractAddress: strkTokenAddress,
      entrypoint: "approve",
      calldata: [spenderAddress, approveAmount, "0"],
    },
  ]);

  console.log("Transaction hash:", result.transactionHash);
};
```

**Batch Transaction Execution**

```typescript
const handleExecuteBatch = async () => {
  const calls = [
    {
      contractAddress: strkTokenAddress,
      entrypoint: "approve",
      calldata: [spenderAddress, approveAmount, "0"],
    },
    {
      contractAddress: strkTokenAddress,
      entrypoint: "allowance",
      calldata: [currentAddress, spenderAddress],
    },
  ];

  const result = await aegisAccount.executeBatch(calls);
  console.log("Batch transaction hash:", result.transactionHash);
};
```

## File Structure

```
app/
├── _layout.tsx          # AegisProvider setup and app configuration
├── index.tsx            # Welcome screen with navigation
├── account.tsx          # Wallet deployment and authentication logic
└── balance.tsx          # Balance queries and transaction execution
```

## Configuration Options

The AegisProvider accepts these configuration options:

```typescript
{
  network: 'SN_SEPOLIA' | 'SN_MAINNET',  // Starknet network
  appName: 'Aegis SDK Example',           // Your app name
  appId: 'your-app-id',                   // Required: Get from https://aegis.cavos.xyz
  enableLogging: true,                    // Enable debug logs
  paymasterApiKey?: string,               // Optional: AVNU paymaster for gasless transactions
  trackingApiUrl?: string                 // Optional: Analytics tracking URL
}
```

## API Reference

### Aegis SDK Methods

#### Wallet Management

```typescript
// Deploy new wallet (gasless)
const privateKey = await aegisAccount.deployAccount();

// Connect existing wallet
await aegisAccount.connectAccount(privateKey);

// Get current wallet address
const address = aegisAccount.address;
```

#### Balance Queries

```typescript
// Get ETH balance
const ethBalance = await aegisAccount.getETHBalance();

// Get token balance
const tokenBalance = await aegisAccount.getTokenBalance(
  contractAddress, // Token contract address
  decimals // Token decimals (usually 18)
);
```

#### Transaction Execution

```typescript
// Execute single transaction
const result = await aegisAccount.execute(
  contractAddress, // Contract address
  entrypoint, // Function name
  calldata // Function parameters
);

// Execute batch transactions
const result = await aegisAccount.executeBatch([
  {
    contractAddress: "0x...",
    entrypoint: "approve",
    calldata: [spender, amount, "0"],
  },
  {
    contractAddress: "0x...",
    entrypoint: "transfer",
    calldata: [recipient, amount, "0"],
  },
]);
```

#### Authentication

```typescript
// Email/Password authentication
const walletData = await signUp(email, password);
const walletData = await signIn(email, password);
await signOut();

// Social authentication
const appleUrl = await aegisAccount.getAppleOAuthUrl(redirectUri);
const googleUrl = await aegisAccount.getGoogleOAuthUrl(redirectUri);
await aegisAccount.handleOAuthCallback(callbackUrl);
const walletData = await getSocialWallet();
```

## Security Considerations

**Important Security Guidelines**

1. **Private Key Storage**: Private keys are stored securely using Expo SecureStore, which utilizes the device's built-in security features
2. **No Network Transmission**: Private keys never leave the device and are not transmitted over the network
3. **User Responsibility**: Users should backup their private keys externally using secure methods
4. **App ID Required**: You must obtain a real App ID from https://aegis.cavos.xyz for production use

## Testing Procedures

### Wallet Deployment Testing

To test wallet deployment functionality:

1. Launch the application
2. Navigate to the welcome screen and tap "Connect"
3. Select "Deploy Wallet" on the account screen
4. Wait for the deployment process to complete
5. Verify that the wallet address is displayed correctly
6. Restart the application to test wallet persistence

### Transaction Execution Testing

To test transaction functionality:

1. Navigate to the balance screen after successful wallet deployment
2. Check ETH and STRK token balances
3. Configure transaction parameters (spender address and amount)
4. Execute single transactions using the "Execute Approve" button
5. Test batch transactions for multiple operations
6. Verify that transaction hashes are displayed correctly

### Expected Test Results

The application should demonstrate the following behaviors:

- Wallet deployment completes successfully
- Wallet addresses are displayed correctly
- Private keys are saved securely to device storage
- Wallets persist across application restarts
- Balance queries return accurate results
- Approve transactions execute successfully
- Batch transactions process multiple operations
- Transaction hashes are displayed for tracking
- Error handling provides appropriate user feedback

## Future Development Opportunities

This example provides a solid foundation for blockchain wallet integration. Consider extending the application with:

- **Additional Transaction Types**: Implement transfer, swap, or other contract interactions
- **Enhanced Authentication**: Expand OAuth integration and authentication methods
- **NFT Support**: Add functionality to query and interact with NFT contracts
- **Transaction History**: Implement display of past transactions
- **Gas Estimation**: Show estimated transaction costs before execution
- **Advanced Security**: Implement additional security features and user controls

## Troubleshooting Guide

### Common Issues and Solutions

**Issue: "Aegis SDK not initialized"**

- Ensure AegisProvider wraps your entire application
- Verify that the SDK is properly imported and configured

**Issue: Wallet deployment fails**

- Confirm your App ID is correct and valid
- Check network connectivity
- Ensure you're using the correct network (SN_SEPOLIA for testing)

**Issue: Wallet not persisting across sessions**

- Verify that expo-secure-store is properly installed
- Check SecureStore permissions on the device
- Ensure proper error handling for storage operations

## Support and Resources

- **Official Documentation**: https://docs.cavos.xyz
- **App ID Registration**: https://aegis.cavos.xyz
- **Community Support**: https://discord.gg/Vvq2ekEV47
