'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      bookingId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      customerId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING,
        defaultValue: 'VND'
      },
      paymentMethod: {
        type: Sequelize.ENUM('cash', 'card', 'wallet', 'bank_transfer'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'refunded'),
        defaultValue: 'pending'
      },
      transactionId: {
        type: Sequelize.STRING,
        unique: true,
        sparse: true
      },
      paymentGateway: {
        type: Sequelize.ENUM('stripe', 'paypal', 'vnpay', 'momo', 'cash'),
        defaultValue: 'cash'
      },
      gatewayResponse: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      refundAmount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      refundedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      }
    });

    // Create indexes
    await queryInterface.addIndex('payments', ['bookingId']);
    await queryInterface.addIndex('payments', ['customerId', 'createdAt']);
    await queryInterface.addIndex('payments', ['transactionId']);
    await queryInterface.addIndex('payments', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payments');
  }
};
