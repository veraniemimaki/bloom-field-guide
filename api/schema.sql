CREATE TABLE IF NOT EXISTS community_posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_alias TEXT NOT NULL,
  body VARCHAR(280) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected')),
  flag_reason VARCHAR(280),
  review_decision TEXT
    CHECK (review_decision IS NULL OR review_decision IN ('approved', 'rejected')),
  reviewer_note VARCHAR(280),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS community_posts_public_idx
  ON community_posts (status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS community_posts_expiry_idx
  ON community_posts (expires_at);
