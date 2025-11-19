'use client'

import { useCallback } from 'react'
import { useCreateWallet as useChipiCreateWallet } from '@chipi-stack/nextjs'
import { useAuth } from '@/store/auth'

/**
 * Hook para crear wallet usando el SDK oficial de ChipiPay
 * 
 * Este hook usa el hook oficial useCreateWallet de @chipi-stack/nextjs
 * que maneja la creación de wallets de forma segura.
 * 
 * @example
 * ```tsx
 * const { createWallet, isLoading, error } = useCreateWallet()
 * 
 * const handleCreate = async () => {
 *   try {
 *     const wallet = await createWallet('1234')
 *     console.log('Wallet creada:', wallet)
 *   } catch (error) {
 *     console.error('Error:', error)
 *   }
 * }
 * ```
 */
export function useCreateWallet() {
  const { user } = useAuth()
  const { createWalletAsync: chipiCreateWalletAsync, isLoading, error } = useChipiCreateWallet()

  /**
   * Obtener bearer token (API key de ChipiPay)
   */
  const getBearerToken = useCallback(async (): Promise<string> => {
    // El bearerToken es la API key pública de ChipiPay
    const apiKey = process.env.NEXT_PUBLIC_CHIPI_API_KEY
    
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_CHIPI_API_KEY no está configurado')
    }
    
    return apiKey
  }, [])

  /**
   * Crear wallet usando el hook oficial de ChipiPay
   */
  const createWallet = useCallback(async (encryptKey: string) => {
    if (!encryptKey || encryptKey.length < 4) {
      throw new Error('El PIN debe tener al menos 4 caracteres')
    }

    const externalUserId = user?.id || user?.email || `user-${Date.now()}`
    const bearerToken = await getBearerToken()

    try {
      const walletData = await chipiCreateWalletAsync({
        params: {
          encryptKey,
          externalUserId,
        },
        bearerToken,
      })

      return walletData
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido al crear wallet')
      console.error('❌ Error creando wallet:', error)
      throw error
    }
  }, [user, getBearerToken, chipiCreateWalletAsync])

  return {
    createWallet,
    isLoading,
    error,
  }
}

