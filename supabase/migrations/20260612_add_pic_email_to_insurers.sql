-- Add pic_email column to sp_insurers for direct PIC email notifications
ALTER TABLE sp_insurers
  ADD COLUMN IF NOT EXISTS pic_email TEXT;
