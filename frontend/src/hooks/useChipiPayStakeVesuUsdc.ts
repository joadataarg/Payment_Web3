'use client'

/**
 * Hook para hacer stake de VESU/USDC usando ChipiPay SDK
 * 
 * Este hook usa el hook oficial useStakeVesuUsdc de @chipi-stack/nextjs
 * 
 * @example
 * ```tsx
 * const { stakeAsync, data, isLoading, error } = useStakeVesuUsdc()
 * 
 * const handleStake = async () => {
 *   await stakeAsync({
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

import { useStakeVesuUsdc as useChipiStakeVesuUsdc } from '@chipi-stack/nextjs'
import { useAuth as useClerkAuth } from '@clerk/nextjs'

export function useStakeVesuUsdc() {
  const { getToken } = useClerkAuth()
  const { stakeAsync, data, isLoading, error } = useChipiStakeVesuUsdc()

  const stake = async (params: {
    encryptKey: string
    wallet: { publicKey: string; encryptedPrivateKey: string }
    amount: string
    decimals?: number
  }) => {
    const bearerToken = await getToken()
    if (!bearerToken) {
      throw new Error('No se pudo obtener el token de autenticación')
    }

    return stakeAsync({
      params,
      bearerToken
    })
  }

  return {
    stake,
    stakeAsync,
    data,
    isLoading,
    error
  }
}

