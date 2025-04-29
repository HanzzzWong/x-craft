-- Improved SQL Server Schema with Error Handling and Table Existence Checks
-- Set XACT_ABORT ON to ensure transactions are properly aborted on errors
SET XACT_ABORT ON;

PRINT 'Starting schema setup...';

BEGIN TRY
    BEGIN TRANSACTION;

    -- Drop all related objects first to avoid dependency conflicts
    -- Drop procedures
    IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'AddProjectStep')
        DROP PROCEDURE AddProjectStep;
    PRINT 'AddProjectStep procedure dropped or not found';

    IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'AddProjectItem')
        DROP PROCEDURE AddProjectItem;
    PRINT 'AddProjectItem procedure dropped or not found';

    IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'SaveProject')
        DROP PROCEDURE SaveProject;
    PRINT 'SaveProject procedure dropped or not found';

    IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'GetUserProjects')
        DROP PROCEDURE GetUserProjects;
    PRINT 'GetUserProjects procedure dropped or not found';

    IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'GetProjectWithDetails')
        DROP PROCEDURE GetProjectWithDetails;
    PRINT 'GetProjectWithDetails procedure dropped or not found';

    -- Check if tables exist before dropping them (in correct order: child tables first)
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectSteps')
        DROP TABLE ProjectSteps;
    PRINT 'ProjectSteps table dropped or not found';

    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectItems')
        DROP TABLE ProjectItems;
    PRINT 'ProjectItems table dropped or not found';

    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Projects')
        DROP TABLE Projects;
    PRINT 'Projects table dropped or not found';

    -- Don't drop Users table, just check if it exists
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
    BEGIN
        -- Create Users table
        CREATE TABLE Users (
            uid VARCHAR(50) PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            photo_url VARCHAR(255) NULL,
            user_type VARCHAR(20) NULL,
            created_at DATETIME NOT NULL DEFAULT GETDATE(),
            updated_at DATETIME NULL
        );
        PRINT 'Users table created';
    END
    ELSE
    BEGIN
        -- Ensure the Users table has the required columns
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'user_type')
        BEGIN
            ALTER TABLE Users ADD user_type VARCHAR(20) NULL;
            PRINT 'Added user_type column to Users table';
        END
        
        -- Add any other missing columns if needed
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'updated_at')
        BEGIN
            ALTER TABLE Users ADD updated_at DATETIME NULL;
            PRINT 'Added updated_at column to Users table';
        END
        
        PRINT 'Users table already exists, checked for required columns';
    END

    -- Create Projects table with better error handling for foreign key
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Projects')
    BEGIN
        -- Validate Users table exists before creating Projects with foreign key
        IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
        BEGIN
            CREATE TABLE Projects (
                id VARCHAR(50) PRIMARY KEY,
                uid VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description NVARCHAR(MAX) NOT NULL,
                project_type VARCHAR(50) NULL,
                completed_at DATETIME NOT NULL,
                sync_status VARCHAR(20) NOT NULL DEFAULT 'synced',
                created_at DATETIME NOT NULL DEFAULT GETDATE(),
                updated_at DATETIME NOT NULL DEFAULT GETDATE(),
                FOREIGN KEY (uid) REFERENCES Users(uid)
            );
            PRINT 'Projects table created with foreign key constraint';
        END
        ELSE
        BEGIN
            -- Create without foreign key if Users table doesn't exist
            CREATE TABLE Projects (
                id VARCHAR(50) PRIMARY KEY,
                uid VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description NVARCHAR(MAX) NOT NULL,
                project_type VARCHAR(50) NULL,
                completed_at DATETIME NOT NULL,
                sync_status VARCHAR(20) NOT NULL DEFAULT 'synced',
                created_at DATETIME NOT NULL DEFAULT GETDATE(),
                updated_at DATETIME NOT NULL DEFAULT GETDATE()
            );
            PRINT 'Projects table created without foreign key constraint (Users table not found)';
        END
    END
    ELSE
    BEGIN
        -- Ensure the Projects table has the required columns
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Projects') AND name = 'created_at')
        BEGIN
            ALTER TABLE Projects ADD created_at DATETIME NOT NULL DEFAULT GETDATE();
            PRINT 'Added created_at column to Projects table';
        END
        
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Projects') AND name = 'updated_at')
        BEGIN
            ALTER TABLE Projects ADD updated_at DATETIME NOT NULL DEFAULT GETDATE();
            PRINT 'Added updated_at column to Projects table';
        END
        
        PRINT 'Projects table already exists, checked for required columns';
    END

    -- Create ProjectItems table
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectItems')
    BEGIN
        CREATE TABLE ProjectItems (
            id INT IDENTITY(1,1) PRIMARY KEY,
            project_id VARCHAR(50) NOT NULL,
            item_name NVARCHAR(255) NOT NULL,
            item_order INT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE
        );
        PRINT 'ProjectItems table created';
    END
    ELSE
    BEGIN
        PRINT 'ProjectItems table already exists';
    END

    -- Create ProjectSteps table
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectSteps')
    BEGIN
        CREATE TABLE ProjectSteps (
            id INT IDENTITY(1,1) PRIMARY KEY,
            project_id VARCHAR(50) NOT NULL,
            step_content NVARCHAR(MAX) NOT NULL,
            step_order INT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE
        );
        PRINT 'ProjectSteps table created';
    END
    ELSE
    BEGIN
        PRINT 'ProjectSteps table already exists';
    END

    -- Create indexes only if they don't exist
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_projects_uid')
        CREATE INDEX idx_projects_uid ON Projects(uid);

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_projectitems_projectid')
        CREATE INDEX idx_projectitems_projectid ON ProjectItems(project_id);

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_projectsteps_projectid')
        CREATE INDEX idx_projectsteps_projectid ON ProjectSteps(project_id);

    PRINT 'Indexes created or already exist';

    COMMIT TRANSACTION;
    PRINT 'Database schema updated successfully';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    
    PRINT 'Error occurred during schema setup:';
    PRINT ERROR_MESSAGE();
    PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS VARCHAR);
    PRINT 'Error Line: ' + CAST(ERROR_LINE() AS VARCHAR);
    
    -- Rethrow the error
    THROW;
