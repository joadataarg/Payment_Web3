'use client'

import { useState, useCallback } from 'react'
import { useAegis } from '@cavos/aegis'

/**
 * Hook para ejecutar transferencias usando Cavos Aegis
 * 
 * Este hook proporciona funcionalidades para:
 * - Transferir tokens (execute)
 * - Ejecutar transacciones batch (executeBatch)
 * - Gestionar el estado de las transacciones
 */
export interface TransferParams {
  contractAddress: string
  entrypoint: string
  calldata: (string | number)[]
}

export interface TransferResult {
  transactionHash: string
  success: boolean
  error?: string
}

export function useCavosTransfer() {
  const { aegisAccount } = useAegis()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastTransactionHash, setLastTransactionHash] = useState<string | null>(null)

  /**
   * Ejecutar una transacción simple
   * @param contractAddress - Dirección del contrato
   * @param entrypoint - Nombre de la función a ejecutar
   * @param calldata - Parámetros de la función
   */
  const execute = useCallback(async (
    contractAddress: string,
    entrypoint: string,
    calldata: (string | number)[]
  ): Promise<TransferResult> => {
    if (!aegisAccount || !aegisAccount.address) {
      const err = new Error('Wallet no conectada')
      setError(err)
      return { transactionHash: '', success: false, error: err.message }
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await aegisAccount.execute(contractAddress, entrypoint, calldata)
      
      if (!result || !result.transactionHash) {
        throw new Error('No se recibió hash de transacción')
      }

      setLastTransactionHash(result.transactionHash)
      console.log('✅ Transacción ejecutada:', result.transactionHash)
      
      return {
        transactionHash: result.transactionHash,
        success: true
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido al ejecutar transacción')
      setError(error)
      console.error('❌ Error ejecutando transacción:', error)
      
      return {
        transactionHash: '',
        success: false,
        error: error.message
      }
    } finally {
      setIsLoading(false)
    }
  }, [aegisAccount])

  /**
   * Ejecutar múltiples transacciones en batch
   * @param calls - Array de llamadas a ejecutar
   */
  const executeBatch = useCallback(async (
    calls: TransferParams[]
  ): Promise<TransferResult> => {
    if (!aegisAccount || !aegisAccount.address) {
      const err = new Error('Wallet no conectada')
      setError(err)
      return { transactionHash: '', success: false, error: err.message }
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await aegisAccount.executeBatch(calls)
      
      if (!result || !result.transactionHash) {
        throw new Error('No se recibió hash de transacción')
      }

      setLastTransactionHash(result.transactionHash)
      console.log('✅ Transacción batch ejecutada:', result.transactionHash)
      
      return {
        transactionHash: result.transactionHash,
        success: true
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido al ejecutar transacción batch')
      setError(error)
      console.error('❌ Error ejecutando transacción batch:', error)
      
      return {
        transactionHash: '',
        success: false,
        error: error.message
      }
    } finally {
      setIsLoading(false)
    }
  }, [aegisAccount])

  /**
   * Transferir tokens (helper method)
   * @param tokenAddress - Dirección del contrato del token
   * @param recipient - Dirección del destinatario
   * @param amount - Cantidad a transferir (en unidades más pequeñas, ej: wei)
   */
  const transfer = useCallback(async (
    tokenAddress: string,
    recipient: string,
    amount: string | number
  ): Promise<TransferResult> => {
    const amountStr = typeof amount === 'number' ? amount.toString() : amount
    
    return execute(
      tokenAddress,
      'transfer',
      [recipient, amountStr, '0'] // recipient, amount, nonce
    )
  }, [execute])

  return {
    // Estado
    isLoading,
    error,
    lastTransactionHash,
    
    // Métodos
    execute,
    executeBatch,
    transfer
  }
}

