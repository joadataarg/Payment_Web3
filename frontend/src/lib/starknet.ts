import { ArgentMobileConnector } from 'starknetkit/argentMobile'
import { WebWalletConnector } from 'starknetkit/webwallet'
import { InjectedConnector } from 'starknetkit/injected'
import { Contract, CallData, cairo, stark } from 'starknet'

// Configuración de conectores de wallet
export const connectors = [
  new InjectedConnector({ options: { id: 'braavos', name: 'Braavos' } }),
  new InjectedConnector({ options: { id: 'argentX', name: 'Argent X' } }),
  new ArgentMobileConnector(),
  new WebWalletConnector({ url: 'https://web.argent.xyz' }),
]

// Direcciones de contratos en Sepolia
export const CONTRACTS = {
  PAYMENT_GATEWAY: process.env.NEXT_PUBLIC_STARKNET_GATEWAY_ADDRESS || '',
  TOKENS: {
    USDT: process.env.NEXT_PUBLIC_STARKNET_USDT_ADDRESS || '0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8',
    STRK: process.env.NEXT_PUBLIC_STARKNET_STRK_ADDRESS || '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
  }
}

// ABI del Payment Gateway (actualizado con nuevas funciones)
export const PAYMENT_GATEWAY_ABI = [
  {
    name: 'pay',
    type: 'function',
    inputs: [
      { name: 'merchant_address', type: 'felt' },
      { name: 'amount', type: 'u256' },
      { name: 'token_address', type: 'felt' },
      { name: 'payment_id', type: 'felt' }
    ],
    outputs: [{ name: 'success', type: 'bool' }],
    state_mutability: 'external'
  },
  {
    name: 'is_payment_processed',
    type: 'function',
    inputs: [{ name: 'payment_id', type: 'felt' }],
    outputs: [{ name: 'processed', type: 'bool' }],
    state_mutability: 'view'
  },
  {
    name: 'is_token_allowed',
    type: 'function',
    inputs: [{ name: 'token_address', type: 'felt' }],
    outputs: [{ name: 'allowed', type: 'bool' }],
    state_mutability: 'view'
  },
  {
    name: 'get_admin',
    type: 'function',
    inputs: [],
    outputs: [{ name: 'admin', type: 'felt' }],
    state_mutability: 'view'
  },
  {
    name: 'add_allowed_token',
    type: 'function',
    inputs: [{ name: 'token_address', type: 'felt' }],
    outputs: [],
    state_mutability: 'external'
  },
  {
    name: 'remove_allowed_token',
    type: 'function',
    inputs: [{ name: 'token_address', type: 'felt' }],
    outputs: [],
    state_mutability: 'external'
  }
]

// ABI del token ERC20 (simplificado)
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'felt' },
      { name: 'amount', type: 'u256' }
    ],
    outputs: [{ name: 'success', type: 'bool' }],
    state_mutability: 'external'
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'felt' },
      { name: 'spender', type: 'felt' }
    ],
    outputs: [{ name: 'remaining', type: 'u256' }],
    state_mutability: 'view'
  },
  {
    name: 'balance_of',
    type: 'function',
    inputs: [{ name: 'account', type: 'felt' }],
    outputs: [{ name: 'balance', type: 'u256' }],
    state_mutability: 'view'
  }
]

export interface StarknetPaymentData {
  type: 'starknet_payment'
  payment_id: string
  merchant_address: string
  token_address: string
  amount: string
  amount_ars: number
  currency: string
  concept: string
  order_id?: string
  network: string
  contract_address: string
}

export class StarknetPaymentService {
  private provider: any
  private account: any

  constructor(provider: any, account: any) {
    this.provider = provider
    this.account = account
  }

