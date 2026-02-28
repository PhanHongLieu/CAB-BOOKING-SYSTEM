const { query } = require('../config/database');

async function initializeSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id BIGSERIAL PRIMARY KEY,
      booking_id VARCHAR(64) NOT NULL UNIQUE,
      reviewer_id VARCHAR(64) NOT NULL,
      reviewee_id VARCHAR(64) NOT NULL,
      rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query('CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews (reviewer_id, created_at DESC);');
  await query('CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews (reviewee_id, created_at DESC);');
  await query('CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews (booking_id);');
}

async function createReview({ bookingId, reviewerId, revieweeId, rating, comment }) {
  const result = await query(
    `
      INSERT INTO reviews (booking_id, reviewer_id, reviewee_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [bookingId, reviewerId, revieweeId, rating, comment || null]
  );

  return result.rows[0];
}

async function getReviewById(id) {
  const result = await query('SELECT * FROM reviews WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getReviewByBookingId(bookingId) {
  const result = await query('SELECT * FROM reviews WHERE booking_id = $1', [bookingId]);
  return result.rows[0] || null;
}

async function listReviewsByReviewee(revieweeId, { page = 1, limit = 10 }) {
  const offset = (page - 1) * limit;
  const reviewsResult = await query(
    `
      SELECT * FROM reviews
      WHERE reviewee_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [revieweeId, limit, offset]
  );

  const totalResult = await query('SELECT COUNT(*)::int AS total FROM reviews WHERE reviewee_id = $1', [revieweeId]);

  return {
    reviews: reviewsResult.rows,
    total: totalResult.rows[0].total
  };
}

async function listReviewsByReviewer(reviewerId, { page = 1, limit = 10 }) {
  const offset = (page - 1) * limit;
  const reviewsResult = await query(
    `
      SELECT * FROM reviews
      WHERE reviewer_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [reviewerId, limit, offset]
  );

  const totalResult = await query('SELECT COUNT(*)::int AS total FROM reviews WHERE reviewer_id = $1', [reviewerId]);

  return {
    reviews: reviewsResult.rows,
    total: totalResult.rows[0].total
  };
}

async function updateReview(id, reviewerId, { rating, comment }) {
  const result = await query(
    `
      UPDATE reviews
      SET
        rating = COALESCE($3, rating),
        comment = COALESCE($4, comment),
        updated_at = NOW()
      WHERE id = $1 AND reviewer_id = $2
      RETURNING *
    `,
    [id, reviewerId, rating ?? null, comment ?? null]
  );

  return result.rows[0] || null;
}

async function deleteReview(id, reviewerId) {
  const result = await query(
    'DELETE FROM reviews WHERE id = $1 AND reviewer_id = $2 RETURNING id',
    [id, reviewerId]
  );
  return Boolean(result.rowCount);
}

async function getReviewStats(revieweeId) {
  const summaryResult = await query(
    `
      SELECT
        COUNT(*)::int AS total_reviews,
        COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS average_rating
      FROM reviews
      WHERE reviewee_id = $1
    `,
    [revieweeId]
  );

  const breakdownResult = await query(
    `
      SELECT rating, COUNT(*)::int AS count
      FROM reviews
      WHERE reviewee_id = $1
      GROUP BY rating
      ORDER BY rating DESC
    `,
    [revieweeId]
  );

  return {
    totalReviews: summaryResult.rows[0].total_reviews,
    averageRating: Number(summaryResult.rows[0].average_rating),
    breakdown: breakdownResult.rows
  };
}

module.exports = {
  initializeSchema,
  createReview,
  getReviewById,
  getReviewByBookingId,
  listReviewsByReviewee,
  listReviewsByReviewer,
  updateReview,
  deleteReview,
  getReviewStats
};
