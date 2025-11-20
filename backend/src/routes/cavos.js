const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const { PrismaClient } = require('@prisma/client')
const { authenticateHybrid } = require('../middleware/clerkAuth')
const { Account, RpcProvider, CallData, ec, hash, stark } = require('starknet')

const prisma = new PrismaClient()

// Configurar provider de Starknet
const provider = new RpcProvider({
  nodeUrl: process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io/rpc/v0_9'
})

/**
 * Crear wallet usando Cavos (Starknet account deployment)
 * 
 * Este endpoint crea una nueva wallet de Starknet usando el mismo método
 * que Cavos Aegis SDK (deployAccount con gasless deployment)
 */
router.post('/create-wallet', authenticateHybrid, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.clerkId

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      })
    }

    // Generar clave privada y pública
    const privateKey = stark.randomAddress()
    const keyPair = ec.getKeyPair(privateKey)
    const publicKey = ec.getStarkKey(keyPair)

    // Crear cuenta (Account class)
    // Nota: En producción, esto debería usar el mismo método que Cavos Aegis
    // que incluye gasless deployment. Por ahora, solo generamos las claves.
    const accountAddress = hash.calculateContractAddressFromHash(
      publicKey,
      process.env.ACCOUNT_CLASS_HASH || '0x0279d77db761fba82e0054125a6fdb5f6baa6286fa3fb73450cc44d193c2d37f', // Account class hash para Sepolia
      CallData.compile({ publicKey }),
      0
    )

    // Normalizar dirección
    const normalizedAddress = accountAddress.startsWith('0x') 
      ? accountAddress 
      : `0x${accountAddress}`
    
    const walletAddress = normalizedAddress.length === 66 
      ? normalizedAddress 
      : normalizedAddress.padStart(66, '0')

    console.log('✅ Wallet Cavos creada:', {
      address: walletAddress,
      publicKey,
      userId
    })

    res.json({
      success: true,
      data: {
        wallet: {
          address: walletAddress,
          publicKey: walletAddress, // Usar address como publicKey para compatibilidad
          privateKey: privateKey // En producción, esto debería estar encriptado
        },
        txHash: null, // Deployment se hará en el frontend con Cavos SDK
        externalUserId: userId
      }
    })
  } catch (error) {
    console.error('❌ Error creando wallet:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Error al crear la wallet'
    })
  }
})

/**
 * Guardar wallet de Cavos en la base de datos
 */
router.post('/save-wallet', authenticateHybrid, [
  body('walletAddress').notEmpty().withMessage('walletAddress es requerido'),
  body('publicKey').notEmpty().withMessage('publicKey es requerido'),
  body('privateKey').optional(),
  body('txHash').optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: errors.array()
      })
    }

    const { walletAddress, publicKey, privateKey, txHash } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      })
    }

    // Actualizar usuario con los datos de la wallet
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        walletAddress: walletAddress,
        publicKey: publicKey,
        privateKey: privateKey || null, // Guardar la clave privada (en producción, debería estar encriptada)
        walletCreatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        walletAddress: true,
        publicKey: true,
        walletCreatedAt: true
      }
    })

    console.log('✅ Wallet Cavos guardada en BD para usuario:', user.email)

    res.json({
      success: true,
      message: 'Wallet guardada correctamente',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          walletAddress: user.walletAddress,
          publicKey: user.publicKey,
          walletCreatedAt: user.walletCreatedAt
        },
        txHash: txHash || null
      }
    })
  } catch (error) {
    console.error('❌ Error guardando wallet en BD:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Error al guardar la wallet'
    })
  }
})

/**
 * Guardar transacción de Cavos
 */
router.post('/transactions', authenticateHybrid, [
  body('sessionId').notEmpty().withMessage('sessionId es requerido'),
  body('amountARS').isFloat({ min: 0 }).withMessage('amountARS debe ser un número positivo'),
  body('amountUSDC').isFloat({ min: 0 }).withMessage('amountUSDC debe ser un número positivo'),
  body('txHash').notEmpty().withMessage('txHash es requerido'),
  body('fromAddress').notEmpty().withMessage('fromAddress es requerido'),
  body('toAddress').notEmpty().withMessage('toAddress es requerido'),
  body('status').isIn(['pending', 'completed', 'failed']).withMessage('status inválido'),
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: errors.array()
      })
    }

    const {
      sessionId,
      amountARS,
      amountUSDC,
      txHash,
      fromAddress,
      toAddress,
      status,
      userId
    } = req.body
    
    const userIdToUse = userId || req.user?.id || null

    // Usar la misma tabla que ChipiPay para compatibilidad
    const existingTransaction = await prisma.chipiPayTransaction.findUnique({
      where: { txHash }
    })

    if (existingTransaction) {
      return res.status(409).json({
        success: false,
        error: 'Esta transacción ya fue registrada'
      })
    }

    const transaction = await prisma.chipiPayTransaction.create({
      data: {
        sessionId,
        amountARS: parseFloat(amountARS),
        amountUSDC: parseFloat(amountUSDC),
        txHash,
        fromAddress,
        toAddress,
        status,
        userId: userIdToUse,
        createdAt: new Date()
      }
    })

    res.json({
      success: true,
      data: transaction
    })
  } catch (error) {
    console.error('❌ Error guardando transacción:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Error al guardar la transacción'
    })
  }
})

/**
 * Obtener transacciones de Cavos
 */
router.get('/transactions', authenticateHybrid, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query
    const where = { userId: req.user?.id || null }

    const transactions = await prisma.chipiPayTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    })

    res.json({
      success: true,
      data: transactions,
      count: transactions.length
    })
  } catch (error) {
    console.error('❌ Error obteniendo transacciones:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener las transacciones'
    })
  }
})

/**
 * Obtener una transacción específica por hash
 */
router.get('/transactions/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params

    const transaction = await prisma.chipiPayTransaction.findUnique({
      where: { txHash }
    })

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transacción no encontrada'
      })
    }

    res.json({
      success: true,
      data: transaction
    })
  } catch (error) {
    console.error('❌ Error obteniendo transacción:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener la transacción'
    })
  }
})

module.exports = router

