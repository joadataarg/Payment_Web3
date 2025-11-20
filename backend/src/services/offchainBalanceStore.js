const { v4: uuid } = require('uuid');

const DEFAULT_BALANCE = 10_000;

class BalanceError extends Error {
  constructor(code, message, data = {}) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

const balances = new Map();

const getUserKey = (userId) => {
  if (!userId) {
    throw new BalanceError('INVALID_USER', 'User id is required to manage balances');
  }

  return String(userId);
};

const ensureBalance = (userId) => {
  const key = getUserKey(userId);
  if (!balances.has(key)) {
    balances.set(key, {
      balance: DEFAULT_BALANCE,
      history: [
        {
          id: uuid(),
          type: 'credit',
          amount: DEFAULT_BALANCE,
          reason: 'Initial signup bonus',
          sessionId: null,
          balanceAfter: DEFAULT_BALANCE,
          createdAt: new Date().toISOString(),
          actor: 'system'
        }
      ]
    });
  }

  return balances.get(key);
};

const snapshot = (entry) => ({
  balance: entry.balance,
  history: [...entry.history]
});

const getBalance = (userId) => {
  const entry = ensureBalance(userId);
  return snapshot(entry);
};

const hasSufficientBalance = (userId, amount) => {
  const entry = ensureBalance(userId);
  return entry.balance >= amount;
};

const appendHistory = (entry, record) => {
  entry.history.unshift(record);
  entry.history = entry.history.slice(0, 100);
};

const credit = (userId, amount, metadata = {}) => {
  if (amount <= 0) {
    throw new BalanceError('INVALID_AMOUNT', 'Credit amount must be greater than zero');
  }

  const entry = ensureBalance(userId);
  entry.balance += amount;

  appendHistory(entry, {
    id: uuid(),
    type: 'credit',
    amount,
    balanceAfter: entry.balance,
    createdAt: new Date().toISOString(),
    ...metadata
  });

  return snapshot(entry);
};

const debit = (userId, amount, metadata = {}) => {
  if (amount <= 0) {
    throw new BalanceError('INVALID_AMOUNT', 'Debit amount must be greater than zero');
  }

  const entry = ensureBalance(userId);

  if (entry.balance < amount) {
    throw new BalanceError('INSUFFICIENT_FUNDS', 'Fondos insuficientes para completar la operación', {
      balance: entry.balance,
      required: amount
    });
  }

  entry.balance -= amount;

  appendHistory(entry, {
    id: uuid(),
    type: 'debit',
    amount,
    balanceAfter: entry.balance,
    createdAt: new Date().toISOString(),
    ...metadata
  });

  return snapshot(entry);
};

const resetBalances = () => {
  balances.clear();
};

module.exports = {
  DEFAULT_BALANCE,
  BalanceError,
  ensureBalance,
  getBalance,
  credit,
  debit,
  hasSufficientBalance,
  resetBalances
};

