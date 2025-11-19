'use client'

import { useState } from 'react'
import { useConnect, useDisconnect, useAccount } from '@starknet-react/core'
import { motion } from 'framer-motion'
import { Wallet, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'

/**
 * Componente para conectar wallet usando ChipiPay/Starknet
 * 
 * Soporta:
 * - Braavos Wallet
 * - Argent X Wallet
 * - Argent Mobile
 * - Web Wallet
 */
export function ChipiPayWalletConnect() {
  const { account, address } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [showModal, setShowModal] = useState(false)

  const handleConnect = async (connector: any) => {
    try {
      await connect({ connector })
      setShowModal(false)
      toast.success('Wallet conectada exitosamente')
    } catch (error) {
      console.error('Error conectando wallet:', error)
      toast.error('Error al conectar wallet. Asegúrate de tener la extensión instalada.')
    }
  }

  const handleDisconnect = () => {
    disconnect()
    toast.success('Wallet desconectada')
  }

  // Si ya hay wallet conectada, mostrar info
  if (account && address) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg" style={{ 
          backgroundColor: 'rgba(254, 108, 28, 0.1)', 
          border: '1px solid rgba(254,108,28,0.3)' 
        }}>
          <Wallet className="w-4 h-4" style={{ color: '#fe6c1c' }} />
          <div className="flex flex-col">
            <span className="text-xs font-medium" style={{ color: '#1a1a1a' }}>
              Wallet Conectada
            </span>
            <span className="text-xs font-mono" style={{ color: '#5d5d5d' }}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>
        </div>
        <Button
          onClick={handleDisconnect}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          Desconectar
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="flex items-center space-x-2"
        style={{ 
          backgroundColor: '#fe6c1c', 
          color: '#ffffff' 
        }}
      >
        <Wallet className="w-4 h-4" />
        <span>Conectar Wallet</span>
      </Button>

      {/* Modal de conexión */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1a1a1a' }}>
                Conectar Wallet
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" style={{ color: '#5d5d5d' }} />
              </button>
            </div>

            <p className="text-sm mb-6" style={{ color: '#5d5d5d' }}>
              Selecciona una wallet para conectar con ChipiPay
            </p>

            <div className="space-y-3">
              {connectors.map((connector, index) => {
                // Manejo seguro de propiedades del conector
                let connectorName = 'Wallet'
                let isAvailable = false
                
                try {
                  // Intentar obtener el nombre del conector
                  if (connector.name) {
                    connectorName = connector.name
                  } else if (connector.id) {
                    // Mapear IDs a nombres más amigables
                    const idToName: Record<string, string> = {
                      'braavos': 'Braavos',
                      'argentX': 'Argent X',
                      'argentMobile': 'Argent (mobile)',
                      'argentWebWallet': 'Argent Web Wallet',
                    }
                    connectorName = idToName[connector.id] || connector.id || 'Wallet'
                  } else {
                    connectorName = 'Wallet'
                  }
                  
                  // Verificar disponibilidad de forma segura
                  if (typeof connector.available === 'function') {
                    try {
                      isAvailable = connector.available()
                    } catch (e) {
                      // Si available() lanza un error, asumimos que no está disponible
                      isAvailable = false
                    }
                  } else {
                    // Si no hay método available, asumimos que está disponible
                    isAvailable = true
                  }
                } catch (error) {
                  // Si hay un error al acceder a las propiedades, asumimos que no está disponible
                  console.warn('Error accediendo a propiedades del conector:', error)
                  isAvailable = false
                }
                
                return (
                  <button
                    key={connector.id || index}
                    onClick={() => handleConnect({ connector })}
                    disabled={isPending || !isAvailable}
                    className="w-full p-4 rounded-lg border-2 hover:border-orange-500 transition-all flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      borderColor: 'rgba(254,108,28,0.2)',
                      backgroundColor: 'rgba(247, 247, 246, 0.8)'
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <Wallet className="w-5 h-5" style={{ color: '#fe6c1c' }} />
                      <div className="flex flex-col">
                        <span className="font-medium text-left" style={{ color: '#1a1a1a' }}>
                          {connectorName}
                        </span>
                        {!isAvailable && (
                          <span className="text-xs text-gray-500">No disponible</span>
                        )}
                      </div>
                    </div>
                    {isPending && (
                      <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 p-3 rounded-lg" style={{ 
              backgroundColor: 'rgba(254, 108, 28, 0.05)' 
            }}>
              <p className="text-xs" style={{ color: '#5d5d5d' }}>
                💡 Asegúrate de tener la extensión de wallet instalada en tu navegador
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

