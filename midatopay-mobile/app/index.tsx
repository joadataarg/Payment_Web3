/**
 * MidatoPay Welcome Screen
 *
 * This is the entry point of the MidatoPay mobile application.
 * It provides Argentine-focused crypto payment interface with wallet connection options.
 *
 * Features:
 * - Argentine-themed branding with flag integration
 * - Multiple authentication methods (Apple, Google, Email)
 * - Professional crypto payment interface
 * - Powered by Cavos Aegis SDK
 */

import {
  Text,
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";

// Apple Logo Component
const AppleLogo = ({ size = 20, color = "#FFFFFF" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
      fill={color}
    />
  </Svg>
);

// Google Logo Component  
const GoogleLogo = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22.56 12<｜tool▁calls▁end｜><｜Assistant｜>
    .25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.37-4.52H2.18v2.84A9.95 9.95 0 0012 23z"
      fill="#34A853"
    />
    <Path
      d="M5.63 13.01c-.22-.66-.35-1.36-.35-2.06s.13-1.4.35-2.06V6.05H2.18C1.43 7.44 1 8.97 1 10.5s.43 3.06 1.18 4.45l3.45-2.84z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.02 1 2.7 4.63 1.18 9.45l3.45 2.84C5.71 9.22 8.14 5.38 12 5.38z"
      fill="#EA4335"
    />
  </Svg>
);

export default function Index() {
  const router = useRouter();

  /**
   * Handle Connect Button Press
   *
   * This function is called when the user taps the "Connect" button.
   * It navigates to the account screen where users can choose their
   * preferred wallet connection method.
   *
   * Available connection options on the account screen:
   * - Create In-App Wallet (deploy new Starknet wallet)
   * - Email & Password authentication
   * - Apple Sign-In (OAuth)
   * - Google Sign-In (OAuth)
   */
  const handleApple = () => {
    // Navigate to account screen for Apple Sign-In
    router.push("/account?method=apple");
  };

  const handleGoogle = () => {
    // Navigate to account screen for Google Sign-In
    router.push("/account?method=google");
  };

  const handleCreateWallet = () => {
    // Navigate to account screen for wallet creation
    router.push("/account?method=create");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* MidatoPay Branding */}
        <View style={styles.brandingContainer}>
          <Text style={styles.appTitle}>MidatoPay</Text>
          <Text style={styles.tagline}>Tus pagos ahora{'\n'}de forma simple</Text>
        </View>

        {/* Authentication Options */}
        <View style={styles.authOptions}>
          <TouchableOpacity style={styles.authButton} onPress={handleApple}>
            <AppleLogo size={20} color="#FFFFFF" />
            <Text style={[styles.buttonTextBlack, { marginLeft: 10 }]}>Continuar con Apple</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.authButtonGoogle} onPress={handleGoogle}>
            <GoogleLogo size={20} />
            <Text style={[styles.buttonTextWhite, { marginLeft: 10 }]}>Continuar con Google</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.createWalletButton} onPress={handleCreateWallet}>
            <Text style={styles.buttonTextWhite}>Crear Wallet Nueva</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Powered by Starknet + Cavos Aegis</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF6E3", // Fondo beige claro como antes
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  
  // Branding styles
  brandingContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  flagEmoji: {
    fontSize: 24,
    marginBottom: 10,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FF6B35", // Color naranja de MidatoPay
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 22,
  },

  // Auth options styles
  authOptions: {
    width: "100%",
    marginBottom: 30,
  },
  authButton: {
    backgroundColor: "#000000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  authButtonGoogle: {
    backgroundColor: "#4285F4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", 
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  createWalletButton: {
    backgroundColor: "#FF6B35", // Naranja de MidatoPay
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
  },
  buttonTextBlack: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextWhite: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Info box styles
  infoBox: {
    backgroundColor: "#FFF8DC",
    padding: 16,
    borderRadius: 12,
    width: "100%",
    marginBottom: 30,
  },
  infoText: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 4,
    textAlign: "center",
  },

  // Footer
  footer: {
    color: "#999999",
    fontSize: 12,
    textAlign: "center",
  },
});
