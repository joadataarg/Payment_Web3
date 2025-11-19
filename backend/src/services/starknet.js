const { RpcProvider, Contract, Account, ec, json, stark, Provider, hash, CallData } = require('starknet');
const { PrismaClient } = require('@prisma/client');
const WebSocket = require('ws');

const prisma = new PrismaClient();

class StarknetService {
  constructor() {
    this.provider = new RpcProvider({
      nodeUrl: process.env.STARKNET_RPC_URL || "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/b6oJemkCmlgEGq1lXC5uTXwOHZA14WNP"
    });
    
    this.paymentGatewayAddress = process.env.STARKNET_PAYMENT_GATEWAY_ADDRESS;
    // ABI simplificado para PaymentGateway (si el archivo JSON no existe, usar ABI inline)
    this.paymentGatewayABI = this.getPaymentGatewayABI();
    
    // Direcciones de tokens en Sepolia testnet
    this.tokens = {
      'USDT': process.env.STARKNET_USDT_ADDRESS || '0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8',
      'STRK': process.env.STARKNET_STRK_ADDRESS || '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
    };

    this.isListening = false;
    this.eventListeners = new Map();
  }

  // Inicializar el servicio
  async initialize() {
    try {
      console.log('🚀 Inicializando servicio Starknet...');
      
      // Verificar conexión con la red
      const chainId = await this.provider.getChainId();
      console.log(`✅ Conectado a Starknet Chain ID: ${chainId}`);
      
      // Inicializar el contrato
      if (this.paymentGatewayAddress) {
        this.paymentGateway = new Contract(
          this.paymentGatewayABI,
          this.paymentGatewayAddress,
          this.provider
        );
        console.log(`✅ Contrato PaymentGateway cargado: ${this.paymentGatewayAddress}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error inicializando Starknet:', error);
      throw error;
    }
  }

  // Crear un pago con información de Starknet
  async createStarknetPayment(paymentData) {
    try {
      const { amount, currency, merchantAddress, concept, orderId } = paymentData;
      
      // Generar payment_id único
      const paymentId = stark.randomAddress();
      
      // Convertir ARS a token amount
      const tokenAmount = await this.convertARSToToken(amount, currency);
      const tokenAddress = this.tokens[currency];
      
      if (!tokenAddress) {
        throw new Error(`Token no soportado: ${currency}`);
      }

      // Crear QR data para Starknet
      const qrData = {
        type: 'starknet_payment',
        payment_id: paymentId,
        merchant_address: merchantAddress,
        token_address: tokenAddress,
        amount: tokenAmount.toString(),
        amount_ars: amount,
        currency,
        concept,
        order_id: orderId,
        network: 'starknet-sepolia',
        contract_address: this.paymentGatewayAddress
      };

      return {
        paymentId,
        qrData,
        tokenAmount,
        tokenAddress,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutos
      };
    } catch (error) {
      console.error('❌ Error creando pago Starknet:', error);
      throw error;
    }
  }

  // Procesar pago desde el frontend
  async processPayment(transactionHash, paymentId) {
    try {
      console.log(`🔍 Procesando pago Starknet: ${transactionHash}`);
      
      // Esperar confirmación de la transacción
      const receipt = await this.provider.waitForTransaction(transactionHash);
      
      if (receipt.execution_status === 'SUCCEEDED') {
        // Buscar eventos de PaymentReceived
        const events = receipt.events || [];
        const paymentEvent = events.find(event => 
          event.from_address === this.paymentGatewayAddress &&
          event.keys.includes(paymentId)
        );

        if (paymentEvent) {
          // Procesar el evento
          const processedPayment = await this.processPaymentEvent(paymentEvent, receipt);
          
          console.log(`✅ Pago procesado exitosamente: ${paymentId}`);
          return processedPayment;
        } else {
          throw new Error('Evento de pago no encontrado en la transacción');
        }
      } else {
        throw new Error(`Transacción falló: ${receipt.execution_status}`);
      }
    } catch (error) {
      console.error('❌ Error procesando pago:', error);
      throw error;
    }
  }

  // Procesar evento de pago
  async processPaymentEvent(event, receipt) {
    try {
      // Decodificar datos del evento
      const [paymentId, merchantAddress] = event.keys.slice(1); // Skip event selector
      const [payerAddress, amount, tokenAddress, timestamp] = event.data;

      // Actualizar en base de datos
      const updatedTransaction = await prisma.transaction.update({
        where: { id: paymentId },
        data: {
          status: 'CONFIRMED',
          blockchainTxHash: receipt.transaction_hash,
          confirmationCount: 1,
          confirmedAt: new Date()
        }
      });

      // Emitir evento WebSocket para notificar al frontend
      this.emitPaymentConfirmed({
        paymentId,
        transactionHash: receipt.transaction_hash,
        amount: amount.toString(),
        merchantAddress,
        timestamp: new Date(parseInt(timestamp) * 1000)
      });

      return updatedTransaction;
    } catch (error) {
      console.error('❌ Error procesando evento de pago:', error);
      throw error;
    }
  }

  // Iniciar listener de eventos en tiempo real
  async startEventListener() {
    if (this.isListening) return;

    try {
      console.log('🎯 Iniciando listener de eventos Starknet...');
      
      // Implementar polling cada 10 segundos para eventos nuevos
      this.eventPollingInterval = setInterval(async () => {
        await this.pollForNewEvents();
      }, 10000);

      this.isListening = true;
      console.log('✅ Event listener iniciado');
    } catch (error) {
      console.error('❌ Error iniciando event listener:', error);
    }
  }

  // Polling para eventos nuevos
  async pollForNewEvents() {
    try {
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 100); // Últimos 100 bloques

      // Obtener eventos del contrato
      const events = await this.provider.getEvents({
        from_block: { block_number: fromBlock },
        to_block: { block_number: latestBlock },
        address: this.paymentGatewayAddress,
        keys: [hash.getSelectorFromName('PaymentReceived')]
      });

      // Procesar eventos nuevos
      for (const event of events.events) {
        const eventId = `${event.transaction_hash}_${event.event_number}`;
        
        if (!this.eventListeners.has(eventId)) {
          await this.processNewEvent(event);
          this.eventListeners.set(eventId, true);
        }
      }
    } catch (error) {
      console.error('❌ Error en polling de eventos:', error);
    }
  }

  // Procesar evento nuevo
  async processNewEvent(event) {
    try {
      const [paymentId] = event.keys.slice(1);
      
      // Verificar si tenemos este pago en nuestra DB
      const transaction = await prisma.transaction.findUnique({
        where: { id: paymentId }
      });

      if (transaction && transaction.status === 'PENDING') {
        // Obtener receipt completo
        const receipt = await this.provider.getTransactionReceipt(event.transaction_hash);
        await this.processPaymentEvent(event, receipt);
      }
    } catch (error) {
      console.error('❌ Error procesando evento nuevo:', error);
    }
  }

  // Convertir ARS a cantidad de token
  async convertARSToToken(amountARS, currency) {
    // Usar las mismas tasas que el frontend por consistencia
    const rates = {
      'USDT': 1380, // 1 USDT = 1380 ARS
      'STRK': 2500  // 1 STRK = 2500 ARS (ejemplo)
    };

    const rate = rates[currency];
    if (!rate) throw new Error(`Tasa no disponible para ${currency}`);

    // Convertir a la menor unidad del token (considerando decimales)
    const decimals = currency === 'USDT' ? 6 : 18;
    const tokenAmount = (amountARS / rate) * Math.pow(10, decimals);
    
    return Math.floor(tokenAmount);
  }

  // Validar dirección de Starknet
  validateStarknetAddress(address) {
    try {
      // Las direcciones de Starknet son felt252 (números de 252 bits)
      const addressBN = BigInt(address);
      return addressBN >= 0n && addressBN < 2n ** 252n;
    } catch {
      return false;
    }
  }

  // Emitir evento WebSocket
  emitPaymentConfirmed(data) {
    // Implementar WebSocket para notificaciones en tiempo real
    if (global.wsServer) {
      global.wsServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'payment_confirmed',
            data
          }));
        }
      });
    }
  }

  // Obtener información de red
  getNetworkInfo() {
    return {
      name: 'Starknet Sepolia',
      chainId: 'SN_SEPOLIA',
      blockTime: 60, // ~1 minuto
      confirmations: 1,
      explorerUrl: 'https://sepolia.starkscan.co'
    };
  }

  // Detener servicios
  async stop() {
    this.isListening = false;
    if (this.eventPollingInterval) {
      clearInterval(this.eventPollingInterval);
    }
    console.log('🛑 Servicio Starknet detenido');
  }

  // Obtener ABI del PaymentGateway (inline para evitar archivo faltante)
  getPaymentGatewayABI() {
    return [
      {
        name: 'pay',
        type: 'function',
        inputs: [
          { name: 'merchant_address', type: 'core::starknet::contract_address::ContractAddress' },
          { name: 'amount', type: 'core::integer::u256' },
          { name: 'token_address', type: 'core::starknet::contract_address::ContractAddress' },
          { name: 'payment_id', type: 'core::felt252' }
        ],
        outputs: [{ type: 'core::bool' }],
        stateMutability: 'external'
      }
    ];
  }
}

module.exports = StarknetService;
