const express = require('express');

const driverController =
require('../controllers/driver.controller');

const { authenticate } =
require('../middleware/auth.middleware');


const router = express.Router();



/* ========= PUBLIC ROUTES ========= */


router.get(
 '/nearby',
 driverController.getNearbyDrivers
);



/* ========= PROTECTED ROUTES ========= */


router.use(authenticate);



router.post(
 '/register',
 driverController.registerDriver
);


router.get(
 '/profile',
 driverController.getDriverProfile
);


router.patch(
 '/status',
 driverController.updateDriverStatus
);


router.post(
 '/location',
 driverController.updateLocation
);


router.post(
 '/:driverId/rating',
 driverController.updateRating
);



/* ========= KYC ========= */


router.patch(
 '/kyc/:driverId',
 driverController.verifyKYC
);



module.exports = router;