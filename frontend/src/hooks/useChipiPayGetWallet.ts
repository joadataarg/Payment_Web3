'use client'

/**
 * Hook para obtener wallet usando ChipiPay SDK
 * 
 * Este hook usa el hook oficial useGetWallet de @chipi-stack/nextjs
 * 
 * IMPORTANTE: Necesitas envolver tu app con ChipiProvider de @chipi-stack/nextjs
 * 
 * @example
 * ```tsx
 * const { getWalletAsync, data, isLoading, error } = useGetWallet()
 * 
 * const handleGetWallet = async () => {
 *   const wallet = await getWalletAsync({
 *     params: {
 *       externalUserId: userId,
 *     },
 *     bearerToken: token
 *   })
 * }
 * ```
 */

import { useGetWallet as useChipiGetWallet } from '@chipi-stack/nextjs'
import { useAuth as useClerkAuth } from '@clerk/nextjs'

export function useGetWallet() {
  const { getToken } = useClerkAuth()
  const chipiGetWallet = useChipiGetWallet()

  const getWallet = async (externalUserId: string) => {
    const bearerToken = await getToken()
    if (!bearerToken) {
      throw new Error('No se pudo obtener el token de autenticación')
    }

    // El hook useGetWallet de @chipi-stack/nextjs usa fetchWallet con GetWalletInput
    return chipiGetWallet.fetchWallet({
      params: {
        externalUserId
      },
      bearerToken
    } as any) // Temporal: ajustar según la API real del SDK
  }

  return {
    getWallet,
    fetchWallet: chipiGetWallet.fetchWallet,
    data: chipiGetWallet.data,
    isLoading: chipiGetWallet.isLoading,
    error: chipiGetWallet.error
  }
}
