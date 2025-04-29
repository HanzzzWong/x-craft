-- Add reset token columns to Users table if they don't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = 'reset_token' AND object_id = OBJECT_ID('Users'))
BEGIN
    ALTER TABLE Users ADD reset_token NVARCHAR(100) NULL;
    PRINT 'Added reset_token column to Users table';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = 'reset_token_expires' AND object_id = OBJECT_ID('Users'))
BEGIN
    ALTER TABLE Users ADD reset_token_expires DATETIME NULL;
    PRINT 'Added reset_token_expires column to Users table';
END

-- Add user_type column to Users table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = 'user_type' AND object_id = OBJECT_ID('Users'))
BEGIN
    ALTER TABLE Users ADD user_type NVARCHAR(50) DEFAULT 'personal' NULL;
    PRINT 'Added user_type column to Users table with default value "personal"';
END
ELSE
BEGIN
    -- Update existing users without a userType to have 'personal' as default
    UPDATE Users SET user_type = 'personal' WHERE user_type IS NULL;
    PRINT 'Updated NULL user_type values to "personal"';
END 