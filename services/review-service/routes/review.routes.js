const express = require('express');
const reviewController = require('../controllers/review.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.post('/', reviewController.createReview);
router.get('/me', reviewController.getMyReviews);
router.get('/driver/:driverId/stats', reviewController.getDriverReviewStats);
router.get('/driver/:driverId', reviewController.getDriverReviews);
router.get('/:id', reviewController.getReview);
router.patch('/:id', reviewController.updateReview);
router.delete('/:id', reviewController.deleteReview);

module.exports = router;
