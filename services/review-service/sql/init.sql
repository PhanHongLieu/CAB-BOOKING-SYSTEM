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

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews (reviewer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews (reviewee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews (booking_id);
