/**
 * Balance Screen - Wallet Management & Transaction Execution
 *
 * This screen provides comprehensive wallet management functionality including:
 * - ETH and token balance queries
 * - Transaction execution (approve, batch transactions)
 * - Transaction history viewing
 * - Voyager explorer integration
 *
 * Key Features:
 * - Real-time balance queries
 * - Secure transaction execution
 * - Batch transaction support
 * - Transaction hash tracking
 * - Voyager explorer integration
 * - Error handling and user feedback
 * - Loading states for all operations
 */

import {
  Text,
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useAegis } from "@cavos/aegis";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";

export default function Balance() {
  const router = useRouter();

  // Aegis SDK hooks - provides access to wallet and transaction functions
  const { aegisAccount, currentAddress } = useAegis();

  // State for balance data and loading indicators
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [isLoadingEth, setIsLoadingEth] = useState(false);
  const [isLoadingToken, setIsLoadingToken] = useState(false);

  // State for transaction execution
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastTransactionHash, setLastTransactionHash] = useState<string | null>(
    null
  );

  // Fixed values for demonstration (in production, these would be user inputs)
  const spenderAddress = "0x1234567890123456789012345678901234567890";
  const approveAmount = "500000000000000000"; // 0.5 ETH in wei (18 decimals)

  /**
   * Balance Query Functions
   *
   * These functions query the current wallet's ETH and token balances
   * using the Aegis SDK. They provide real-time balance information
   * and handle errors gracefully.
   */

  /**
   * Get STRK Token Balance
   *
   * This function queries the STRK token balance for the current wallet.
   * STRK is the native token of the Starknet network.
   *
   * Process:
   * 1. Validate SDK initialization
   * 2. Call SDK getTokenBalance method with STRK contract address
   * 3. Update UI state with balance
   * 4. Show success alert with balance
   * 5. Handle errors gracefully
   *
   * Note: The STRK token address is specific to the Sepolia testnet.
   * For mainnet, you would use the mainnet STRK token address.
   */
  const handleGetSTRKBalance = async () => {
    if (!aegisAccount) {
      Alert.alert("Error", "Aegis SDK not initialized");
      return;
    }

    setIsLoadingToken(true);
    try {
      // STRK token address on Sepolia testnet
      const strkTokenAddress =
        "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

      // Query token balance (18 decimals for STRK)
      const balance = await aegisAccount.getTokenBalance(strkTokenAddress, 18);
      setTokenBalance(balance);
      console.log("STRK balance:", balance);
      Alert.alert("STRK Balance", `Balance: ${balance} STRK`);
    } catch (error) {
      console.error("Failed to get STRK balance:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      Alert.alert("Error", `Failed to get STRK balance: ${errorMessage}`);
    } finally {
      setIsLoadingToken(false);
    }
  };

  /**
   * Get ETH Balance
   *
   * This function queries the ETH balance for the current wallet.
   * ETH is the native currency of the Starknet network.
   *
   * Process:
   * 1. Validate SDK initialization
   * 2. Call SDK getETHBalance method
   * 3. Update UI state with balance
   * 4. Show success alert with balance
   * 5. Handle errors gracefully
   *
   * Note: This queries the native ETH balance, not wrapped ETH (WETH).
   */
  const handleGetETHBalance = async () => {
    if (!aegisAccount) {
      Alert.alert("Error", "Aegis SDK not initialized");
      return;
    }

    setIsLoadingEth(true);
    try {
      // Query native ETH balance
      const balance = await aegisAccount.getETHBalance();
      setEthBalance(balance);
      console.log("ETH balance:", balance);
      Alert.alert("ETH Balance", `Balance: ${balance} ETH`);
    } catch (error) {
      console.error("Failed to get ETH balance:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      Alert.alert("Error", `Failed to get ETH balance: ${errorMessage}`);
    } finally {
      setIsLoadingEth(false);
    }
  };

  /**
   * Utility Functions
   *
   * These functions handle navigation and utility operations
   * like copying addresses to clipboard.
   */

  /**
   * Navigate Back to Account Screen
   *
   * This function navigates back to the account screen where users can
   * manage their wallet connection and authentication.
   */
  const handleGoBack = () => {
    // Navigate back to account screen
    router.back();
  };

  /**
   * Copy Wallet Address to Clipboard
   *
   * This function copies the current wallet address to the device's clipboard.
   * Useful for sharing the address or using it in other applications.
   */
  const handleCopyAddress = async () => {
    if (currentAddress) {
      try {
        await Clipboard.setStringAsync(currentAddress);
        console.log("Copy address to clipboard:", currentAddress);
        Alert.alert("Copied", "Address copied to clipboard");
      } catch (error) {
        console.error("Failed to copy address:", error);
        Alert.alert("Error", "Failed to copy address");
      }
    }
  };

  /**
   * Transaction Execution Functions
   *
   * These functions handle the execution of transactions on Starknet
   * using the Aegis SDK. They support both single and batch transactions.
   */

  /**
   * Execute Approve Transaction
   *
   * This function executes an ERC-20 approve transaction, allowing a spender
   * to transfer tokens on behalf of the wallet owner.
   *
   * Process:
   * 1. Validate SDK initialization
   * 2. Prepare transaction parameters (contract, spender, amount)
   * 3. Execute transaction using SDK executeBatch method
   * 4. Store transaction hash for tracking
   * 5. Show success message with transaction details
   * 6. Handle errors gracefully
   *
   * Security: The transaction is signed using the wallet's private key
   * and submitted to the Starknet network. The user must have sufficient
   * ETH for gas fees (unless using a paymaster).
   */
  const handleExecuteApprove = async () => {
    if (!aegisAccount) {
      Alert.alert("Error", "Aegis SDK not initialized");
      return;
    }

    setIsExecuting(true);
    try {
      // STRK token address on Sepolia testnet
      const strkTokenAddress =
        "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

      console.log("Executing approve transaction:", {
        contract: strkTokenAddress,
        spender: spenderAddress,
        amount: approveAmount,
        currentAddress: currentAddress,
      });

      // Execute approve transaction using SDK executeBatch method
      // This allows for future expansion to multiple calls in one transaction
      const result = await aegisAccount.executeBatch([
        {
          contractAddress: strkTokenAddress,
          entrypoint: "approve",
          calldata: [spenderAddress, approveAmount, "0"],
        },
      ]);

      // Store transaction hash for tracking and display
      setLastTransactionHash(result.transactionHash);

      Alert.alert(
        "Transaction Successful!",
        `Approve transaction executed successfully.\n\nTransaction Hash: ${result.transactionHash}\n\nSpender: ${spenderAddress}\nAmount: ${approveAmount}`,
        [{ text: "OK" }]
      );

      console.log("Approve transaction result:", result);
    } catch (error) {
      console.error("Failed to execute approve transaction:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      Alert.alert(
        "Error",
        `Failed to execute approve transaction: ${errorMessage}`
      );
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <Image
          source={require("../assets/images/cavos-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {currentAddress && (
          <View style={styles.addressContainer}>
            <Text style={styles.addressLabel}>Wallet Address:</Text>
            <View style={styles.addressRow}>
              <Text style={styles.addressText}>
                {currentAddress.slice(0, 6)}...{currentAddress.slice(-4)}
              </Text>
              <TouchableOpacity
                onPress={handleCopyAddress}
                style={styles.copyButton}
              >
                <Text style={styles.copyIcon}>⧉</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.balanceButton, isLoadingEth && styles.disabledButton]}
          onPress={handleGetETHBalance}
          disabled={isLoadingEth}
        >
          {isLoadingEth ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.buttonText}>Loading...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Get $ETH balance</Text>
          )}
        </TouchableOpacity>

        {ethBalance && (
          <View style={styles.balanceResult}>
            <Text style={styles.balanceLabel}>ETH Balance:</Text>
            <Text style={styles.balanceValue}>{ethBalance} ETH</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.balanceButton,
            isLoadingToken && styles.disabledButton,
          ]}
          onPress={handleGetSTRKBalance}
          disabled={isLoadingToken}
        >
          {isLoadingToken ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.buttonText}>Loading...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Get $STRK balance</Text>
          )}
        </TouchableOpacity>

        {tokenBalance && (
          <View style={styles.balanceResult}>
            <Text style={styles.balanceLabel}>STRK Balance:</Text>
            <Text style={styles.balanceValue}>{tokenBalance} STRK</Text>
          </View>
        )}

        {/* Execute Approve Section */}
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>Execute Approve</Text>

        <TouchableOpacity
          style={[styles.balanceButton, isExecuting && styles.disabledButton]}
          onPress={handleExecuteApprove}
          disabled={isExecuting}
        >
          {isExecuting ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.buttonText}>Executing...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Execute Approve</Text>
          )}
        </TouchableOpacity>

        {lastTransactionHash && (
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionTitle}>Transaction Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction Hash:</Text>
              <Text style={styles.detailValue}>
                {lastTransactionHash.slice(0, 10)}...
                {lastTransactionHash.slice(-8)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Spender:</Text>
              <Text style={styles.detailValue}>
                {spenderAddress.slice(0, 10)}...{spenderAddress.slice(-8)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount:</Text>
              <Text style={styles.detailValue}>{approveAmount} wei</Text>
            </View>

            <TouchableOpacity
              style={styles.voyagerButton}
              onPress={async () => {
                const voyagerUrl = `https://sepolia.voyager.online/tx/${lastTransactionHash}`;
                console.log("Voyager URL:", voyagerUrl);

                try {
                  const supported = await Linking.canOpenURL(voyagerUrl);
                  if (supported) {
                    await Linking.openURL(voyagerUrl);
                  } else {
                    Alert.alert("Error", "Cannot open Voyager URL");
                  }
                } catch (error) {
                  console.error("Failed to open Voyager URL:", error);
                  Alert.alert("Error", "Failed to open Voyager URL");
                }
              }}
            >
              <Text style={styles.voyagerButtonText}>View on Voyager</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.footer}>Aegis SDK Example</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 80,
    paddingTop: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 50,
  },
  addressContainer: {
    marginBottom: 40,
    alignItems: "center",
  },
  addressLabel: {
    color: "#CCCCCC",
    fontSize: 14,
    marginBottom: 5,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 10,
  },
  copyButton: {
    padding: 5,
  },
  copyIcon: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  balanceButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    width: "100%",
    maxWidth: 280,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: "#666666",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceResult: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 8,
    marginBottom: 30,
    width: "100%",
    maxWidth: 280,
    alignItems: "center",
    alignSelf: "center",
  },
  balanceLabel: {
    color: "#CCCCCC",
    fontSize: 14,
    marginBottom: 5,
  },
  balanceValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#333333",
    width: "100%",
    marginVertical: 30,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    width: "100%",
    maxWidth: 280,
    marginBottom: 20,
    alignSelf: "center",
  },
  inputLabel: {
    color: "#CCCCCC",
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
  },
  fixedInput: {
    backgroundColor: "#1a1a1a",
    borderColor: "#333333",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  fixedInputText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "monospace",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  transactionDetails: {
    backgroundColor: "#1a1a1a",
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    width: "100%",
    maxWidth: 280,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  transactionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  detailLabel: {
    color: "#CCCCCC",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  detailValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "monospace",
    flex: 2,
    textAlign: "right",
  },
  voyagerButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
    alignSelf: "center",
  },
  voyagerButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  footer: {
    color: "#FFFFFF",
    fontSize: 14,
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
  },
});
