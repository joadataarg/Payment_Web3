const prisma = require('../config/database');
const cron = require('node-cron');
const StarknetOracleService = require('./starknetOracleService');

// Cache de precios en memoria (para MVP)
const priceCache = new Map();
const CACHE_DURATION = 30 * 1000; // 30 segundos

// Instancia del servicio Oracle de Starknet
const starknetOracle = new StarknetOracleService();
async function getCurrentPrice(currency, baseCurrency = 'ARS') {
  const cacheKey = `${currency}_${baseCurrency}`;
  const cached = priceCache.get(cacheKey);
  
  // Verificar cache
  if (cached && (Date.now() - cached.timestamp.getTime()) < CACHE_DURATION) {
    return cached;
  }

  // 🚀 SOLO ORACLE DE STARKNET para USDT/ARS
  if (currency === 'USDT' && baseCurrency === 'ARS') {
    console.log('🔍 Obteniendo precio USDT/ARS del Oracle de Starknet...');
    
    // Usar 1 ARS como base para obtener el rate
    const quoteResult = await starknetOracle.getARSToUSDTQuote(1);
    
    // Solo guardar si el rate es válido (no 0, no Infinity, no NaN)
    if (quoteResult.rate > 0 && isFinite(quoteResult.rate)) {
      const oraclePrice = {
        price: quoteResult.rate,
        source: 'STARKNET_ORACLE',
        timestamp: new Date(),
        oracleAddress: starknetOracle.oracleAddress,
        usdtAmount: quoteResult.usdtAmount,
        rate: quoteResult.rate
      };
      
      // Actualizar cache
      priceCache.set(cacheKey, oraclePrice);
      
      // Guardar en base de datos
      try {
        await prisma.priceOracle.create({
          data: {
            currency,
            baseCurrency,
            price: oraclePrice.price,
            source: oraclePrice.source
          }
        });
        console.log(`✅ Precio USDT/ARS guardado en BD: $${oraclePrice.price}`);
      } catch (error) {
        console.warn('Error guardando precio del Oracle en BD:', error.message);
      }
      
      console.log(`✅ Precio USDT/ARS obtenido del Oracle: $${oraclePrice.price}`);
      return oraclePrice;
    } else {
      console.warn(`⚠️ Rate inválido del Oracle: ${quoteResult.rate}, no se guarda en BD`);
      // Devolver un precio por defecto para evitar errores
      return {
        price: 1000, // Precio por defecto: 1 USDT = 1000 ARS
        source: 'DEFAULT',
        timestamp: new Date()
      };
    }
  }
  
  // Para otras monedas, no soportadas - solo USDT/ARS
  throw new Error(`Solo se soporta USDT/ARS a través del Oracle de Starknet. Solicitado: ${currency}/${baseCurrency}`);
}

// Función ELIMINADA: getAveragePrice() - Solo usamos Oracle de Starknet

// Función para actualizar precios periódicamente - SOLO ORACLE DE STARKNET
async function updatePrices() {
  console.log('🔄 Actualizando precios...');
  
  // Solo actualizar USDT usando Oracle de Starknet
  try {
    const priceData = await getCurrentPrice('USDT', 'ARS');
    console.log(`✅ Precio USDT/ARS actualizado: $${priceData.price} (${priceData.source})`);
  } catch (error) {
    console.error(`❌ Error actualizando USDT/ARS:`, error.message);
  }
}

// Iniciar actualización automática de precios
function startPriceOracle() {
  console.log('🚀 Iniciando oráculo de precios...');
  
  // Actualizar precios cada 30 segundos
  cron.schedule('*/30 * * * * *', updatePrices);
  
  // Actualizar precios al inicio
  updatePrices();
  
  console.log('✅ Oráculo de precios iniciado');
}

// Función para obtener historial de precios
async function getPriceHistory(currency, baseCurrency = 'ARS', hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const prices = await prisma.priceOracle.findMany({
    where: {
      currency,
      baseCurrency,
      timestamp: {
        gte: since
      }
    },
    orderBy: {
      timestamp: 'desc'
    },
    take: 100
  });

  return prices;
}

