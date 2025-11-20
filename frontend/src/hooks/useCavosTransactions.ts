'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/store/auth'

export interface CavosTransaction {
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

export function useCavosTransactions() {
  const { user, token } = useAuth()
  const [transactions, setTransactions] = useState<CavosTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        
        // Construir headers con autenticación
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        }
        
        // Intentar obtener token de múltiples fuentes
        let authToken = token
        
        // Si no hay token en el store, intentar obtenerlo de Clerk
        if (!authToken && typeof window !== 'undefined') {
          try {
            // Intentar obtener token de Clerk si está disponible
            const clerkToken = localStorage.getItem('clerk_token')
            if (clerkToken) {
              authToken = clerkToken
            }
          } catch (e) {
            console.warn('No se pudo obtener token de Clerk:', e)
          }
        }
        
        // Agregar token de autenticación si está disponible
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`
        }

        // El endpoint de Cavos usa autenticación
        const url = `${apiUrl}/api/cavos/transactions`

        const response = await fetch(url, {
          headers
        })
        
        if (!response.ok) {
          // Si es 401, el usuario no está autenticado - no es un error crítico
          if (response.status === 401) {
            console.warn('Usuario no autenticado para obtener transacciones Cavos')
            setTransactions([])
            setIsLoading(false)
            return
          }
          
          const errorData = await response.json().catch(() => ({ error: 'Error al obtener transacciones' }))
          throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()
        
        if (result.success) {
          setTransactions(result.data || [])
        } else {
          throw new Error(result.error || 'Error al obtener transacciones')
        }
      } catch (err) {
        console.error('Error obteniendo transacciones Cavos:', err)
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
        setError(errorMessage)
        // En caso de error, establecer array vacío para que no se muestre error si no hay transacciones
        setTransactions([])
      } finally {
        setIsLoading(false)
      }
    }

    // Intentar cargar transacciones (incluso sin token, el backend puede devolver vacío)
    fetchTransactions()
  }, [user?.id, token])

  return {
    transactions,
    isLoading,
    error,
    refetch: () => {
      // Trigger re-fetch by updating a dependency
      const fetchTransactions = async () => {
        try {
          setIsLoading(true)
          setError(null)

          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          }
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`
          }

          const url = `${apiUrl}/api/cavos/transactions`

          const response = await fetch(url, {
            headers
          })
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Error al obtener transacciones' }))
            throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
          }

          const result = await response.json()
          
          if (result.success) {
            setTransactions(result.data || [])
          } else {
            throw new Error(result.error || 'Error al obtener transacciones')
          }
        } catch (err) {
          console.error('Error obteniendo transacciones Cavos:', err)
          setError(err instanceof Error ? err.message : 'Error desconocido')
        } finally {
          setIsLoading(false)
        }
      }
      fetchTransactions()
    }
  }
}

