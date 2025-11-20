'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { midatoPayAPI } from '@/lib/midatopay-api'

interface BalanceHistoryRecord {
  id: string
  type: 'credit' | 'debit'
  amount: number
  balanceAfter: number
  reason?: string
  sessionId?: string | null
  actor?: string
  createdAt: string
}

interface BalanceResponse {
  success: boolean
  balance: number
  history: BalanceHistoryRecord[]
  defaultBalance?: number
}

export function useOffchainBalance() {
  const [balance, setBalance] = useState(0)
  const [history, setHistory] = useState<BalanceHistoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response: BalanceResponse = await midatoPayAPI.getOffchainBalance()
      setBalance(response.balance)
      setHistory(response.history || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching off-chain balance:', err)
      setError(err instanceof Error ? err.message : 'No se pudo obtener el balance')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  const adjustBalance = useCallback(
    async (
      type: 'credit' | 'debit',
      amount: number,
      metadata?: { reason?: string; sessionId?: string | null }
    ) => {
      if (amount <= 0) {
        throw new Error('El monto debe ser mayor que 0')
      }

      setIsAdjusting(true)
      setError(null)

      const previousBalance = balance
      const previousHistory = history

      setBalance((current) => (type === 'credit' ? current + amount : current - amount))

      try {
        const response: BalanceResponse = await midatoPayAPI.adjustOffchainBalance({
          type,
          amount,
          reason: metadata?.reason,
          sessionId: metadata?.sessionId ?? null
        })

        setBalance(response.balance)
        setHistory(response.history || [])
        return response
      } catch (err) {
        setBalance(previousBalance)
        setHistory(previousHistory)
        setError(err instanceof Error ? err.message : 'No se pudo actualizar el balance')
        throw err
      } finally {
        setIsAdjusting(false)
      }
    },
    [balance, history]
  )

  const debit = useCallback(
    async (amount: number, metadata?: { reason?: string; sessionId?: string | null }) => {
      return adjustBalance('debit', amount, metadata)
    },
    [adjustBalance]
  )

  const credit = useCallback(
    async (amount: number, metadata?: { reason?: string; sessionId?: string | null }) => {
      return adjustBalance('credit', amount, metadata)
    },
    [adjustBalance]
  )

  const summary = useMemo(
    () => ({
      balance,
      history,
      isLoading,
      isAdjusting,
      error,
      refresh: fetchBalance,
      debit,
      credit
    }),
    [balance, history, isLoading, isAdjusting, error, fetchBalance, debit, credit]
  )

  return summary
}

