const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateHybrid } = require('../middleware/clerkAuth');
const {
  getBalance,
  credit,
  debit,
  ensureBalance,
  hasSufficientBalance,
  BalanceError,
  DEFAULT_BALANCE
} = require('../services/offchainBalanceStore');

const router = express.Router();

const normalizeUserId = (req) => req.user?.id || req.user?.clerkId;

router.use(authenticateHybrid);

router.get('/', (req, res) => {
  try {
    const userId = normalizeUserId(req);
    const result = getBalance(userId);

    res.json({
      success: true,
      balance: result.balance,
      history: result.history,
      defaultBalance: DEFAULT_BALANCE
    });
  } catch (error) {
    console.error('Error fetching off-chain balance:', error);
    res.status(500).json({
      success: false,
      error: 'No se pudo obtener el balance'
    });
  }
});

router.post('/adjust', [
  body('type').isIn(['credit', 'debit']).withMessage('type debe ser credit o debit'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount debe ser mayor a 0'),
  body('reason').optional().isString().trim(),
  body('sessionId').optional().isString().trim()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: errors.array()
      });
    }

    const userId = normalizeUserId(req);
    const { type, amount, reason, sessionId } = req.body;
    const amountNumber = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    const metadata = {
      reason: reason || `${type === 'debit' ? 'Débito' : 'Crédito'} manual`,
      sessionId: sessionId || null,
      actor: userId
    };

    let result;

    if (Number.isNaN(amountNumber)) {
      throw new BalanceError('INVALID_AMOUNT', 'El monto no es válido');
    }

    if (type === 'credit') {
      result = credit(userId, amountNumber, metadata);
    } else {
      result = debit(userId, amountNumber, metadata);
    }

    res.json({
      success: true,
      balance: result.balance,
      history: result.history
    });
  } catch (error) {
    if (error instanceof BalanceError) {
      const statusCode = error.code === 'INSUFFICIENT_FUNDS' ? 400 : 422;
      return res.status(statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.data
      });
    }

    console.error('Error adjusting balance:', error);
    res.status(500).json({
      success: false,
      error: 'No se pudo actualizar el balance'
    });
  }
});

router.post('/ensure', (req, res) => {
  try {
    const userId = normalizeUserId(req);
    const result = ensureBalance(userId);

    res.json({
      success: true,
      balance: result.balance,
      history: result.history,
      hasSufficientBalance: hasSufficientBalance(userId, 0)
    });
  } catch (error) {
    console.error('Error ensuring balance:', error);
    res.status(500).json({
      success: false,
      error: 'No se pudo inicializar el balance'
    });
  }
});

module.exports = router;

