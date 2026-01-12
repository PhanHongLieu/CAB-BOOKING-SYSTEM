const express = require('express');
const { body } = require('express-validator');
const bookingController = require('../controllers/booking.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const createBookingValidation = [
  body('pickupLocation.address').notEmpty(),
  body('pickupLocation.coordinates.lat').isFloat(),
  body('pickupLocation.coordinates.lng').isFloat(),
  body('dropoffLocation.address').notEmpty(),
  body('dropoffLocation.coordinates.lat').isFloat(),
  body('dropoffLocation.coordinates.lng').isFloat()
];

// Routes
router.post('/', createBookingValidation, bookingController.createBooking);
router.get('/', bookingController.getBookings);
router.get('/:id', bookingController.getBooking);
router.post('/:id/accept', bookingController.acceptBooking);
router.patch('/:id/status', bookingController.updateBookingStatus);
router.post('/:id/cancel', bookingController.cancelBooking);

module.exports = router;
