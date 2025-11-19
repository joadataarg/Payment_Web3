const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const { PrismaClient } = require('@prisma/client')
const { authenticateHybrid } = require('../middleware/clerkAuth')

const prisma = new PrismaClient()

let chipiSDK = null
let ChipiServerSDK = null

const getChipiSDK = async () => {
  if (!ChipiServerSDK) {
    const chipiModule = await import('@chipi-stack/backend')
    ChipiServerSDK = chipiModule.ChipiServerSDK
  }
  
  if (!chipiSDK) {
    const apiPublicKey = process.env.CHIPI_API_KEY || process.env.NEXT_PUBLIC_CHIPI_API_KEY
    const apiSecretKey = process.env.CHIPI_SECRET_KEY
    
    if (!apiSecretKey || !apiPublicKey) {
      throw new Error('CHIPI_SECRET_KEY y CHIPI_API_KEY deben estar configurados')
    }
    
    chipiSDK = new ChipiServerSDK({
      apiPublicKey,
      apiSecretKey,
    })
  }
  
  return chipiSDK
}

router.post('/create-wallet', authenticateHybrid, [
  body('encryptKey').notEmpty().withMessage('encryptKey es requerido'),
  body('externalUserId').optional(),
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

    const { encryptKey, externalUserId } = req.body
    const userIdToUse = externalUserId || req.user?.id || req.user?.clerkId || `user-${Date.now()}`

    // Usar el SDK directamente (sin fallback a API REST)
    // El SDK puede tener problemas con crypto-es, pero es la forma oficial de crear wallets
    console.log('🔄 Creando wallet con SDK de ChipiPay...')
    const chipiClient = await getChipiSDK()
    const walletData = await chipiClient.createWallet({
      encryptKey,
      externalUserId: userIdToUse
    })
    console.log('✅ Wallet creada con SDK de ChipiPay')

    // Normalizar la respuesta
    const normalizedData = {
      wallet: {
        publicKey: walletData.wallet?.publicKey || walletData.publicKey || walletData.address,
        address: walletData.wallet?.address || walletData.address || walletData.publicKey,
        encryptedPrivateKey: walletData.wallet?.encryptedPrivateKey || walletData.encryptedPrivateKey
      },
      txHash: walletData.txHash || walletData.transactionHash,
      externalUserId: userIdToUse
    }

    res.json({
      success: true,
      data: normalizedData
    })
  } catch (error) {
    console.error('❌ Error creando wallet:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Error al crear la wallet'
    })
  }
})

// Guardar wallet de ChipiPay en la base de datos
router.post('/save-wallet', authenticateHybrid, [
  body('walletAddress').notEmpty().withMessage('walletAddress es requerido'),
  body('publicKey').notEmpty().withMessage('publicKey es requerido'),
  body('encryptedPrivateKey').optional(),
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

    const { walletAddress, publicKey, encryptedPrivateKey, txHash } = req.body
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
        privateKey: encryptedPrivateKey || null, // Guardar la clave privada encriptada
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

    console.log('✅ Wallet ChipiPay guardada en BD para usuario:', user.email)

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
