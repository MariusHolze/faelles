IF OBJECT_ID('dbo.InvesteringscaseKoebspost', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.InvesteringscaseKoebspost (
        koebspostID INT IDENTITY(1,1) NOT NULL,
        caseID INT NOT NULL,
        navn VARCHAR(100) NOT NULL,
        beloeb DECIMAL(18,2) NOT NULL,

        CONSTRAINT PK_InvesteringscaseKoebspost PRIMARY KEY (koebspostID),
        CONSTRAINT FK_InvesteringscaseKoebspost_Investeringscase
            FOREIGN KEY (caseID) REFERENCES dbo.Investeringscase(caseID) ON DELETE CASCADE,
        CONSTRAINT CK_InvesteringscaseKoebspost_Beloeb CHECK (beloeb >= 0)
    );
END;

IF OBJECT_ID('dbo.InvesteringscaseFinansiering', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.InvesteringscaseFinansiering (
        finansieringID INT IDENTITY(1,1) NOT NULL,
        caseID INT NOT NULL,
        laanetype VARCHAR(50) NULL,
        laanebeloeb DECIMAL(18,2) NULL,
        egenbetaling DECIMAL(18,2) NULL,
        rente DECIMAL(9,4) NULL,
        loebetid INT NULL,
        afdragsfrihed INT NULL,

        CONSTRAINT PK_InvesteringscaseFinansiering PRIMARY KEY (finansieringID),
        CONSTRAINT UQ_InvesteringscaseFinansiering_CaseID UNIQUE (caseID),
        CONSTRAINT FK_InvesteringscaseFinansiering_Investeringscase
            FOREIGN KEY (caseID) REFERENCES dbo.Investeringscase(caseID) ON DELETE CASCADE,
        CONSTRAINT CK_InvesteringscaseFinansiering_Laanebeloeb CHECK (laanebeloeb IS NULL OR laanebeloeb >= 0),
        CONSTRAINT CK_InvesteringscaseFinansiering_Egenbetaling CHECK (egenbetaling IS NULL OR egenbetaling >= 0),
        CONSTRAINT CK_InvesteringscaseFinansiering_Rente CHECK (rente IS NULL OR rente >= 0),
        CONSTRAINT CK_InvesteringscaseFinansiering_Loebetid CHECK (loebetid IS NULL OR loebetid > 0),
        CONSTRAINT CK_InvesteringscaseFinansiering_Afdragsfrihed CHECK (afdragsfrihed IS NULL OR afdragsfrihed >= 0)
    );
END;

IF OBJECT_ID('dbo.InvesteringscaseRenovering', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.InvesteringscaseRenovering (
        renoveringID INT IDENTITY(1,1) NOT NULL,
        caseID INT NOT NULL,
        aktiv BIT NOT NULL DEFAULT 0,

        CONSTRAINT PK_InvesteringscaseRenovering PRIMARY KEY (renoveringID),
        CONSTRAINT UQ_InvesteringscaseRenovering_CaseID UNIQUE (caseID),
        CONSTRAINT FK_InvesteringscaseRenovering_Investeringscase
            FOREIGN KEY (caseID) REFERENCES dbo.Investeringscase(caseID) ON DELETE CASCADE
    );
END;

IF OBJECT_ID('dbo.InvesteringscaseRenoveringspost', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.InvesteringscaseRenoveringspost (
        renoveringspostID INT IDENTITY(1,1) NOT NULL,
        caseID INT NOT NULL,
        navn VARCHAR(100) NOT NULL,
        beloeb DECIMAL(18,2) NOT NULL,
        tidspunktKey VARCHAR(50) NULL,
        tidspunktLabel VARCHAR(100) NULL,
        tidspunktMaaned INT NULL,

        CONSTRAINT PK_InvesteringscaseRenoveringspost PRIMARY KEY (renoveringspostID),
        CONSTRAINT FK_InvesteringscaseRenoveringspost_Investeringscase
            FOREIGN KEY (caseID) REFERENCES dbo.Investeringscase(caseID) ON DELETE CASCADE,
        CONSTRAINT CK_InvesteringscaseRenoveringspost_Beloeb CHECK (beloeb >= 0),
        CONSTRAINT CK_InvesteringscaseRenoveringspost_TidspunktMaaned CHECK (tidspunktMaaned IS NULL OR tidspunktMaaned >= 0)
    );
END;

IF OBJECT_ID('dbo.InvesteringscaseDriftspost', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.InvesteringscaseDriftspost (
        driftspostID INT IDENTITY(1,1) NOT NULL,
        caseID INT NOT NULL,
        navn VARCHAR(100) NOT NULL,
        beloeb DECIMAL(18,2) NOT NULL,
        periode VARCHAR(20) NOT NULL,

        CONSTRAINT PK_InvesteringscaseDriftspost PRIMARY KEY (driftspostID),
        CONSTRAINT FK_InvesteringscaseDriftspost_Investeringscase
            FOREIGN KEY (caseID) REFERENCES dbo.Investeringscase(caseID) ON DELETE CASCADE,
        CONSTRAINT CK_InvesteringscaseDriftspost_Beloeb CHECK (beloeb > 0),
        CONSTRAINT CK_InvesteringscaseDriftspost_Periode CHECK (periode IN ('maanedligt', 'aarligt'))
    );
END;

IF OBJECT_ID('dbo.InvesteringscaseUdlejning', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.InvesteringscaseUdlejning (
        udlejningID INT IDENTITY(1,1) NOT NULL,
        caseID INT NOT NULL,
        aktiv BIT NOT NULL DEFAULT 0,
        maanedligLeje DECIMAL(18,2) NOT NULL DEFAULT 0,
        depositum DECIMAL(18,2) NOT NULL DEFAULT 0,
        tomgangDage INT NOT NULL DEFAULT 0,
        maanedligeUdlejningsudgifter DECIMAL(18,2) NOT NULL DEFAULT 0,
        aarligeUdlejningsudgifter DECIMAL(18,2) NOT NULL DEFAULT 0,
        udlejningsNoter VARCHAR(500) NULL,

        CONSTRAINT PK_InvesteringscaseUdlejning PRIMARY KEY (udlejningID),
        CONSTRAINT UQ_InvesteringscaseUdlejning_CaseID UNIQUE (caseID),
        CONSTRAINT FK_InvesteringscaseUdlejning_Investeringscase
            FOREIGN KEY (caseID) REFERENCES dbo.Investeringscase(caseID) ON DELETE CASCADE,
        CONSTRAINT CK_InvesteringscaseUdlejning_MaanedligLeje CHECK (maanedligLeje >= 0),
        CONSTRAINT CK_InvesteringscaseUdlejning_Depositum CHECK (depositum >= 0),
        CONSTRAINT CK_InvesteringscaseUdlejning_TomgangDage CHECK (tomgangDage BETWEEN 0 AND 365),
        CONSTRAINT CK_InvesteringscaseUdlejning_MaanedligeUdgifter CHECK (maanedligeUdlejningsudgifter >= 0),
        CONSTRAINT CK_InvesteringscaseUdlejning_AarligeUdgifter CHECK (aarligeUdlejningsudgifter >= 0)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InvesteringscaseKoebspost_CaseID')
    CREATE INDEX IX_InvesteringscaseKoebspost_CaseID ON dbo.InvesteringscaseKoebspost(caseID);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InvesteringscaseRenoveringspost_CaseID')
    CREATE INDEX IX_InvesteringscaseRenoveringspost_CaseID ON dbo.InvesteringscaseRenoveringspost(caseID);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InvesteringscaseDriftspost_CaseID')
    CREATE INDEX IX_InvesteringscaseDriftspost_CaseID ON dbo.InvesteringscaseDriftspost(caseID);

IF COL_LENGTH('dbo.Investeringscase', 'dataJson') IS NOT NULL
BEGIN
    INSERT INTO dbo.InvesteringscaseKoebspost (caseID, navn, beloeb)
    SELECT c.caseID,
           LEFT(JSON_VALUE(post.value, '$.navn'), 100),
           TRY_CONVERT(DECIMAL(18,2), JSON_VALUE(post.value, '$.beloeb'))
    FROM dbo.Investeringscase c
    CROSS APPLY OPENJSON(c.dataJson, '$.koebsudgifter.poster') post
    WHERE ISJSON(c.dataJson) = 1
      AND NOT EXISTS (SELECT 1 FROM dbo.InvesteringscaseKoebspost kp WHERE kp.caseID = c.caseID)
      AND JSON_VALUE(post.value, '$.navn') IS NOT NULL
      AND TRY_CONVERT(DECIMAL(18,2), JSON_VALUE(post.value, '$.beloeb')) IS NOT NULL;

    INSERT INTO dbo.InvesteringscaseFinansiering
    (caseID, laanetype, laanebeloeb, egenbetaling, rente, loebetid, afdragsfrihed)
    SELECT c.caseID,
           LEFT(JSON_VALUE(c.dataJson, '$.finansiering.laanetype'), 50),
           TRY_CONVERT(DECIMAL(18,2), JSON_VALUE(c.dataJson, '$.finansiering.laanebeloeb')),
           TRY_CONVERT(DECIMAL(18,2), JSON_VALUE(c.dataJson, '$.finansiering.egenbetaling')),
           TRY_CONVERT(DECIMAL(9,4), JSON_VALUE(c.dataJson, '$.finansiering.rente')),
           TRY_CONVERT(INT, JSON_VALUE(c.dataJson, '$.finansiering.loebetid')),
           TRY_CONVERT(INT, JSON_VALUE(c.dataJson, '$.finansiering.afdragsfrihed'))
    FROM dbo.Investeringscase c
    WHERE ISJSON(c.dataJson) = 1
      AND NOT EXISTS (SELECT 1 FROM dbo.InvesteringscaseFinansiering f WHERE f.caseID = c.caseID)
      AND JSON_QUERY(c.dataJson, '$.finansiering') IS NOT NULL;

    INSERT INTO dbo.InvesteringscaseRenovering (caseID, aktiv)
    SELECT c.caseID,
           COALESCE(TRY_CONVERT(BIT, JSON_VALUE(c.dataJson, '$.renovering.aktiv')), 0)
    FROM dbo.Investeringscase c
    WHERE ISJSON(c.dataJson) = 1
      AND NOT EXISTS (SELECT 1 FROM dbo.InvesteringscaseRenovering r WHERE r.caseID = c.caseID)
      AND JSON_QUERY(c.dataJson, '$.renovering') IS NOT NULL;

    INSERT INTO dbo.InvesteringscaseRenoveringspost
    (caseID, navn, beloeb, tidspunktKey, tidspunktLabel, tidspunktMaaned)
    SELECT c.caseID,
           LEFT(JSON_VALUE(post.value, '$.navn'), 100),
           TRY_CONVERT(DECIMAL(18,2), JSON_VALUE(post.value, '$.beloeb')),
           LEFT(JSON_VALUE(post.value, '$.tidspunktKey'), 50),
           LEFT(JSON_VALUE(post.value, '$.tidspunktLabel'), 100),
           TRY_CONVERT(INT, JSON_VALUE(post.value, '$.tidspunktMaaned'))
    FROM dbo.Investeringscase c
    CROSS APPLY OPENJSON(c.dataJson, '$.renovering.poster') post
    WHERE ISJSON(c.dataJson) = 1
      AND NOT EXISTS (SELECT 1 FROM dbo.InvesteringscaseRenoveringspost rp WHERE rp.caseID = c.caseID)
      AND JSON_VALUE(post.value, '$.navn') IS NOT NULL
      AND TRY_CONVERT(DECIMAL(18,2), JSON_VALUE(post.value, '$.beloeb')) IS NOT NULL;

    INSERT INTO dbo.InvesteringscaseDriftspost (caseID, navn, beloeb, periode)
    SELECT c.caseID,
           LEFT(JSON_VALUE(post.value, '$.navn'), 100),
           TRY_CONVERT(DECIMAL(18,2), JSON_VALUE(post.value, '$.beloeb')),
           CASE WHEN JSON_VALUE(post.value, '$.periode') = 'maanedligt' THEN 'maanedligt' ELSE 'aarligt' END
    FROM dbo.Investeringscase c
    CROSS APPLY OPENJSON(c.dataJson, '$.driftsbudget.poster') post
    WHERE ISJSON(c.dataJson) = 1
      AND NOT EXISTS (SELECT 1 FROM dbo.InvesteringscaseDriftspost dp WHERE dp.caseID = c.caseID)
      AND JSON_VALUE(post.value, '$.navn') IS NOT NULL
      AND TRY_CONVERT(DECIMAL(18,2), JSON_VALUE(post.value, '$.beloeb')) IS NOT NULL;

    INSERT INTO dbo.InvesteringscaseUdlejning
    (caseID, aktiv, maanedligLeje, depositum, tomgangDage,
     maanedligeUdlejningsudgifter, aarligeUdlejningsudgifter, udlejningsNoter)
    SELECT c.caseID,
           COALESCE(TRY_CONVERT(BIT, JSON_VALUE(c.dataJson, '$.udlejning.aktiv')), 0),
           COALESCE(TRY_CONVERT(DECIMAL(18,2), JSON_VALUE(c.dataJson, '$.udlejning.maanedligLeje')), 0),
           COALESCE(TRY_CONVERT(DECIMAL(18,2), JSON_VALUE(c.dataJson, '$.udlejning.depositum')), 0),
           COALESCE(TRY_CONVERT(INT, JSON_VALUE(c.dataJson, '$.udlejning.tomgangDage')), 0),
           COALESCE(TRY_CONVERT(DECIMAL(18,2), JSON_VALUE(c.dataJson, '$.udlejning.maanedligeUdlejningsudgifter')), 0),
           COALESCE(TRY_CONVERT(DECIMAL(18,2), JSON_VALUE(c.dataJson, '$.udlejning.aarligeUdlejningsudgifter')), 0),
           LEFT(JSON_VALUE(c.dataJson, '$.udlejning.udlejningsNoter'), 500)
    FROM dbo.Investeringscase c
    WHERE ISJSON(c.dataJson) = 1
      AND NOT EXISTS (SELECT 1 FROM dbo.InvesteringscaseUdlejning u WHERE u.caseID = c.caseID)
      AND JSON_QUERY(c.dataJson, '$.udlejning') IS NOT NULL;
END;

IF COL_LENGTH('dbo.Investeringscase', 'dataJson') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Investeringscase DROP COLUMN dataJson;
END;
