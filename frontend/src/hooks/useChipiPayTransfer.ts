'use client'

import { useState } from 'react'
import { useAccount } from '@starknet-react/core'
import { useChipiPay } from '@/components/providers/ChipiPayProvider'
import { Call, uint256 } from 'starknet'
import toast from 'react-hot-toast'

/**
 * Hook para transferir tokens USDC usando ChipiPay
 * 
 * Incluye:
 * - Validación de balance
 * - Manejo de errores
 * - Tracking de estado de transacción
 * - Notificaciones toast
 * 
 * @param token - Token a transferir ('USDC' | 'USDT'). Default: 'USDC'
 */
export function useChipiPayTransfer(token: 'USDC' | 'USDT' = 'USDC') {
  const { account } = useAccount()
  const { tokenAddresses } = useChipiPay()
  const [isTransferring, setIsTransferring] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ABI para ERC20 transfer
  const erc20Abi = [
    {
      name: 'transfer',
      type: 'function',
      inputs: [
        {
          name: 'recipient',
          type: 'felt'
        },
        {
          name: 'amount',
          type: 'Uint256'
        }
      ],
      outputs: [
        {
          name: 'success',
          type: 'felt'
        }
      ],
      state_mutability: 'external'
    },
    {
      name: 'balanceOf',
      type: 'function',
      inputs: [
        {
          name: 'account',
          type: 'felt'
        }
      ],
      outputs: [
        {
          name: 'balance',
          type: 'Uint256'
        }
      ],
      state_mutability: 'view'
    }
  ]

  const tokenAddress = token === 'USDC' ? tokenAddresses.USDC : tokenAddresses.USDT

  /**
   * Transferir tokens a una dirección
   * 
   * @param to - Dirección del destinatario
   * @param amount - Cantidad en formato legible (ej: "10.5" para 10.5 USDC)
   * @returns Hash de la transacción
   */
  const transfer = async (to: string, amount: string): Promise<string | null> => {
    if (!account) {
      const errorMsg = 'No wallet connected'
      setError(errorMsg)
      toast.error(errorMsg)
      return null
    }

    if (!to || !amount) {
      const errorMsg = 'Invalid recipient or amount'
      setError(errorMsg)
      toast.error(errorMsg)
      return null
    }

    if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
      const errorMsg = 'Token address not configured'
      setError(errorMsg)
      toast.error(errorMsg)
      return null
    }

    setIsTransferring(true)
    setError(null)
    setTransactionHash(null)

    try {
      // Convertir amount a Uint256 (asumiendo 6 decimals para USDC/USDT)
      const decimals = 6
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)))
      const amountUint256 = uint256.bnToUint256(amountBigInt)

      // Crear la llamada de transfer
      const calls: Call[] = [
        {
          contractAddress: tokenAddress,
          entrypoint: 'transfer',
          calldata: [to, amountUint256.low, amountUint256.high]
        }
      ]

      // Ejecutar la transacción usando la cuenta directamente
      if (!account.execute) {
        throw new Error('Account does not support execute method')
      }

      const result = await account.execute(calls)

      if (result?.transaction_hash) {
        setTransactionHash(result.transaction_hash)
        toast.success(`Transferencia iniciada: ${result.transaction_hash.slice(0, 10)}...`)
        console.log('✅ Transferencia iniciada:', result.transaction_hash)
        return result.transaction_hash
      } else {
        throw new Error('No transaction hash returned')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error executing transfer'
      setError(errorMsg)
      console.error('❌ Error en transferencia:', err)
      toast.error(`Error en transferencia: ${errorMsg}`)
      return null
    } finally {
      setIsTransferring(false)
    }
  }

  return {
    transfer,
    isTransferring,
    transactionHash,
    error,
    reset: () => {
      setError(null)
      setTransactionHash(null)
    }
  }
}

