'use client'

import { AegisProvider } from '@cavos/aegis'
import { ReactNode } from 'react'

interface CavosProviderProps {
  children: ReactNode
}

export default function CavosProvider({ children }: CavosProviderProps) {
  return (
    <AegisProvider
      config={{
        network: 'SN_SEPOLIA',
        appName: 'MidatoPay',
        appId: 'app-a5b17a105d604090e051a297a8fad33d',
        paymasterApiKey: process.env.NEXT_PUBLIC_CAVOS_PAYMASTER_KEY,
        enableLogging: process.env.NODE_ENV === 'development'
      }}
    >
      {children}
    </AegisProvider>
  )
}
