const express = require('express');
const { body } = require('express-validator');
const bookingController = require('../controllers/booking.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validateRequest');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const createBookingValidation = [
  body('pickupLocation.address').notEmpty().withMessage('pickupLocation.address is required'),
  body('pickupLocation.coordinates.lat').isFloat().withMessage('pickupLocation.coordinates.lat must be float'),
  body('pickupLocation.coordinates.lng').isFloat().withMessage('pickupLocation.coordinates.lng must be float'),
  body('dropoffLocation.address').notEmpty().withMessage('dropoffLocation.address is required'),
  body('dropoffLocation.coordinates.lat').isFloat().withMessage('dropoffLocation.coordinates.lat must be float'),
  body('dropoffLocation.coordinates.lng').isFloat().withMessage('dropoffLocation.coordinates.lng must be float'),
  body('vehicleType').optional().isIn(['economy', 'comfort', 'premium', 'luxury']),
  body('scheduledAt').optional().isISO8601()
];

const updateStatusValidation = [
  body('status').isIn(['arrived', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('reason').optional().isString().isLength({ min: 3, max: 255 })
];

const cancelBookingValidation = [
  body('reason').optional().isString().isLength({ min: 3, max: 255 })
];

// Routes
router.post('/', createBookingValidation, validateRequest, bookingController.createBooking);
router.get('/', bookingController.getBookings);
router.get('/:id', bookingController.getBooking);
router.post('/:id/accept', bookingController.acceptBooking);
router.patch('/:id/status', updateStatusValidation, validateRequest, bookingController.updateBookingStatus);
router.post('/:id/cancel', cancelBookingValidation, validateRequest, bookingController.cancelBooking);

module.exports = router;
