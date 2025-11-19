'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { QrCode, ArrowLeft, CheckCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAccount } from '@starknet-react/core'
import { useTransfer } from '@/hooks/useChipiPayTransferSDK'
import { useChipiPay } from '@/components/providers/ChipiPayProvider'
import { useChipiPayWalletStorage } from '@/hooks/useChipiPayWalletStorage'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/store/auth'
import jsQR from 'jsqr'

/**
 * Página para escanear QR de ChipiPay y procesar pagos
 */
export default function ScanChipiPayPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { account } = useAccount()
  const { tokenAddresses } = useChipiPay()
  const { wallet: chipiPayWallet, hasWallet } = useChipiPayWalletStorage()
  const { transferAsync, isLoading: isTransferring, transferData } = useTransfer()
  const { t } = useLanguage()
  
  const [scannedData, setScannedData] = useState<any>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [pin, setPin] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [scanning, setScanning] = useState(false)

  // Iniciar escáner de cámara
  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setShowScanner(true)
        setScanning(true)
        scanQR()
      }
    } catch (error) {
      console.error('Error accediendo a la cámara:', error)
      toast.error('No se pudo acceder a la cámara. Asegúrate de dar permisos.')
    }
  }

  // Detener escáner
  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowScanner(false)
    setScanning(false)
  }

  // Escanear QR
  const scanQR = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight
      canvas.width = video.videoWidth
      context?.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = context?.getImageData(0, 0, canvas.width, canvas.height)
      
      if (imageData) {
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code) {
          handleQRScanned(code.data)
          return
        }
      }
    }

    if (scanning) {
      requestAnimationFrame(scanQR)
    }
  }

  // Procesar QR escaneado
  const handleQRScanned = (qrData: string) => {
    try {
      // Intentar parsear como JSON (formato ChipiPay)
      let data
      try {
        data = JSON.parse(qrData)
      } catch {
        // Si no es JSON, intentar parsear como EMV QR
        // Por ahora, asumimos formato JSON de ChipiPay
        toast.error('Formato de QR no válido para ChipiPay')
        return
      }

      // Validar estructura de datos
      if (data.paymentData && data.paymentData.targetCrypto === 'USDC') {
        setScannedData(data)
        stopScanner()
        toast.success('QR escaneado correctamente')
      } else {
        toast.error('Este QR no es de ChipiPay o no es válido')
      }
    } catch (error) {
      console.error('Error procesando QR:', error)
      toast.error('Error al procesar el QR')
    }
  }

  // Procesar pago con ChipiPay
  const handleProcessPayment = async () => {
    if (!scannedData || !hasWallet || !chipiPayWallet) {
      toast.error('Necesitas tener una wallet ChipiPay creada para procesar pagos')
      return
    }

    if (!pin || pin.length < 4) {
      toast.error('Ingresa tu PIN (mínimo 4 caracteres)')
      return
    }

    try {
      const apiKey = process.env.NEXT_PUBLIC_CHIPI_API_KEY
      const secretKey = process.env.CHIPI_SECRET_KEY
      const bearerToken = secretKey || apiKey || ''

      if (!bearerToken) {
        toast.error('Credenciales de ChipiPay no configuradas')
        return
      }

      // Convertir amount a formato con decimals (USDC tiene 6 decimals)
      const decimals = 6
      const amountInSmallestUnit = Math.floor(parseFloat(scannedData.paymentData.cryptoAmount.toString()) * Math.pow(10, decimals))

      // Ejecutar transferencia usando useTransfer
      // ChipiPay maneja USDC automáticamente, no necesitamos contractAddress
      const txHash = await transferAsync({
        params: {
          encryptKey: pin,
          wallet: {
            publicKey: chipiPayWallet.publicKey,
            encryptedPrivateKey: chipiPayWallet.encryptedPrivateKey
          },
          token: 'USDC', // ChipiPay resuelve la dirección del contrato automáticamente
          recipient: scannedData.paymentData.walletAddress || account?.address || '',
          amount: amountInSmallestUnit.toString(),
          decimals: decimals,
        },
        bearerToken,
      })

      if (txHash) {
        // Guardar transacción en backend
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/chipipay/transactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: scannedData.paymentData.sessionId,
              amountARS: scannedData.paymentData.amountARS,
              amountUSDC: scannedData.paymentData.cryptoAmount,
              txHash: txHash,
              fromAddress: chipiPayWallet.publicKey,
              toAddress: scannedData.paymentData.walletAddress || account?.address,
              status: 'completed',
              userId: user?.id
            })
          })

          if (response.ok) {
            toast.success('Pago procesado exitosamente!')
            // Redirigir a movimientos después de 2 segundos
            setTimeout(() => {
              router.push('/dashboard/movimientos')
            }, 2000)
          } else {
            toast.success('Pago procesado, pero no se pudo guardar en el historial')
          }
        } catch (error) {
          console.error('Error guardando transacción:', error)
          toast.success('Pago procesado exitosamente!')
        }
      }
    } catch (error) {
      console.error('Error procesando pago:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar el pago'
      toast.error(`Error: ${errorMessage}`)
    }
  }

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  return (
    <DashboardLayout pageTitle="Escanear QR ChipiPay">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver al Dashboard</span>
          </Link>
          <h1 className="text-3xl font-bold" style={{ color: '#1a1a1a', fontFamily: 'Kufam, sans-serif' }}>
            Escanear QR de Pago ChipiPay
          </h1>
        </div>

        {/* Verificar wallet ChipiPay */}
        {!hasWallet && (
          <Card className="mb-6" style={{ 
            backgroundColor: 'rgba(254, 108, 28, 0.05)', 
            borderColor: 'rgba(254, 108, 28, 0.2)' 
          }}>
            <CardContent className="p-6">
              <p className="text-sm mb-4" style={{ color: '#5d5d5d' }}>
                Necesitas crear una wallet ChipiPay antes de poder procesar pagos.
              </p>
              <Button
                onClick={() => router.push('/dashboard/billetera')}
                style={{ backgroundColor: '#fe6c1c', color: '#ffffff' }}
              >
                Crear Wallet ChipiPay
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Escáner o Confirmación de Pago */}
        {!scannedData ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <QrCode className="w-6 h-6" style={{ color: '#fe6c1c' }} />
                <span>Escanear Código QR</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showScanner ? (
                <>
                  <p className="text-sm" style={{ color: '#5d5d5d' }}>
                    Escanea el código QR generado por el comercio para procesar el pago con ChipiPay.
                  </p>
                  <Button
                    onClick={startScanner}
                    className="w-full"
                    style={{ backgroundColor: '#fe6c1c', color: '#ffffff' }}
                    disabled={!hasWallet}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Iniciar Escáner de Cámara
                  </Button>
                </>
              ) : (
                <>
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded-lg"
                      style={{ maxHeight: '400px' }}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-64 h-64 border-4 border-orange-500 rounded-lg"></div>
                    </div>
                  </div>
                  <Button
                    onClick={stopScanner}
                    variant="outline"
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Detener Escáner
                  </Button>
                  <p className="text-xs text-center" style={{ color: '#5d5d5d' }}>
                    Apunta la cámara al código QR del pago
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Confirmar Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                  Comercio: {scannedData.paymentData.merchantName || 'MidatoPay'}
                </p>
                <p className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
                  ${scannedData.paymentData.amountARS.toLocaleString()} ARS
                </p>
                <p className="text-sm" style={{ color: '#5d5d5d' }}>
                  Recibirás: {scannedData.paymentData.cryptoAmount.toFixed(6)} {scannedData.paymentData.targetCrypto}
                </p>
                <p className="text-xs" style={{ color: '#5d5d5d' }}>
                  Tasa: $1,000 ARS = 1 {scannedData.paymentData.targetCrypto}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">PIN de tu Wallet ChipiPay</Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Ingresa tu PIN"
                  minLength={4}
                  required
                  style={{ 
                    backgroundColor: 'rgba(247, 247, 246, 0.8)', 
                    border: '1px solid rgba(254,108,28,0.2)'
                  }}
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setScannedData(null)
                    setPin('')
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleProcessPayment}
                  disabled={isTransferring || !pin}
                  className="flex-1"
                  style={{ backgroundColor: '#fe6c1c', color: '#ffffff' }}
                >
                  {isTransferring ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Procesando...</span>
                    </div>
                  ) : (
                    'Confirmar Pago'
                  )}
                </Button>
              </div>

              {transferData && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Transacción completada</p>
                      <p className="text-xs font-mono text-green-600 break-all mt-1">
                        TX: {transferData}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

