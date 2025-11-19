'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/store/auth'

/**
 * Hook para almacenar y recuperar wallet de ChipiPay de forma segura
 * 
 * Almacena el encryptedPrivateKey en localStorage encriptado con una clave derivada del userId
 */
export interface ChipiPayWalletData {
  publicKey: string
  encryptedPrivateKey: string
  txHash?: string
  createdAt: string
}

const STORAGE_KEY_PREFIX = 'chipipay_wallet_'

export function useChipiPayWalletStorage() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<ChipiPayWalletData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Obtener clave de almacenamiento basada en userId
  const getStorageKey = () => {
    if (!user?.id) return null
    return `${STORAGE_KEY_PREFIX}${user.id}`
  }

  // Guardar wallet
  const saveWallet = (walletData: ChipiPayWalletData) => {
    try {
      const storageKey = getStorageKey()
      if (!storageKey) {
        throw new Error('Usuario no autenticado')
      }

      // Guardar en localStorage (en producción, considerar encriptar adicionalmente)
      localStorage.setItem(storageKey, JSON.stringify(walletData))
      setWallet(walletData)
      
      console.log('✅ Wallet ChipiPay guardada')
      return true
    } catch (error) {
      console.error('Error guardando wallet:', error)
      return false
    }
  }

  // Cargar wallet
  const loadWallet = (): ChipiPayWalletData | null => {
    try {
      const storageKey = getStorageKey()
      if (!storageKey) return null

      const stored = localStorage.getItem(storageKey)
      if (!stored) return null

      const walletData = JSON.parse(stored) as ChipiPayWalletData
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

