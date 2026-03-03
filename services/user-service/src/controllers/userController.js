const userService = require("../services/userService");

class UserController {
  async getMe(req, res, next) {
    try {
      const profile = await userService.getMe(req.user.userId);
      res.status(200).json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req, res, next) {
    try {
      const profile = await userService.updateMe(req.user.userId, req.body);
      res.status(200).json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const profile = await userService.getById(req.params.id);
      res.status(200).json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const profile = await userService.updateStatus(req.params.id, req.body.status);
      res.status(200).json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }

  async softDelete(req, res, next) {
    try {
      const result = await userService.softDelete(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
