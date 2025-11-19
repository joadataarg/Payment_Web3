// Configuración de Cavos Aegis para el frontend
export const cavosConfig = {
  network: 'SN_SEPOLIA' as const,
  appName: 'MidatoPay',
  appId: 'app-a5b17a105d604090e051a297a8fad33d',
  paymasterApiKey: process.env.NEXT_PUBLIC_CAVOS_PAYMASTER_KEY || '',
  enableLogging: true
}

export default cavosConfig