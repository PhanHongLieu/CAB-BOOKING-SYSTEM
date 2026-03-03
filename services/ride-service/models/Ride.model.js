const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Booking'
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['created', 'assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'created'
  },
  pickupLocation: {
    address: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  dropoffLocation: {
    address: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  fare: {
    baseFare: { type: Number, default: 0 },
    distanceFare: { type: Number, default: 0 },
    timeFare: { type: Number, default: 0 },
    total: { type: Number }
  },
  vehicleType: {
    type: String,
    enum: ['economy', 'comfort', 'premium', 'luxury'],
    default: 'economy'
  },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  route: [
    {
      lat: Number,
      lng: Number,
      timestamp: Date
    }
  ],
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: String
}, {
  timestamps: true
});

rideSchema.index({ bookingId: 1 });
rideSchema.index({ driverId: 1, createdAt: -1 });
rideSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model('Ride', rideSchema);
