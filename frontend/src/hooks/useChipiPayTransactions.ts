'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/store/auth'

export interface ChipiPayTransaction {
  id: string
  sessionId: string
  amountARS: number
  amountUSDC: number
  txHash: string
  fromAddress: string
  toAddress: string
  status: 'pending' | 'completed' | 'failed'
  userId?: string
  createdAt: string
  updatedAt: string
}

export function useChipiPayTransactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<ChipiPayTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
        const url = user?.id 
          ? `${apiUrl}/api/chipipay/transactions?userId=${user.id}`
          : `${apiUrl}/api/chipipay/transactions`

        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error('Error al obtener transacciones')
        }

        const result = await response.json()
        
        if (result.success) {
          setTransactions(result.data || [])
        } else {
          throw new Error(result.error || 'Error al obtener transacciones')
        }
      } catch (err) {
        console.error('Error obteniendo transacciones ChipiPay:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [user?.id])

  return {
    transactions,
    isLoading,
    error
  }
}

