'use client'

/**
 * Hook para retirar (withdraw) VESU/USDC usando ChipiPay SDK
 * 
 * Este hook usa el hook oficial useWithdrawVesuUsdc de @chipi-stack/nextjs
 * 
 * @example
 * ```tsx
 * const { withdrawAsync, data, isLoading, error } = useWithdrawVesuUsdc()
 * 
 * const handleWithdraw = async () => {
 *   await withdrawAsync({
 *     params: {
 *       encryptKey: pin,
 *       wallet: { publicKey, encryptedPrivateKey },
 *       amount: '1000000',
 *       decimals: 6
 *     },
 *     bearerToken: token
 *   })
 * }
 * ```
 */

import { useWithdrawVesuUsdc as useChipiWithdrawVesuUsdc } from '@chipi-stack/nextjs'
import { useAuth as useClerkAuth } from '@clerk/nextjs'

export function useWithdrawVesuUsdc() {
  const { getToken } = useClerkAuth()
  const { withdrawAsync, data, isLoading, error } = useChipiWithdrawVesuUsdc()

  const withdraw = async (params: {
    encryptKey: string
    wallet: { publicKey: string; encryptedPrivateKey: string }
    amount: string
    decimals?: number
  }) => {
    const bearerToken = await getToken()
    if (!bearerToken) {
      throw new Error('No se pudo obtener el token de autenticación')
    }

    return withdrawAsync({
      params,
      bearerToken
    })
  }

  return {
    withdraw,
    withdrawAsync,
    data,
    isLoading,
    error
  }
}