END CATCH

-- Create stored procedures
GO
PRINT 'Creating stored procedures...';

-- GetProjectWithDetails procedure
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'GetProjectWithDetails')
    DROP PROCEDURE GetProjectWithDetails;
GO

CREATE PROCEDURE GetProjectWithDetails
    @ProjectId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Get project info
        SELECT 
            p.id,
            p.uid,
            p.title,
            p.description,
            p.project_type AS projectType,
            p.completed_at AS completedAt,
            p.sync_status AS syncStatus,
            p.created_at AS createdAt,
            p.updated_at AS updatedAt
        FROM 
            Projects p
        WHERE 
            p.id = @ProjectId;
        
        -- Get required items
        SELECT 
            item_name AS itemName,
            item_order AS itemOrder
        FROM 
            ProjectItems
        WHERE 
            project_id = @ProjectId
        ORDER BY 
            item_order;
        
        -- Get steps
        SELECT 
            step_content AS stepContent,
            step_order AS stepOrder
        FROM 
            ProjectSteps
        WHERE 
            project_id = @ProjectId
        ORDER BY 
            step_order;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO
PRINT 'GetProjectWithDetails procedure created';

-- GetUserProjects procedure
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'GetUserProjects')
    DROP PROCEDURE GetUserProjects;
GO

CREATE PROCEDURE GetUserProjects
    @UserId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Get all projects for the user
        SELECT 
            p.id,
            p.uid,
            p.title,
            p.description,
            p.project_type AS projectType,
            p.completed_at AS completedAt,
            p.sync_status AS syncStatus,
            p.created_at AS createdAt,
            p.updated_at AS updatedAt
        FROM 
            Projects p
        WHERE 
            p.uid = @UserId
        ORDER BY 
            p.completed_at DESC;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO
PRINT 'GetUserProjects procedure created';

-- SaveProject procedure
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'SaveProject')
    DROP PROCEDURE SaveProject;
GO

CREATE PROCEDURE SaveProject
    @ProjectId VARCHAR(50),
    @UserId VARCHAR(50),
    @Title VARCHAR(255),
    @Description NVARCHAR(MAX),
    @ProjectType VARCHAR(50) = NULL,
    @CompletedAt DATETIME = NULL,
    @SyncStatus VARCHAR(20) = 'synced'
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Set default CompletedAt if not provided
        IF @CompletedAt IS NULL
            SET @CompletedAt = GETDATE();
        
        -- Check if project exists and update or insert accordingly
        IF EXISTS (SELECT 1 FROM Projects WHERE id = @ProjectId)
        BEGIN
            -- Update existing project
            UPDATE Projects 
            SET 
                title = @Title,
                description = @Description,
                project_type = @ProjectType,
                completed_at = @CompletedAt,
                sync_status = @SyncStatus,
                updated_at = GETDATE()
            WHERE 
                id = @ProjectId;
                
            PRINT 'Project updated';
        END
        ELSE
        BEGIN
            -- Insert new project
            INSERT INTO Projects (
                id, 
                uid, 
                title, 
                description, 
                project_type, 
                completed_at, 
                sync_status,
                created_at,
                updated_at
            )
            VALUES (
                @ProjectId, 
                @UserId, 
                @Title, 
                @Description, 
                @ProjectType, 
                @CompletedAt, 
                @SyncStatus,
                GETDATE(),
                GETDATE()
            );
            
            PRINT 'Project inserted';
        END
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        PRINT 'Error in SaveProject: ' + ERROR_MESSAGE();
        THROW;
    END CATCH
END
GO
PRINT 'SaveProject procedure created';

-- AddProjectItem procedure
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'AddProjectItem')
    DROP PROCEDURE AddProjectItem;
GO

CREATE PROCEDURE AddProjectItem
    @ProjectId VARCHAR(50),
    @ItemName NVARCHAR(255),
    @ItemOrder INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        INSERT INTO ProjectItems (
            project_id,
            item_name,
            item_order
        )
        VALUES (
            @ProjectId,
            @ItemName,
            @ItemOrder
        );
    END TRY
    BEGIN CATCH
        PRINT 'Error in AddProjectItem: ' + ERROR_MESSAGE();
        THROW;
    END CATCH
END
GO
PRINT 'AddProjectItem procedure created';

-- AddProjectStep procedure
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'AddProjectStep')
    DROP PROCEDURE AddProjectStep;
GO

CREATE PROCEDURE AddProjectStep
    @ProjectId VARCHAR(50),
    @StepContent NVARCHAR(MAX),
    @StepOrder INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        INSERT INTO ProjectSteps (
            project_id,
            step_content,
            step_order
        )
        VALUES (
            @ProjectId,
            @StepContent,
            @StepOrder
        );
    END TRY
    BEGIN CATCH
        PRINT 'Error in AddProjectStep: ' + ERROR_MESSAGE();
        THROW;
    END CATCH
END
GO
PRINT 'AddProjectStep procedure created';

PRINT 'Schema setup completed successfully'; 