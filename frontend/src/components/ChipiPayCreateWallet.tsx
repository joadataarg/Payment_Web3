'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCreateWallet as useChipiCreateWallet } from '@chipi-stack/nextjs'
import { useAuth as useClerkAuth } from '@clerk/nextjs'
import { useAuth } from '@/store/auth'
import { useChipiPayWalletStorage } from '@/hooks/useChipiPayWalletStorage'
import { normalizeStarknetAddress } from '@/utils/starknetAddress'

/**
 * Componente para crear wallet usando ChipiPay MCP
 * 
 * Este componente usa el hook useCreateWallet que integra ChipiPay MCP
 * para crear wallets de forma segura. El flujo completo incluye:
 * 
 * 1. Validación del PIN del usuario
 * 2. Creación de wallet usando ChipiPay MCP
 * 3. Almacenamiento seguro de la wallet
 * 4. Feedback visual del estado de la operación
 * 
 * Requiere que la app esté envuelta con ChipiPaySDKProvider.
 */
export function ChipiPayCreateWallet() {
  const { user, token: jwtToken } = useAuth()
  const { getToken: getClerkToken, isSignedIn: isClerkSignedIn } = useClerkAuth()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const { createWalletAsync, isLoading: isCreating, error } = useChipiCreateWallet()
  const { saveWallet, wallet: storedWallet } = useChipiPayWalletStorage()
  
  const hasWallet = !!storedWallet?.publicKey
  
  // Función para obtener el token correcto según el método de autenticación
  const getAuthToken = async (): Promise<string | null> => {
    // Si hay token JWT (autenticación tradicional), usarlo
    if (jwtToken) {
      console.log('🔑 Usando token JWT para autenticación')
      return jwtToken
    }
    
    // Si no hay JWT pero hay sesión de Clerk, usar token de Clerk
    if (isClerkSignedIn) {
      const clerkToken = await getClerkToken()
      if (clerkToken) {
        console.log('🔑 Usando token de Clerk para autenticación')
        return clerkToken
      }
    }
    
    return null
  }
  
  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al crear wallet. Por favor, intenta de nuevo.'
      toast.error(errorMessage, {
        duration: 5000,
        style: {
          maxWidth: '500px'
        }
      })
    }
  }, [error])
  
  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault()

    if (pin.length < 4) {
      toast.error('El PIN debe tener al menos 4 caracteres')
      return
    }

    if (pin !== confirmPin) {
      toast.error('Los PINs no coinciden')
      return
    }

    try {
      // Obtener token de sesión de Clerk para ChipiPay SDK
      const bearerToken = await getClerkToken()
      
      if (!bearerToken) {
        toast.error('No se pudo obtener el token de autenticación')
        return
      }
      
      console.log('🔑 Token obtenido para crear wallet, longitud:', bearerToken.length)
      console.log('👤 Usuario autenticado:', user?.email || 'N/A')
      
      // Usar el SDK del frontend directamente (funciona mejor que el del backend)
      const walletResponse = await createWalletAsync({
        params: {
          encryptKey: pin,
          externalUserId: user?.id || user?.email || `user-${Date.now()}`
        },
        bearerToken
      })
      
      console.log('✅ Wallet creada con ChipiPay SDK oficial:', walletResponse)
      
      const rawWalletAddress = walletResponse?.wallet?.publicKey
      const txHash = walletResponse?.txHash
      
      // Normalizar dirección para que tenga exactamente 66 caracteres (0x + 64 hex)
      const walletAddress = rawWalletAddress ? normalizeStarknetAddress(rawWalletAddress) || rawWalletAddress : null
      
      if (walletAddress) {
        console.log('📏 Dirección normalizada:', {
          original: rawWalletAddress,
          normalized: walletAddress,
          originalLength: rawWalletAddress?.length,
          normalizedLength: walletAddress.length
        })
        
        const walletToStore = {
          publicKey: walletAddress, // Guardar dirección normalizada
          encryptedPrivateKey: walletResponse?.wallet?.encryptedPrivateKey || '',
          txHash: txHash || '',
          createdAt: new Date().toISOString()
        }
        
        // Guardar en localStorage
        const saved = saveWallet(walletToStore)
        
        // Guardar en la base de datos
        try {
          // Obtener un nuevo token para la llamada al backend (puede ser diferente)
          const backendToken = await getAuthToken()
          
          if (!backendToken) {
            console.warn('⚠️ No se pudo obtener token para guardar en BD, pero wallet está en localStorage')
            toast.success('✅ Wallet creada y guardada localmente!')
            setPin('')
            setConfirmPin('')
            return
          }
          
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          console.log('💾 Guardando wallet en BD con token de longitud:', backendToken.length)
          
          const saveResponse = await fetch(`${apiUrl}/api/chipipay/save-wallet`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${backendToken}`
            },
            body: JSON.stringify({
              walletAddress: walletAddress, // Guardar dirección normalizada
              publicKey: walletAddress, // Guardar dirección normalizada
              encryptedPrivateKey: walletResponse?.wallet?.encryptedPrivateKey || '',
              txHash: txHash || ''
            })
          })

          if (!saveResponse.ok) {
            const errorData = await saveResponse.json().catch(() => ({ error: 'Error desconocido' }))
            console.error('❌ Error guardando wallet en BD:', errorData)
            toast.error('Wallet creada pero no se pudo guardar en la base de datos')
          } else {
            const saveData = await saveResponse.json()
            console.log('✅ Wallet guardada en BD:', saveData)
            
            if (saved) {
              toast.success('✅ Wallet creada y guardada exitosamente!')
            } else {
              toast.success('✅ Wallet creada y guardada en la base de datos!')
            }
            setPin('')
            setConfirmPin('')
          }
        } catch (saveError) {
          console.error('❌ Error guardando wallet en BD:', saveError)
          if (saved) {
            toast.success('✅ Wallet creada y guardada localmente!')
          } else {
            toast.error('Wallet creada pero no se pudo guardar. Por favor, guarda tu información.')
          }
        }
      } else {
        console.error('❌ Formato de respuesta inesperado:', walletResponse)
        toast.error('Error: Formato de respuesta inválido del SDK de ChipiPay')
      }
    } catch (err: any) {
      console.error('❌ Error creando wallet:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al crear wallet'
      toast.error(`Error creando wallet: ${errorMessage}`)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wallet className="w-6 h-6" style={{ color: '#fe6c1c' }} />
          <span>Crear Wallet</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasWallet ? (
          <form onSubmit={handleCreateWallet} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin" className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>PIN de Seguridad</span>
              </Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                minLength={4}
                required
                style={{ 
                  backgroundColor: 'rgba(247, 247, 246, 0.8)', 
                  border: '1px solid rgba(254,108,28,0.2)'
                }}
              />
              <p className="text-xs" style={{ color: '#5d5d5d' }}>
                Este PIN se usa para encriptar tu clave privada
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirmar PIN</Label>
              <Input
                id="confirmPin"
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Repite tu PIN"
                minLength={4}
                required
                style={{ 
                  backgroundColor: 'rgba(247, 247, 246, 0.8)', 
                  border: '1px solid rgba(254,108,28,0.2)'
                }}
              />
            </div>

            <Button
              type="submit"
              disabled={isCreating || pin.length < 4 || pin !== confirmPin}
              className="w-full"
              style={{ 
                backgroundColor: '#fe6c1c', 
                color: '#ffffff' 
              }}
            >
              {isCreating ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creando wallet...</span>
                </div>
              ) : (
                'Crear Wallet'
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ 
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <h3 className="font-semibold mb-3" style={{ color: '#1a1a1a' }}>
                ✅ Wallet ChipiPay Configurada
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium" style={{ color: '#1a1a1a' }}>Dirección:</span>
                  <p className="font-mono break-all mt-1" style={{ color: '#5d5d5d' }}>
                    {storedWallet?.publicKey || 'N/A'}
                  </p>
                </div>
                {storedWallet?.txHash && (
                  <div>
                    <span className="font-medium" style={{ color: '#1a1a1a' }}>TX Hash:</span>
                    <p className="font-mono break-all mt-1" style={{ color: '#5d5d5d' }}>
                      {storedWallet.txHash}
                    </p>
                  </div>
                )}
                <p className="text-xs mt-3" style={{ color: '#5d5d5d' }}>
                  💡 Tu wallet está lista para recibir pagos en USDC
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

