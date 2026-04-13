'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('payments', [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        bookingId: 'booking-001',
        customerId: 'user-001',
        amount: 250000,
        currency: 'VND',
        paymentMethod: 'card',
        status: 'completed',
        transactionId: 'TXN1704110400000000001',
        paymentGateway: 'vnpay',
        gatewayResponse: { response_code: '00', message: 'Successful' },
        refundAmount: 0,
        refundedAt: null,
        metadata: { source: 'mobile_app', platform: 'iOS' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        bookingId: 'booking-002',
        customerId: 'user-002',
        amount: 180000,
        currency: 'VND',
        paymentMethod: 'cash',
        status: 'pending',
        transactionId: 'TXN1704110400000000002',
        paymentGateway: 'cash',
        gatewayResponse: {},
        refundAmount: 0,
        refundedAt: null,
        metadata: { notes: 'Cash payment pending' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        bookingId: 'booking-003',
        customerId: 'user-003',
        amount: 320000,
        currency: 'VND',
        paymentMethod: 'wallet',
        status: 'completed',
        transactionId: 'TXN1704110400000000003',
        paymentGateway: 'momo',
        gatewayResponse: { transactionId: 'MOMO123456', status: 'success' },
        refundAmount: 0,
        refundedAt: null,
        metadata: { wallet_type: 'momo' },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('payments', null, {});
  }
};
