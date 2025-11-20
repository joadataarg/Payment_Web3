const { EMVQRGenerator, EMVQRParser } = require('./emvQRGenerator');
const CavosService = require('./cavosService');
const prisma = require('../config/database');

class MidatoPayService {
  constructor() {
    this.qrGenerator = new EMVQRGenerator();
    this.qrParser = new EMVQRParser();
    this.cavosService = new CavosService();
  }

  // Generar QR de pago para comercio
  async generatePaymentQR(merchantId, amountARS, targetCrypto = 'USDT', concept = 'Pago QR', walletAddressFromRequest = null) {
    try {
      // 1. Obtener datos del comercio
      let merchant = await this.getMerchant(merchantId);
      if (!merchant) {
        throw new Error('Merchant not found');
      }
      
      // Si no tiene walletAddress pero se proporcionó en el request, usarla
      if (!merchant.walletAddress && walletAddressFromRequest) {
        console.log('✅ Usando walletAddress del request:', walletAddressFromRequest);
        merchant = {
          ...merchant,
          walletAddress: walletAddressFromRequest
        };
      }

      // 2. Generar payment ID único
      const paymentId = this.qrGenerator.generatePaymentId();
      
      // 3. Validar datos básicos
      const validation = this.qrGenerator.validatePaymentData(
        merchant.walletAddress, 
        amountARS, 
        paymentId
      );
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // 4. Generar TLV data con solo 3 campos
      const tlvData = this.qrGenerator.generateEMVQR(
        merchant.walletAddress,
        amountARS,
        paymentId
      );
      
      // 5. Generar QR visual
      const qrCodeImage = await this.qrGenerator.generateQRCodeImage(tlvData);
      
      // 6. QR generado exitosamente - starkli se ejecutará al escanear
      console.log('✅ QR generado exitosamente - listo para escanear');

      // 7. Obtener cotización del Oracle para mostrar en el QR
      let cryptoAmount = 0;
      let exchangeRate = 0;
      try {
        const StarknetOracleService = require('./starknetOracleService');
        const oracle = new StarknetOracleService();
        const quote = await oracle.getARSToUSDTQuote(amountARS);
        cryptoAmount = quote.amountUSDT || quote.amountUSDT_raw || 0;
        exchangeRate = quote.rate || 1000;
        console.log('✅ Cotización Oracle obtenida:', { cryptoAmount, exchangeRate });
      } catch (error) {
        console.warn('⚠️ No se pudo obtener cotización del Oracle:', error.message);
        // Usar valores por defecto si falla el Oracle
        cryptoAmount = amountARS * 0.001; // Rate aproximado
        exchangeRate = 1000;
      }

      // 8. Guardar sesión en base de datos
      console.log('💾 Guardando pago con paymentId:', paymentId);
      console.log('💾 MerchantId:', merchantId);
      console.log('💾 Amount:', amountARS);
      await this.savePaymentSession(paymentId, merchantId, {
        amountARS,
        concept,
        merchantWallet: merchant.walletAddress
      });
      console.log('✅ Pago guardado exitosamente');
      
      return {
        success: true,
        qrCodeImage,
        tlvData,
        paymentData: {
          paymentId,
          amountARS,
          merchantAddress: merchant.walletAddress,
          merchantName: merchant.name,
          concept,
          targetCrypto: targetCrypto || 'USDT',
          cryptoAmount,
          exchangeRate,
          sessionId: paymentId
        }
      };
      
    } catch (error) {
      console.error('Error generating payment QR:', error);
      throw error;
    }
  }

  // Obtener comercio por ID
  async getMerchant(merchantId) {
    try {
      // Verificar que prisma esté disponible
      if (!prisma || !prisma.user) {
        throw new Error('Prisma client not initialized');
      }
      
      const merchant = await prisma.user.findUnique({
        where: { id: merchantId }
      });
      
      if (!merchant) {
        throw new Error('Merchant not found');
      }

      // Usar la wallet real del comercio si existe
      // Verificar si tiene walletAddress (puede ser de Cavos o del sistema anterior)
      if (!merchant.walletAddress) {
        // El usuario no tiene wallet. Necesita crear una primero.
        throw new Error('Merchant wallet not found. Please create a wallet first. Go to /dashboard/billetera to create your Cavos wallet.');
      }

      console.log('✅ Merchant wallet encontrada:', merchant.walletAddress);
      return merchant;
    } catch (error) {
      console.error('Error getting merchant:', error);
      throw error;
    }
  }

