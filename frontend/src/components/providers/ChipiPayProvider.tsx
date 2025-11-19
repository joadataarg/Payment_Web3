'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { StarknetConfig } from '@starknet-react/core'
import { sepolia } from '@starknet-react/chains'
import { RpcProvider } from 'starknet'
import { InjectedConnector } from 'starknetkit/injected'
import { ArgentMobileConnector } from 'starknetkit/argentMobile'
import { WebWalletConnector } from 'starknetkit/webwallet'

/**
 * ChipiPay BaseProvider
 * 
 * Este provider envuelve la aplicación y proporciona acceso a:
 * - Starknet network (Sepolia testnet)
 * - Wallet connections
 * - Transaction management
 * - Balance queries
 * 
 * Configuración para MidatoPay:
 * - Network: Starknet Sepolia
 * - Tokens soportados: USDC, USDT
 * - Integración con sistema de autenticación existente
 */

interface ChipiPayContextType {
  // Network configuration
  network: 'sepolia' | 'mainnet'
  // Token addresses
  tokenAddresses: {
    USDC: string
    USDT: string
  }
  // Connection status
  isConnected: boolean
}

const ChipiPayContext = createContext<ChipiPayContextType | undefined>(undefined)

interface ChipiPayProviderProps {
  children: ReactNode
  network?: 'sepolia' | 'mainnet'
}

export function ChipiPayProvider({ 
  children, 
  network = 'sepolia' 
}: ChipiPayProviderProps) {
  // Token addresses para Starknet Sepolia
  // Dirección de USDC según documentación de ChipiPay (useStakeVesuUsdc)
  // NOTA: Verificar si es para Sepolia testnet o mainnet
  const tokenAddresses = {
    USDC: process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS || '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
    USDT: process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS || '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c7b7f451cd475'
  }

  const contextValue: ChipiPayContextType = {
    network,
    tokenAddresses,
    isConnected: false // Se actualizará cuando se conecte una wallet
  }

  // Configurar provider de Starknet usando función factory
  const rpcUrl = process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io/rpc/v0_9'

  // Conectores de wallet disponibles
  const connectors = [
    new InjectedConnector({ options: { id: 'braavos', name: 'Braavos' } }),
    new InjectedConnector({ options: { id: 'argentX', name: 'Argent X' } }),
    new ArgentMobileConnector(),
    new WebWalletConnector({ url: 'https://web.argent.xyz' }),
  ]

  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={() => new RpcProvider({ nodeUrl: rpcUrl })}
      connectors={connectors}
    >
      <ChipiPayContext.Provider value={contextValue}>
        {children}
      </ChipiPayContext.Provider>
    </StarknetConfig>
  )
}

/**
 * Hook para acceder al contexto de ChipiPay
 */
export function useChipiPay() {
  const context = useContext(ChipiPayContext)
  if (context === undefined) {
    throw new Error('useChipiPay must be used within a ChipiPayProvider')
  }
  return context
}

