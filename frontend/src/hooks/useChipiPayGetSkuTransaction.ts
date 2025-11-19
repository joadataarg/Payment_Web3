'use client'

/**
 * Hook para obtener transacción SKU usando ChipiPay SDK
 * 
 * Este hook usa el hook oficial useGetSkuTransaction de @chipi-stack/nextjs
 * 
 * @example
 * ```tsx
 * const { getSkuTransactionAsync, data, isLoading, error } = useGetSkuTransaction()
 * 
 * const handleGetTransaction = async () => {
 *   const transaction = await getSkuTransactionAsync({
 *     params: {
 *       transactionId: 'tx-123'
 *     },
 *     bearerToken: token
 *   })
 * }
 * ```
 */

import { useGetSkuTransaction as useChipiGetSkuTransaction } from '@chipi-stack/nextjs'
import { useAuth as useClerkAuth } from '@clerk/nextjs'

export function useGetSkuTransaction() {
  const { getToken } = useClerkAuth()
  const { getSkuTransactionAsync, data, isLoading, error } = useChipiGetSkuTransaction()

  const getSkuTransaction = async (params: {
    transactionId: string
    // otros parámetros según la documentación
  }) => {
    const bearerToken = await getToken()
    if (!bearerToken) {
      throw new Error('No se pudo obtener el token de autenticación')
    }

    return getSkuTransactionAsync({
      params,
      bearerToken
    })
  }

  return {
    getSkuTransaction,
    getSkuTransactionAsync,
    data,
    isLoading,
    error
  }
}

