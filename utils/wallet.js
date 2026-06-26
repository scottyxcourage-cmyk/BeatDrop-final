const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

const getUserBalance = async (userId) => {
  const result = await db.execute({ sql: 'SELECT wallet_balance FROM users WHERE id = ?', args: [userId] });
  if (result.rows.length === 0) return null;
  return result.rows[0].wallet_balance || 0;
};

const adjustWalletBalance = async (userId, type, amount, description) => {
  const balance = await getUserBalance(userId);
  if (balance === null) return { error: 'User not found', status: 404 };

  let newBalance;
  if (type === 'spend') {
    if (balance < amount) return { error: 'Insufficient COPS balance', status: 400 };
    newBalance = balance - amount;
  } else if (type === 'deduct') {
    newBalance = Math.max(0, balance - parseFloat(amount));
  } else {
    newBalance = balance + parseFloat(amount);
  }

  await db.execute({ sql: 'UPDATE users SET wallet_balance = ? WHERE id = ?', args: [newBalance, userId] });
  await db.execute({
    sql: 'INSERT INTO wallet_transactions (id, user_id, type, amount, description) VALUES (?, ?, ?, ?, ?)',
    args: [uuidv4(), userId, type, parseFloat(amount), description || '']
  });

  return { balance: newBalance };
};

module.exports = { getUserBalance, adjustWalletBalance };
