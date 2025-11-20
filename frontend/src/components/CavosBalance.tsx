'use client'

import { useState, useEffect } from 'react'
import { useCavosWallet } from '@/hooks/useCavosWallet'
import { motion } from 'framer-motion'

interface CavosBalanceProps {
  /**
   * Dirección de wallet. Si no se proporciona, usa la wallet conectada
   */
  address?: string
  /**
   * Token a mostrar ('USDC' | 'USDT' | 'ETH')
   */
  token?: 'USDC' | 'USDT' | 'ETH'
  /**
   * Dirección del contrato del token (requerida para USDC/USDT)
   */
  tokenAddress?: string
  /**
   * Mostrar loading state
   */
  showLoading?: boolean
  /**
   * Clase CSS personalizada
   */
  className?: string
}

/**
 * Componente para mostrar balance usando Cavos Aegis
 * 
 * Ejemplos de uso:
 * 
 * // Mostrar balance ETH de wallet conectada
 * <CavosBalance token="ETH" />
 * 
 * // Mostrar balance de token específico
 * <CavosBalance 
 *   token="USDC" 
 *   tokenAddress="0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8"
 * />
 */
export function CavosBalance({ 
  address, 
  token = 'ETH',
  tokenAddress,
  showLoading = true,
  className = ''
}: CavosBalanceProps) {
  const { getETHBalance, getTokenBalance, address: walletAddress, isConnected } = useCavosWallet()
  const [balance, setBalance] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const targetAddress = address || walletAddress

  useEffect(() => {
    const fetchBalance = async () => {
      if (!targetAddress) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        let balanceValue = '0'

        if (token === 'ETH') {
          balanceValue = await getETHBalance()
        } else if (tokenAddress) {
          // USDC tiene 6 decimales, USDT tiene 6, otros tokens pueden tener 18
          const decimals = token === 'USDC' || token === 'USDT' ? 6 : 18
          balanceValue = await getTokenBalance(tokenAddress, decimals)
        } else {
          throw new Error(`Dirección del contrato requerida para ${token}`)
        }

        // Formatear balance (dividir por decimales)
        const decimals = token === 'USDC' || token === 'USDT' ? 6 : 18
        const formattedBalance = (parseFloat(balanceValue) / Math.pow(10, decimals)).toFixed(6)
        setBalance(formattedBalance)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
        setError(errorMessage)
        console.error('Error obteniendo balance:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBalance()
  }, [targetAddress, token, tokenAddress, getETHBalance, getTokenBalance])

  // Si no hay wallet conectada y no se especificó address
  if (!isConnected && !address) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Conecta una wallet para ver tu balance
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-sm text-red-500 ${className}`}>
        Error: {error}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      {isLoading && showLoading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500">Cargando balance...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <span className="text-lg font-bold" style={{ color: '#1a1a1a', fontFamily: 'Kufam, sans-serif' }}>
            {balance} {token}
          </span>
        </div>
      )}
    </motion.div>
  )
}

