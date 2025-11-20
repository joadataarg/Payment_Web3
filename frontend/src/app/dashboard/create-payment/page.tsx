'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/store/auth'
import { ArrowLeft, QrCode, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

// Importar nuestros nuevos componentes y hooks
import { midatoPayAPI } from '@/lib/midatopay-api'
import { QRModal } from '@/components/QRModal'
import { useOracleConversion } from '@/hooks/useOracleConversion'
import { useCavosConversion } from '@/hooks/useCavosConversion'
import { useCavosWallet } from '@/hooks/useCavosWallet'
import { CavosBalance } from '@/components/CavosBalance'

export default function CreatePaymentPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const { t, language } = useLanguage()
  const [isCreating, setIsCreating] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrData, setQrData] = useState<any>(null)
  const [refreshingQR, setRefreshingQR] = useState(false)

  // Schema de validación - se crea dentro del componente para acceder a las traducciones
  const createPaymentSchema = z.object({
    amount: z.number().min(1, t.dashboard.createPayment.errors.amountMustBeGreater),
  })

  type CreatePaymentForm = z.infer<typeof createPaymentSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreatePaymentForm>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      amount: undefined,
    },
  })

  const watchedAmount = watch('amount')
  
  // Toggle para elegir entre sistema actual (USDT) y Cavos (USDT)
  const [useCavos, setUseCavos] = useState(false)
  
  // Hooks del sistema actual (USDT)
  const { convertARSToCrypto, loading: oracleLoading } = useOracleConversion()
  
  // Hooks de Cavos (USDT)
  const { address: cavosAddress, isConnected: isCavosConnected, wallet: cavosWallet } = useCavosWallet()
  const { convertARSToUSDT, isConverting: cavosConverting } = useCavosConversion()
  
  const [cryptoAmount, setCryptoAmount] = useState<number | null>(null)
  const [percentage, setPercentage] = useState<number>(100) // Porcentaje predeterminado 100%

  // Calcular montos según el porcentaje seleccionado
  const adjustedCryptoAmount = cryptoAmount !== null && watchedAmount 
    ? (cryptoAmount * percentage) / 100 
    : null

  const remainingARSAmount = watchedAmount && percentage < 100
    ? (watchedAmount * (100 - percentage)) / 100
    : null

  // Calcular el monto en USDT/USDC cuando cambia el monto en ARS
  useEffect(() => {
    if (!watchedAmount || watchedAmount <= 0) {
      setCryptoAmount(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        if (useCavos) {
          // Usar Cavos para conversión ARS → USDT
          const usdtAmount = await convertARSToUSDT(watchedAmount)
          setCryptoAmount(usdtAmount)
        } else {
          // Usar sistema actual para conversión ARS → USDT
          const result = await convertARSToCrypto(watchedAmount, 'USDT')
          if (result) {
            setCryptoAmount(result.cryptoAmount)
          } else {
            setCryptoAmount(null)
          }
        }
      } catch (error) {
        console.error('Error calculating conversion:', error)
        setCryptoAmount(null)
      }
    }, 1000) // Debounce de 1 segundo

    return () => clearTimeout(timeoutId)
  }, [watchedAmount, convertARSToCrypto, convertARSToUSDT, useCavos])


  const onSubmit = async (data: CreatePaymentForm) => {
    if (!isAuthenticated) {
      toast.error(t.dashboard.createPayment.errors.mustBeAuthenticated)
      return
    }

    setIsCreating(true)
    try {
      if (useCavos) {
        // Usar Cavos para procesar pago ARS → USDT
        if (!adjustedCryptoAmount || adjustedCryptoAmount <= 0) {
          toast.error('Monto en USDT inválido')
          setIsCreating(false)
          return
        }

        // Generar QR para Cavos (no requiere wallet conectada para generar QR)
        // El QR contiene la información del pago ARS → USDT
        const cavosData = {
          success: true,
          paymentData: {
            amountARS: data.amount,
            targetCrypto: 'USDT', // Cavos usa USDT
            cryptoAmount: adjustedCryptoAmount,
            sessionId: `cavos-${Date.now()}`,
            timestamp: new Date().toISOString(),
            exchangeRate: '1000 ARS = 1 USDT',
            merchantName: 'MidatoPay - Cavos',
            walletAddress: cavosAddress || null // Opcional: incluir wallet si está conectada
          },
          qrCodeImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5DYXZvczx0c3BhbiBkeT0iLjhlbSI+VVNEVDwvdHNwYW4+PC90ZXh0Pjwvc3ZnPg=='
        }

        setQrData(cavosData)
        setShowQRModal(true)
        toast.success(`QR Cavos generado: ${adjustedCryptoAmount.toFixed(6)} USDT`)
      } else {
        // Usar sistema actual para generar QR
        // Asegurarse de que la wallet esté guardada en DB antes de generar QR
        let walletToUse: string | undefined = cavosAddress || undefined
        
        // Si tenemos wallet en localStorage, intentar guardarla en DB primero
        if (walletToUse && cavosWallet) {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
            // Obtener token de autenticación
            let authToken: string | null = null
            try {
              const authStorage = localStorage.getItem('auth-storage')
              if (authStorage) {
                const parsed = JSON.parse(authStorage)
                authToken = parsed.state?.token || null
              }
            } catch (e) {
              // Ignorar error de parsing
            }
            
            // Intentar guardar wallet si no está en DB
            await fetch(`${apiUrl}/api/cavos/save-wallet`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
              },
              body: JSON.stringify({
                walletAddress: walletToUse,
                publicKey: walletToUse,
                privateKey: cavosWallet.privateKey || '', // Enviar clave privada si está disponible
                txHash: cavosWallet.txHash || ''
              })
            }).catch(() => {
              // Si falla, continuar de todas formas con el wallet del request
              console.warn('No se pudo guardar wallet, usando wallet del request')
            })
          } catch (saveError) {
            console.warn('Error guardando wallet antes de generar QR:', saveError)
          }
        }
        
        const result = await midatoPayAPI.generatePaymentQR({
          amountARS: data.amount,
          targetCrypto: 'USDT',
          walletAddress: walletToUse // Pasar walletAddress en el request
        })

        if (result.success) {
          setQrData(result)
          setShowQRModal(true)
          toast.success(t.dashboard.createPayment.success.qrGenerated)
        } else {
          throw new Error(result.error || t.dashboard.createPayment.errors.errorGeneratingQR)
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.dashboard.createPayment.errors.errorGeneratingQR)
    } finally {
      setIsCreating(false)
    }
  }

  // Evitar render en servidor si no está autenticado
  if (typeof window === 'undefined' || !isAuthenticated) {
    if (typeof window !== 'undefined') {
      router.push('/auth/login')
    }
    return null
  }

  return (
    <div className="min-h-screen"
      style={{ 
        background: 'linear-gradient(135deg, #fff5f0 0%, #f7f7f6 100%)',
        fontFamily: 'Kufam, sans-serif'
      }}
    >
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">{t.dashboard.createPayment.backToDashboard}</span>
              </Link>
            </div>
            <div className="flex items-center space-x-2">
              <QrCode className="w-6 h-6" style={{ color: '#fe6c1c' }} />
              <h1 className="text-xl font-bold" style={{ color: '#1a1a1a' }}>{t.dashboard.createPayment.title}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center">
          
          {/* Formulario */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl"
          >
            <Card className="shadow-lg border-0"
              style={{ 
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(254, 108, 28, 0.1)'
              }}
            >
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
                  {t.dashboard.createPayment.paymentDetails}
                </CardTitle>
                <CardDescription className="text-base" style={{ color: '#5d5d5d' }}>
                  {t.dashboard.createPayment.completeDetails}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  
                  {/* Toggle Cavos */}
                  <div className="flex items-center justify-between p-4 rounded-xl border" style={{ 
                    backgroundColor: 'rgba(247, 247, 246, 0.8)', 
                    borderColor: 'rgba(254,108,28,0.2)' 
                  }}>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                        Sistema de Pago:
                      </span>
                      <span className="text-xs" style={{ color: useCavos ? '#fe6c1c' : '#5d5d5d' }}>
                        {useCavos ? 'Cavos (USDT)' : 'Sistema Actual (USDT)'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseCavos(!useCavos)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        useCavos ? 'bg-orange-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useCavos ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {/* Balance USDT si usa Cavos y tiene wallet conectada */}
                  {useCavos && isCavosConnected && cavosAddress && (
                    <div className="p-3 rounded-lg" style={{ 
                      backgroundColor: 'rgba(254, 108, 28, 0.05)', 
                      border: '1px solid rgba(254,108,28,0.2)' 
                    }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                          Balance USDT:
                        </span>
                        <CavosBalance 
                          token="USDT" 
                          tokenAddress={process.env.NEXT_PUBLIC_STARKNET_USDT_ADDRESS || '0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8'}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Monto */}
                  <div className="space-y-2">
                    <Label htmlFor="amount" style={{ color: '#1a1a1a', fontWeight: '500' }}>{t.dashboard.createPayment.amountInARS}</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#fe6c1c' }} />
                      <img 
                        src="/logo-arg.png" 
                        alt="ARS" 
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6"
                      />
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register('amount', { valueAsNumber: true })}
                        className={`pl-12 pr-12 h-12 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-offset-2 ${errors.amount ? 'border-red-500' : ''}`}
                        style={{ 
                          backgroundColor: 'rgba(247, 247, 246, 0.8)', 
                          border: '1px solid rgba(254,108,28,0.2)',
                          color: '#1a1a1a'
                        }}
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-sm text-red-500">{errors.amount.message}</p>
                    )}
                  </div>

                  {/* Barra de Porcentajes */}
                  {watchedAmount && watchedAmount > 0 && (
                    <div className="space-y-3">
                      <Label style={{ color: '#1a1a1a', fontWeight: '500' }}>{t.dashboard.createPayment.conversionPercentage}</Label>
                      <div className="flex flex-wrap gap-2">
                        {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setPercentage(pct)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              percentage === pct
                                ? 'scale-105 shadow-md'
                                : 'hover:scale-105'
                            }`}
                            style={{
                              backgroundColor: percentage === pct ? '#fe6c1c' : 'rgba(247, 247, 246, 0.8)',
                              color: percentage === pct ? '#ffffff' : '#1a1a1a',
                              border: percentage === pct ? '2px solid #fe6c1c' : '1px solid rgba(254,108,28,0.2)',
                              fontFamily: 'Kufam, sans-serif',
                              fontWeight: percentage === pct ? 600 : 500
                            }}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cripto a Recibir */}
                  <div className="space-y-2">
                    <Label htmlFor="receiveCurrency" style={{ color: '#1a1a1a', fontWeight: '500' }}>{t.dashboard.createPayment.cryptoToReceive}</Label>
                    <div className="relative">
                      <div className="w-full h-12 px-4 py-3 rounded-xl flex items-center justify-between"
                        style={{ 
                          backgroundColor: 'rgba(247, 247, 246, 0.8)', 
                          border: '1px solid rgba(254,108,28,0.2)',
                          color: '#1a1a1a'
                        }}
                      >
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#009393' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <g clipPath="url(#USDT_create)">
                                <path fill="#009393" d="M24 0H0v24h24z"/>
                                <path fill="#fff" d="m12 18.4-8-7.892L7.052 5.6h9.896L20 10.508zm.8-7.2v-.976c1.44.072 2.784.352 3.2.716-.484.424-2.216.732-4 .732s-3.516-.308-4-.732c.412-.364 1.76-.64 3.2-.72v.98zM8 10.936v.588c.412.364 1.756.64 3.2.72V14.4h1.6v-2.16c1.44-.072 2.788-.352 3.2-.716v-1.172c-.412-.364-1.76-.644-3.2-.72V8.8h2.4V7.6H8.8v1.2h2.4v.832c-1.444.076-2.788.356-3.2.72z"/>
                              </g>
                              <defs>
                                <clipPath id="USDT_create">
                                  <path fill="#fff" d="M0 0h24v24H0z"/>
                                </clipPath>
                              </defs>
                            </svg>
                          </div>
                          <span className="font-medium">USDT (Tether)</span>
                        </div>
                        <span className="text-sm font-semibold" style={{ color: (oracleLoading || cavosConverting) ? '#8B8B8B' : '#009393' }}>
                          {(oracleLoading || cavosConverting) ? '...' : adjustedCryptoAmount !== null ? `${adjustedCryptoAmount.toFixed(6)} USDT` : '--'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs" style={{ color: '#5d5d5d' }}>
                        {t.dashboard.createPayment.oracleDescription}
                      </p>
                      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg" style={{ 
                        backgroundColor: 'rgba(254, 108, 28, 0.05)', 
                        border: '1px solid rgba(254,108,28,0.15)' 
                      }}>
                        <svg className="w-4 h-4" style={{ color: '#fe6c1c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs font-medium" style={{ color: '#fe6c1c', fontFamily: 'Kufam, sans-serif' }}>
                          {t.dashboard.createPayment.exchangeRate}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Información del porcentaje restante en ARS */}
                  {percentage < 100 && remainingARSAmount !== null && watchedAmount && (
                    <div className="p-4 rounded-xl" style={{ 
                      backgroundColor: 'rgba(254, 108, 28, 0.05)', 
                      border: '1px solid rgba(254,108,28,0.2)' 
                    }}>
                      <div className="space-y-2">
                        <p className="text-sm font-semibold" style={{ color: '#1a1a1a', fontFamily: 'Kufam, sans-serif' }}>
                          {t.dashboard.createPayment.remainingAmountARS}
                        </p>
                        <div className="flex items-center space-x-2">
                          <img 
                            src="/logo-arg.png" 
                            alt="ARS" 
                            className="w-5 h-5"
                          />
                          <span className="text-lg font-bold" style={{ color: '#fe6c1c', fontFamily: 'Kufam, sans-serif' }}>
                            ${remainingARSAmount.toLocaleString(language === 'es' ? 'es-AR' : language === 'en' ? 'en-US' : language === 'it' ? 'it-IT' : language === 'pt' ? 'pt-BR' : 'zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: '#5d5d5d', fontFamily: 'Kufam, sans-serif' }}>
                          {t.dashboard.createPayment.remainingAmountDescription
                            .replace('{percentage}', String(100 - percentage))
                            .replace('{amount}', remainingARSAmount.toLocaleString(language === 'es' ? 'es-AR' : language === 'en' ? 'en-US' : language === 'it' ? 'it-IT' : language === 'pt' ? 'pt-BR' : 'zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Botón Generar QR */}
                  <Button
                    type="submit"
                    disabled={isCreating || !watchedAmount}
                    className="w-full h-14 rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ 
                      backgroundColor: '#fe6c1c', 
                      color: '#ffffff',
                      fontFamily: 'Kufam, sans-serif'
                    }}
                  >
                    {isCreating ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{t.dashboard.createPayment.generatingQR}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <QrCode className="w-5 h-5" />
                        <span>{t.dashboard.createPayment.generateQR}</span>
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* QR Modal */}
      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrData={qrData}
        onRefreshQR={async () => {
          if (!qrData?.paymentData?.amountARS) return
          
          setRefreshingQR(true)
          try {
            const result = await midatoPayAPI.generatePaymentQR({
              amountARS: qrData.paymentData.amountARS,
              targetCrypto: 'USDT'
            })
            
            if (result.success) {
              setQrData(result)
              toast.success(t.dashboard.createPayment.success.qrUpdated)
            }
          } catch (error) {
            toast.error(t.dashboard.createPayment.errors.errorUpdatingQR)
          } finally {
            setRefreshingQR(false)
          }
        }}
        refreshing={refreshingQR}
      />
    </div>
  )
}