  // Procesar pago desde QR escaneado
  async processPayment(qrData: StarknetPaymentData): Promise<string> {
    try {
      console.log('🚀 Procesando pago Starknet:', qrData)

      const { 
        payment_id, 
        merchant_address, 
        token_address, 
        amount, 
        contract_address 
      } = qrData

      // 1. Verificar que el token esté permitido
      const paymentContract = new Contract(
        PAYMENT_GATEWAY_ABI, 
        contract_address, 
        this.provider
      )
      
      const isTokenAllowed = await paymentContract.is_token_allowed(token_address)
      if (!isTokenAllowed) {
        throw new Error(`Token ${token_address} no está permitido en este gateway`)
      }

      // 2. Verificar balance del usuario
      const balance = await this.checkBalance(token_address)
      if (BigInt(balance) < BigInt(amount)) {
        throw new Error(`Balance insuficiente. Necesitas ${amount} tokens pero tienes ${balance}`)
      }

      // 3. Verificar allowance del token
      const tokenContract = new Contract(ERC20_ABI, token_address, this.provider)
      tokenContract.connect(this.account)

      const currentAllowance = await tokenContract.allowance(
        this.account.address,
        contract_address
      )

      // 4. Aprobar tokens si es necesario (PASO CRÍTICO)
      if (BigInt(currentAllowance) < BigInt(amount)) {
        console.log('📝 Aprobando tokens para el gateway...')
        console.log(`   - Cantidad: ${amount}`)
        console.log(`   - Token: ${token_address}`)
        console.log(`   - Gateway: ${contract_address}`)
        
        const approveCall = tokenContract.populate('approve', [
          contract_address,
          cairo.uint256(amount)
        ])

        const approveResult = await this.account.execute([approveCall])
        await this.provider.waitForTransaction(approveResult.transaction_hash)
        
        console.log('✅ Tokens aprobados:', approveResult.transaction_hash)
        
        // Verificar que el approve funcionó
        const newAllowance = await tokenContract.allowance(
          this.account.address,
          contract_address
        )
        
        if (BigInt(newAllowance) < BigInt(amount)) {
          throw new Error('El approve no se procesó correctamente')
        }
      } else {
        console.log('✅ Ya tienes allowance suficiente:', currentAllowance)
      }

      // 5. Verificar que el pago no haya sido procesado ya
      paymentContract.connect(this.account)
      const isProcessed = await paymentContract.is_payment_processed(payment_id)
      if (isProcessed) {
        throw new Error('Este pago ya fue procesado')
      }

      // 6. Ejecutar pago (TRANSFERENCIA DIRECTA AL MERCHANT)
      console.log('💳 Ejecutando pago directo al merchant...')
      console.log(`   - De: ${this.account.address}`)
      console.log(`   - Para: ${merchant_address}`) 
      console.log(`   - Cantidad: ${amount}`)
      
      const payCall = paymentContract.populate('pay', [
        merchant_address,
        cairo.uint256(amount),
        token_address,
        payment_id
      ])

      const payResult = await this.account.execute([payCall])
      
      console.log('✅ Pago enviado:', payResult.transaction_hash)
      
      // 7. Esperar confirmación
      console.log('⏳ Esperando confirmación...')
      const receipt = await this.provider.waitForTransaction(payResult.transaction_hash)
      
      if (receipt.execution_status === 'SUCCEEDED') {
        console.log('🎉 Pago confirmado exitosamente!')
        return payResult.transaction_hash
      } else {
        throw new Error(`Pago falló: ${receipt.execution_status}`)
      }

    } catch (error) {
      console.error('❌ Error procesando pago:', error)
      
      // Mejorar mensajes de error para el usuario
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      if (errorMessage.includes('Token not allowed')) {
        throw new Error('Este token no está soportado por MidatoPay')
      } else if (errorMessage.includes('Amount must be greater than zero')) {
        throw new Error('El monto debe ser mayor a cero')
      } else if (errorMessage.includes('Invalid merchant address')) {
        throw new Error('Dirección de comercio inválida')
      } else if (errorMessage.includes('Payment already processed')) {
        throw new Error('Este pago ya fue procesado anteriormente')
      }
      
      throw error instanceof Error ? error : new Error(String(error))
    }
  }

  // Verificar balance del usuario
  async checkBalance(tokenAddress: string): Promise<string> {
    try {
      const tokenContract = new Contract(ERC20_ABI, tokenAddress, this.provider)
      const balance = await tokenContract.balance_of(this.account.address)
      return balance.toString()
    } catch (error) {
      console.error('❌ Error verificando balance:', error)
      throw error instanceof Error ? error : new Error(String(error))
    }
  }

  // Verificar si un pago ya fue procesado
  async isPaymentProcessed(paymentId: string): Promise<boolean> {
    try {
      const contract = new Contract(
        PAYMENT_GATEWAY_ABI,
        CONTRACTS.PAYMENT_GATEWAY,
        this.provider
      )
      
      const result = await contract.is_payment_processed(paymentId)
      return result
    } catch (error) {
      console.error('❌ Error verificando pago:', error)
      return false
    }
  }
}

// Utilidades
export const formatStarknetAddress = (address: string): string => {
  if (address.startsWith('0x')) {
    return address
  }
  return `0x${address.padStart(64, '0')}`
}

export const parseStarknetAddress = (address: string): string => {
  return address.replace('0x', '').toLowerCase()
}

export const generatePaymentId = (): string => {
  return stark.randomAddress()
}

// Constantes de red
export const STARKNET_SEPOLIA = {
  chainId: 'SN_SEPOLIA',
  name: 'Starknet Sepolia',
  rpcUrl: 'https://starknet-sepolia.public.blastapi.io/rpc/v0_7',
  explorerUrl: 'https://sepolia.starkscan.co',
  faucetUrl: 'https://starknet-faucet.vercel.app'
}

export const TOKEN_INFO = {
  USDT: {
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    address: CONTRACTS.TOKENS.USDT
  },
  STRK: {
    name: 'Starknet Token',
    symbol: 'STRK', 
    decimals: 18,
    address: CONTRACTS.TOKENS.STRK
  }
}
