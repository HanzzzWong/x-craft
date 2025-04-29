-- Drop all related objects first to avoid dependency conflicts
-- Drop procedures
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'AddProjectStep')
    DROP PROCEDURE AddProjectStep;

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'AddProjectItem')
    DROP PROCEDURE AddProjectItem;

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'SaveProject')
    DROP PROCEDURE SaveProject;

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'GetUserProjects')
    DROP PROCEDURE GetUserProjects;

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'GetProjectWithDetails')
    DROP PROCEDURE GetProjectWithDetails;

-- Drop tables in correct order (child tables first)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectSteps')
    DROP TABLE ProjectSteps;

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectItems')
    DROP TABLE ProjectItems;

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Projects')
    DROP TABLE Projects;

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
    DROP TABLE Users;

-- Now recreate the tables in correct order (parent tables first)
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

-- Create Projects table
CREATE TABLE Projects (
    id VARCHAR(50) PRIMARY KEY,
    uid VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    project_type VARCHAR(50) NULL,
    completed_at DATETIME NOT NULL,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'synced',
    FOREIGN KEY (uid) REFERENCES Users(uid)
);
PRINT 'Projects table created';

-- Create ProjectItems table
CREATE TABLE ProjectItems (
    id INT IDENTITY(1,1) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    item_name NVARCHAR(255) NOT NULL,
    item_order INT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE
);
PRINT 'ProjectItems table created';

-- Create ProjectSteps table
CREATE TABLE ProjectSteps (
    id INT IDENTITY(1,1) PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    step_content NVARCHAR(MAX) NOT NULL,
    step_order INT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE
);
PRINT 'ProjectSteps table created';

-- Create indexes
CREATE INDEX idx_projects_uid ON Projects(uid);
CREATE INDEX idx_projectitems_projectid ON ProjectItems(project_id);
CREATE INDEX idx_projectsteps_projectid ON ProjectSteps(project_id);
PRINT 'Indexes created';

-- Create stored procedures
GO
CREATE PROCEDURE GetProjectWithDetails
    @ProjectId VARCHAR(50)
AS
BEGIN
    -- Get project info
    SELECT 
        p.id,
        p.uid,
        p.title,
        p.description,
        p.project_type AS projectType,
        p.completed_at AS completedAt,
        p.sync_status AS syncStatus
    FROM 
        Projects p
    WHERE 
        p.id = @ProjectId;
    
    -- Get required items
    SELECT 
        item_name AS itemName
    FROM 
        ProjectItems
    WHERE 
        project_id = @ProjectId
    ORDER BY 
        item_order;
    
    -- Get steps
    SELECT 
        step_content AS stepContent
    FROM 
        ProjectSteps
    WHERE 
        project_id = @ProjectId
    ORDER BY 
        step_order;
END
GO
PRINT 'GetProjectWithDetails procedure created';

GO
CREATE PROCEDURE GetUserProjects
    @UserId VARCHAR(50)
AS
BEGIN
    -- Get all projects for the user
    SELECT 
        p.id,
        p.uid,
        p.title,
        p.description,
        p.project_type AS projectType,
        p.completed_at AS completedAt,
        p.sync_status AS syncStatus
    FROM 
        Projects p
    WHERE 
        p.uid = @UserId
    ORDER BY 
        p.completed_at DESC;
END
GO
PRINT 'GetUserProjects procedure created';

GO
CREATE PROCEDURE SaveProject
    @ProjectId VARCHAR(50),
    @UserId VARCHAR(50),
    @Title VARCHAR(255),
    @Description NVARCHAR(MAX),
    @ProjectType VARCHAR(50),
    @SyncStatus VARCHAR(20)
AS
BEGIN
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- Insert project
        INSERT INTO Projects (
            id, 
            uid, 
            title, 
            description, 
            project_type, 
            completed_at, 
            sync_status
        )
        VALUES (
            @ProjectId, 
            @UserId, 
            @Title, 
            @Description, 
            @ProjectType, 
            GETDATE(), 
            @SyncStatus
        );
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END
GO
PRINT 'SaveProject procedure created';

GO
CREATE PROCEDURE AddProjectItem
    @ProjectId VARCHAR(50),
    @ItemName NVARCHAR(255),
    @ItemOrder INT
AS
BEGIN
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
END
GO
PRINT 'AddProjectItem procedure created';

GO
CREATE PROCEDURE AddProjectStep
    @ProjectId VARCHAR(50),
    @StepContent NVARCHAR(MAX),
    @StepOrder INT
AS
BEGIN
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
END
GO
PRINT 'AddProjectStep procedure created'; 