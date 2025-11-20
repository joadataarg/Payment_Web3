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
import { useCavosTransfer } from '@/hooks/useCavosTransfer'
import { useCavosWallet } from '@/hooks/useCavosWallet'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/store/auth'
import jsQR from 'jsqr'

/**
 * Página para escanear QR de ChipiPay y procesar pagos
 */
export default function ScanChipiPayPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { wallet: cavosWallet, address: cavosAddress, isConnected: isCavosConnected } = useCavosWallet()
  const { transfer, isLoading: isTransferring, lastTransactionHash } = useCavosTransfer()
  const { t } = useLanguage()
  
    // Direcciones de contratos (usar las variables de entorno correctas)
    const USDT_CONTRACT = process.env.NEXT_PUBLIC_STARKNET_USDT_ADDRESS || '0x008D4C6451c45ef46Eff81b13e1a3F2237642b97E528Ce1ae1d8B8eE2b267e8D'
    const STRK_CONTRACT = process.env.NEXT_PUBLIC_STARKNET_STRK_ADDRESS || '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
  
  const [scannedData, setScannedData] = useState<any>(null)
  const [showScanner, setShowScanner] = useState(false)
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

      // Validar estructura de datos (aceptar USDT o STRK)
      if (data.paymentData && (data.paymentData.targetCrypto === 'USDT' || data.paymentData.targetCrypto === 'STRK')) {
        setScannedData(data)
        stopScanner()
        toast.success('QR escaneado correctamente')
      } else {
        toast.error('Este QR no es válido. Debe ser USDT o STRK.')
      }
    } catch (error) {
      console.error('Error procesando QR:', error)
      toast.error('Error al procesar el QR')
    }
  }

  // Procesar pago con Cavos
  const handleProcessPayment = async () => {
    if (!scannedData || !isCavosConnected || !cavosAddress) {
      toast.error('Necesitas tener una wallet Cavos conectada para procesar pagos')
      return
    }

    try {
      // Determinar dirección del contrato según el token
      let tokenContractAddress = ''
      let decimals = 18

      if (scannedData.paymentData.targetCrypto === 'USDT') {
        tokenContractAddress = USDT_CONTRACT
        decimals = 6
      } else if (scannedData.paymentData.targetCrypto === 'STRK') {
        tokenContractAddress = STRK_CONTRACT
        decimals = 18
      } else {
        toast.error(`Token ${scannedData.paymentData.targetCrypto} no soportado. Usa USDT o STRK.`)
        return
      }

      // Convertir amount a formato con decimals
      const amountInSmallestUnit = Math.floor(
        parseFloat(scannedData.paymentData.cryptoAmount.toString()) * Math.pow(10, decimals)
      ).toString()

      const recipient = scannedData.paymentData.walletAddress || ''
      if (!recipient) {
        toast.error('Dirección del destinatario no válida')
        return
      }

      // Ejecutar transferencia usando Cavos
      const result = await transfer(
        tokenContractAddress,
        recipient,
        amountInSmallestUnit
      )

      if (result.success && result.transactionHash) {
        // Guardar transacción en backend
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/cavos/transactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: scannedData.paymentData.sessionId,
              amountARS: scannedData.paymentData.amountARS,
              amountUSDC: scannedData.paymentData.cryptoAmount, // Mantener nombre del campo para compatibilidad con BD
              txHash: result.transactionHash,
              fromAddress: cavosAddress,
              toAddress: recipient,
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
      } else {
        throw new Error(result.error || 'Error al procesar el pago')
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
    <DashboardLayout pageTitle="Escanear QR Cavos">
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
            Escanear QR de Pago Cavos
          </h1>
        </div>

        {/* Verificar wallet Cavos */}
        {!isCavosConnected && (
          <Card className="mb-6" style={{ 
            backgroundColor: 'rgba(254, 108, 28, 0.05)', 
            borderColor: 'rgba(254, 108, 28, 0.2)' 
          }}>
            <CardContent className="p-6">
              <p className="text-sm mb-4" style={{ color: '#5d5d5d' }}>
                Necesitas crear una wallet Cavos antes de poder procesar pagos.
              </p>
              <Button
                onClick={() => router.push('/dashboard/billetera')}
                style={{ backgroundColor: '#fe6c1c', color: '#ffffff' }}
              >
                Crear Wallet Cavos
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
                    Escanea el código QR generado por el comercio para procesar el pago con Cavos.
                  </p>
                  <Button
                    onClick={startScanner}
                    className="w-full"
                    style={{ backgroundColor: '#fe6c1c', color: '#ffffff' }}
                    disabled={!isCavosConnected}
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

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setScannedData(null)
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleProcessPayment}
                  disabled={isTransferring}
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

              {lastTransactionHash && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Transacción completada</p>
                      <p className="text-xs font-mono text-green-600 break-all mt-1">
                        TX: {lastTransactionHash}
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

