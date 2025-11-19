'use client'

/**
 * Hook para crear transacción SKU usando ChipiPay SDK
 * 
 * Este hook usa el hook oficial useCreateSkuTransaction de @chipi-stack/nextjs
 * 
 * @example
 * ```tsx
 * const { createSkuTransactionAsync, data, isLoading, error } = useCreateSkuTransaction()
 * 
 * const handleCreateTransaction = async () => {
 *   await createSkuTransactionAsync({
 *     params: {
 *       encryptKey: pin,
 *       wallet: { publicKey, encryptedPrivateKey },
 *       skuId: 'sku-123',
 *       quantity: 1
 *     },
 *     bearerToken: token
 *   })
 * }
 * ```
 */

import { useCreateSkuTransaction as useChipiCreateSkuTransaction } from '@chipi-stack/nextjs'
import { useAuth as useClerkAuth } from '@clerk/nextjs'

export function useCreateSkuTransaction() {
  const { getToken } = useClerkAuth()
  const { createSkuTransactionAsync, data, isLoading, error } = useChipiCreateSkuTransaction()

  const createSkuTransaction = async (params: {
    encryptKey: string
    wallet: { publicKey: string; encryptedPrivateKey: string }
    skuId: string
    quantity?: number
    // otros parámetros según la documentación
  }) => {
    const bearerToken = await getToken()
    if (!bearerToken) {
      throw new Error('No se pudo obtener el token de autenticación')
    }

    return createSkuTransactionAsync({
      params,
      bearerToken
    })
  }

  return {
    createSkuTransaction,
    createSkuTransactionAsync,
    data,
    isLoading,
    error
  }
}

