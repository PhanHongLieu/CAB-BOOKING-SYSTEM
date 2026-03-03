const Joi = require("joi");

const uuidSchema = Joi.object({
  id: Joi.string().guid({ version: ["uuidv4", "uuidv5", "uuidv1"] }).required()
});

const addressSchema = Joi.object({
  label: Joi.string().valid("HOME", "WORK", "OTHER").required(),
  address: Joi.string().min(3).max(500).required(),
  lat: Joi.number().min(-90).max(90).optional().allow(null),
  lng: Joi.number().min(-180).max(180).optional().allow(null)
});

const updateMeSchema = Joi.object({
  full_name: Joi.string().min(2).max(150).optional(),
  phone: Joi.string().min(8).max(20).optional().allow(null, ""),
  avatar_url: Joi.string().uri().optional().allow(null, ""),
  national_id: Joi.string().min(8).max(20).optional().allow(null, ""),
  driver_license_number: Joi.string().min(6).max(30).optional().allow(null, ""),
  reward_points: Joi.number().integer().min(0).optional(),
  addresses: Joi.array().items(addressSchema).max(10).optional()
}).min(1);

const statusSchema = Joi.object({
  status: Joi.string().valid("ACTIVE", "BANNED").required()
});

module.exports = {
  uuidSchema,
  updateMeSchema,
  statusSchema
};
