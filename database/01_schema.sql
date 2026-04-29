CREATE TABLE Ejendomsprofil (
    ejendomID INT IDENTITY(1,1) NOT NULL,
    adresse VARCHAR(255) NOT NULL,
    adresseID VARCHAR(50) NULL,
    vejnavn VARCHAR(100) NULL,
    husnr VARCHAR(20) NULL,
    postnr VARCHAR(10) NULL,
    bynavn VARCHAR(100) NULL,
    adgangsadresseID VARCHAR(50) NULL,
    boligtype VARCHAR(100) NULL,
    byggeaar INT NULL,
    boligareal INT NULL,
    grundareal INT NULL,
    antalVaerelser INT NULL,
    oprettetTidspunkt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    sidstOpdateret DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    erArkiveret BIT NOT NULL DEFAULT 0,

    CONSTRAINT PK_Ejendomsprofil PRIMARY KEY (ejendomID),
    CONSTRAINT UQ_Ejendomsprofil_Adresse UNIQUE (adresse)
);

CREATE TABLE Investeringscase (
    caseID INT IDENTITY(1,1) NOT NULL,
    ejendomID INT NOT NULL,
    navn VARCHAR(100) NOT NULL,
    beskrivelse VARCHAR(500) NULL,
    oprettetTidspunkt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT PK_Investeringscase PRIMARY KEY (caseID),
    CONSTRAINT FK_Investeringscase_Ejendomsprofil
        FOREIGN KEY (ejendomID) REFERENCES Ejendomsprofil(ejendomID)
);

CREATE TABLE InvesteringscaseKoebspost (
    koebspostID INT IDENTITY(1,1) NOT NULL,
    caseID INT NOT NULL,
    navn VARCHAR(100) NOT NULL,
    beloeb DECIMAL(18,2) NOT NULL,

    CONSTRAINT PK_InvesteringscaseKoebspost PRIMARY KEY (koebspostID),
    CONSTRAINT FK_InvesteringscaseKoebspost_Investeringscase
        FOREIGN KEY (caseID) REFERENCES Investeringscase(caseID) ON DELETE CASCADE,
    CONSTRAINT CK_InvesteringscaseKoebspost_Beloeb CHECK (beloeb >= 0)
);

CREATE TABLE InvesteringscaseFinansiering (
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
        FOREIGN KEY (caseID) REFERENCES Investeringscase(caseID) ON DELETE CASCADE,
    CONSTRAINT CK_InvesteringscaseFinansiering_Laanebeloeb CHECK (laanebeloeb IS NULL OR laanebeloeb >= 0),
    CONSTRAINT CK_InvesteringscaseFinansiering_Egenbetaling CHECK (egenbetaling IS NULL OR egenbetaling >= 0),
    CONSTRAINT CK_InvesteringscaseFinansiering_Rente CHECK (rente IS NULL OR rente >= 0),
    CONSTRAINT CK_InvesteringscaseFinansiering_Loebetid CHECK (loebetid IS NULL OR loebetid > 0),
    CONSTRAINT CK_InvesteringscaseFinansiering_Afdragsfrihed CHECK (afdragsfrihed IS NULL OR afdragsfrihed >= 0)
);

CREATE TABLE InvesteringscaseRenovering (
    renoveringID INT IDENTITY(1,1) NOT NULL,
    caseID INT NOT NULL,
    aktiv BIT NOT NULL DEFAULT 0,

    CONSTRAINT PK_InvesteringscaseRenovering PRIMARY KEY (renoveringID),
    CONSTRAINT UQ_InvesteringscaseRenovering_CaseID UNIQUE (caseID),
    CONSTRAINT FK_InvesteringscaseRenovering_Investeringscase
        FOREIGN KEY (caseID) REFERENCES Investeringscase(caseID) ON DELETE CASCADE
);

CREATE TABLE InvesteringscaseRenoveringspost (
    renoveringspostID INT IDENTITY(1,1) NOT NULL,
    caseID INT NOT NULL,
    navn VARCHAR(100) NOT NULL,
    beloeb DECIMAL(18,2) NOT NULL,
    tidspunktKey VARCHAR(50) NULL,
    tidspunktLabel VARCHAR(100) NULL,
    tidspunktMaaned INT NULL,

    CONSTRAINT PK_InvesteringscaseRenoveringspost PRIMARY KEY (renoveringspostID),
    CONSTRAINT FK_InvesteringscaseRenoveringspost_Investeringscase
        FOREIGN KEY (caseID) REFERENCES Investeringscase(caseID) ON DELETE CASCADE,
    CONSTRAINT CK_InvesteringscaseRenoveringspost_Beloeb CHECK (beloeb >= 0),
    CONSTRAINT CK_InvesteringscaseRenoveringspost_TidspunktMaaned CHECK (tidspunktMaaned IS NULL OR tidspunktMaaned >= 0)
);

CREATE TABLE InvesteringscaseDriftspost (
    driftspostID INT IDENTITY(1,1) NOT NULL,
    caseID INT NOT NULL,
    navn VARCHAR(100) NOT NULL,
    beloeb DECIMAL(18,2) NOT NULL,
    periode VARCHAR(20) NOT NULL,

    CONSTRAINT PK_InvesteringscaseDriftspost PRIMARY KEY (driftspostID),
    CONSTRAINT FK_InvesteringscaseDriftspost_Investeringscase
        FOREIGN KEY (caseID) REFERENCES Investeringscase(caseID) ON DELETE CASCADE,
    CONSTRAINT CK_InvesteringscaseDriftspost_Beloeb CHECK (beloeb > 0),
    CONSTRAINT CK_InvesteringscaseDriftspost_Periode CHECK (periode IN ('maanedligt', 'aarligt'))
);

CREATE TABLE InvesteringscaseUdlejning (
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
        FOREIGN KEY (caseID) REFERENCES Investeringscase(caseID) ON DELETE CASCADE,
    CONSTRAINT CK_InvesteringscaseUdlejning_MaanedligLeje CHECK (maanedligLeje >= 0),
    CONSTRAINT CK_InvesteringscaseUdlejning_Depositum CHECK (depositum >= 0),
    CONSTRAINT CK_InvesteringscaseUdlejning_TomgangDage CHECK (tomgangDage BETWEEN 0 AND 365),
    CONSTRAINT CK_InvesteringscaseUdlejning_MaanedligeUdgifter CHECK (maanedligeUdlejningsudgifter >= 0),
    CONSTRAINT CK_InvesteringscaseUdlejning_AarligeUdgifter CHECK (aarligeUdlejningsudgifter >= 0)
);

CREATE INDEX IX_InvesteringscaseKoebspost_CaseID ON InvesteringscaseKoebspost(caseID);
CREATE INDEX IX_InvesteringscaseRenoveringspost_CaseID ON InvesteringscaseRenoveringspost(caseID);
CREATE INDEX IX_InvesteringscaseDriftspost_CaseID ON InvesteringscaseDriftspost(caseID);
