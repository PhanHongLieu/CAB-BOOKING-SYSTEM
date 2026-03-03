const express = require("express");

const userController = require("../controllers/userController");
const validate = require("../middlewares/validate");
const parseUserFromGateway = require("../middlewares/authContext");
const { updateMeSchema, statusSchema, uuidSchema } = require("../validations/userValidation");

const router = express.Router();

router.get("/me", parseUserFromGateway, userController.getMe.bind(userController));

router.put(
  "/me",
  parseUserFromGateway,
  validate(updateMeSchema),
  userController.updateMe.bind(userController)
);

router.get(
  "/:id",
  validate(uuidSchema, "params"),
  userController.getById.bind(userController)
);

router.patch(
  "/:id/status",
  validate(uuidSchema, "params"),
  validate(statusSchema),
  userController.updateStatus.bind(userController)
);

router.delete(
  "/:id",
  validate(uuidSchema, "params"),
  userController.softDelete.bind(userController)
);

module.exports = router;