// Función específica para conversión ARS → Crypto (MidatoPay) - SOLO ORACLE DE STARKNET
async function convertARSToCrypto(amountARS, targetCrypto) {
  try {
    // 🚀 SOLO ORACLE DE STARKNET para USDT
    if (targetCrypto === 'USDT') {
      console.log(`🔍 Convirtiendo ${amountARS} ARS a USDT usando Oracle de Starknet...`);
      
      const quoteResult = await starknetOracle.getARSToUSDTQuote(amountARS);
      
      return {
        amountARS,
        targetCrypto,
        cryptoAmount: quoteResult.usdtAmount,
        exchangeRate: quoteResult.rate,
        source: 'STARKNET_ORACLE',
        timestamp: quoteResult.timestamp,
        oracleAddress: starknetOracle.oracleAddress,
        // Agregar margen de seguridad del 2%
        cryptoAmountWithMargin: quoteResult.usdtAmount * 0.98
      };
    }
    
    // Para otras criptomonedas, no soportadas
    throw new Error(`Solo se soporta conversión a USDT a través del Oracle de Starknet. Solicitado: ${targetCrypto}`);
  } catch (error) {
    console.error(`Error convirtiendo ${amountARS} ARS a ${targetCrypto}:`, error.message);
    throw error;
  }
}

// Función para obtener rate con margen de seguridad - SOLO ORACLE DE STARKNET
async function getExchangeRateWithMargin(targetCrypto, marginPercent = 2) {
  try {
    // Solo soportamos USDT
    if (targetCrypto !== 'USDT') {
      throw new Error(`Solo se soporta USDT a través del Oracle de Starknet. Solicitado: ${targetCrypto}`);
    }
    
    const priceData = await getCurrentPrice(targetCrypto, 'ARS');
    const margin = marginPercent / 100;
    
    return {
      baseRate: priceData.price,
      rateWithMargin: priceData.price * (1 + margin),
      marginPercent,
      targetCrypto,
      source: priceData.source,
      timestamp: priceData.timestamp
    };
  } catch (error) {
    console.error(`Error obteniendo rate con margen para ${targetCrypto}:`, error.message);
    throw error;
  }
}

// Función para validar si un rate está dentro del rango aceptable - SOLO ORACLE DE STARKNET
async function validateExchangeRate(targetCrypto, expectedRate, tolerancePercent = 5) {
  try {
    // Solo soportamos USDT
    if (targetCrypto !== 'USDT') {
      throw new Error(`Solo se soporta USDT a través del Oracle de Starknet. Solicitado: ${targetCrypto}`);
    }
    
    const currentRate = await getCurrentPrice(targetCrypto, 'ARS');
    const tolerance = tolerancePercent / 100;
    const minRate = expectedRate * (1 - tolerance);
    const maxRate = expectedRate * (1 + tolerance);
    
    const isValid = currentRate.price >= minRate && currentRate.price <= maxRate;
    
    return {
      isValid,
      currentRate: currentRate.price,
      expectedRate,
      tolerancePercent,
      minRate,
      maxRate,
      deviation: Math.abs(currentRate.price - expectedRate) / expectedRate * 100
    };
  } catch (error) {
    console.error(`Error validando rate para ${targetCrypto}:`, error.message);
    throw error;
  }
}

// Función para obtener balance USDT usando el contrato Starknet
async function getUSDTBalance(accountAddress) {
  try {
    console.log(`🔍 Obteniendo balance USDT para ${accountAddress}...`);
    
    const balanceResult = await starknetOracle.getUSDTBalance(accountAddress);
    
    return {
      balance: balanceResult.balance,
      balance_u256: balanceResult.balance_u256,
      accountAddress,
      tokenAddress: starknetOracle.usdtTokenAddress,
      source: 'STARKNET_USDT',
      timestamp: balanceResult.timestamp
    };
  } catch (error) {
    console.error('Error obteniendo balance USDT:', error.message);
    throw error;
  }
}

// Función para verificar estado del Oracle
async function getOracleStatus() {
  try {
    console.log('🔍 Verificando estado del Oracle de Starknet...');
    
    const statusResult = await starknetOracle.checkOracleStatus();
    
    return {
      isActive: statusResult.isActive,
      currentRate: statusResult.currentRate,
      oracleAddress: statusResult.oracleAddress,
      usdtTokenAddress: statusResult.usdtTokenAddress,
      status: statusResult.status,
      timestamp: statusResult.timestamp,
      error: statusResult.error || null
    };
  } catch (error) {
    console.error('Error verificando estado del Oracle:', error.message);
    return {
      isActive: false,
      currentRate: null,
      oracleAddress: starknetOracle.oracleAddress,
      usdtTokenAddress: starknetOracle.usdtTokenAddress,
      status: 'ERROR',
      error: error.message,
      timestamp: new Date()
    };
  }
}

module.exports = {
  getCurrentPrice,
  startPriceOracle,
  getPriceHistory,
  updatePrices,
  convertARSToCrypto,
  getExchangeRateWithMargin,
  validateExchangeRate,
  getUSDTBalance,
  getOracleStatus
};
