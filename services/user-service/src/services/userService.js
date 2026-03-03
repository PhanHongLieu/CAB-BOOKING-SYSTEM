const AppError = require("../utils/AppError");
const userRepository = require("../repositories/userRepository");
const { publishEvent } = require("../events/producer");
const logger = require("../utils/logger");

class UserService {
  async getMe(userId) {
    const profile = await userRepository.findByUserId(userId);
    if (!profile) {
      throw new AppError("User profile not found", 404, "PROFILE_NOT_FOUND");
    }
    return profile;
  }

  async updateMe(userId, payload) {
    const exists = await userRepository.findByUserId(userId);
    if (!exists) {
      throw new AppError("User profile not found", 404, "PROFILE_NOT_FOUND");
    }

    const { addresses, ...profilePayload } = payload;

    if (Object.keys(profilePayload).length) {
      await userRepository.updateProfile(userId, profilePayload);
    }

    if (addresses) {
      await userRepository.upsertAddresses(userId, addresses);
    }

    const updated = await userRepository.findByUserId(userId);

    try {
      await publishEvent("UserProfileUpdated", {
        user_id: updated.user_id,
        full_name: updated.full_name,
        phone: updated.phone,
        avatar_url: updated.avatar_url,
        status: updated.status,
        rating: updated.rating,
        total_rides: updated.total_rides,
        reward_points: updated.reward_points,
        national_id: updated.national_id,
        driver_license_number: updated.driver_license_number
      });
    } catch (error) {
      // Profile update should still succeed even if event bus is temporarily unavailable.
      logger.warn("Failed to publish UserProfileUpdated event", { error: error.message, userId });
    }

    return updated;
  }

  async getById(userId) {
    const profile = await userRepository.findByUserId(userId);
    if (!profile) {
      throw new AppError("User profile not found", 404, "PROFILE_NOT_FOUND");
    }
    return profile;
  }

  async updateStatus(userId, status) {
    const profile = await userRepository.findByUserId(userId);
    if (!profile) {
      throw new AppError("User profile not found", 404, "PROFILE_NOT_FOUND");
    }

    return userRepository.updateStatus(userId, status);
  }

  async softDelete(userId) {
    const deletedCount = await userRepository.softDelete(userId);
    if (!deletedCount) {
      throw new AppError("User profile not found", 404, "PROFILE_NOT_FOUND");
    }
    return { deleted: true };
  }

  async handleUserRegistered(eventPayload) {
    const userId = eventPayload.user_id || eventPayload.userId;
    if (!userId) {
      throw new AppError("UserRegistered event missing user_id", 400, "INVALID_EVENT");
    }

    const existing = await userRepository.findByUserId(userId);
    if (existing) {
      return existing;
    }

    const existingIncludeDeleted = await userRepository.findByUserIdIncludeDeleted(userId);
    if (existingIncludeDeleted && existingIncludeDeleted.deleted_at) {
      await userRepository.restoreProfile(userId);
      return userRepository.updateProfile(userId, {
        full_name: eventPayload.full_name || eventPayload.fullName || "New User",
        phone: eventPayload.phone || null,
        avatar_url: eventPayload.avatar_url || null,
        status: "ACTIVE",
        national_id: eventPayload.national_id || null,
        driver_license_number: eventPayload.driver_license_number || null
      });
    }

    return userRepository.createProfile({
      user_id: userId,
      full_name: eventPayload.full_name || eventPayload.fullName || "New User",
      phone: eventPayload.phone || null,
      avatar_url: eventPayload.avatar_url || null,
      status: "ACTIVE",
      rating: 5,
      total_rides: 0,
      reward_points: 0,
      national_id: eventPayload.national_id || null,
      driver_license_number: eventPayload.driver_license_number || null
    });
  }

  async handleUserBanned(eventPayload) {
    const userId = eventPayload.user_id || eventPayload.userId;
    if (!userId) {
      throw new AppError("UserBanned event missing user_id", 400, "INVALID_EVENT");
    }

    const profile = await userRepository.findByUserId(userId);
    if (!profile) {
      return this.handleUserRegistered({ user_id: userId, full_name: "Unknown User" }).then(() =>
        userRepository.updateStatus(userId, "BANNED")
      );
    }

    return userRepository.updateStatus(userId, "BANNED");
  }

  async ensureDemoUser() {
    const demoUserId = process.env.SEED_DEMO_USER_ID || "550e8400-e29b-41d4-a716-446655440000";
    const existing = await userRepository.findByUserId(demoUserId);
    if (existing) {
      return existing;
    }

    const existingIncludeDeleted = await userRepository.findByUserIdIncludeDeleted(demoUserId);
    if (existingIncludeDeleted && existingIncludeDeleted.deleted_at) {
      await userRepository.restoreProfile(demoUserId);
      return userRepository.updateProfile(demoUserId, {
        full_name: "Demo Rider",
        phone: "+84900000000",
        status: "ACTIVE",
        reward_points: 120,
        national_id: "012345678901"
      });
    }

    return userRepository.createProfile({
      user_id: demoUserId,
      full_name: "Demo Rider",
      phone: "+84900000000",
      status: "ACTIVE",
      rating: 4.8,
      total_rides: 24,
      reward_points: 120,
      national_id: "012345678901"
    });
  }
}

module.exports = new UserService();
