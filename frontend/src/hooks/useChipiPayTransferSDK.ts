'use client'

/**
 * Hook para transferir tokens usando ChipiPay SDK
 * 
 * Este hook usa el hook oficial useTransfer de @chipi-stack/nextjs
 * 
 * IMPORTANTE: 
 * - Necesitas envolver tu app con ChipiProvider de @chipi-stack/nextjs
 * - Necesitas proporcionar la dirección del contrato (contractAddress)
 * - ChipiPay usa Avnus gasless para cubrir las tarifas de gas
 * 
 * @example
 * ```tsx
 * const { transferAsync, transferData, isLoading, error } = useTransfer()
 * 
 * const handleTransfer = async () => {
 *   const bearerToken = await getToken()
 *   await transferAsync({
 *     params: {
 *       encryptKey: pin,
 *       wallet: { publicKey, encryptedPrivateKey },
 *       contractAddress: '0x...', // Dirección del contrato del token
 *       recipient: toAddress,
 *       amount: '1000000', // Puede ser string o number
 *       decimals: 6 // Default: 18, pero USDC tiene 6
 *     },
 *     bearerToken
 *   })
 *   // transferData contiene el hash de la transacción
 * }
 * ```
 */

import { useTransfer as useChipiTransfer } from '@chipi-stack/nextjs'
import { useAuth as useClerkAuth } from '@clerk/nextjs'

export function useTransfer() {
  const { getToken } = useClerkAuth()
  const { transferAsync, data: transferData, isLoading, error } = useChipiTransfer()

  const transfer = async (params: {
    encryptKey: string
    wallet: { publicKey: string; encryptedPrivateKey: string }
    contractAddress: string // Dirección del contrato del token (requerida)
    recipient: string
    amount: string | number // Puede ser string o number
    decimals?: number // Default: 18, pero USDC tiene 6
  }) => {
    const bearerToken = await getToken()
    if (!bearerToken) {
      throw new Error('No se pudo obtener el token de autenticación')
    }

    // El amount puede ser string o number según la documentación, pero convertimos a number
    const amountValue = typeof params.amount === 'string' ? parseFloat(params.amount) : params.amount

    return transferAsync({
      params: {
        encryptKey: params.encryptKey,
        wallet: params.wallet,
        contractAddress: params.contractAddress,
        recipient: params.recipient,
        amount: amountValue,
        decimals: params.decimals || 18
      } as any, // El SDK puede tener una estructura diferente, ajustar según la API real
      bearerToken
    })
  }

  return {
    transfer,
    transferAsync,
    transferData, // Hash de la transacción (string)
    data: transferData, // Alias para compatibilidad
    isLoading,
    error
  }
}

