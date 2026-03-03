const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
    ref: 'User'
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  vehicle: {
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    color: { type: String, required: true },
    licensePlate: { type: String, required: true, unique: true },
    vehicleType: {
      type: String,
      enum: ['economy', 'comfort', 'premium', 'luxury'],
      default: 'economy'
    }
  },
  location: {
    coordinates: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 }
    },
    lastUpdated: { type: Date, default: Date.now }
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  totalTrips: {
    type: Number,
    default: 0
  },
  documents: {
    license: { type: String },
    insurance: { type: String },
    registration: { type: String }
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

driverSchema.index({ 'location.coordinates': '2dsphere' });
driverSchema.index({ isAvailable: 1, isOnline: 1 });

module.exports = mongoose.model('Driver', driverSchema);
