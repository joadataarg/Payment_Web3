'use client'

import { useChipiPayBalance } from '@/hooks/useChipiPayBalance'
import { useAccount } from '@starknet-react/core'
import { motion } from 'framer-motion'

interface ChipiPayBalanceProps {
  /**
   * Dirección de wallet. Si no se proporciona, usa la wallet conectada
   */
  address?: string
  /**
   * Token a mostrar ('USDC' | 'USDT')
   */
  token?: 'USDC' | 'USDT'
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
 * Componente para mostrar balance USDC/USDT usando ChipiPay
 * 
 * Ejemplos de uso:
 * 
 * // Mostrar balance de wallet conectada
 * <ChipiPayBalance token="USDC" />
 * 
 * // Mostrar balance de dirección específica
 * <ChipiPayBalance address="0x123..." token="USDC" />
 */
export function ChipiPayBalance({ 
  address, 
  token = 'USDC',
  showLoading = true,
  className = ''
}: ChipiPayBalanceProps) {
  const { account } = useAccount()
  const { balance, isLoading, error } = useChipiPayBalance(address, token)

  // Si no hay wallet conectada y no se especificó address
  if (!account && !address) {
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

