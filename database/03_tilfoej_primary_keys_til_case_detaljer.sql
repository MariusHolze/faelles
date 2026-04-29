IF COL_LENGTH('dbo.InvesteringscaseFinansiering', 'finansieringID') IS NULL
BEGIN
    ALTER TABLE dbo.InvesteringscaseFinansiering
    ADD finansieringID INT IDENTITY(1,1) NOT NULL;
END;

IF COL_LENGTH('dbo.InvesteringscaseRenovering', 'renoveringID') IS NULL
BEGIN
    ALTER TABLE dbo.InvesteringscaseRenovering
    ADD renoveringID INT IDENTITY(1,1) NOT NULL;
END;

IF COL_LENGTH('dbo.InvesteringscaseUdlejning', 'udlejningID') IS NULL
BEGIN
    ALTER TABLE dbo.InvesteringscaseUdlejning
    ADD udlejningID INT IDENTITY(1,1) NOT NULL;
END;

IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = 'PK_InvesteringscaseFinansiering'
      AND parent_object_id = OBJECT_ID('dbo.InvesteringscaseFinansiering')
)
BEGIN
    ALTER TABLE dbo.InvesteringscaseFinansiering
    DROP CONSTRAINT PK_InvesteringscaseFinansiering;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = 'PK_InvesteringscaseFinansiering'
      AND parent_object_id = OBJECT_ID('dbo.InvesteringscaseFinansiering')
)
BEGIN
    ALTER TABLE dbo.InvesteringscaseFinansiering
    ADD CONSTRAINT PK_InvesteringscaseFinansiering PRIMARY KEY (finansieringID);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = 'UQ_InvesteringscaseFinansiering_CaseID'
      AND parent_object_id = OBJECT_ID('dbo.InvesteringscaseFinansiering')
)
BEGIN
    ALTER TABLE dbo.InvesteringscaseFinansiering
    ADD CONSTRAINT UQ_InvesteringscaseFinansiering_CaseID UNIQUE (caseID);
END;

IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = 'PK_InvesteringscaseRenovering'
      AND parent_object_id = OBJECT_ID('dbo.InvesteringscaseRenovering')
)
BEGIN
    ALTER TABLE dbo.InvesteringscaseRenovering
    DROP CONSTRAINT PK_InvesteringscaseRenovering;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = 'PK_InvesteringscaseRenovering'
      AND parent_object_id = OBJECT_ID('dbo.InvesteringscaseRenovering')
)
BEGIN
    ALTER TABLE dbo.InvesteringscaseRenovering
    ADD CONSTRAINT PK_InvesteringscaseRenovering PRIMARY KEY (renoveringID);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = 'UQ_InvesteringscaseRenovering_CaseID'
      AND parent_object_id = OBJECT_ID('dbo.InvesteringscaseRenovering')
)
BEGIN
    ALTER TABLE dbo.InvesteringscaseRenovering
    ADD CONSTRAINT UQ_InvesteringscaseRenovering_CaseID UNIQUE (caseID);
END;

IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = 'PK_InvesteringscaseUdlejning'
      AND parent_object_id = OBJECT_ID('dbo.InvesteringscaseUdlejning')
)
BEGIN
    ALTER TABLE dbo.InvesteringscaseUdlejning
    DROP CONSTRAINT PK_InvesteringscaseUdlejning;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = 'PK_InvesteringscaseUdlejning'
      AND parent_object_id = OBJECT_ID('dbo.InvesteringscaseUdlejning')
)
BEGIN
    ALTER TABLE dbo.InvesteringscaseUdlejning
    ADD CONSTRAINT PK_InvesteringscaseUdlejning PRIMARY KEY (udlejningID);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = 'UQ_InvesteringscaseUdlejning_CaseID'
      AND parent_object_id = OBJECT_ID('dbo.InvesteringscaseUdlejning')
)
BEGIN
    ALTER TABLE dbo.InvesteringscaseUdlejning
    ADD CONSTRAINT UQ_InvesteringscaseUdlejning_CaseID UNIQUE (caseID);
END;
