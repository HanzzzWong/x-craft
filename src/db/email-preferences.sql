-- Check if EmailPreferences table exists, if not create it
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EmailPreferences')
BEGIN
    CREATE TABLE EmailPreferences (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        project_updates BIT NOT NULL DEFAULT 1,
        marketing_emails BIT NOT NULL DEFAULT 0,
        weekly_digest BIT NOT NULL DEFAULT 1,
        last_updated DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (user_id) REFERENCES Users(uid) ON DELETE CASCADE
    );
    
    PRINT 'EmailPreferences table created';
    
    -- Create index for faster lookups
    CREATE INDEX idx_email_prefs_userid ON EmailPreferences(user_id);
    PRINT 'EmailPreferences index created';
END
ELSE
BEGIN
    PRINT 'EmailPreferences table already exists';
END 