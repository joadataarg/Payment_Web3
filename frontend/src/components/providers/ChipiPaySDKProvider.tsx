'use client'

import React, { ReactNode } from 'react'
import dynamic from 'next/dynamic'

/**
 * Provider de ChipiPay SDK
 * 
 * Este provider envuelve la aplicación y proporciona acceso a los hooks de ChipiPay SDK.
 * Usa el ChipiProvider oficial de @chipi-stack/nextjs que es requerido por useCreateWallet.
 * 
 * IMPORTANTE: Necesitas obtener tus credenciales de ChipiPay desde:
 * https://dashboard.chipipay.com
 * 
 * Agrega estas variables de entorno a tu .env.local:
 * NEXT_PUBLIC_CHIPI_API_KEY=tu_api_key_publica
 * NEXT_PUBLIC_CHIPI_SECRET_KEY=tu_secret_key
 * 
 * ⚠️ NOTA: NEXT_PUBLIC_CHIPI_SECRET_KEY se expone al cliente porque el ChipiProvider
 * requiere acceso a ella en tiempo de ejecución. Esto es requerido por el SDK.
 */
interface ChipiPaySDKProviderProps {
  children: ReactNode
}

// Cargar ChipiProvider dinámicamente solo en el cliente, sin SSR
const DynamicChipiProvider = dynamic(
  async () => {
    // Configurar las variables de entorno antes de importar el provider
    // El ChipiProvider busca CHIPI_SECRET_KEY (sin NEXT_PUBLIC_)
    if (typeof window !== 'undefined') {
      const nextPublicSecretKey = process.env.NEXT_PUBLIC_CHIPI_SECRET_KEY
      const nextPublicApiKey = process.env.NEXT_PUBLIC_CHIPI_API_KEY
      
      // Configurar las variables que el provider espera
      if (nextPublicSecretKey && !(process.env as any).CHIPI_SECRET_KEY) {
        (process.env as any).CHIPI_SECRET_KEY = nextPublicSecretKey
      }
      if (nextPublicApiKey && !(process.env as any).CHIPI_API_KEY) {
        (process.env as any).CHIPI_API_KEY = nextPublicApiKey
      }
    }
    
    const module = await import('@chipi-stack/nextjs')
    return { default: module.ChipiProvider }
  },
  {
    ssr: false,
    loading: () => null, // No mostrar nada mientras carga
  }
) as React.ComponentType<{ children: ReactNode }>

export function ChipiPaySDKProvider({ children }: ChipiPaySDKProviderProps) {
  const apiPublicKey = process.env.NEXT_PUBLIC_CHIPI_API_KEY
  const secretKey = process.env.NEXT_PUBLIC_CHIPI_SECRET_KEY

  if (!apiPublicKey) {
    console.error(
      '❌ ChipiPay API Key no configurada. ' +
      'Agrega NEXT_PUBLIC_CHIPI_API_KEY a tu .env.local'
    )
    return <>{children}</>
  }

  if (!secretKey) {
    console.error(
      '❌ ChipiPay Secret Key no configurada. ' +
      'ChipiProvider requiere NEXT_PUBLIC_CHIPI_SECRET_KEY. ' +
      'Agrega NEXT_PUBLIC_CHIPI_SECRET_KEY a tu .env.local'
    )
    return <>{children}</>
  }

  // Configurar las variables de entorno que el provider espera
  if (typeof window !== 'undefined') {
    if (!(process.env as any).CHIPI_SECRET_KEY) {
      (process.env as any).CHIPI_SECRET_KEY = secretKey
    }
    if (!(process.env as any).CHIPI_API_KEY) {
      (process.env as any).CHIPI_API_KEY = apiPublicKey
    }
  }

  // Usar dynamic import con ssr: false para evitar problemas con async/await
  return (
    <DynamicChipiProvider>
      {children}
    </DynamicChipiProvider>
  )
}

