-- Add event fields used by the current calendar client.
ALTER TABLE calendar_events
    ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS is_repeating BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS repeat_options JSONB;

CREATE INDEX IF NOT EXISTS idx_calendar_events_is_repeating
    ON calendar_events(is_repeating);
