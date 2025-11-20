'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAegis } from '@cavos/aegis'
import { useCavosWalletStorage, CavosWalletData } from './useCavosWalletStorage'

/**
 * Hook para crear y gestionar wallets usando Cavos Aegis
 * 
 * Este hook proporciona funcionalidades para:
 * - Crear nuevas wallets (deployAccount)
 * - Conectar wallets existentes (connectAccount)
 * - Obtener balances (getETHBalance, getTokenBalance)
 * - Gestionar el estado de la wallet
 */
export function useCavosWallet() {
  const { aegisAccount } = useAegis()
  const { saveWallet, wallet: storedWallet, loadWallet } = useCavosWalletStorage()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Crear una nueva wallet usando Cavos Aegis
   * @returns Promise con los datos de la wallet creada
   */
  const createWallet = useCallback(async (): Promise<CavosWalletData | null> => {
    if (!aegisAccount) {
      const err = new Error('Aegis account no está disponible')
      setError(err)
      throw err
    }

    setIsLoading(true)
    setError(null)

    try {
      // Deploy new wallet using gasless deployment
      const privateKey = await aegisAccount.deployAccount()
      
      if (!privateKey || !aegisAccount.address) {
        throw new Error('No se pudo crear la wallet')
      }

      const walletData: CavosWalletData = {
        address: aegisAccount.address,
        privateKey: privateKey,
        createdAt: new Date().toISOString()
      }

      // Guardar en localStorage
      saveWallet(walletData)

      console.log('✅ Wallet Cavos creada:', walletData.address)
      return walletData
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido al crear wallet')
      setError(error)
      console.error('❌ Error creando wallet:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [aegisAccount, saveWallet])

  /**
   * Conectar una wallet existente usando su private key
   * @param privateKey - La clave privada de la wallet
   */
  const connectWallet = useCallback(async (privateKey: string): Promise<void> => {
    if (!aegisAccount) {
      const err = new Error('Aegis account no está disponible')
      setError(err)
      throw err
    }

    setIsLoading(true)
    setError(null)

    try {
      await aegisAccount.connectAccount(privateKey)
      
      if (!aegisAccount.address) {
        throw new Error('No se pudo conectar la wallet')
      }

      // Cargar wallet desde storage o crear nuevo registro
      const existingWallet = loadWallet()
      if (!existingWallet || existingWallet.address !== aegisAccount.address) {
        const walletData: CavosWalletData = {
          address: aegisAccount.address,
          privateKey: privateKey,
          createdAt: existingWallet?.createdAt || new Date().toISOString()
        }
        saveWallet(walletData)
      }

      console.log('✅ Wallet Cavos conectada:', aegisAccount.address)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido al conectar wallet')
      setError(error)
      console.error('❌ Error conectando wallet:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [aegisAccount, saveWallet, loadWallet])

  /**
   * Obtener el balance de ETH
   */
  const getETHBalance = useCallback(async (): Promise<string> => {
    if (!aegisAccount || !aegisAccount.address) {
      throw new Error('Wallet no conectada')
    }

    try {
      const balance = await aegisAccount.getETHBalance()
      return balance || '0'
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error obteniendo balance de ETH')
      console.error('❌ Error obteniendo balance:', error)
      throw error
    }
  }, [aegisAccount])

  /**
   * Obtener el balance de un token
   * @param tokenAddress - Dirección del contrato del token
   * @param decimals - Decimales del token (default: 18)
   */
  const getTokenBalance = useCallback(async (tokenAddress: string, decimals: number = 18): Promise<string> => {
    if (!aegisAccount || !aegisAccount.address) {
      throw new Error('Wallet no conectada')
    }

    try {
      const balance = await aegisAccount.getTokenBalance(tokenAddress, decimals)
      return balance || '0'
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error obteniendo balance del token')
      console.error('❌ Error obteniendo balance del token:', error)
      throw error
    }
  }, [aegisAccount])

  // Conectar wallet automáticamente si hay una guardada
  const connectStoredWallet = useCallback(async () => {
    if (storedWallet?.privateKey && aegisAccount) {
      try {
        // Solo conectar si no está ya conectada o si la dirección es diferente
        if (!aegisAccount.address || aegisAccount.address !== storedWallet.address) {
          await connectWallet(storedWallet.privateKey)
        }
      } catch (err) {
        console.error('Error conectando wallet guardada:', err)
      }
    }
  }, [storedWallet, aegisAccount, connectWallet])

  // Auto-conectar wallet guardada cuando el hook se monta
  useEffect(() => {
    const autoConnect = async () => {
      if (storedWallet?.privateKey && aegisAccount) {
        // Solo conectar si no está ya conectada o si la dirección es diferente
        if (!aegisAccount.address || (storedWallet.address && aegisAccount.address !== storedWallet.address)) {
          try {
            await connectStoredWallet()
          } catch (err) {
            console.error('Error auto-conectando wallet:', err)
          }
        }
      }
    }
    
    // Pequeño delay para asegurar que aegisAccount esté inicializado
    const timer = setTimeout(() => {
      autoConnect()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [storedWallet?.privateKey, storedWallet?.address, aegisAccount, connectStoredWallet])

  return {
    // Estado
    wallet: storedWallet,
    address: aegisAccount?.address || storedWallet?.address || null,
    isLoading,
    error,
    
    // Métodos
    createWallet,
    connectWallet,
    connectStoredWallet,
    getETHBalance,
    getTokenBalance,
    
    // Estado de conexión
    isConnected: !!aegisAccount?.address || !!storedWallet
  }
}

