# Aegis SDK Example Application

This is a comprehensive example application demonstrating how to integrate the Aegis SDK for Starknet wallet functionality. The application showcases wallet creation, authentication, balance management, and transaction execution in a mobile environment.

## What This Application Does

This example application provides a complete demonstration of blockchain wallet functionality, including:

- **Wallet Creation**: Users can create new Starknet wallets directly within the application
- **Multiple Authentication Methods**: Support for email/password, Apple Sign-In, and Google Sign-In
- **Balance Management**: View ETH and token balances in real-time
- **Transaction Execution**: Send and approve transactions on the Starknet network
- **Secure Storage**: Private keys are stored securely on the device

## Getting Started

### Prerequisites

Before running this application, ensure you have the following installed:

- Node.js (version 16 or higher)
- npm or yarn package manager
- Expo CLI (for mobile development)
- A mobile device or emulator for testing

### Installation Steps

1. **Install Dependencies**

   Navigate to the project directory and install all required packages:

   ```bash
   npm install
   ```

2. **Start the Application**

   Launch the development server:

   ```bash
   npx expo start
   ```

3. **Run on Device**

   The application can be run on:

   - Physical mobile devices using the Expo Go app
   - iOS Simulator (for iOS development)
   - Android Emulator (for Android development)
   - Web browsers (limited functionality)

## Project Structure

The application is organized into several key components:

- **Configuration**: Settings and environment variables for the Aegis SDK
- **Authentication**: User login and wallet connection functionality
- **Balance Management**: Display and query wallet balances
- **Transaction Handling**: Execute and track blockchain transactions

## Key Features Explained

### Wallet Management

The application allows users to create and manage Starknet wallets without requiring prior blockchain knowledge. Wallets are created using gasless deployment, meaning users don't need ETH to get started.

### Security

All private keys are stored securely on the device using the device's built-in security features. Private keys never leave the device and are not transmitted over the network.

### User Experience

The interface is designed to be intuitive for both technical and non-technical users, with clear instructions and helpful error messages.

## Development

This project uses modern React Native development practices with TypeScript for type safety and better code quality.

### File Organization

- **app/**: Main application code
- **config.ts**: Configuration settings
- **AEGIS_INTEGRATION.md**: Detailed integration documentation

### Customization

The application can be customized by modifying the configuration settings in `config.ts` and adding new features to the existing components.

## Support and Documentation

For detailed integration instructions and API documentation, refer to the `AEGIS_INTEGRATION.md` file included in this project.

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/): Learn about mobile app development with Expo
- [React Native Documentation](https://reactnative.dev/): Understand the underlying framework
- [Starknet Documentation](https://docs.starknet.io/): Learn about the Starknet blockchain
