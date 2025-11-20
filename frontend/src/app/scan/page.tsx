'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QrCode, Camera, AlertCircle, CheckCircle, ArrowLeft, Upload, Clipboard, FileText } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
// Usar API nativa del navegador + jsQR para detectar QR codes
import jsQR from 'jsqr'
import { Input } from '@/components/ui/input'

export default function QRScannerPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrScanner, setQrScanner] = useState<any>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isScannerReady, setIsScannerReady] = useState(false)
  const [scanInterval, setScanInterval] = useState<NodeJS.Timeout | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualQRData, setManualQRData] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Inicializar cámara usando API nativa
  useEffect(() => {
    // Evitar múltiples inicializaciones
    if (isInitialized) return
    
    const initCamera = async () => {
      try {
        console.log('Starting camera...')
        setIsInitialized(true)
        
        // Verificar si el navegador soporta getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Your browser does not support camera access')
          return
        }

        // Solicitar acceso a la cámara
        console.log('Requesting camera access...')
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment', // Usar cámara trasera si está disponible
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        })
        
        console.log('Stream obtained:', stream)
        console.log('Active tracks:', stream.getTracks().length)
        console.log('Video track:', stream.getVideoTracks()[0])
        
        setHasPermission(true)
        setIsScannerReady(true)
        
        // Conectar stream al video
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          
          // Esperar a que el video esté completamente cargado
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded, starting playback...')
            videoRef.current?.play().then(() => {
              console.log('Video playback started successfully')
              setIsScanning(true)
              // Iniciar detección de QR después de un pequeño delay
              setTimeout(() => {
                startQRDetection()
              }, 1000)
            }).catch((err) => {
              console.error('Error starting video playback:', err)
              setError('Error iniciando la cámara')
            })
          }
          
          videoRef.current.onerror = (err) => {
            console.error('Video error:', err)
            setError('Error con el video de la cámara')
          }
        }
        
      } catch (err) {
        console.error('Error accediendo a la cámara:', err)
        const error = err as any
        if (error.name === 'NotAllowedError') {
          setError('Se requieren permisos de cámara para escanear QR codes')
        } else if (error.name === 'NotFoundError') {
          setError('No se encontró una cámara disponible')
        } else {
          setError('Error al acceder a la cámara: ' + (err as Error).message)
        }
        setHasPermission(false)
      }
    }

    initCamera()

    return () => {
      // Limpiar stream al desmontar
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
      // Limpiar intervalo de detección
      if (scanInterval) {
        clearInterval(scanInterval)
      }
    }
  }, [isInitialized]) // Solo ejecutar cuando cambie isInitialized

  const startQRDetection = () => {
    if (!videoRef.current || !canvasRef.current) return

    const interval = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current
        const video = videoRef.current
        const context = canvas.getContext('2d')

        if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
          // Configurar canvas con las dimensiones del video
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight

          // Optimizar canvas para lectura frecuente
          context.imageSmoothingEnabled = false

          // Dibujar frame del video en el canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Obtener datos de imagen
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

          // Detectar QR code
          const code = jsQR(imageData.data, imageData.width, imageData.height)

          if (code) {
            console.log('QR Code detectado:', code.data)
            setScannedData(code.data)
            setIsScanning(false)
            clearInterval(interval)
            processScannedQR(code.data)
          }
        }
      }
    }, 300) // Detectar cada 300ms para reducir parpadeo

    setScanInterval(interval)
  }

  const startScanning = () => {
    // La cámara ya está iniciada en el useEffect
    setIsScanning(true)
    setError(null)
  }

  const stopScanning = () => {
    setIsScanning(false)
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
    }
  }

  const processScannedQR = async (qrData: string) => {
    try {
      console.log('🔍 Procesando QR:', qrData)
      
      // Intentar parsear como JSON primero (formato Cavos)
      try {
        const jsonData = JSON.parse(qrData)
        if (jsonData.success && jsonData.paymentData) {
          // Es un QR de Cavos (formato JSON)
          console.log('📱 QR Cavos detectado:', jsonData)
          // Para Cavos, redirigir a la página de procesamiento de pago
          toast.success('QR Cavos detectado correctamente')
          // Guardar datos en localStorage o redirigir a página de pago
          const params = new URLSearchParams({
            type: 'cavos',
            amountARS: jsonData.paymentData.amountARS.toString(),
            cryptoAmount: jsonData.paymentData.cryptoAmount.toString(),
            targetCrypto: jsonData.paymentData.targetCrypto,
            sessionId: jsonData.paymentData.sessionId,
            merchantName: jsonData.paymentData.merchantName || 'MidatoPay - Cavos',
            walletAddress: jsonData.paymentData.walletAddress || ''
          })
          router.push(`/transaction-result?${params.toString()}`)
          return
        }
      } catch (e) {
        // No es JSON, continuar con el backend para parsear EMV
        console.log('No es JSON, enviando al backend para parsear EMV...')
      }
      
      // Enviar directamente al backend para que haga el parsing correcto
      // El backend tiene el parser TLV adecuado que maneja diferentes formatos
      console.log('📤 Enviando QR al backend para validación...')

      // Llamar al backend para verificar el pago
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/midatopay/scan-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData })
      })

      const result = await response.json()
      
      if (!result.success) {
        toast.error(result.error || 'Error al procesar el QR')
        return
      }

      console.log('✅ Pago verificado:', result.data)

      // Mostrar los datos de la transacción blockchain
      if (result.data.paymentData.blockchainTransaction) {
        const tx = result.data.paymentData.blockchainTransaction
        toast.success(`Transaction executed! Hash: ${tx.hash}`)
        
        // Redirigir a la página de resultados detallados
        const params = new URLSearchParams({
          paymentId: result.data.paymentData.paymentId,
          merchantAddress: result.data.paymentData.merchantAddress,
          amountARS: result.data.paymentData.amountARS.toString(),
          merchantName: result.data.paymentData.merchantName,
          concept: result.data.paymentData.concept,
          status: result.data.paymentData.status,
          txHash: tx.hash,
          explorerUrl: tx.explorerUrl
        })
        
        router.push(`/transaction-result?${params.toString()}`)
      } else {
        toast.success('QR scanned successfully')
        
        // Redirigir sin datos de blockchain (transacción pendiente)
        const params = new URLSearchParams({
          paymentId: result.data.paymentData.paymentId,
          merchantAddress: result.data.paymentData.merchantAddress,
          amountARS: result.data.paymentData.amountARS.toString(),
          merchantName: result.data.paymentData.merchantName,
          concept: result.data.paymentData.concept,
          status: result.data.paymentData.status
        })
        
        router.push(`/transaction-result?${params.toString()}`)
      }
      
    } catch (err) {
      console.error('Error procesando QR:', err)
      toast.error('Error processing QR Code')
    }
  }

  const parseEMVQR = (qrData: string) => {
    try {
      console.log('🔍 Parsing QR:', qrData)
      
      // Parsear TLV data del QR EMVCo
      // El QR contiene: 01650x[merchant_address]0205[amount]0326[payment_id]17C1
      // Ejemplo: 01650x263314aecfb546ead2569e4793128c9337d9906e3eecdc42c4cbd2f68d6ccd30205100000326pay_1760486804327_8c33d6ca7B74
      
      // Extraer merchant address (65 caracteres después de 01650x)
      const merchantMatch = qrData.match(/01650x([a-f0-9]{65})/)
      if (!merchantMatch) {
        console.warn('⚠️ No valid merchant address found')
        return null
      }
      
      // Extraer amount (buscar 0205 seguido de números)
      const amountMatch = qrData.match(/0205(\d+)/)
      if (!amountMatch) {
        console.warn('⚠️ No valid amount found')
        return null
      }
      
      // Extraer paymentId (después del amount, buscar patrón pay_)
      const afterAmount = qrData.substring(qrData.indexOf(amountMatch[1]) + amountMatch[1].length)
      const paymentIdMatch = afterAmount.match(/pay_[a-zA-Z0-9_]+/)
      if (!paymentIdMatch) {
        console.warn('⚠️ No valid paymentId found')
        return null
      }
      
      const merchantAddress = '0x' + merchantMatch[1]
      const amount = parseInt(amountMatch[1])
      const paymentId = paymentIdMatch[0] // Usar el match completo que incluye 'pay_'
      
      console.log('📱 QR parsed:', { merchantAddress, amount, paymentId })
      
      return {
        merchantAddress,
        amount,
        paymentId,
        qrData: qrData
      }
      
    } catch (err) {
      console.error('Error parsing EMV QR:', err)
      return null
    }
  }

  const simulateQRScan = () => {
    // Simular escaneo de QR para testing con formato TLV correcto
    const mockQRData = '01650x263314aecfb546ead2569e4793128c9337d9906e3eecdc42c4cbd2f68d6ccd30205100000326pay_test_1234517C1'
    setScannedData(mockQRData)
    setIsScanning(false)
    processScannedQR(mockQRData)
  }

  const retryScanning = () => {
    setScannedData(null)
    setError(null)
    setShowManualInput(false)
    setManualQRData('')
    startScanning()
  }

  // Manejar pegado de datos QR
  const handlePasteQR = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setManualQRData(text)
        setShowManualInput(true)
        toast.success('Datos QR pegados desde el portapapeles')
      }
    } catch (error) {
      toast.error('No se pudo leer el portapapeles. Por favor, pega manualmente.')
      setShowManualInput(true)
    }
  }

  // Procesar datos QR manuales
  const handleProcessManualQR = () => {
    if (!manualQRData.trim()) {
      toast.error('Por favor, ingresa o pega los datos del QR')
      return
    }
    processScannedQR(manualQRData.trim())
  }

  // Procesar imagen QR (usado tanto para upload como drag & drop)
  const processQRImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecciona un archivo de imagen')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Crear canvas para procesar la imagen
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          toast.error('Error procesando la imagen')
          return
        }

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        // Intentar detectar QR code en la imagen
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (code) {
          console.log('QR Code detectado en imagen:', code.data)
          processScannedQR(code.data)
        } else {
          toast.error('No se pudo detectar un QR code en la imagen')
        }
      }
      img.onerror = () => {
        toast.error('Error cargando la imagen')
      }
      img.src = e.target?.result as string
    }
    reader.onerror = () => {
      toast.error('Error leyendo el archivo')
    }
    reader.readAsDataURL(file)
  }

  // Manejar carga de imagen QR
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    processQRImage(file)
  }

  // Manejar drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        processQRImage(file)
      } else {
        toast.error('Por favor, arrastra un archivo de imagen')
      }
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f7f6' }}>
      {/* Header */}
      <header className="shadow-sm border-b" style={{ backgroundColor: '#f7f7f6', borderColor: 'rgba(26,26,26,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link href="/" className="mr-4">
              <Button variant="ghost" size="sm" style={{ color: '#1a1a1a' }}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fe6c1c 0%, #fe9c42 100%)' }}>
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ fontFamily: 'Gromm, sans-serif', color: '#1a1a1a' }}>Scan QR</h1>
                <p className="text-sm" style={{ color: '#5d5d5d' }}>Scan the QR code to pay</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div 
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag and Drop Overlay */}
        {isDragging && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-8 max-w-md mx-4"
            >
              <div className="text-center">
                <Upload className="w-16 h-16 mx-auto mb-4" style={{ color: '#fe6c1c' }} />
                <h3 className="text-xl font-bold mb-2" style={{ color: '#1a1a1a' }}>
                  Suelta la imagen del QR aquí
                </h3>
                <p className="text-sm" style={{ color: '#5d5d5d' }}>
                  Arrastra y suelta una imagen con un código QR
                </p>
              </div>
            </motion.div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="w-5 h-5" style={{ color: '#fe6c1c' }} />
                  <span>Camera</span>
                </CardTitle>
                <CardDescription>
                  Point the camera at the merchant QR code
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {hasPermission === false ? (
                    <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">Camera permissions required</p>
                        <Button onClick={retryScanning} variant="outline">
                          Allow Camera
                        </Button>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Button onClick={retryScanning} variant="outline">
                          Retry
                        </Button>
                      </div>
                    </div>
                  ) : scannedData ? (
                    <div className="aspect-video bg-green-50 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <p className="text-green-700 mb-4">QR scanned successfully!</p>
                        <Button onClick={retryScanning} variant="outline">
                          Scan Another
                        </Button>
                      </div>
                    </div>
                  ) : !isScannerReady ? (
                    <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading scanner...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        className="w-full aspect-video rounded-lg bg-black"
                        playsInline
                      />
                      {/* Canvas oculto para detección de QR */}
                      <canvas
                        ref={canvasRef}
                        className="hidden"
                      />
                      {isScanning && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-48 h-48 border-4 border-orange-500 border-dashed rounded-lg animate-pulse"></div>
                        </div>
                      )}
                      {/* Botones de control */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 flex-wrap justify-center">
                        <Button 
                          onClick={simulateQRScan}
                          variant="outline"
                          size="sm"
                          className="bg-white/90 hover:bg-white"
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Simulate QR (Test)
                        </Button>
                        <Button 
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              window.location.reload()
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="bg-white/90 hover:bg-white"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Restart Camera
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Opciones alternativas: Copy/Paste y Upload */}
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePasteQR}
                      variant="outline"
                      className="flex-1"
                      size="sm"
                    >
                      <Clipboard className="w-4 h-4 mr-2" />
                      Pegar QR
                    </Button>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="flex-1"
                      size="sm"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Subir Imagen
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                  
                  {/* Drag and Drop Zone */}
                  <div 
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                      isDragging 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-300 bg-gray-50 hover:border-orange-300 hover:bg-orange-50/50'
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: isDragging ? '#fe6c1c' : '#5d5d5d' }} />
                    <p className="text-sm font-medium mb-1" style={{ color: isDragging ? '#fe6c1c' : '#1a1a1a' }}>
                      Arrastra y suelta una imagen QR aquí
                    </p>
                    <p className="text-xs" style={{ color: '#5d5d5d' }}>
                      o haz clic en "Subir Imagen" arriba
                    </p>
                  </div>

                  {/* Input manual para pegar datos QR */}
                  {showManualInput && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" style={{ color: '#fe6c1c' }} />
                        <label className="text-sm font-medium">Datos del QR:</label>
                      </div>
                      <textarea
                        value={manualQRData}
                        onChange={(e) => setManualQRData(e.target.value)}
                        placeholder="Pega aquí los datos del QR code..."
                        className="w-full p-3 border rounded-lg resize-none"
                        rows={4}
                        style={{
                          borderColor: 'rgba(254,108,28,0.2)',
                          fontFamily: 'monospace',
                          fontSize: '12px'
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleProcessManualQR}
                          className="flex-1"
                          style={{ backgroundColor: '#fe6c1c', color: '#ffffff' }}
                        >
                          Procesar QR
                        </Button>
                        <Button
                          onClick={() => {
                            setShowManualInput(false)
                            setManualQRData('')
                          }}
                          variant="outline"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Instrucciones */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <QrCode className="w-5 h-5" style={{ color: '#fe6c1c' }} />
                  <span>Instructions</span>
                </CardTitle>
                <CardDescription>
                  How to use the QR scanner
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-medium text-orange-600">1</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Allow camera access</h3>
                      <p className="text-sm text-gray-600">Your browser will ask for camera permissions</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-medium text-orange-600">2</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Point to the QR code</h3>
                      <p className="text-sm text-gray-600">Place the merchant QR code within the frame</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-medium text-orange-600">3</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Confirm payment</h3>
                      <p className="text-sm text-gray-600">Review details and confirm your payment in ARS</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">💡 Tips</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Make sure you have good lighting</li>
                    <li>• Keep the QR stable within the frame</li>
                    <li>• The QR must be complete and visible</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
