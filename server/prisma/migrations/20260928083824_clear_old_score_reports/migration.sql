-- Old reports use the 0-10 scale and a free-text "pattern" field that the new UI can't read.
-- Deleting the answers also deletes their score reports (ON DELETE CASCADE).
DELETE FROM "Answer";