IF COL_LENGTH('dbo.InvesteringscaseKoebspost', 'sortering') IS NOT NULL
BEGIN
    DECLARE @koebspostDefault NVARCHAR(128);

    SELECT @koebspostDefault = dc.name
    FROM sys.default_constraints dc
    JOIN sys.columns c
      ON c.default_object_id = dc.object_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.InvesteringscaseKoebspost')
      AND c.name = 'sortering';

    IF @koebspostDefault IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE dbo.InvesteringscaseKoebspost DROP CONSTRAINT ' + @koebspostDefault);
    END;

    ALTER TABLE dbo.InvesteringscaseKoebspost DROP COLUMN sortering;
END;

IF COL_LENGTH('dbo.InvesteringscaseRenoveringspost', 'sortering') IS NOT NULL
BEGIN
    DECLARE @renoveringspostDefault NVARCHAR(128);

    SELECT @renoveringspostDefault = dc.name
    FROM sys.default_constraints dc
    JOIN sys.columns c
      ON c.default_object_id = dc.object_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.InvesteringscaseRenoveringspost')
      AND c.name = 'sortering';

    IF @renoveringspostDefault IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE dbo.InvesteringscaseRenoveringspost DROP CONSTRAINT ' + @renoveringspostDefault);
    END;

    ALTER TABLE dbo.InvesteringscaseRenoveringspost DROP COLUMN sortering;
END;

IF COL_LENGTH('dbo.InvesteringscaseDriftspost', 'sortering') IS NOT NULL
BEGIN
    DECLARE @driftspostDefault NVARCHAR(128);

    SELECT @driftspostDefault = dc.name
    FROM sys.default_constraints dc
    JOIN sys.columns c
      ON c.default_object_id = dc.object_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.InvesteringscaseDriftspost')
      AND c.name = 'sortering';

    IF @driftspostDefault IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE dbo.InvesteringscaseDriftspost DROP CONSTRAINT ' + @driftspostDefault);
    END;

    ALTER TABLE dbo.InvesteringscaseDriftspost DROP COLUMN sortering;
END;
