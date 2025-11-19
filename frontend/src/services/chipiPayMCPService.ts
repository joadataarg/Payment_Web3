'use client'

import { useAuthStore } from '@/store/auth'

/**
 * Servicio para interactuar con ChipiPay MCP
 * 
 * Este servicio proporciona métodos para usar las herramientas MCP de ChipiPay
 * para crear wallets, transferir tokens, y otras operaciones.
 * 
 * Las herramientas MCP están disponibles a través del servidor MCP configurado
 * en mcp.json: https://mcp.chipipay.com/mcp
 */

export interface ChipiPayMCPWalletResponse {
  wallet: {
    publicKey: string
    address: string
    encryptedPrivateKey: string
  }
  txHash?: string
  externalUserId: string
}

export interface ChipiPayMCPCreateWalletParams {
  encryptKey: string // PIN del usuario
  externalUserId: string // ID del usuario en tu sistema
}

export interface ChipiPayMCPTransferParams {
  from: string
  to: string
  amount: string
  token?: string
  encryptKey?: string
}

export interface ChipiPayMCPTransferResponse {
  txHash: string
  status: 'pending' | 'completed' | 'failed'
}

/**
 * Servicio para usar ChipiPay MCP tools
 * 
 * Este servicio actúa como wrapper para las herramientas MCP de ChipiPay.
 * En un entorno real, estas llamadas se harían a través del cliente MCP.
 */
export class ChipiPayMCPService {
  private static instance: ChipiPayMCPService
  private apiKey: string | null = null

  private constructor() {
    // Obtener API key de las variables de entorno
    if (typeof window !== 'undefined') {
      this.apiKey = process.env.NEXT_PUBLIC_CHIPI_API_KEY || null
    }
  }

  static getInstance(): ChipiPayMCPService {
    if (!ChipiPayMCPService.instance) {
      ChipiPayMCPService.instance = new ChipiPayMCPService()
    }
    return ChipiPayMCPService.instance
  }

  /**
   * Crear wallet usando ChipiPay MCP
   * 
   * Esta función usa la herramienta MCP de ChipiPay para crear una wallet.
   * En producción, esto se llamaría a través del cliente MCP.
   * 
   * @param params - Parámetros para crear la wallet
   * @returns Respuesta con la wallet creada
   */
  async createWallet(params: ChipiPayMCPCreateWalletParams): Promise<ChipiPayMCPWalletResponse> {
    try {
      // En un entorno con MCP disponible, esto usaría call_mcp_tool
      // Por ahora, usamos el endpoint del backend que tiene acceso al Secret Key
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      // Obtener token de autenticación del store
      const token = useAuthStore.getState().token
      
      if (!token) {
        throw new Error('Token requerido. Por favor, inicia sesión nuevamente.')
      }
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
      
      const response = await fetch(`${apiUrl}/api/chipipay/create-wallet`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          encryptKey: params.encryptKey,
          externalUserId: params.externalUserId,
        })
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          const errorText = await response.text()
          errorData = { error: errorText }
        }
        
        // Si el error es 401, el token puede ser inválido
        if (response.status === 401) {
          throw new Error(errorData.message || errorData.error || 'Token inválido o expirado. Por favor, inicia sesión nuevamente.')
        }
        
        throw new Error(errorData.message || errorData.error || `Error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Normalizar la respuesta para que coincida con el formato esperado
      if (result.success && result.data) {
        const walletData = result.data
        
        // ChipiPay puede devolver la wallet en diferentes formatos
        if (walletData.wallet) {
          return {
            wallet: {
              publicKey: walletData.wallet.publicKey || walletData.wallet.address,
              address: walletData.wallet.address || walletData.wallet.publicKey,
              encryptedPrivateKey: walletData.wallet.encryptedPrivateKey || walletData.encryptedPrivateKey
            },
            txHash: walletData.txHash,
            externalUserId: params.externalUserId
          }
        } else {
          // Formato alternativo
          return {
            wallet: {
              publicKey: walletData.publicKey || walletData.address,
              address: walletData.address || walletData.publicKey,
              encryptedPrivateKey: walletData.encryptedPrivateKey
            },
            txHash: walletData.txHash,
            externalUserId: params.externalUserId
          }
        }
      }

      throw new Error('Formato de respuesta inválido de ChipiPay')
    } catch (error) {
      console.error('Error en ChipiPay MCP createWallet:', error)
      throw error
    }
  }

  /**
   * Transferir tokens usando ChipiPay MCP
   * 
   * @param params - Parámetros para la transferencia
   * @returns Respuesta con el hash de la transacción
   */
  async transfer(params: ChipiPayMCPTransferParams): Promise<ChipiPayMCPTransferResponse> {
    try {
      // En un entorno con MCP disponible, esto usaría call_mcp_tool
      // Por ahora, usamos el SDK de ChipiPay directamente
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      const response = await fetch(`${apiUrl}/api/chipipay/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          const errorText = await response.text()
          errorData = { error: errorText }
        }
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        return {
          txHash: result.data.txHash,
          status: result.data.status || 'pending'
        }
      }

      throw new Error('Formato de respuesta inválido de ChipiPay')
    } catch (error) {
      console.error('Error en ChipiPay MCP transfer:', error)
      throw error
    }
  }

  /**
   * Obtener información de una wallet usando ChipiPay MCP
   * 
   * @param walletAddress - Dirección de la wallet
   * @returns Información de la wallet
   */
  async getWallet(walletAddress: string): Promise<any> {
    try {
      // En un entorno con MCP disponible, esto usaría call_mcp_tool
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      const response = await fetch(`${apiUrl}/api/chipipay/wallet/${walletAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          const errorText = await response.text()
          errorData = { error: errorText }
        }
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error en ChipiPay MCP getWallet:', error)
      throw error
    }
  }

  /**
   * Verificar si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0
  }
}

// Exportar instancia singleton
export const chipiPayMCPService = ChipiPayMCPService.getInstance()

