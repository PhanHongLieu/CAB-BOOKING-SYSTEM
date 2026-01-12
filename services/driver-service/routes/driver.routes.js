const express = require('express');
const driverController = require('../controllers/driver.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.post('/register', driverController.registerDriver);
router.get('/profile', driverController.getDriverProfile);
router.patch('/status', driverController.updateDriverStatus);
router.post('/location', driverController.updateLocation);
router.get('/nearby', driverController.getNearbyDrivers);
router.post('/:driverId/rating', driverController.updateRating);

module.exports = router;
