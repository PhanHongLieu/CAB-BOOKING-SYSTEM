const express = require('express');
const locationController = require('../controllers/location.controller');

const router = express.Router();

router.post('/update', locationController.updateLocation);
router.get('/:userId', locationController.getLocation);

module.exports = router;
