const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  pickupLocation: {
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }
  },
  dropoffLocation: {
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }
  },
  distance: {
    type: Number, // in kilometers
    required: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true
  },
  fare: {
    baseFare: { type: Number, default: 0 },
    distanceFare: { type: Number, default: 0 },
    timeFare: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  vehicleType: {
    type: String,
    enum: ['economy', 'comfort', 'premium', 'luxury'],
    default: 'economy'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'driver_assigned', 'arrived', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  scheduledAt: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  rating: {
    score: { type: Number, min: 1, max: 5 },
    comment: { type: String }
  }
}, {
  timestamps: true
});

// Indexes
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ driverId: 1, createdAt: -1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'pickupLocation.coordinates.lat': 1, 'pickupLocation.coordinates.lng': 1 });

module.exports = mongoose.model('Booking', bookingSchema);
