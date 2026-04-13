const express = require('express');
const rideController = require('../controllers/ride.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);


router.post('/', rideController.createRide);
router.get('/', rideController.getRides);
router.get('/:id', rideController.getRide);

module.exports = router;