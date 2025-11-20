'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Wallet, AlertCircle, CheckCircle, Copy, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCavosTransfer } from '@/hooks/useCavosTransfer'
import { useCavosWallet } from '@/hooks/useCavosWallet'
import { CavosBalance } from '@/components/CavosBalance'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/store/auth'
import { useUserProfile } from '@/hooks/useUserProfile'
import { normalizeStarknetAddress } from '@/utils/starknetAddress'

/**
 * Página para enviar pagos USDT manualmente usando Cavos
 * 
 * Flujo:
 * 1. Usuario ingresa dirección del destinatario
 * 2. Usuario ingresa monto (ARS o USDT)
 * 3. Usuario ingresa PIN
 * 4. Se ejecuta transferencia usando useCavosTransfer
 * 5. Se muestra confirmación con TX hash
 */
export default function SendPaymentPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { wallet: cavosWallet, address: cavosAddress, isConnected: isCavosConnected, isLoading: walletLoading } = useCavosWallet()
  const { user: authUser } = useAuth()
  const { user: profileUser, isLoading: profileLoading } = useUserProfile()
  
  // Usar walletAddress del perfil completo (más confiable) y normalizarla
  const rawWalletAddress = cavosAddress || profileUser?.walletAddress || authUser?.walletAddress
  const walletAddress = rawWalletAddress ? normalizeStarknetAddress(rawWalletAddress) || rawWalletAddress : undefined
  
  const { transfer, isLoading: isTransferring, error: transferError, transactionHash } = useCavosTransfer()
  
  // Verificar si hay wallet en localStorage o en la BD
  const hasCavosWallet = isCavosConnected || !!cavosWallet || !!profileUser?.walletAddress || !!authUser?.walletAddress
  const user = profileUser || authUser

  const USDT_CONTRACT = process.env.NEXT_PUBLIC_STARKNET_USDT_ADDRESS || '0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8'

  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [amountType, setAmountType] = useState<'ARS' | 'USDT'>('ARS')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errors, setErrors] = useState<{
    recipient?: string
    amount?: string
    pin?: string
  }>({})

  // Normalizar dirección de Starknet (debe tener exactamente 66 caracteres: 0x + 64 hex)
  const normalizeAddress = (address: string): string => {
    const normalized = normalizeStarknetAddress(address)
    return normalized || address // Si no se puede normalizar, retornar la original
  }

  // Validar dirección de Starknet (después de normalización debe tener 66 caracteres)
  const isValidStarknetAddress = (address: string): boolean => {
    if (!address) return false
    const normalized = normalizeStarknetAddress(address)
    return normalized !== null && normalized.length === 66
  }

  // Validar formulario
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    if (!recipientAddress.trim()) {
      newErrors.recipient = 'La dirección del destinatario es requerida'
    } else if (!isValidStarknetAddress(recipientAddress.trim())) {
      newErrors.recipient = 'La dirección no es válida. Debe empezar con 0x y contener caracteres hexadecimales válidos'
    }
    // Permitir enviarse a sí mismo para pruebas

    if (!amount.trim()) {
      newErrors.amount = 'El monto es requerido'
    } else {
      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        newErrors.amount = 'El monto debe ser un número mayor a 0'
      } else if (amountType === 'USDT') {
        // Validación de balance se manejará en el backend o durante la transferencia
        // Por ahora, solo validamos que el monto sea positivo
      }
    }

    if (!pin.trim()) {
      newErrors.pin = 'El PIN es requerido'
    } else if (pin.length < 4) {
      newErrors.pin = 'El PIN debe tener al menos 4 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Manejar envío
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!isCavosConnected || !cavosAddress) {
      toast.error('No se pudo obtener la información de tu wallet Cavos. Por favor, conecta tu wallet.')
      router.push('/dashboard/billetera')
      return
    }

    try {
      // Obtener tasa de cambio ARS/USDT del backend o usar tasa por defecto
      let arsToUsdtRate = 1411 // 1411 ARS = 1 USDT (tasa por defecto)
      
      // Intentar obtener tasa real del backend
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const priceResponse = await fetch(`${apiUrl}/api/prices/latest?currency=USDT&baseCurrency=ARS`)
        if (priceResponse.ok) {
          const priceData = await priceResponse.json()
          if (priceData.price) {
            // El precio viene como USDT/ARS, necesitamos invertirlo para ARS/USDT
            arsToUsdtRate = 1 / parseFloat(priceData.price)
          }
        }
      } catch (priceError) {
        console.warn('No se pudo obtener tasa de cambio, usando tasa por defecto:', priceError)
      }

      // Convertir monto a USDT si está en ARS
      let amountInUSDT = parseFloat(amount)
      if (amountType === 'ARS') {
        amountInUSDT = amountInUSDT / arsToUsdtRate
        toast(`💡 Conversión: ${parseFloat(amount).toFixed(2)} ARS = ${amountInUSDT.toFixed(6)} USDT (1 USDT ≈ ${arsToUsdtRate.toFixed(0)} ARS)`, { duration: 4000 })
      }

      if (!USDT_CONTRACT || USDT_CONTRACT === '0x0000000000000000000000000000000000000000') {
        toast.error('⚠️ La dirección del contrato USDT no está configurada. Agrega NEXT_PUBLIC_STARKNET_USDT_ADDRESS a .env.local')
        return
      }
      
      console.log('🔍 Usando dirección de contrato USDT:', USDT_CONTRACT)

      // Convertir a formato con decimals (USDT tiene 6 decimals)
      const decimals = 6
      // El amount debe estar en la unidad más pequeña (sin decimals)
      const amountInSmallestUnit = Math.floor(amountInUSDT * Math.pow(10, decimals)).toString()

      if (parseInt(amountInSmallestUnit) <= 0) {
        toast.error('El monto es demasiado pequeño después de la conversión')
        return
      }

      // Ejecutar transferencia usando Cavos
      const result = await transfer(
        USDT_CONTRACT, // Dirección del contrato USDT
        normalizeAddress(recipientAddress.trim()), // Normalizar dirección del destinatario
        amountInSmallestUnit // Enviar como string (unidades más pequeñas)
      )

      // transactionHash contiene directamente el hash de la transacción
      const txHashValue = result.transactionHash || transactionHash
      
      if (result.success && txHashValue) {
        setTxHash(txHashValue)
        toast.success('✅ Pago enviado exitosamente!')
        
        // Limpiar formulario
        setRecipientAddress('')
        setAmount('')
        setPin('')
        setErrors({})

        // Guardar transacción en backend (opcional)
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          // Obtener token de autenticación desde localStorage o Clerk
          const authToken = localStorage.getItem('token') || ''
          await fetch(`${apiUrl}/api/cavos/transactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              sessionId: `send-${Date.now()}`,
              amountARS: amountType === 'ARS' ? parseFloat(amount) : parseFloat(amount) * arsToUsdtRate,
              amountUSDC: amountInUSDT, // Kept for DB compatibility
              txHash: txHashValue,
              fromAddress: cavosAddress,
              toAddress: recipientAddress.trim(),
              status: 'completed',
              userId: user?.id || cavosAddress
            })
          })
        } catch (error) {
          console.error('Error guardando transacción:', error)
          // No mostrar error al usuario, la transacción ya se ejecutó
        }
      } else {
        toast.error(result.error || 'No se recibió hash de transacción. Verifica la consola para más detalles.')
        console.error('Resultado de transfer:', result)
      }
    } catch (error: any) {
      console.error('Error enviando pago:', error)
      const errorMessage = error?.message || 'Error al enviar el pago'
      toast.error(`Error: ${errorMessage}`)
    }
  }

  // Copiar dirección al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado al portapapeles')
  }

  // Debug: Log información de la wallet
  useEffect(() => {
    if (!walletLoading && user) {
      console.log('🔍 Send Payment - Estado de wallet:', {
        hasCavosWallet,
        isCavosConnected,
        walletAddress: walletAddress,
        cavosWallet: cavosWallet?.address,
        profileUserWallet: profileUser?.walletAddress,
        authUserWallet: authUser?.walletAddress,
        usdtContract: USDT_CONTRACT
      })
    }
  }, [hasCavosWallet, walletLoading, user, isCavosConnected, cavosWallet, walletAddress, USDT_CONTRACT, profileUser, authUser])

  // Mostrar loading mientras se carga la wallet
  if (walletLoading || profileLoading || !user) {
    return (
      <DashboardLayout pageTitle="Enviar Pago">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg mb-4" style={{ fontFamily: 'Kufam, sans-serif', color: '#5d5d5d' }}>
              Cargando información de wallet...
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Si no hay wallet después de cargar, mostrar mensaje y opción para crear
  if (!hasCavosWallet) {
    return (
      <DashboardLayout pageTitle="Enviar Pago USDT">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className="mb-6"
              style={{
                fontFamily: 'Kufam, sans-serif',
                color: '#5d5d5d'
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </Link>

          <Card style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(254, 108, 28, 0.2)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" style={{
                fontFamily: 'Kufam, sans-serif',
                color: '#1a1a1a',
                fontWeight: 700
              }}>
                <AlertCircle className="w-6 h-6" style={{ color: '#ef4444' }} />
                <span>Wallet Cavos Requerida</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/dashboard/billetera">
                <Button
                  className="w-full"
                  style={{
                    backgroundColor: '#fe6c1c',
                    color: '#ffffff',
                    fontFamily: 'Kufam, sans-serif',
                    fontWeight: 600
                  }}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Ir a Crear Wallet Cavos
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout pageTitle="Enviar Pago USDT">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Botón volver */}
        <Link href="/dashboard">
          <Button
            variant="ghost"
            className="mb-6"
            style={{
              fontFamily: 'Kufam, sans-serif',
              color: '#5d5d5d'
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Button>
        </Link>

        {/* Card principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(254, 108, 28, 0.2)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" style={{
                fontFamily: 'Kufam, sans-serif',
                color: '#1a1a1a',
                fontWeight: 700
              }}>
                <Send className="w-6 h-6" style={{ color: '#fe6c1c' }} />
                <span>Enviar Pago USDT</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Balance actual */}
              <div className="mb-6 p-4 rounded-lg" style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm mb-1" style={{ color: '#5d5d5d', fontFamily: 'Kufam, sans-serif' }}>
                      Balance disponible
                    </p>
                    <div className="text-2xl font-bold" style={{ color: '#1a1a1a', fontFamily: 'Kufam, sans-serif' }}>
                      <CavosBalance 
                        token="USDT" 
                        tokenAddress={USDT_CONTRACT}
                      />
                    </div>
                  </div>
                  <Wallet className="w-8 h-8" style={{ color: '#10b981' }} />
                </div>
              </div>

              {/* Dirección de tu wallet para recibir fondos */}
              {walletAddress && (
                <div className="mb-6 p-4 rounded-lg" style={{
                  backgroundColor: 'rgba(254, 108, 28, 0.1)',
                  border: '1px solid rgba(254, 108, 28, 0.3)'
                }}>
                  <div className="space-y-2">
                    <p className="text-sm font-medium" style={{ color: '#1a1a1a', fontFamily: 'Kufam, sans-serif' }}>
                      Tu Dirección de Wallet (Starknet Sepolia)
                    </p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-sm font-mono break-all p-2 rounded bg-white border" style={{ color: '#1a1a1a' }}>
                        {walletAddress}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => copyToClipboard(walletAddress)}
                        style={{
                          backgroundColor: '#fe6c1c',
                          color: '#ffffff',
                          fontFamily: 'Kufam, sans-serif'
                        }}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <p className="text-xs" style={{ color: '#5d5d5d' }}>
                      Pasa esta dirección para recibir USDT
                    </p>
                  </div>
                </div>
              )}

              {/* Formulario */}
              {!txHash ? (
                <form onSubmit={handleSend} className="space-y-6">
                  {/* Dirección del destinatario */}
                  <div className="space-y-2">
                    <Label htmlFor="recipient" style={{ fontFamily: 'Kufam, sans-serif', color: '#1a1a1a' }}>
                      Dirección del Destinatario
                    </Label>
                    <Input
                      id="recipient"
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => {
                        setRecipientAddress(e.target.value)
                        if (errors.recipient) {
                          setErrors({ ...errors, recipient: undefined })
                        }
                      }}
                      placeholder="0x..."
                      className={errors.recipient ? 'border-red-500' : ''}
                      style={{
                        backgroundColor: 'rgba(247, 247, 246, 0.8)',
                        border: errors.recipient ? '1px solid #ef4444' : '1px solid rgba(254,108,28,0.2)',
                        fontFamily: 'monospace',
                        fontSize: '14px'
                      }}
                    />
                    {errors.recipient && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.recipient}</span>
                      </p>
                    )}
                  </div>

                  {/* Monto */}
                  <div className="space-y-2">
                    <Label htmlFor="amount" style={{ fontFamily: 'Kufam, sans-serif', color: '#1a1a1a' }}>
                      Monto
                    </Label>
                    <div className="flex space-x-2">
                      <Input
                        id="amount"
                        type="number"
                        step="0.000001"
                        min="0"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value)
                          if (errors.amount) {
                            setErrors({ ...errors, amount: undefined })
                          }
                        }}
                        placeholder="0.00"
                        className={errors.amount ? 'border-red-500' : ''}
                        style={{
                          backgroundColor: 'rgba(247, 247, 246, 0.8)',
                          border: errors.amount ? '1px solid #ef4444' : '1px solid rgba(254,108,28,0.2)'
                        }}
                      />
                      <select
                        value={amountType}
                        onChange={(e) => setAmountType(e.target.value as 'ARS' | 'USDC')}
                        style={{
                          backgroundColor: 'rgba(247, 247, 246, 0.8)',
                          border: '1px solid rgba(254,108,28,0.2)',
                          borderRadius: '6px',
                          padding: '0 12px',
                          fontFamily: 'Kufam, sans-serif',
                          color: '#1a1a1a'
                        }}
                      >
                        <option value="ARS">ARS</option>
                        <option value="USDT">USDT</option>
                      </select>
                    </div>
                    {errors.amount && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.amount}</span>
                      </p>
                    )}
                  </div>

                  {/* PIN */}
                  <div className="space-y-2">
                    <Label htmlFor="pin" style={{ fontFamily: 'Kufam, sans-serif', color: '#1a1a1a' }}>
                      PIN de Seguridad
                    </Label>
                    <div className="relative">
                      <Input
                        id="pin"
                        type={showPin ? 'text' : 'password'}
                        value={pin}
                        onChange={(e) => {
                          setPin(e.target.value)
                          if (errors.pin) {
                            setErrors({ ...errors, pin: undefined })
                          }
                        }}
                        placeholder="Ingresa tu PIN"
                        minLength={4}
                        className={errors.pin ? 'border-red-500' : ''}
                        style={{
                          backgroundColor: 'rgba(247, 247, 246, 0.8)',
                          border: errors.pin ? '1px solid #ef4444' : '1px solid rgba(254,108,28,0.2)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: '#5d5d5d' }}
                      >
                        {showPin ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    {errors.pin && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.pin}</span>
                      </p>
                    )}
                  </div>

                  {/* Error de transferencia */}
                  {transferError && (
                    <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-sm text-red-800 flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Error: {transferError instanceof Error ? transferError.message : 'Error desconocido'}</span>
                      </p>
                    </div>
                  )}

                  {/* Botón enviar */}
                  <Button
                    type="submit"
                    disabled={isTransferring || !recipientAddress || !amount || !pin}
                    className="w-full"
                    style={{
                      backgroundColor: isTransferring ? '#9ca3af' : '#fe6c1c',
                      color: '#ffffff',
                      fontFamily: 'Kufam, sans-serif',
                      fontWeight: 600
                    }}
                  >
                    {isTransferring ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Enviando...</span>
                      </div>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Pago
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                /* Confirmación de éxito */
                <div className="space-y-6">
                  <div className="p-6 rounded-lg text-center" style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#10b981' }} />
                    <h3 className="text-xl font-bold mb-2" style={{
                      fontFamily: 'Kufam, sans-serif',
                      color: '#1a1a1a'
                    }}>
                      ¡Pago Enviado Exitosamente!
                    </h3>
                    <p className="text-sm mb-4" style={{ color: '#5d5d5d' }}>
                      Tu transacción ha sido procesada correctamente
                    </p>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-xs mb-2" style={{ color: '#5d5d5d' }}>Hash de Transacción:</p>
                      <div className="flex items-center justify-center space-x-2">
                        <code className="text-sm font-mono break-all" style={{ color: '#1a1a1a' }}>
                          {txHash}
                        </code>
                        <button
                          onClick={() => copyToClipboard(txHash)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Copiar"
                        >
                          <Copy className="w-4 h-4" style={{ color: '#5d5d5d' }} />
                        </button>
                        <a
                          href={`https://sepolia.starkscan.co/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Ver en Starkscan"
                        >
                          <ExternalLink className="w-4 h-4" style={{ color: '#5d5d5d' }} />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Button
                      onClick={() => {
                        setTxHash(null)
                        setRecipientAddress('')
                        setAmount('')
                        setPin('')
                      }}
                      className="flex-1"
                      style={{
                        backgroundColor: '#fe6c1c',
                        color: '#ffffff',
                        fontFamily: 'Kufam, sans-serif'
                      }}
                    >
                      Enviar Otro Pago
                    </Button>
                    <Link href="/dashboard/movimientos" className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full"
                        style={{
                          fontFamily: 'Kufam, sans-serif',
                          borderColor: '#fe6c1c',
                          color: '#fe6c1c'
                        }}
                      >
                        Ver Transacciones
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}

