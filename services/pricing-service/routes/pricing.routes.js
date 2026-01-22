const express = require("express");
const router = express.Router();
const pricingController = require("../controllers/pricing.controller");

router.post("/calculate", pricingController.calculatePrice);

module.exports = router;