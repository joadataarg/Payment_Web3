'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { QrCode, Wallet, ArrowRight, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCavosTransfer } from '@/hooks/useCavosTransfer'
import { useCavosWallet } from '@/hooks/useCavosWallet'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/store/auth'

/**
 * Componente para escanear QR y procesar pagos usando Cavos
 * 
 * Este componente permite:
 * 1. Escanear un QR generado
 * 2. Mostrar información del pago
 * 3. Procesar el pago usando Cavos transfers
 */
interface PaymentQRData {
  paymentData: {
    amountARS: number
    targetCrypto: string
    cryptoAmount: number
    sessionId: string
    merchantName: string
    walletAddress?: string
  }
}

interface CavosQRScannerProps {
  onPaymentSuccess?: (txHash: string) => void
}

export function CavosQRScanner({ onPaymentSuccess }: CavosQRScannerProps) {
  const { user } = useAuth()
  const { wallet, address, isConnected } = useCavosWallet()
  const { transfer, isLoading: isTransferring, lastTransactionHash } = useCavosTransfer()
  const { t } = useLanguage()
  const [scannedData, setScannedData] = useState<PaymentQRData | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Direcciones de contratos (usar las variables de entorno correctas)
  const USDT_CONTRACT = process.env.NEXT_PUBLIC_STARKNET_USDT_ADDRESS || '0x008D4C6451c45ef46Eff81b13e1a3F2237642b97E528Ce1ae1d8B8eE2b267e8D'
  const STRK_CONTRACT = process.env.NEXT_PUBLIC_STARKNET_STRK_ADDRESS || '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'

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
      }
    } catch (error) {
      console.error('Error accediendo a la cámara:', error)
      toast.error('No se pudo acceder a la cámara')
    }
  }

  // Detener escáner
  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowScanner(false)
  }

  // Procesar QR escaneado
  const handleQRScanned = (qrData: string) => {
    try {
      const data = JSON.parse(qrData) as PaymentQRData
      setScannedData(data)
      stopScanner()
      toast.success('QR escaneado correctamente')
    } catch (error) {
      toast.error('QR no válido')
    }
  }

  // Procesar pago con Cavos
  const handleProcessPayment = async () => {
    if (!scannedData) {
      toast.error('Datos de pago inválidos')
      return
    }

    if (!isConnected || !address) {
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
              amountUSDC: scannedData.paymentData.cryptoAmount,
              txHash: result.transactionHash,
              fromAddress: address,
              toAddress: recipient,
              status: 'completed',
              userId: user?.id
            })
          })

          if (response.ok) {
            toast.success('Pago procesado exitosamente!')
            if (onPaymentSuccess) {
              onPaymentSuccess(result.transactionHash)
            }
            setScannedData(null)
          } else {
            toast.success('Pago procesado, pero no se pudo guardar en el historial')
          }
        } catch (error) {
          console.error('Error guardando transacción:', error)
          toast.success('Pago procesado exitosamente!')
          setScannedData(null)
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

  if (!isConnected || !address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="w-5 h-5" style={{ color: '#fe6c1c' }} />
            <span>Crear Wallet Cavos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4" style={{ color: '#5d5d5d' }}>
            Necesitas crear una wallet Cavos antes de poder escanear y procesar pagos.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (scannedData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Confirmar Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
              Comercio: {scannedData.paymentData.merchantName}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
              ${scannedData.paymentData.amountARS.toLocaleString()} ARS
            </p>
            <p className="text-sm" style={{ color: '#5d5d5d' }}>
              Recibirás: {scannedData.paymentData.cryptoAmount.toFixed(6)} {scannedData.paymentData.targetCrypto}
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
              style={{ 
                backgroundColor: '#fe6c1c', 
                color: '#ffffff' 
              }}
            >
              {isTransferring ? 'Procesando...' : 'Confirmar Pago'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <QrCode className="w-5 h-5" style={{ color: '#fe6c1c' }} />
          <span>Escanear QR de Pago</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showScanner ? (
          <>
            <p className="text-sm" style={{ color: '#5d5d5d' }}>
              Escanea el QR generado por el comercio para procesar el pago con Cavos.
            </p>
            <Button
              onClick={startScanner}
              className="w-full"
              style={{ 
                backgroundColor: '#fe6c1c', 
                color: '#ffffff' 
              }}
            >
              <QrCode className="w-4 h-4 mr-2" />
              Iniciar Escáner
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
              Apunta la cámara al código QR
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

