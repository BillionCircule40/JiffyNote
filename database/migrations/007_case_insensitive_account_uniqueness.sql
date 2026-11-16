-- Prevent duplicate account identifiers that differ only by letter case.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower_unique
    ON users (LOWER(username));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower_unique
    ON users (LOWER(email));
