'use client'

/**
 * Hook para llamar cualquier contrato usando ChipiPay SDK
 * 
 * Este hook usa el hook oficial useCallAnyContract de @chipi-stack/nextjs
 * 
 * @example
 * ```tsx
 * const { callContractAsync, data, isLoading, error } = useCallAnyContract()
 * 
 * const handleCall = async () => {
 *   await callContractAsync({
 *     params: {
 *       encryptKey: pin,
 *       wallet: { publicKey, encryptedPrivateKey },
 *       contractAddress: contractAddress,
 *       functionName: 'transfer',
 *       calldata: [...]
 *     },
 *     bearerToken: token
 *   })
 * }
 * ```
 */

import { useCallAnyContract as useChipiCallAnyContract } from '@chipi-stack/nextjs'
import { useAuth as useClerkAuth } from '@clerk/nextjs'

export function useCallAnyContract() {
  const { getToken } = useClerkAuth()
  const { callContractAsync, data, isLoading, error } = useChipiCallAnyContract()

  const callContract = async (params: {
    encryptKey: string
    wallet: { publicKey: string; encryptedPrivateKey: string }
    contractAddress: string
    functionName: string
    calldata: any[]
  }) => {
    const bearerToken = await getToken()
    if (!bearerToken) {
      throw new Error('No se pudo obtener el token de autenticación')
    }

    return callContractAsync({
      params,
      bearerToken
    })
  }

  return {
    callContract,
    callContractAsync,
    data,
    isLoading,
    error
  }
}

