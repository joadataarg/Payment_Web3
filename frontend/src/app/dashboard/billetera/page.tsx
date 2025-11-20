'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useWalletManager } from '@/hooks/useWalletManager'
import { WalletSetup } from '@/components/WalletSetup'
import { CavosCreateWallet } from '@/components/CavosCreateWallet'
import { useCavosWallet } from '@/hooks/useCavosWallet'
import { CavosBalance } from '@/components/CavosBalance'
import { useLanguage } from '@/contexts/LanguageContext'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet, DollarSign } from 'lucide-react'
import { normalizeStarknetAddress } from '@/utils/starknetAddress'

export default function BilleteraPage() {
  const { wallet, isConnected, isLoading: walletLoading } = useWalletManager()
  const { wallet: cavosWallet, address: cavosAddress, isConnected: isCavosConnected } = useCavosWallet()
  const { t } = useLanguage()
  
  const [merchantWallet, setMerchantWallet] = useState({
    isConnected: isConnected,
    address: wallet?.address || null,
    balance: null as string | null,
    isLoading: false
  })

  // Inicializar estado de wallet si ya existe una guardada
  useEffect(() => {
    if (wallet?.address && !merchantWallet.isConnected) {
      setMerchantWallet({
        isConnected: true,
        address: wallet.address,
        balance: '0.0 USDT',
        isLoading: false
      })
    }
  }, [wallet?.address])

  // Actualizar estado cuando cambie la wallet
  useEffect(() => {
    if (isConnected && wallet?.address) {
      setMerchantWallet(prev => ({
        ...prev,
        isConnected: true,
        address: wallet.address
      }))
    }
  }, [isConnected, wallet?.address])

  // Mostrar WalletSetup solo si no hay wallet de Starknet Y no hay wallet de Cavos
  // Si hay wallet de Cavos, mostrar la página completa (no solo WalletSetup)
  if (!isConnected && !walletLoading && !isCavosConnected) {
    return (
      <DashboardLayout pageTitle={t.dashboard.sidebar.wallet}>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-teal-50 flex items-center justify-center p-4">
          <WalletSetup />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout pageTitle={t.dashboard.sidebar.wallet}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sección de Información de Wallet */}
        {merchantWallet.isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card style={{ 
              backgroundColor: 'rgba(16,185,129,0.05)', 
              borderColor: 'rgba(16,185,129,0.2)', 
              boxShadow: '0 10px 30px rgba(16,185,129,0.1)', 
              backdropFilter: 'blur(10px)' 
            }}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#10b981' }}>
                    <Wallet className="w-4 h-4 text-white" />
                  </div>
                  <span style={{ color: '#1a1a1a', fontFamily: 'Kufam, sans-serif', fontWeight: 700 }}>{t.dashboard.walletInformation}</span>
                </CardTitle>
                <CardDescription style={{ color: '#5d5d5d', fontFamily: 'Kufam, sans-serif', fontWeight: 400 }}>
                  {t.dashboard.walletDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dirección */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2" style={{ fontFamily: 'Kufam, sans-serif', fontWeight: 700 }}>{t.dashboard.address}</h4>
                    <p className="text-sm font-mono text-green-800 break-all" style={{ fontFamily: 'Kufam, sans-serif', fontWeight: 400 }}>
                      {merchantWallet.address}
                    </p>
                    <p className="text-xs text-green-600 mt-1" style={{ fontFamily: 'Kufam, sans-serif', fontWeight: 400 }}>{t.dashboard.yourWalletAddress}</p>
                  </div>
                  
                  {/* Red */}
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2" style={{ fontFamily: 'Kufam, sans-serif', fontWeight: 700 }}>{t.dashboard.network}</h4>
                    <p className="text-lg font-bold text-purple-900" style={{ fontFamily: 'Kufam, sans-serif', fontWeight: 700 }}>Starknet Sepolia</p>
                    <p className="text-sm text-purple-700" style={{ fontFamily: 'Kufam, sans-serif', fontWeight: 400 }}>{t.dashboard.testnet}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Sección de Wallet Cavos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card style={{ 
            backgroundColor: 'rgba(254, 108, 28, 0.05)', 
            borderColor: 'rgba(254, 108, 28, 0.2)', 
            boxShadow: '0 10px 30px rgba(254, 108, 28, 0.1)' 
          }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fe6c1c' }}>
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <span style={{ color: '#1a1a1a', fontFamily: 'Kufam, sans-serif', fontWeight: 700 }}>
                  Wallet Cavos (USDC)
                </span>
              </CardTitle>
              <CardDescription style={{ color: '#5d5d5d', fontFamily: 'Kufam, sans-serif' }}>
                Crea una wallet Cavos para recibir pagos en USDC. Las transacciones son gasless (sin costo de gas).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCavosConnected && cavosWallet ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2" style={{ fontFamily: 'Kufam, sans-serif' }}>
                      ✅ Wallet Cavos Activa
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-green-800">Dirección:</span>
                        <p className="font-mono text-green-800 break-all mt-1">
                          {cavosAddress || cavosWallet.address}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-green-800">Balance USDC:</span>
                        <div className="mt-1">
                          <CavosBalance 
                            token="USDC" 
                            tokenAddress={process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS || '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8'}
                            address={cavosAddress}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <CavosCreateWallet />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}

