const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  bookingId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customerId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'VND',
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'wallet', 'bank_transfer'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending',
  },
  transactionId: {
    type: DataTypes.STRING,
    unique: true,
    sparse: true,
  },
  paymentGateway: {
    type: DataTypes.ENUM('stripe', 'paypal', 'vnpay', 'momo', 'cash'),
    defaultValue: 'cash',
  },
  gatewayResponse: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'payments',
  timestamps: true,
  indexes: [
    { fields: ['bookingId'] },
    { fields: ['customerId', 'createdAt'] },
    { fields: ['transactionId'] },
    { fields: ['status'] },
  ],
});

module.exports = Payment;
