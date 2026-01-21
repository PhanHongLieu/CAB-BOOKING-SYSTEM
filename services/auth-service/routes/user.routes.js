const express = require('express');
const User = require('../models/User.model');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { NotFoundError } = require('../../../shared/errors');

const router = express.Router();

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -refreshToken');
    if (!user) {
      throw new NotFoundError('User');
    }
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const users = await User.find().select('-password -refreshToken');
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
