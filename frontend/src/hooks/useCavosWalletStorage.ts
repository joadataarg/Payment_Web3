'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/store/auth'

/**
 * Hook para almacenar y recuperar wallet de Cavos de forma segura
 * 
 * Almacena el privateKey en localStorage (en producción, considerar encriptar adicionalmente)
 */
export interface CavosWalletData {
  address: string
  privateKey: string
  txHash?: string
  createdAt: string
}

const STORAGE_KEY_PREFIX = 'cavos_wallet_'

export function useCavosWalletStorage() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<CavosWalletData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Obtener clave de almacenamiento basada en userId
  const getStorageKey = () => {
    if (!user?.id) return null
    return `${STORAGE_KEY_PREFIX}${user.id}`
  }

  // Guardar wallet
  const saveWallet = (walletData: CavosWalletData) => {
    try {
      const storageKey = getStorageKey()
      if (!storageKey) {
        throw new Error('Usuario no autenticado')
      }

      // Guardar en localStorage (en producción, considerar encriptar adicionalmente)
      localStorage.setItem(storageKey, JSON.stringify(walletData))
      setWallet(walletData)
      
      console.log('✅ Wallet Cavos guardada')
      return true
    } catch (error) {
      console.error('Error guardando wallet:', error)
      return false
    }
  }

  // Cargar wallet
  const loadWallet = (): CavosWalletData | null => {
    try {
      const storageKey = getStorageKey()
      if (!storageKey) return null

      const stored = localStorage.getItem(storageKey)
      if (!stored) return null

      const walletData = JSON.parse(stored) as CavosWalletData
      setWallet(walletData)
      return walletData
    } catch (error) {
      console.error('Error cargando wallet:', error)
      return null
    }
  }

  // Eliminar wallet
  const clearWallet = () => {
    try {
      const storageKey = getStorageKey()
      if (storageKey) {
        localStorage.removeItem(storageKey)
      }
      setWallet(null)
    } catch (error) {
      console.error('Error eliminando wallet:', error)
    }
  }

  // Cargar wallet al montar
  useEffect(() => {
    setIsLoading(true)
    const loaded = loadWallet()
    setIsLoading(false)
  }, [user?.id])

  return {
    wallet,
    isLoading,
    saveWallet,
    loadWallet,
    clearWallet,
    hasWallet: wallet !== null
  }
}

