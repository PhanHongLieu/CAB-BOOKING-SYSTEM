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

    licensePlate: {
      type: String,
      required: true,
      unique: true
    },

    vehicleType: {
      type: String,
      enum: ['economy','comfort','premium','luxury'],
      default: 'economy'
    }
  },

  /* ===== LOCATION (Sửa lỗi 2dsphere) ===== */

  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      default: [0,0]
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },

  /* ===== ONLINE OFFLINE STATE ===== */

  status: {
    type: String,
    enum: ['offline','online','busy'],
    default: 'offline'
  },

  isAvailable: {
    type: Boolean,
    default: false
  },

  /* ===== RATING ===== */

  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },

  totalTrips: {
    type: Number,
    default: 0
  },

  /* ===== KYC ===== */

  kyc: {

    status: {
      type: String,
      enum: ['pending','approved','rejected'],
      default: 'pending'
    },

    documents: {

      driverLicense: {
        type: String
      },

      insurance: {
        type: String
      },

      vehicleRegistration: {
        type: String
      },

      identityCard: {
        type: String
      }

    },

    verifiedAt: Date

  }

},{
  timestamps:true
});


/* ===== INDEX ===== */

driverSchema.index({ location: "2dsphere" });

driverSchema.index({
  status:1,
  isAvailable:1
});


module.exports = mongoose.model('Driver',driverSchema);