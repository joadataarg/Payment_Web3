'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { QrCode, Wallet, ArrowRight, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransfer } from '@/hooks/useChipiPayTransferSDK'
import { useAccount } from '@starknet-react/core'
import { useChipiPay } from '@/components/providers/ChipiPayProvider'
import { useChipiPayWalletStorage } from '@/hooks/useChipiPayWalletStorage'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/store/auth'

/**
 * Componente para escanear QR de ChipiPay y procesar pagos
 * 
 * Este componente permite:
 * 1. Escanear un QR generado con ChipiPay
 * 2. Mostrar información del pago
 * 3. Procesar el pago usando useTransfer de ChipiPay
 */
interface ChipiPayQRData {
  paymentData: {
    amountARS: number
    targetCrypto: string
    cryptoAmount: number
    sessionId: string
    merchantName: string
    walletAddress?: string
  }
}

interface ChipiPayQRScannerProps {
  onPaymentSuccess?: (txHash: string) => void
}

export function ChipiPayQRScanner({ onPaymentSuccess }: ChipiPayQRScannerProps) {
  const { account, address } = useAccount()
  const { user } = useAuth()
  const { tokenAddresses } = useChipiPay()
  const { wallet: chipiPayWallet, hasWallet } = useChipiPayWalletStorage()
  const { transferAsync, isLoading: isTransferring, transferData } = useTransfer()
  const { t } = useLanguage()
  const [scannedData, setScannedData] = useState<ChipiPayQRData | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [pin, setPin] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

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

  // Procesar QR escaneado (simulado por ahora)
  const handleQRScanned = (qrData: string) => {
    try {
      // Parsear el QR (en producción, usar una librería real de QR)
      // Por ahora, asumimos que el QR contiene JSON
      const data = JSON.parse(qrData) as ChipiPayQRData
      setScannedData(data)
      stopScanner()
      toast.success('QR escaneado correctamente')
    } catch (error) {
      toast.error('QR no válido')
    }
  }

  // Procesar pago con ChipiPay
  const handleProcessPayment = async () => {
    if (!scannedData) {
      toast.error('Datos de pago inválidos')
      return
    }

    if (!hasWallet || !chipiPayWallet) {
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
            if (onPaymentSuccess) {
              onPaymentSuccess(txHash)
            }
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

  if (!hasWallet || !chipiPayWallet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="w-5 h-5" style={{ color: '#fe6c1c' }} />
            <span>Crear Wallet ChipiPay</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4" style={{ color: '#5d5d5d' }}>
            Necesitas crear una wallet ChipiPay antes de poder escanear y procesar pagos.
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

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
              PIN de tu wallet ChipiPay
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Ingresa tu PIN"
              className="w-full p-3 rounded-lg border"
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
              Escanea el QR generado por el comercio para procesar el pago con ChipiPay.
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