  // Generar wallet para comercio (placeholder para Cavos)
  async generateMerchantWallet(merchantId) {
    // TODO: Integrar con Cavos Aegis para generar wallet automático
    // Por ahora retornamos un placeholder
    const timestamp = Date.now();
    const randomHex = Math.random().toString(16).substring(2, 10);
    return `0x${merchantId}_${timestamp}_${randomHex}`;
  }

  // Guardar sesión de pago
  async savePaymentSession(paymentId, merchantId, paymentData) {
    try {
      // Calcular tiempo de expiración (30 minutos)
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 30);

      // Generar QR único basado en paymentId y timestamp
      const uniqueQRCode = `QR_${paymentId}_${Date.now()}`;
      
      console.log('💾 Creando pago en BD con datos:', {
        paymentId,
        merchantId,
        amount: paymentData.amountARS,
        concept: paymentData.concept || 'Pago QR',
        orderId: paymentId,
        status: 'PENDING',
        qrCode: uniqueQRCode,
        expiresAt: expirationTime
      });

      const createdPayment = await prisma.payment.create({
        data: {
          amount: paymentData.amountARS, // Campo obligatorio del schema
          currency: 'ARS', // Campo obligatorio del schema
          concept: paymentData.concept || 'Pago QR', // Campo obligatorio del schema
          orderId: paymentId, // Usar paymentId como orderId
          status: 'PENDING', // Campo obligatorio del schema
          qrCode: uniqueQRCode, // QR único para evitar conflictos
          expiresAt: expirationTime, // Campo obligatorio del schema
          userId: merchantId // Campo obligatorio del schema para la relación
        }
      });
      
      console.log('✅ Payment session saved successfully:', createdPayment);
    } catch (error) {
      console.error('Error saving payment session:', error);
      throw error;
    }
  }

  // Obtener sesión de pago
  async getPaymentSession(sessionId) {
    try {
      return await prisma.payment.findUnique({
        where: { sessionId }
      });
    } catch (error) {
      console.error('Error getting payment session:', error);
      throw error;
    }
  }

  // Actualizar sesión de pago
  async updatePaymentSession(sessionId, updateData) {
    try {
      await prisma.payment.update({
        where: { sessionId },
        data: updateData
      });
    } catch (error) {
      console.error('Error updating payment session:', error);
      throw error;
    }
  }

  // Ejecutar conversión crypto (placeholder para Cavos)
  async executeCryptoConversion(paymentSession) {
    // TODO: Integrar con Cavos Aegis para ejecutar conversión automática
    // Por ahora simulamos la transacción
    const transactionHash = `0x${Date.now().toString(16)}_${Math.random().toString(16).substring(2)}`;
    
    return {
      success: true,
      transactionHash,
      gasUsed: '0x1234',
      blockNumber: '0x5678',
      timestamp: new Date()
    };
  }

  // Llamar a la función pay del contrato de Starknet usando starkli
  async callStarknetPayFunction(merchantAddress, amountARS, tokenAddress, paymentId) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      // Construir el comando starkli - compatible con Windows y Linux
      const contractAddress = process.env.STARKNET_PAYMENT_GATEWAY_ADDRESS || '0x062161e7494635ec85e2f3e89bde170b433b8d4b07286c2754a9676fa32bbbb5';
      
      // Detectar sistema operativo y usar la ruta correcta
      const isWindows = process.platform === 'win32';
      const fs = require('fs');
      const path = require('path');
      
      // Intentar encontrar starkli en diferentes ubicaciones
      let starkliPath = process.env.STARKLI_PATH;
      
      if (!starkliPath) {
        const possiblePaths = [
          'C:\\Users\\monst\\midatopay\\starknet-token\\starkli\\.starkli\\bin\\starkli.exe',
          path.join(__dirname, '../../starknet-token/starkli/.starkli/bin/starkli.exe'),
          'starkli' // Intentar desde PATH
        ];
        
        for (const testPath of possiblePaths) {
          if (testPath === 'starkli') {
            // Si es 'starkli', asumimos que está en PATH
            starkliPath = 'starkli';
            break;
          } else if (fs.existsSync(testPath)) {
            starkliPath = testPath;
            break;
          }
        }
        
        // Si no se encontró, usar 'starkli' y esperar que esté en PATH
        if (!starkliPath) {
          starkliPath = 'starkli';
        }
      }
      
      // Verificar que starkli existe (si no es 'starkli' desde PATH)
      if (starkliPath !== 'starkli' && !fs.existsSync(starkliPath)) {
        throw new Error(`starkli no encontrado en: ${starkliPath}. Por favor, instala starkli o configura STARKLI_PATH en las variables de entorno.`);
      }
      
      // Rutas de configuración (keystore y account)
      const starknetTokenPath = process.env.STARKNET_TOKEN_PATH || (isWindows
        ? 'C:\\Users\\monst\\midatopay\\starknet-token'
        : '/var/www/midatopay/starknet-token'
      );
      
      // Usar path.join para construir rutas correctamente según el OS
      const accountPath = process.env.STARKNET_ACCOUNT_PATH || (isWindows
        ? path.join(starknetTokenPath, 'starkli', '.starkli', 'accounts', 'sepolia', 'my.json')
        : path.join(starknetTokenPath, 'starkli', '.starkli', 'accounts', 'sepolia', 'my.json')
      );
      const keystorePath = process.env.STARKNET_KEYSTORE_PATH || (isWindows
        ? path.join(starknetTokenPath, 'starkli', '.starkli', 'keystores', 'my_keystore.json')
        : path.join(starknetTokenPath, 'starkli', '.starkli', 'keystores', 'my_keystore.json')
      );
      const keystorePassword = process.env.STARKNET_KEYSTORE_PASSWORD ? process.env.STARKNET_KEYSTORE_PASSWORD.trim() : 'vargaviella';
      
      // Obtener RPC URL desde variables de entorno
      const rpcUrl = process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io/rpc/v0_7';
      // Remover comillas si están presentes
      const cleanRpcUrl = rpcUrl.replace(/^["']|["']$/g, '');
      
      // Convertir paymentId a formato hexadecimal válido para felt252
      const paymentIdHex = '0x' + Buffer.from(paymentId, 'utf8').toString('hex');
      
      // Primero hacer un dry-run para verificar que el calldata es correcto
      const dryRunCommand = `${starkliPath} call ${contractAddress} pay ${merchantAddress} u256:${amountARS} ${tokenAddress} ${paymentIdHex} --rpc ${cleanRpcUrl}`;
      
      console.log('🧪 Ejecutando dry-run para verificar calldata:', dryRunCommand);
      
      try {
        const { stdout: dryRunStdout, stderr: dryRunStderr } = await execAsync(dryRunCommand, {
          cwd: process.cwd(),
          timeout: 30000 // 30 segundos para dry-run
        });
        
        console.log('✅ Dry-run exitoso:', dryRunStdout);
      } catch (dryRunError) {
        console.warn('⚠️ Dry-run falló:', dryRunError.message);
        console.log('📝 Continuando con invoke real...');
      }
      // Ahora ejecutar la transacción real
      const command = `${starkliPath} invoke ${contractAddress} pay ${merchantAddress} u256:${amountARS} ${tokenAddress} ${paymentIdHex} --account ${accountPath} --keystore ${keystorePath} --keystore-password ${keystorePassword} --rpc ${cleanRpcUrl}`;

      console.log('🔧 Ejecutando comando starkli:', command);

      // Ejecutar el comando con timeout más largo para transacciones blockchain
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 60000 // 60 segundos timeout para transacciones blockchain
      });

      if (stderr && !stderr.includes('Transaction accepted') && !stderr.includes('Invoke transaction:')) {
        throw new Error(`Starkli error: ${stderr}`);
      }

      console.log('📊 Starkli output:', stdout);
      console.log('📊 Starkli stderr:', stderr);
      
      // Buscar hash en stdout o stderr
      const transactionHash = this.extractTransactionHash(stdout) || this.extractTransactionHash(stderr);
      if (transactionHash) {
        const explorerUrl = `https://sepolia.starkscan.co/tx/${transactionHash}`;
        console.log('🔗 Hash de transacción:', transactionHash);
        console.log('🌐 Starkscan URL:', explorerUrl);
      }
      
      return {
        success: true,
        output: stdout,
        transactionHash: transactionHash,
        explorerUrl: transactionHash ? `https://sepolia.starkscan.co/tx/${transactionHash}` : null
      };

    } catch (error) {
      console.error('❌ Error ejecutando starkli:', error.message);
      throw new Error(`Error llamando función pay: ${error.message}`);
    }
  }

  // Extraer hash de transacción del output de starkli
  extractTransactionHash(output) {
    // Buscar diferentes patrones de hash
    const patterns = [
      /Transaction hash: (0x[a-fA-F0-9]+)/,
      /Invoke transaction: (0x[a-fA-F0-9]+)/,
      /(0x[a-fA-F0-9]{64})/ // Hash de 64 caracteres hex
    ];
    
    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  // Obtener historial de pagos del comercio
  async getMerchantPaymentHistory(merchantId, limit = 50) {
    try {
      const payments = await prisma.payment.findMany({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
      
      return payments;
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }

  // Obtener estadísticas del comercio
  async getMerchantStats(merchantId) {
    try {
      const stats = await prisma.payment.aggregate({
        where: { merchantId },
        _sum: {
          amountARS: true,
          cryptoAmount: true
        },
        _count: {
          sessionId: true
        }
      });

      const completedPayments = await prisma.payment.count({
        where: {
          merchantId,
          status: 'PAID'
        }
      });

      return {
        totalPayments: stats._count.sessionId,
        completedPayments,
        totalARS: stats._sum.amountARS || 0,
        totalCrypto: stats._sum.cryptoAmount || 0,
        successRate: stats._count.sessionId > 0 ? (completedPayments / stats._count.sessionId) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting merchant stats:', error);
      throw error;
    }
  }

  // Escanear QR y obtener datos del pago
  async scanPaymentQR(qrData) {
    try {
      // Parsear el QR simplificado
      const qrInfo = this.qrParser.parseEMVQR(qrData);
      
      if (!qrInfo.isValid) {
        throw new Error(`QR Code no válido: ${qrInfo.error}`);
      }

      const { merchantAddress, amount, paymentId } = qrInfo.data;

      // Buscar el pago en la base de datos
      console.log('Buscando pago con paymentId:', paymentId);
      
      const payment = await prisma.payment.findFirst({
        where: { orderId: paymentId },
        include: { user: true }
      });

      if (!payment) {
        throw new Error('Pago no encontrado');
      }

      // Verificar si el pago ha expirado
      if (new Date() > payment.expiresAt) {
        throw new Error('El QR ha expirado');
      }

      // Verificar si el pago ya fue procesado
      if (payment.status !== 'PENDING') {
        throw new Error('El pago ya fue procesado');
      }

      // 🚀 EJECUTAR STARKLI AQUÍ - Cuando se escanea el QR
      console.log('🚀 QR escaneado - Ejecutando transacción en Starknet...');
      let starkliResult = null;
      try {
        starkliResult = await this.callStarknetPayFunction(
          merchantAddress,
          amount,
          '0x040898923d06af282d4a647966fc65c0f308020c43388026b56ef833eda0efdc', // USDT token address
          paymentId
        );
        console.log('✅ Transacción Starknet ejecutada:', starkliResult);
      } catch (error) {
        console.warn('⚠️ Error ejecutando transacción Starknet:', error.message);
        // Si hay un error pero se generó un hash, extraerlo del mensaje de error
        if (error.message.includes('Invoke transaction:')) {
          const hashMatch = error.message.match(/Invoke transaction: (0x[a-fA-F0-9]+)/);
          if (hashMatch) {
            starkliResult = {
              success: true,
              transactionHash: hashMatch[1],
              explorerUrl: `https://sepolia.starkscan.co/tx/${hashMatch[1]}`
            };
            console.log('✅ Hash extraído del error:', starkliResult);
          }
        }
      }

      // 📝 ACTUALIZAR ESTADO DEL PAGO si la transacción fue exitosa
      if (starkliResult && starkliResult.success) {
        try {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { 
              status: 'PAID',
              updatedAt: new Date()
            }
          });
          console.log('✅ Estado del pago actualizado a PAID');
        } catch (updateError) {
          console.warn('⚠️ Error actualizando estado del pago:', updateError.message);
        }
      }
      
      return {
        success: true,
        paymentData: {
          paymentId,
          merchantAddress,
          amountARS: amount,
          merchantName: payment.user.name,
          concept: payment.concept,
          expiresAt: payment.expiresAt.toISOString(),
          status: (starkliResult && starkliResult.success) ? 'PAID' : payment.status,
          // Datos de la transacción blockchain
          blockchainTransaction: starkliResult ? {
            hash: starkliResult.transactionHash,
            explorerUrl: starkliResult.explorerUrl,
            success: starkliResult.success
          } : null
        }
      };
    } catch (error) {
      console.error('Error scanning payment QR:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Procesar pago ARS
  async processARSPayment(paymentId, arsPaymentData) {
    try {
      console.log('🔄 Procesando pago ARS:', { paymentId, arsPaymentData });
      
      // Buscar el pago
      const payment = await prisma.payment.findFirst({
        where: { orderId: paymentId },
        include: { user: true }
      });

      if (!payment) {
        throw new Error('Pago no encontrado');
      }

      // Verificar estado
      if (payment.status !== 'PENDING') {
        throw new Error('El pago ya fue procesado');
      }

      // Verificar expiración
      if (new Date() > payment.expiresAt) {
        throw new Error('El pago ha expirado');
      }

      // Validar monto
      if (Math.abs(payment.amount - arsPaymentData.amount) > 0.01) {
        throw new Error('El monto no coincide');
      }

      // Simular procesamiento de pago ARS
      // En producción, aquí se integraría con el sistema bancario argentino
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 🚀 EJECUTAR SWAP REAL CON ORACLE DE BLOCKCHAIN
      console.log('🚀 Ejecutando swap ARS → Crypto con Oracle de blockchain...');
      
      const swapResult = await this.cavosService.executeARSToCryptoSwap({
        merchantWalletAddress: payment.user.walletAddress,
        amountARS: arsPaymentData.amount,
        targetCrypto: arsPaymentData.targetCrypto || 'USDT',
        cryptoAmount: null, // El Oracle calculará esto
        exchangeRate: null, // El Oracle calculará esto
        paymentId: paymentId
      });

      if (!swapResult.success) {
        throw new Error(`Swap falló: ${swapResult.error}`);
      }

      console.log('✅ Swap ejecutado exitosamente:', swapResult);

      // Actualizar estado del pago
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: 'PAID',
          updatedAt: new Date()
        }
      });

      // Crear transacción de crypto con datos del Oracle
      const transaction = await prisma.transaction.create({
        data: {
          paymentId: BigInt(Date.now()), // BigInt escalable para u256
          paymentIdString: payment.id, // String para la relación con Payment
          amount: swapResult.cryptoAmount, // Del Oracle
          currency: arsPaymentData.targetCrypto || 'USDT',
          exchangeRate: swapResult.exchangeRate, // Del Oracle
          finalAmount: parseFloat(payment.amount),
          finalCurrency: 'ARS',
          status: 'CONFIRMED',
          blockchainTxHash: swapResult.transactionHash, // Hash real de Starknet
          walletAddress: payment.user.walletAddress,
          userId: payment.userId,
          confirmationCount: 1,
          requiredConfirmations: 1
        }
      });

      console.log('✅ Pago procesado exitosamente:', {
        paymentId: payment.id,
        transactionId: transaction.id,
        cryptoAmount: swapResult.cryptoAmount, // Del Oracle
        targetCrypto: arsPaymentData.targetCrypto || 'USDT',
        blockchainTxHash: swapResult.transactionHash,
        explorerUrl: swapResult.explorerUrl,
        mode: swapResult.mode || 'REAL'
      });

      return {
        success: true,
        transactionId: transaction.id,
        message: swapResult.mode === 'SIMULATION' 
          ? 'Pago procesado exitosamente (Modo Simulación)' 
          : 'Pago procesado exitosamente',
        cryptoAmount: swapResult.cryptoAmount, // Del Oracle
        targetCrypto: arsPaymentData.targetCrypto || 'USDT',
        exchangeRate: swapResult.exchangeRate, // Del Oracle
        blockchainTxHash: swapResult.transactionHash,
        explorerUrl: swapResult.explorerUrl,
        gasUsed: swapResult.gasUsed,
        gasPrice: swapResult.gasPrice,
        mode: swapResult.mode || 'REAL'
      };
    } catch (error) {
      console.error('Error processing ARS payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

}

module.exports = MidatoPayService;
