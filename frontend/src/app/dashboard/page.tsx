'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useWalletManager } from '@/hooks/useWalletManager'
import { useUSDTBalance } from '@/hooks/useUSDTBalance'
import { CavosBalance } from '@/components/CavosBalance'
import { CavosCreateWallet } from '@/components/CavosCreateWallet'
import { useCavosWallet } from '@/hooks/useCavosWallet'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuth as useClerkAuth } from '@clerk/nextjs'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { QrCode, ArrowUp, History, Settings } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { wallet, isConnected, isLoading: walletLoading } = useWalletManager()
  const { balance: usdtBalance, isLoading: usdtBalanceLoading, error: usdtBalanceError } = useUSDTBalance(wallet?.address)
  const { address: cavosAddress, isConnected: isCavosConnected } = useCavosWallet()
  const { t } = useLanguage()
  const { user, isLoading: profileLoading, needsOnboarding, needsWallet } = useUserProfile()
  const { isSignedIn, isLoaded: isClerkAuthLoaded } = useClerkAuth()
  
  // Debug: Verificar si venimos de OAuth callback
  useEffect(() => {
    const clerkSession = searchParams.get('__clerk_redirect_url') || searchParams.get('__session')
    if (clerkSession) {
      console.log('🔄 Detectado callback de Clerk OAuth:', clerkSession)
    }
    
    // Verificar estado de Clerk después de un delay para dar tiempo a que se establezca la sesión
    if (isClerkAuthLoaded) {
      const timer = setTimeout(() => {
        console.log('🔍 Estado de Clerk en Dashboard:', {
          isSignedIn,
          isLoaded: isClerkAuthLoaded,
          hasSearchParams: searchParams.toString().length > 0
        })
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isClerkAuthLoaded, isSignedIn, searchParams])

  // NO redirigir a onboarding - el usuario puede crear wallet directamente desde el dashboard
  // useEffect(() => {
  //   if (!profileLoading && needsOnboarding) {
  //     const timer = setTimeout(() => {
  //       router.push('/onboarding')
  //     }, 500)
  //     return () => clearTimeout(timer)
  //   }
  // }, [profileLoading, needsOnboarding, router])

  // Mostrar CavosCreateWallet si no hay wallet conectada
  // Verificar si el usuario tiene wallet en la BD o en localStorage
  const hasAnyWallet = isConnected || isCavosConnected || user?.walletAddress
  
  if (!hasAnyWallet && !walletLoading && !profileLoading) {
    return (
      <DashboardLayout pageTitle={t.dashboard.header.start}>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-teal-50 flex items-center justify-center p-4">
          <CavosCreateWallet />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout pageTitle={t.dashboard.header.start}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section - Welcome and Total Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-end justify-between">
            {/* Welcome Section */}
            <div style={{ marginTop: '48px' }}>
              <h2 className="mb-0" style={{ fontFamily: 'Kufam, sans-serif', color: '#2C2C2C', fontWeight: 500, fontSize: '24px', marginBottom: '-10px' }}>
                {t.dashboard.welcome}
              </h2>
              <h2 className="mb-0" style={{ fontFamily: 'Kufam, sans-serif', color: '#FF6A00', fontWeight: 600, fontSize: '62px' }}>
                {user?.name || 'Tu Negocio'}
              </h2>
            </div>
            
            {/* Total Balance Card */}
            <Card style={{ backgroundColor: '#FFFFFF', border: '3px solid transparent', background: 'linear-gradient(#FFFFFF, #FFFFFF) padding-box, linear-gradient(135deg, #FF6A00, #FF8A33) border-box', boxShadow: '0px 6px 20px rgba(255,106,0,0.25)', borderRadius: '16px' }}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#E3F2FD' }}>
                    <img src="/logo-arg.png" alt="Argentina" className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-medium" style={{ color: '#8B8B8B', fontFamily: 'Kufam, sans-serif', fontWeight: 400 }}>{t.dashboard.totalBalance}</p>
                    <p className="text-3xl font-bold" style={{ color: '#2C2C2C', fontFamily: 'Kufam, sans-serif', fontWeight: 700 }}>
                      $ 0
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" style={{ color: '#8B8B8B' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium" style={{ color: '#8B8B8B', fontFamily: 'Kufam, sans-serif', fontWeight: 500 }}>--</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Botones de Acción Rápida */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between gap-4">
            {/* Generar QR */}
            <Link 
              href="/dashboard/create-payment"
              className="flex-1 flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-200 hover:scale-105 cursor-pointer"
              style={{ 
                backgroundColor: '#2C2C2C',
                border: '2px solid rgba(255,106,0,0.3)',
                boxShadow: '0px 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-3"
                style={{ 
                  background: 'linear-gradient(135deg, #FF6A00 0%, #FF8A33 100%)',
                  boxShadow: '0px 4px 12px rgba(255,106,0,0.3)'
                }}
              >
                <QrCode className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <span 
                className="text-sm font-semibold text-center"
                style={{ 
                  color: '#FFFFFF',
                  fontFamily: 'Kufam, sans-serif',
                  fontWeight: 600
                }}
              >
                {t.dashboard.generateQR}
              </span>
            </Link>

            {/* Retirar */}
            <button
              onClick={() => {
                toast(t.dashboard.withdrawComingSoon || 'Función próximamente disponible')
              }}
              className="flex-1 flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-200 hover:scale-105 cursor-pointer"
              style={{ 
                backgroundColor: '#2C2C2C',
                border: '2px solid rgba(255,106,0,0.3)',
                boxShadow: '0px 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-3"
                style={{ 
                  background: 'linear-gradient(135deg, #FF6A00 0%, #FF8A33 100%)',
                  boxShadow: '0px 4px 12px rgba(255,106,0,0.3)'
                }}
              >
                <ArrowUp className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <span 
                className="text-sm font-semibold text-center"
                style={{ 
                  color: '#FFFFFF',
                  fontFamily: 'Kufam, sans-serif',
                  fontWeight: 600
                }}
              >
                {t.dashboard.withdraw}
              </span>
            </button>

            {/* Ver Historial */}
            <Link
              href="/dashboard/movimientos"
              className="flex-1 flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-200 hover:scale-105 cursor-pointer"
              style={{ 
                backgroundColor: '#2C2C2C',
                border: '2px solid rgba(255,106,0,0.3)',
                boxShadow: '0px 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-3"
                style={{ 
                  background: 'linear-gradient(135deg, #FF6A00 0%, #FF8A33 100%)',
                  boxShadow: '0px 4px 12px rgba(255,106,0,0.3)'
                }}
              >
                <History className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <span 
                className="text-sm font-semibold text-center"
                style={{ 
                  color: '#FFFFFF',
                  fontFamily: 'Kufam, sans-serif',
                  fontWeight: 600
                }}
              >
                {t.dashboard.viewHistory}
              </span>
            </Link>

            {/* Configuración */}
            <button
              onClick={() => {
                toast(t.dashboard.settingsComingSoon || 'Función próximamente disponible')
              }}
              className="flex-1 flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-200 hover:scale-105 cursor-pointer"
              style={{ 
                backgroundColor: '#2C2C2C',
                border: '2px solid rgba(255,106,0,0.3)',
                boxShadow: '0px 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-3"
                style={{ 
                  background: 'linear-gradient(135deg, #FF6A00 0%, #FF8A33 100%)',
                  boxShadow: '0px 4px 12px rgba(255,106,0,0.3)'
                }}
              >
                <Settings className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <span 
                className="text-sm font-semibold text-center"
                style={{ 
                  color: '#FFFFFF',
                  fontFamily: 'Kufam, sans-serif',
                  fontWeight: 600
                }}
              >
                {t.dashboard.settings}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Saldos en Criptomonedas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div style={{ backgroundColor: '#FF6A00', borderRadius: '20px', padding: '32px' }}>
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Kufam, sans-serif', fontWeight: 700 }}>{t.dashboard.cryptoBalance}</h4>
              <button className="px-3 py-1 rounded-lg text-sm font-medium" style={{ backgroundColor: '#FFFFFF', color: '#FF6A00', fontFamily: 'Kufam, sans-serif', fontWeight: 500, borderRadius: '8px', boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' }}>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>{t.dashboard.filter}</span>
                </div>
              </button>
            </div>
            
            <div style={{ backgroundColor: '#FFF9F5', border: '1.8px solid #FF6A00', borderRadius: '14px', boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.08)', padding: '24px' }}>
              {/* USDT Card */}
              <div className="flex items-center justify-between" style={{ padding: '16px 0' }}>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#009393' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <g clipPath="url(#USDT_real)">
                        <path fill="#009393" d="M24 0H0v24h24z"/>
                        <path fill="#fff" d="m12 18.4-8-7.892L7.052 5.6h9.896L20 10.508zm.8-7.2v-.976c1.44.072 2.784.352 3.2.716-.484.424-2.216.732-4 .732s-3.516-.308-4-.732c.412-.364 1.76-.64 3.2-.72v.98zM8 10.936v.588c.412.364 1.756.64 3.2.72V14.4h1.6v-2.16c1.44-.072 2.788-.352 3.2-.716v-1.172c-.412-.364-1.76-.644-3.2-.72V8.8h2.4V7.6H8.8v1.2h2.4v.832c-1.444.076-2.788.356-3.2.72z"/>
                      </g>
                      <defs>
                        <clipPath id="USDT_real">
                          <path fill="#fff" d="M0 0h24v24H0z"/>
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-bold" style={{ color: '#2C2C2C', fontFamily: 'Kufam, sans-serif', fontWeight: 700 }}>USDT</h5>
                    <p className="text-sm" style={{ color: '#8B8B8B', fontFamily: 'Kufam, sans-serif', fontWeight: 400 }}>Tether</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-[1fr_1fr_1fr] gap-16">
                  <div className="text-left">
                    <p className="text-sm" style={{ color: '#8B8B8B', fontFamily: 'Kufam, sans-serif', fontWeight: 400 }}>{t.dashboard.balance}</p>
                    <p className="font-bold text-lg" style={{ color: '#FF6A00', fontFamily: 'Kufam, sans-serif', fontWeight: 500 }}>
                      {usdtBalanceLoading ? '...' : usdtBalanceError ? '--' : `${usdtBalance.toFixed(6)}`}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm" style={{ color: '#8B8B8B', fontFamily: 'Kufam, sans-serif', fontWeight: 400 }}>{t.dashboard.exchangeRate}</p>
                    <p className="font-bold text-lg" style={{ color: '#FF6A00', fontFamily: 'Kufam, sans-serif', fontWeight: 500 }}>--</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm" style={{ color: '#8B8B8B', fontFamily: 'Kufam, sans-serif', fontWeight: 400 }}>{t.dashboard.argentinePesos}</p>
                    <p className="font-bold text-lg" style={{ color: '#2C2C2C', fontFamily: 'Kufam, sans-serif', fontWeight: 500 }}>--</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" style={{ color: '#8B8B8B' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium" style={{ color: '#8B8B8B', fontFamily: 'Kufam, sans-serif', fontWeight: 500 }}>--</span>
                </div>
              </div>

              {/* USDT (Cavos) Card */}
              {isCavosConnected && cavosAddress && (
                <div className="flex items-center justify-between border-t border-orange-200" style={{ padding: '16px 0', marginTop: '16px' }}>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#009393' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <g clipPath="url(#USDT_real)">
                          <path fill="#009393" d="M24 0H0v24h24z"/>
                          <path fill="#fff" d="m12 18.4-8-7.892L7.052 5.6h9.896L20 10.508zm.8-7.2v-.976c1.44.072 2.784.352 3.2.716-.484.424-2.216.732-4 .732s-3.516-.308-4-.732c.412-.364 1.76-.64 3.2-.72v.98zM8 10.936v.588c.412.364 1.756.64 3.2.72V14.4h1.6v-2.16c1.44-.072 2.788-.352 3.2-.716v-1.172c-.412-.364-1.76-.644-3.2-.72V8.8h2.4V7.6H8.8v1.2h2.4v.832c-1.444.076-2.788.356-3.2.72z"/>
                        </g>
                        <defs>
                          <clipPath id="USDT_real">
                            <path fill="#fff" d="M0 0h24v24H0z"/>
                          </clipPath>
                        </defs>
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-bold" style={{ color: '#2C2C2C', fontFamily: 'Kufam, sans-serif', fontWeight: 700 }}>USDT</h5>
                      <p className="text-sm" style={{ color: '#8B8B8B', fontFamily: 'Kufam, sans-serif', fontWeight: 400 }}>Cavos</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-[1fr_1fr_1fr] gap-16">
                    <div className="text-left">
                      <p className="text-sm" style={{ color: '#8B8B8B', fontFamily: 'Kufam, sans-serif', fontWeight: 400 }}>{t.dashboard.balance}</p>
                      <CavosBalance 
                        token="USDT" 
                        tokenAddress={process.env.NEXT_PUBLIC_STARKNET_USDT_ADDRESS || '0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8'}
                        address={cavosAddress}
                      />
                    </div>
                    <div className="text-left">
                      <p className="text-sm" style={{ color: '#8B8B8B', fontFamily: 'Kufam, sans-serif', fontWeight: 400 }}>{t.dashboard.exchangeRate}</p>
                      <p className="font-bold text-lg" style={{ color: '#FF6A00', fontFamily: 'Kufam, sans-serif', fontWeight: 500 }}>$1,000</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm" style={{ color: '#8B8B8B', fontFamily: 'Kufam, sans-serif', fontWeight: 400 }}>{t.dashboard.argentinePesos}</p>
                      <p className="font-bold text-lg" style={{ color: '#2C2C2C', fontFamily: 'Kufam, sans-serif', fontWeight: 500 }}>--</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" style={{ color: '#8B8B8B' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium" style={{ color: '#8B8B8B', fontFamily: 'Kufam, sans-serif', fontWeight: 500 }}>--</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
