'use client'

/**
 * Hook para aprobar tokens usando ChipiPay SDK
 * 
 * Este hook usa el hook oficial useApprove de @chipi-stack/nextjs
 * 
 * IMPORTANTE: Necesitas envolver tu app con ChipiProvider de @chipi-stack/nextjs
 * 
 * @example
 * ```tsx
 * const { approveAsync, data, isLoading, error } = useApprove()
 * 
 * const handleApprove = async () => {
 *   await approveAsync({
 *     params: {
 *       encryptKey: pin,
 *       wallet: { publicKey, encryptedPrivateKey },
 *       contractAddress: tokenAddress,
 *       spender: spenderAddress,
 *       amount: '1000000',
 *       decimals: 6
 *     },
 *     bearerToken: token
 *   })
 * }
 * ```
 */

import { useApprove as useChipiApprove } from '@chipi-stack/nextjs'
import { useAuth as useClerkAuth } from '@clerk/nextjs'

export function useApprove() {
  const { getToken } = useClerkAuth()
  const { approveAsync, data, isLoading, error } = useChipiApprove()

  const approve = async (params: {
    encryptKey: string
    wallet: { publicKey: string; encryptedPrivateKey: string }
    contractAddress: string
    spender: string
    amount: string
    decimals?: number
  }) => {
    const bearerToken = await getToken()
    if (!bearerToken) {
      throw new Error('No se pudo obtener el token de autenticación')
    }

    return approveAsync({
      params,
      bearerToken
    })
  }

  return {
    approve,
    approveAsync,
    data,
    isLoading,
    error
  }
}

