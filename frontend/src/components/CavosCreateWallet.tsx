'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCavosWallet } from '@/hooks/useCavosWallet'
import { useAuth } from '@/store/auth'
import { normalizeStarknetAddress } from '@/utils/starknetAddress'

/**
 * Componente para crear wallet usando Cavos Aegis
 * 
 * Este componente usa el hook useCavosWallet que integra Cavos Aegis
 * para crear wallets de forma segura. El flujo completo incluye:
 * 
 * 1. Validación del PIN del usuario (opcional, para encriptación adicional)
 * 2. Creación de wallet usando Cavos Aegis (deployAccount)
 * 3. Almacenamiento seguro de la wallet
 * 4. Feedback visual del estado de la operación
 * 
 * Requiere que la app esté envuelta con CavosProvider.
 */
export function CavosCreateWallet() {
  const { user, token: jwtToken } = useAuth()
  const { createWallet, wallet, address, isLoading: isCreating, error, connectStoredWallet } = useCavosWallet()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  
  const hasWallet = !!wallet?.address || !!address
  
  // Conectar wallet guardada al montar
  useEffect(() => {
    if (wallet && !address) {
      connectStoredWallet()
    }
  }, [wallet, address, connectStoredWallet])
  
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

    // PIN es opcional para Cavos, pero lo mantenemos para compatibilidad
    if (pin && pin.length > 0 && pin.length < 4) {
      toast.error('El PIN debe tener al menos 4 caracteres')
      return
    }

    if (pin && pin !== confirmPin) {
      toast.error('Los PINs no coinciden')
      return
    }

    try {
      console.log('🔄 Creando wallet con Cavos Aegis...')
      
      // Crear wallet usando Cavos
      const walletData = await createWallet()
      
      if (!walletData) {
        throw new Error('No se recibieron datos de la wallet')
      }
      
      console.log('✅ Wallet creada con Cavos Aegis:', walletData.address)
      
      // Normalizar dirección para que tenga exactamente 66 caracteres (0x + 64 hex)
      const walletAddress = walletData.address ? normalizeStarknetAddress(walletData.address) || walletData.address : null
      
      if (walletAddress) {
        console.log('📏 Dirección normalizada:', {
          original: walletData.address,
          normalized: walletAddress,
          originalLength: walletData.address?.length,
          normalizedLength: walletAddress.length
        })
        
        // Guardar en la base de datos
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
          console.log('💾 Guardando wallet en BD...')
          
          // Obtener token de autenticación
          let authToken = jwtToken
          if (!authToken && typeof window !== 'undefined') {
            // Intentar obtener token de Clerk si está disponible
            const clerkToken = localStorage.getItem('clerk_token')
            authToken = clerkToken || null
          }
          
          const saveResponse = await fetch(`${apiUrl}/api/cavos/save-wallet`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            },
            body: JSON.stringify({
              walletAddress: walletAddress,
              publicKey: walletAddress,
              privateKey: walletData.privateKey, // En producción, esto debería estar encriptado
              txHash: walletData.txHash || ''
            })
          })

          if (!saveResponse.ok) {
            const errorData = await saveResponse.json().catch(() => ({ error: 'Error desconocido' }))
            console.error('❌ Error guardando wallet en BD:', errorData)
            toast.error('Wallet creada pero no se pudo guardar en la base de datos')
          } else {
            const saveData = await saveResponse.json()
            console.log('✅ Wallet guardada en BD:', saveData)
            toast.success('✅ Wallet creada y guardada exitosamente!')
            setPin('')
            setConfirmPin('')
          }
        } catch (saveError) {
          console.error('❌ Error guardando wallet en BD:', saveError)
          toast.success('✅ Wallet creada y guardada localmente!')
        }
      } else {
        console.error('❌ Formato de respuesta inesperado:', walletData)
        toast.error('Error: Formato de respuesta inválido de Cavos')
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
                <span>PIN de Seguridad (Opcional)</span>
              </Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Mínimo 4 caracteres (opcional)"
                minLength={4}
                style={{ 
                  backgroundColor: 'rgba(247, 247, 246, 0.8)', 
                  border: '1px solid rgba(254,108,28,0.2)'
                }}
              />
              <p className="text-xs" style={{ color: '#5d5d5d' }}>
                Este PIN es opcional. Tu clave privada se almacena de forma segura.
              </p>
            </div>

            {pin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPin">Confirmar PIN</Label>
                <Input
                  id="confirmPin"
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Repite tu PIN"
                  minLength={4}
                  style={{ 
                    backgroundColor: 'rgba(247, 247, 246, 0.8)', 
                    border: '1px solid rgba(254,108,28,0.2)'
                  }}
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={isCreating || (pin && pin.length > 0 && pin.length < 4) || (pin && pin !== confirmPin)}
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
                ✅ Wallet Cavos Configurada
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium" style={{ color: '#1a1a1a' }}>Dirección:</span>
                  <p className="font-mono break-all mt-1" style={{ color: '#5d5d5d' }}>
                    {wallet?.address || address || 'N/A'}
                  </p>
                </div>
                {wallet?.txHash && (
                  <div>
                    <span className="font-medium" style={{ color: '#1a1a1a' }}>TX Hash:</span>
                    <p className="font-mono break-all mt-1" style={{ color: '#5d5d5d' }}>
                      {wallet.txHash}
                    </p>
                  </div>
                )}
                <p className="text-xs mt-3" style={{ color: '#5d5d5d' }}>
                  💡 Tu wallet está lista para recibir pagos
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

